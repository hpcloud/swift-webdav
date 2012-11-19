/**
 * Function utilities.
 */

var Futil = {};
module.exports = Futil;


/**
 * Re-scan an argument list with internal optional arguments and a trailing function.
 *
 * It is often considered best to have callback functions listed as the last argument
 * on a function call. This provides a way of re-setting arguments so that optional
 * arguments are set to 'undefined' and the function callback is moved to the far right
 * of the arguments list.
 *
 * Usage:
 *
 *   function example(a, b, c, callback) {
 *     var args = Futil.argsWithFn(arguments, ['a', 'b', 'c', 'callback']);
 *
 *     console.log("a: %s, b: %s, c: %s, callback: %s", args.a, args.b, args.c, args.callback);
 *   }
 *
 *   // Call like this...
 *   example(1, function(){});
 *   // Output:
 *   // a: 1, b: undefined, c: undefined, callback: function (){}
 */
Futil.argsWithFn = function (args, names) {
  var newArgs = {};
  var found = false;
  for (var i = args.length - 1; i >= 0; --i) {
    if (!found && typeof args[i] == 'function') {
      var fn = args[i];
      newArgs[names[i]] = undefined;
      newArgs[names[names.length - 1]] = fn;
      found = true;
    }
    else {
      newArgs[names[i]] = args[i];
    }
  }
  return newArgs;
}

