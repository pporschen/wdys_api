var path = require('path');
const Pages = require('../database/models/pages');
const Users = require('../database/models/users');
const Projects = require('../database/models/projects');
const moment = require('moment');
const saltRounds = 10;
const bcrypt = require('bcrypt');
const HTMLParser = require('node-html-parser');


require('dotenv').config()
require('../database/client')

exports.translators_inital = (req,res) => {
    Users.find({role: "1", userreference: {$in: req.params.user_id}},{password: 0})
    .exec( (err, translators) => {
        if(translators && !err) {
            res.send(translators)} 
        else {
            return res.send({"errorcode": "Could not load translators"})
        }
    });
}

exports.translator_extension_initial = (req,res) => {
    Pages.find({translator_id: `${req.params.user_id}`, base_page_id: { $ne: "base" }})
    .exec( (err, pages) => {
        if(pages && !err) {
            let base_projects_ids = []
            pages.map(x=> base_projects_ids.push(x.base_project_id))
            Projects.find({_id: { $in: base_projects_ids }})
                .exec( (err, projects) => {
                    if(projects && !err) {
                        res.status(200).send({"projects": projects, "translationpages": pages})} 
                    else { return res.send({"errorcode": "No related pages found"})}
                });
        } 
        else { return res.send({"errorcode": "No projects found."})}
     });
};  


exports.getpage = (req,res) => {
    Pages.findOne({_id: req.params.page_id, translator_id: req.params.user_id})     //get translation page
    .exec( (err, page) => {
        if(page && !err) {
            Pages.findOne({_id: page.base_page_id})                                         //get basepage
                .exec( (err, basepage) => {
                if(basepage && !err) {
                res.send({"translationpage": page, "basepage": basepage})} 
                else {return res.send({"errorcode": "Could not load requested basepage"})}
                });
            }
        else {return res.send({"errorcode": "Could not load requested page"})}
    })
} 


exports.sendpage = (req,res) => {
    Pages.findOneAndUpdate({_id: req.body.page_id, translator_id: req.body.translator_id}, {innerHTML: req.body.innerHTML})
    .exec( (err, page) => {
        if(page && !err) {
            res.send("Page saved")} 
        else {return res.send({"errorcode": "Could not save page"})}
        });
}




//// EMAIL OR PASSWORD SETTING IS MISSING


// Checks if translator already exists. If so, add TM to userreference, update translator_langs. Else create a new translator.
exports.translator_create = (req,res) => {
    Users.findOne({email: req.body.email})
    .exec((err, existing_translator)=>{

        let pw = "0000"
        let pwhash
        bcrypt.genSalt(saltRounds, function(err, salt) { 
            bcrypt.hash(pw, salt, (err, hash)=>{
                if (err || !hash) 
                    {
                        res.status(400).send({'bcrypt error': err})
                    }
                else {
                    pwhash = hash
                    if (err) {
                        res.send({"errorcode":"An unknown error occured."})
                    }
                    else if (!existing_translator) {
                        var new_translator =  new Users (
                            {
                            email: req.body.email, 
                            role: 1, 
                            translator_langs: req.body.translator_langs, 
                            displayname: req.body.displayname,
                            userreference: req.body.user_id,
                            password: pwhash
                            })
                                  
                            new_translator.save((err)=>{
                                if (err) { return res.send({'errorcode': 'Translator creation failed.'})}
                                else { return (res.status(201).send("Translator created."))
                                }
                            });
                        }
                        else {
                            Users.findOneAndUpdate({_id: existing_translator._id},{$addToSet: {userreference: req.body.user_id, translator_langs: req.body.translator_langs}})
                            .exec((err)=>{
                                if(err) res.status(400).send("Could not update existing translator.")
                                else res.status(200).send({"displayname": existing_translator.displayname, "other_translator_langs": existing_translator.translator_langs.filter(y=>!req.body.translator_langs.includes(y))})
                            })
                        }
                    }
                }
            )
        })
    })
}


exports.translator_remove = (req,res) => {
    Users.findOneAndUpdate({_id: req.body.translator_id, userreference: req.body.user_id}, {$pull: {userreference: req.body.user_id}})
    .exec( (err, user) => {
        if(user && !err) {
            res.send("Translator removed.")} 
        else {return res.send({"errorcode": "Could not remove Translator"})}
        }
    );
}


