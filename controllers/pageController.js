var path = require('path');
const Pages = require('../database/models/pages');
const Users = require('../database/models/users');
const moment = require('moment');
const Projects = require('../database/models/projects');
const { findOneAndUpdate } = require('../database/models/pages');

require('dotenv').config()
require('../database/client')


exports.snapshot = (req,res) => {
    var page =  new Pages (
        {
            pagename: `${req.body.pagename}`, 
            description: `${req.body.description}`, 
            page_url: `${req.body.page_url}`, 
            base_project_id: `${req.params.project_id}`,
            innerHTML: `${req.body.innerHTML}`,
            
        })
    page.save((err)=>{
        if (err) {
            return res.send({'errorcode': 'Page creation failed'})
        }
        else {
            Projects.findOne({_id: req.params.project_id})
            .exec((err, project)=>{
                if(err || !project) {
                    return res.status(400).send({'errorcode':'Could not find baseproject.'})
                }
                else {
                    project.langs.map( x=> {
                        let translationpage = new Pages(
                            {
                                pagename: `${req.body.pagename} - ${x}`, 
                                description: `${req.body.description}`, 
                                page_url: `${req.body.page_url}`, 
                                base_lang: `${project.baselang}`,
                                base_project_id: `${req.params.project_id}`,
                                innerHTML: `${req.body.innerHTML}`,
                                lang: x,
                                base_page_id: page._id
                            })
                        translationpage.save((err)=>{
                            if (err) {return res.send({'errorcode': 'Translationpage creation failed'})
                            }
                        })
                    })
                    Pages.findOneAndUpdate({pagename:`${req.body.pagename}`},{base_lang: project.baselang, lang: project.baselang})
                    .exec((err, result)=>{
                        if(!err && result){
                        return (res.send("Page successfully created."))
                        }
                    })
                }
            })
        }
    });
}


exports.showBasePage = (req,res) => {
    Pages.findOne({_id: req.params.base_page_id}, {innerHTML: 0})                                       //get basepage
    .exec( (err, basepage) => {
        if(basepage && !err) {
            Projects.findOne({_id: basepage.base_project_id})
            .exec( (err, baseproject) => {
                if(baseproject && !err) {
                    Pages.find({base_page_id: basepage._id},{innerHTML:0})                                    //get translationpages
                        .exec( (err, pages) => {
                        if(pages && !err) {
                            Users.find({role: 1, userreference: req.params.user_id, $and: [{translator_langs: {$in: basepage.base_lang}},{translator_langs: {$in: baseproject.langs }}]})       //get all translator with the related langs
                            .exec( (err, translators) => {
                                if(translators && !err) {
                                    res.status(200).send({"translationpage": pages, "basepage": basepage, "translators": translators, "baseproject": baseproject})
                                } 
                                else {
                                    return res.send({"errorcode": "Could not load requested translators"})
                                }
                            })
                        }
                        else {return res.send({"errorcode": "Could not load requested translationpages"})}
                        });
                    }
                else {
                    return res.send({"errorcode": "Could not load requested baseproject"})
                }
            })
        }
        else {
            return res.send({"errorcode": "Could not load requested basepage"})
        }
    })
} 

exports.editBasePage = (req,res) => {
    Pages.findOneAndUpdate({_id: req.params.base_page_id},{pagename: req.body.pagename, description: req.body.description})                                       //get basepage
    .exec( (err, basepage) => {
        if(basepage && !err) {
            Projects.findOne({_id: basepage.base_project_id})
            .exec( (err, baseproject) => {
                if(baseproject && !err) {
                    Pages.find({base_page_id: basepage._id},{innerHTML:0})                                    //get translationpages
                    .exec( (err, pages) => {
                        if(pages && !err) {
                            pages.map(page=> 
                                Pages.findOneAndUpdate({_id: page._id},{pagename: `${req.body.pagename} - ${page.lang}`})
                                .exec((err, translationpage) => {
                                    if(err) {
                                        return res.send({"errorcode": "Could not update translationpage names"})
                                    }
                                })
                            )
                            return res.send("Basepage and Translationpages updated.")
                        }
                    })
                }
                else {
                    return res.send({"errorcode": "Could not load requested baseproject"})
                }
            })
        }
        else {
            return res.send({"errorcode": "Could not load requested basepage"})
        }
    })
} 



exports.deleteBasePage = (req,res) => {
    Pages.findOneAndDelete({_id: req.params.base_page_id})
    .exec((err, page)=>{
        if (!err && page) {
            Pages.deleteMany({base_page_id: page._id})
            .exec((err, pages)=>{
                if (!err && pages) {
                    res.status(200).send("Basepage and related translationpages successfully deleted")
                }
            })
        }
        else res.send("An error occurred finding your page")
    })
}


exports.assignTranslator = (req,res) => {
    Pages.findOneAndUpdate({_id: req.body.page_id}, {translator_id: req.body.translator_id, assigned: new Date(), status: "open"})
    .exec( (err, page) => {
        if(page && !err) {
            res.send("Page assigned.")} 
        else {
            return res.send({"errorcode": "Could not assign translator"})
        }
    });
}