/**
 * This is the ResourceBridge abstract prototype.
 *
 * A resource bridge is responsible for translating between WebDAV and
 * some other IO system, such as file system operations, an object
 * database, or a content repository.
 *
 * Ideally, a resource bridge handles the following:
 *
 * - It provides Collection objects for "directory-like" listings
 * - It provides File/Resource objects for "object-like" things
 * - It handles auxilliary tasks when supported, like locking.
 *
 * In most cases, the webdav.Resource, webdav.File, and webdav.Collection classes
 * should cover base needs, but some backends may require more
 * sophisticated versions of these objects.
 */
function ResourceBridge() {
}
module.exports = ResourceBridge;

// ==================================================================
// Abstract methods
// ==================================================================
ResourceBridge.prototype.load = function (name, fn) {
}
ResourceBridge.prototype.save = function (resource, fn) {
}
ResourceBridge.prototype.delete = function (name, fn) {
}
ResourceBridge.prototype.copy = function (src, dest, fn) {
}

// ==================================================================
// Concrete methods. Override at will.
// ==================================================================
ResourceBridge.prototype.move = function (src, dest, fn) {
  var rb = this;
  rb.copy(src, dest, function (err) {
    if (e) {
      fn(err);
      return;
    }
    rb.delete(src, fn);
  });
}
