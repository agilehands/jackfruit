/**
 * Created by Aman on 10/09/14.
 */

function app(){
    this.domains = {
        "client.localhost.com":{ // write you config here for localhost (good for dev/test environment)
        },
        "api.mydomain.com":{ // write you config here for your domain (good for production)
        }
    }

    /**
     * This method will be called just after the application is ready to run
     *
     * Domain specific configuration, as defined above, will be injected before this call.
     * This configuration can be accessed as:
     * `this.config`.
     */
    this.bootstrap = function(domain){
        console.log("Bootstraping site for domain:" + domain);
    }

    /**
     * Called before the server shutsdown.
     * @param domain Current domain
     */
    this.shutdown = function(domain){

    }

    /**
     * Called before the calling a controller action.
     * It can be used for authentication
     */
    this.preAction = function(controller, action, request, response){
        console.log(this.name + ": PRECALL:"+ request.method + ">> " + controller + "->" + action);
        if(controller == 'default' && action == 'restricted'){
            return false;
        }
    };

    /**
     * Called after the calling a controller action.
     */
    this.postAction = function(controller, action, view, request, response){
        console.log(this.name + ": POSTCALL:"+ request.method + ">> " + controller + "->" + action);
    };


    /*  Static file serving configuration for node-static module */
    this.nodeStaticConfig={
        cache: 3600
    };

    /**
     * static:
     * Can either be true or a custom file
     *
     * parseJSON:
     * if true, then request body will be converted to JSON object.
     * Make sure it body contains a valid JSON object otherwise it will crash
     *
     * For routing, it uses routes package: https://www.npmjs.org/package/routes
     */
    this.routes = {
        "*.JPG|*.css|*.png":{static:true},
        "/":{controller:'default', action:'index', command:'DummyCommand', parseJSON:false},
        "/404":{static:'/404.html'},
        "/dummy": {static:'/dummy.html'},
        "/home/:id?/:name?/:hello?": {controller:'default', action:'home'},
        "/fun/:id?": function(params, request, response, match){
            response.write("I am fun 2!" + params['id']);
            response.end();
        },
        "/:controller?/:action?/:id?": {}
    };
}

module.exports = app;