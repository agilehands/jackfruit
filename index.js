/**
 * Created by Aman on 10/09/14.
 */


var jackfruit = require('./jackfruit/jackfruit');
jackfruit.start(8080);

process.on('SIGINT', function () {
    process.exit(0);
});
process.on('exit', function (){
    jackfruit.shutdown();
});