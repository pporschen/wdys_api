# WDYS REST API

## Endpoints

#### "/login" -> Webversion login

  put '/login'

  body: email
        password
  
    returns:  Errorcode 1 //wrong password
              or
              Errorcode 2 //wrong email
              or
              setheader x-token
              token, user_id, displayname, role    

#### "/signup" -> Webversion signup

    post /signup'
    
    body: email
          password
          displayname
          
    returns:  bcrypt error
              or
              Errorcode 2 // email in use
              or
              setheader x-token
              token, user_id, displayname, role
  
#### "/initial/:user_id" -> Initial data set onload of the web dashboard

    get /initial/:user_id
    
    returns:  "errorcode": "No languages found"
              or
              "errorcode": "No projects found."
              or
              languages*, userprojects**                             // *a collection of all defined langs for translation 
                                                             // ** a set of all existing projects the user owns

#### "/projects/create" -> Creates a new project for a user

     post /projects/create
     
     body:  projectname
            langs
            baselang
            deadline
            owner_id                                         // owner_id = user_id
            
     returns:   'errorcode': 'Project creation failed'
                or
                project

#### "/projects/delete" -> Deletes the selected project and all related pages.

     delete /projects/delete
     
     body:  project_id
            owner_id
            
     returns:   "Project and related pages successfully deleted"
                or
                "An error occurred finding your project"

#### "/projects/:project_id/:user_id" -> Load specific project of a user

    get  /projects/:project_id/:user_id

    returns:  "errorcode": "Could not load requested project", "project_id": XXXXX
              or
              project, pages

#### "/projects/:project_id/:user_id/:base_page_id" -> Shows the basepage, the translation pages and translators (are setup for project languges) for a specific project

    get  /projects/:project_id/:user_id/:base_page_id
    
    returns:  "errorcode": "Could not load requested translationpages"
              or
              "errorcode": "Could not load requested basepage"
              or
              basepage, translationpages*, translators                                //*related to basepage

#### "/projects/:project_id/assign" -> Assigns a translator to a translation page

    put  /projects/:project_id/assign
   
    body: translator_id
          page_id
    
    returns:  "errorcode": "Could not assign translator"
              or
              "Page assigned"

#### "/projects/:project_id/update" -> Applies changes to a specific project of a TM (projectname, deadline, langs). If a lang is added to the project it automatically creates a new translationpage for the added lang

    put  /projects/:project_id/update
    
    body: user_id
          projectname
          langs
          deadline
          
    returns:  "errorcode": "No projects found."
              or
              "errorcode": "Could not create new pages"
              or
              "project updated"

#### "/projects/:project_id/snapshot" -> Extension creates a base page snapshot

    post  /projects/:project_id/snapshot
    
    body: pagename
          description
          page_url
          base_lang
          base_project_id
          innerHTML
          
    returns:  'errorcode': 'Page creation failed'
              or
              "Page successfully created."    
  
#### "/projects/extensions/initial/:user_id" -> On initial load of the extension by a TM he gets all his projects and the related base pages

    get  /projects/extensions/initial/:user_id
    
    returns:  "errorcode": "No related pages found"
              or
              "errorcode": "No projects found."
              or
              projects, basepages       

#### "/translators/extension/:user_id/initial" -> On initial load of the extension by a TR he gets all his translation pages and the related projects

    get    /translators/extension/:user_id/initial

    returns:  "errorcode": "No related pages found"
              or
              "errorcode": "No projects found."
              or
              projects, translationpages

#### "/translators/extension/:user_id/:page_id" -> A TR can load a specific translationpage and the related basepage

    get    /translators/extension/:user_id/:page_id
          
    returns:  "errorcode": "Could not load requested basepage"
              or
              "errorcode": "Could not load requested page"
              or
              translationpage, basepage

#### "/translators/extension/sendpage'" -> Saves a snapshot of a specific page a translator worked on

    put    /translators/extension/sendpage'
    
    body:   translator_id               //is = user_id    
            pagename
            innerHTML
          
    returns:  "errorcode": "Could not save page"
              or
              "page saved"    

#### "/translators/:user_id/initial" -> loads all translators added by a logged in TM

    get    /translators/:user_id/initial
          
    returns:  "errorcode": "Could load translators"
              or
              translators

