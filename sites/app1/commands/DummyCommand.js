/**
 * Created by Aman on 11/09/14.
 */


module.exports =  function(){
    return {
        name: '',
        age: 0,
        country: '',
        validate:function(){
            console.log("I am in validator!");
            return true;
        }
    }
}