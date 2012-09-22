/**
 * A Resource is the basic WebDAV data type.
 *
 * There are two types of resources:
 * - A Collection
 * - A  File, which is a Resource that is not a collection. ;-)
 *
 * Every resource has a name, which is a path-like structure. Resources
 * may also have modification dates, though this is seldom used on
 * collections.
 */
function Resource(path) {
  this.path = path;
}
module.exports = Resource;

/**
 * Used to identify whether this is a collection or a file.
 */
Resource.prototype.isCollection = false;

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