exports.translation_compare = async (req,res) => {
   try {
        const translationpage = await Pages.findById(req.params.page_id)
        const basepage = await Pages.findById(translationpage.base_page_id)
        const root = HTMLParser.parse('<body data-id="1">'+basepage.innerHTML+'</body>');
        const root2 = HTMLParser.parse('<body data-id="1">'+translationpage.innerHTML+'</body>');
        const nodes = root.querySelectorAll('*');
        const nodes2 = root2.querySelectorAll('*');
        const nodesObj = {};
        const difference = [];

        for (let node of nodes) {
            if ((node.innerHTML.trim()[0] !== '<') && node.tagName !== 'script' && node.innerHTML) {
                nodesObj[node.getAttribute('data-id')] = { id: node.getAttribute('data-id'), baseText: node.text.trim(), parent: node.parentNode.getAttribute('data-id'), children: [], tag: node.tagName };
                if (nodesObj[node.parentNode.getAttribute('data-id')]) nodesObj[node.parentNode.getAttribute('data-id')].children.push(node.getAttribute('data-id'));
            }
        }
        
        for (let node of nodes2) {
            if(node.getAttribute('data-id') === undefined) continue;
            if ((node.innerHTML.trim()[0] !== '<') && node.tagName !== 'script' && node.innerHTML) {
                nodesObj[node.getAttribute('data-id')].translation = node.text.trim();
                if (nodesObj[node.getAttribute('data-id')].translation !== nodesObj[node.getAttribute('data-id')].baseText) {
                    difference.push(node.getAttribute('data-id'));
                }
            }
        }
        const seen = []
        const result = []
        const recur = (arr, depth = 0, index = 0) => {
            if (!seen.includes(nodesObj[arr[index]].id)) {
                nodesObj[arr[index]].depth = depth;
                result.push(nodesObj[arr[index]])
                seen.push(nodesObj[arr[index]].id);
                if (nodesObj[arr[index]].children.length) recur(nodesObj[arr[index]].children, depth + 1);
                if (index === arr.length - 1) return
                else recur(arr, depth, index + 1)
            }
        };

        recur(difference)

        res.send({"result": result, "translationpage":translationpage})
        }

    catch (err) {
        res.send(err.msg)
    }
}



exports.translatorsById = (req,res) => {
    Users.findOne({role: "1", userreference: req.params.user_id, _id: req.params.translator_id},{password:0})
    .exec( (err, translator) => {
        if(translator && !err) {
            Pages.find({translator_id: req.params.translator_id}, {innerHTML:0})
            .exec((err, pages)=>{
                if(!err) {
                    if(pages.length >0){
                        Pages.find({_id: pages[0].base_page_id},{innerHTML:0})
                        .exec((err, basepages)=>{
                            if(basepages, !err) {
                                res.status(200).send({'translator': translator, 'assignedPages': pages, 'basepages': basepages})
                            }
                            else{
                                res.status(400).send({'errorcode': 'Could not load basepages.'})
                            }
                        })
                    }
                    else {
                        res.status(200).send({'translator': translator, 'assignedPages': [], 'basepages': []})
                    }
                }    
            })   
        } 
        else {
            return res.send({"errorcode": "Could load translators"})
        }
    });
}

exports.translation_initial = (req, res) =>{
    Pages.find({translator_id: req.params.user_id},{innerHTML: 0})
    .then((pages) =>{
        let assignedPages = []
        const promises = pages.map(x => Projects.findOne({_id: x.base_project_id})
        .then(baseproject =>{
            return {
                _id: x._id,
                pagename: x.pagename,
                base_lang: x.base_lang,
                lang: x.lang,
                deadline: baseproject.deadline,
                projectname: baseproject.projectname,
                page_url: x.page_url,
                description: x.description
            }
        })) 
        
        Promise.all(promises)
            .then(data => res.status(200).send(data))
            .catch(err => res.status(400).send({'errorcode': 'An unknown error occured.'}))
    }).catch(err => res.status(400).send({'errorcode': 'Could not load assigned pages.'}))}

