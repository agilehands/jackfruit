/**
 * Created by Aman on 15/09/14.
 */
var url         = require("url");
var http        = require("http");
var path        = require("path");
var Router      = require('routes');
var Formidable  = require('formidable');
var NodeStatic  = require("node-static");
var fileSystem  = require("fs");


var jackfruit = {
    version:1.0,
    port:8080,
    isRunning:false,
    sitesForDomains:{},
    routesForDomain:{}
};

jackfruit.start = function(port){
    if(this.isRunning === true)return;

    if(typeof  port != undefined){
        this.port = port;
    }

    this.isRunning = true;
    http.createServer(function(request, response){
        jackfruit.httpHandler(request, response); // could use apply or a local variable to this
    }).listen(this.port);

    log("*", "SERVER STARTED AT PORT " + this.port);
}


jackfruit.httpHandler = function(request, response){
    if(this.isRunning === false){
        request.connection.destroy()
        return;
    }

    var domain = request.headers.host.split(':')[0]; // TODO: confirm its correct way to get domain
    var site = this.siteForDomain(domain);

    if(typeof site == 'undefined'){
        this.showError(404, 'site not found for domain:' + domain, response);
        return;
    }

    var router = this.routesForDomain[domain];
    var uri = url.parse(request.url).pathname;
    var match = router.match(uri);
    if(!match){
        // check static file
        site.serveFile(uri, 200, {}, request, response);
        return;
    }


    var route = match.fn;

    /**
     * Route can be either a function or an object
     */
    if (typeof route == 'function'){
        var shouldEndResponse = route(match.params, request, response, match);
        /**
         * If the function wants not to end the response,
         * it must return boolean false
         */
        if(shouldEndResponse !== false){
            response.end();
        }

        return;
    }

    /*==== Check if any route configuration is defined ===*/
    if(route == null || typeof route != 'object'){
        /**
         * Bummer, incorrect configuration
         * showing 404 just not to crash others ==
         */
        site.onError(404,"Invalid route", request, response);
        return;
    }


    var controllerName;
    var commandName;
    var action;

    /**
     * Route object can be either:
     * A. {} : Determine controller/action from route params
     * B. {static:'view'} : show this static view
     * C. {controller:'MyController', action:'myAction', command:'LoginCommand'}: Determine from the route object
     *
     * NOTE: If B & C both are present, B will be have precedence i.e. showing static file
     */
    if(Object.keys(route).length == 0){ // 'A'
        var params = match.params;
        controllerName = params['controller'];
        action = params['action'];
    } else { //'B' or 'C'
        if(route['static']){
            var file = route['static'];
            if(file === true){
                file = uri;
            }
            site.serveFile(file, 200, {}, request, response); //TODO: Configurable options for  file serving? e.g. header, status code?
            return;
        } else {
            controllerName = route['controller'];
            action = route['action'];
            commandName = route['command'];
        }
    }

    var shouldRun = site.preAction(controllerName, action, request, response)
    if(shouldRun === false){
        site.onError(401,"Restricted area", request, response);
        log(site, "PRE_ACTION=FALSE: " + controllerName + "->" + action);
        return;
    }

    // Instantiate and configure controller object
    var controllerInstance;
    try{
        controllerInstance = require(site.baseDirectory + "/controllers/"+controllerName)(site, request, response, match.params); // TODO: Use controller pool?
        controllerInstance.showView = function(file, status, config){
            if(!file)return false;
            if(!status) status = 200;
            if(config) config ={};
            site.serveFile(file, status, config, request, response);
            controllerInstance._isServingFile_ = true;
            return true;
        }
    }catch(e){
        site.onError(404,"Controller not found", request, response);
        return;
    }

    // Fallback action is 'index'
    if(!action){
        action = 'index';
    }

    if(typeof controllerInstance[action] != 'function'){
        site.onError(404,'Action not defined')
        return;
    }

    var commandInstance;
    if(typeof commandName != 'undefined'){
        try{
            commandInstance = require(site.baseDirectory + "/commands/"+commandName)(site,request, response, match.params);
        }catch (e){
            log(site, 'command not found:' + commandName);
        }
    }

    // TODO: Remove code duplication between JSON and FORM final block
    var requestBody;
    if(route['parseJSON'] === true){
        var requestBodyData = '';
        request.on('data', function (data) {
            //TODO: how about using buffer?
            //TODO: How about MAX data length limit?
            requestBodyData += data;
        });
        request.on('end', function () {
            try{
                requestBody  = JSON.parse(requestBodyData);
            } catch(e){
                log(site, e);
                requestBody = {};
            } finally{
                if(typeof commandInstance != 'undefined'){
                    for(var key in requestBody){
                        commandInstance[key] = requestBody[key];
                    }
                    commandInstance.requestBody = requestBody;
                }
                var shouldEnd = controllerInstance[action](commandInstance);
                if(controllerInstance._isServingFile_ !== true && shouldEnd !== false){
                    response.end();
                }
                site.postAction(controllerName, action, request, response)
            }
        });
    } else {
        requestBody= {};
        var form = new Formidable.IncomingForm();
        form.parse(request, function(err, fields, files) {
            requestBody.fields = fields;
            requestBody.files  = files; // TODO: Handle file upload
            if(typeof commandcomInstance != 'undefined'){
                for(var key in requestBody.fields){
                    commandInstance[key] = requestBody.fields[key];
                }
                commandInstance.requestBody = requestBody;
            }
            var shouldEnd = controllerInstance[action](commandInstance);
            log(site, "serving file:" + controllerInstance._isServingFile_);
            if(controllerInstance._isServingFile_ !== true && shouldEnd !== false){
                response.end();
            }
            site.postAction(controllerName, action, request, response)
        });
    }

    // NOTE: Make sure response is ended before reaching here or it is will be open
}