#### "/translators/create" -> Checks if translator already exists. If so, add TM to userreference, update translator_langs. Else create a new translator

    post    /translators/create
    
    body:   user_id
            email
            displayname
            translator_langs    
          
    returns:  'errorcode': 'Translator creation failed.'
              or
              "Could not update existing translator."
              or
              displayname, other translator langs           //if the translator already exists
              or
              "Translator created."

#### "/translators/remove" -> Removes a TR from a TM's set of TR's

    delete    /translators/remove
    
    body:   user_id
            translator_id
          
    returns:  "errorcode": "Could not remove Translator"
              or
              "Translator removed."

#### "/translators/:user_id/pages/:page_id" ->  load the innerHTML of a page and the related basepage and baseproject

    get    /translators/:user_id/pages/:page_id
          
    returns:  'errorcode': 'Could not load requested page.'
              or
              'errorcode': 'Could not load requested basepage.'
              or
              page, basepage, baseproject

#### "/translators/:user_id/:translator_id" -> get TR (check userreference) and all assigned pages, and basepages

    get    /translators/:user_id/:translator_id    

    returns:  'errorcode':'Could not load based pages.'
              or
              'errorcode':'Could not load assigned pages.'
              or
              "errorcode": "Could load translators"
              or
              translator, pages, basepages

#### "/translation/:user_id" -> load all assigned pages and related baseprojects

      post     /translation/:user_id

      returns:  'errorcode': 'Could not load baseprojects.'
                or
                'errorcode':'Could not load assigned pages.'
                or
                assignedPages, baseprojects

#### "/translation/pages/:page_id" ->  load the innerHTML of a page and the related basepage and baseproject

    get    /translation/pages/:page_id
          
    returns:  'errorcode': 'Could not load requested page.'
              or
              'errorcode': 'Could not load requested basepage.'
              or
              page, basepage, baseproject

#### "/langs/create" ->  creates a new document in the langs collection

    post    /langs/create

    body:   lang                        // 3letter Code
            langname

    returns:  "errorcode":"Cant save language"
              or
              "Language created."

## DB MODELS SCHEMA

#### UsersSchema(
    { 
        password: { 
          type: String, 
          required: true, 
          minlength: 3, 
          maxlength: 100
        },
        
        email: { 
          type: String, 
          trim: true, 
          lowercase: true, 
          unique: true, 
          match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'], 
          required: true, 
        },
        
        role: { 
          type: Number, 
          required: true, 
          default: 0,
          enum: [0, 1, 2]  // Translationmanager 0 , Translator 1, Developer 2
        },
        
        displayname: { 
          type: String, 
          required: true, 
          maxlength: 100
        },
        
        translator_langs: { // Set of languages the user is allowed to translate
          type: Array, 
          required: true
        }, 
        
        userreference: { // Set of translationmanagers _id the user is connected to and allowed to do translations for
          type: Array, 
          required: true
        }
    },{ timestamps: true },{ collection: 'users'});

#### ProjectsSchema (
    {
        projectname: { 
            type: String, 
            required: true, 
            trim: true,
            minlength: 3, 
            maxlength: 100,
            required: true,
            unique: true
        },
        owner_id: {
            type: String, 
            required: true, 
        },
        baselang: {
            type: String, 
            required: true, 
            lowercase: true
        },
        langs: {
            type: Array, 
            required: true
        },
        deadline: { 
            type: Date      
        }
    }, { timestamps: true }, { collection: 'projects'});

#### PagesSchema(
    {  
        pagename: { 
            type: String, 
            required: true, 
            trim: true,
            minlength: 3, 
            maxlength: 100,
            required: true,
            unique: true
        },    
        description: { 
            type: String, 
        },    
        assigned: { 
            type: Date 
        },    
        page_url: { 
            type: String,
            required: true
        },
        base_lang: { 
            type: String, 
            required: true, 
        },
        lang: { 
            type: String,     
        },
        base_project_id: { 
            type: String, 
            required: true, 
        },    
        base_page_id: {
            type: String, 
            default: "base"
        },    
        translator_id: { // _id of the assigned translator
        type: String, 
        },
        status: { 
            type: String,
        },    
        innerHTML: { 
            type: String, 
            required: true, 
        },    
    }, { timestamps: true }, { collection: 'pages'});
