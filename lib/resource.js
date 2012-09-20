/**
 * A Resource is the basic WebDAV data type.
 *
 * There are two types of resources:
 * - A Collection
 * - A Resource that is not a collection. ;-) (A file or object)
 *
 */
function Resource(path) {
  this.path = path;
}
module.exports = Resource;

Resource.prototype.isCollection = false;

// ==================================================================
// Abstract methods
// ==================================================================
Resource.prototype.delete = function (fn) {
}


// ==================================================================
// Concrete methods
// ==================================================================
Resource.prototype.name = function () {
  return this.path;
}
Resource.prototype.setName = function (name) {
  this.path = name;
}
Resource.prototype.lastModified = function () {
  return this.modified;
}
Resource.prototype.setLastModified = function (time) {
  this.modified = time;
}