jackfruit.siteForDomain=function(domain){
    var site = this.sitesForDomains[domain];
    if(typeof  site != 'undefined'){
        return site;
    }

    var sitesDir = path.dirname(require.main.filename) + "/sites/"; //KISS: convention
    fileSystem.readdirSync(sitesDir).forEach(function(dir) {
        var SiteClass = require(sitesDir + dir+'/index.js');
        var siteInstance = new SiteClass();
        for(var siteDomain in siteInstance.domains){
            if(siteDomain == domain){
                log("*", "Site found:"+domain);
                site = siteInstance;
                site.name = dir;
                jackfruit.sitesForDomains[domain] = site;
                jackfruit.configureSiteInstanceInDirWithDomain(siteInstance, sitesDir + dir, domain);

                var router = Router();
                var routes = site.routes;
                for(var uri in routes){
                    router.addRoute(uri, routes[uri]);
                }
                jackfruit.routesForDomain[domain] = router;
                if(typeof site.bootstrap == 'function'){
                    site.bootstrap(domain);
                }
                return false;
            }
        }
    });

    return site;
}

jackfruit.configureSiteInstanceInDirWithDomain = function(site, dir, domain){
    site.baseDirectory = dir;
    site.www = dir + "/public"; //KISS: convention
    site.fileServer = new NodeStatic.Server(site.www);

    site.serveFile = function(file, status, header, request, response){
        fileSystem.exists(site.www + "/"+ file, function(exists) {
            if (exists) {
                if(!status){
                    status = 200;
                }
                if(typeof header != "object"){
                    header = {};
                }
                site.fileServer.serveFile(file, status, header, request, response);
            } else {
                log(site,"not found!!" + file);
                site.onError(404, "Page not found", request, response);
            }
        });
    }

    site.onError = function(code, message, request, response){
        var filePath = path.join(site.www, code+'.html');
        response.writeHead(code, {
            'Content-Type': 'text/html'
        });
        fileSystem.exists(filePath, function(exists) {
            if(exists){
                var readStream = fileSystem.createReadStream(filePath);
                readStream.pipe(response);
            }else {
                response.write(message);
                response.end();
            }
        });
    }
}

jackfruit.testRunSiteWithDomain=function(siteName, domain){
}

jackfruit.shutdown = function(){
    this.isRunning = false;
    log("*","\nSHUTTING DOWN SERVER...");
    for(var domain in this.sitesForDomains){
        var site = this.sitesForDomains[domain];
        if(typeof  site['shutdown'] == "function"){
            log("*","SHUTTING DOWN " +domain);
            site.shutdown(domain);
        }
    }

}

jackfruit.showError = function(code, message, response){
    var filePath = path.join(__dirname, 'views/'+code+'.html');
    response.writeHead(code, {
        'Content-Type': 'text/html'
    });

    fileSystem.exists(filePath, function(exists) {
        if(exists){
            var readStream = fileSystem.createReadStream(filePath);
            readStream.pipe(response);
        }else {
            response.write(message);
            response.end();
        }
    });
}


module.exports = jackfruit;

function log(site, msg){
    msg = new Date() + " JACKFRUIT " + ((typeof site.name == 'undefined')?'*':site.name)  + " " + msg;
    console.log(msg);
}
