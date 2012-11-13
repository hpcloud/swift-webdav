var pronto = require('pronto');
var Path = require('path');
/**
 * Get the name of a resource's parent.
 *
 * Examples:
 *
 * 'foo/bar/baz' becomes 'foo/bar'
 * '/foo/bar/baz' becomes '/foo/bar'
 * 'foo' becomes '.'
 * '', null, and undefined become '.'
 * '/foo' becomes '/'
 *
 * Params:
 *
 * - path: The path to parse. (REQUIRED)
 */
function ParentName(){}
pronto.inheritsCommand(ParentName);
module.exports = ParentName;

ParentName.prototype.execute = function (cxt, params) {
  var path = params.path;
  var parent = '.';

  if (path) {
    parent = Path.dirname(path);
  }

  this.done(parent);
}
