/**
 * Created by Aman on 10/09/14.
 */



module.exports = function(app, request, response, params){
    return {
        'index': function (command) {
//            if(command){
                console.log("\n\nin index:" + command.name);
                command.validate();
//            }
            this.showView('dummy.html');
        },
        'hello': function () {
            console.log("in hello");
        },
        'home': function () {
            response.write("Hello home! <br/>" + params.id + "-" + app.name);
        },
        'restricted': function(){
            response.write("You can't see me! ;-)");
        }
    }
};