/**
 * A Collection resource.
 *
 * This resource represents a collection of File and Collection
 * resources. It is analogous to a file system directory. The term
 * 'Collection' comes from the WebDAV standard.
 */
var util = require('util');
var Resource = require('./resource');

function Collection(path) {
  this.isCollection = true;
}
module.exports = Collection;
util.inherits(Collection, Resource);

Collection.prototype.childExists = function (name, fn) {
}
Collection.prototype.getChild = function (name, fn) {
}
Collection.prototype.getChildren = function (fn) {
}
