/**
 * A Collection resource.
 */
var util = require('util');
var Resource = require('./resource');

function Collection(path) {
  this.isCollection = true;
}
module.exports = Collection;
util.inherits(Collection, Resource);

// ==================================================================
// Abstract methods
// ==================================================================
Collection.prototype.createFile = function (name, data, fn) {
}
Collection.prototype.createCollection = function (name, fn) {
}
Collection.prototype.childExists = function (name, fn) {
}
Collection.prototype.getChild = function (name, fn) {
}
Collection.prototype.getChildren = function (fn) {
}
