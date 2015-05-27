/**
 * Created by zshchou on 5/26/15.
 */
/**
 * Created by zshchou on 5/26/15.
 */
var Backbone = require('backbone');

Person = Backbone.Model.extend({
    // If you return a string from the validate function,
    // Backbone will throw an error
    validate: function( attributes ){
        if( attributes.age < 0 && attributes.name != "Dr Manhatten" ){
            return "You can't be negative years old";
        }
    },
    initialize: function() {
        alert("Weblcome to this world");
        this.bind("error", function(model, error){
            // We have received an error, log it, alert it or forget it :)
            alert( error );
        });
    }
});

module.exports = Person;
