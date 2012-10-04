var File = require('./file');
var Collection = require('./collection');
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

/**
 * Load a resource.
 *
 * HANDLING ERRORS:
 *
 * An implementation should return an Error with a `code` on it. The
 * code MUST be a string. Codes come from the POSIX standard for file
 * I/O error codes. See `man 2 open`. These happen to also be the
 * error codes that Node.js uses in its 'fs' package.
 *
 * An error may have the following Error.status codes:
 *
 * - 404: No such file
 * - 403: Forbidden
 * - 500: The sky is falling
 *
 * All other codes are resolved to HTTP 500.
 *
 * @param {String} name
 *   The name of the resource to load.
 * @param {Function} fn
 *   A callback. This will be executed as fn(error, Resource).
 *   Resource may be a File or a Collection.
 */
ResourceBridge.prototype.load = function (name, fn) {
}

/**
 * Create a new File object.
 *
 * This should not store the file, but create a stub which can be used
 * by save() and other functions.
 *
 * When creating a resource from outside of the bridge API, you should
 * always use ResourceBridge.createFile() instead of new File(). This
 * allows low-level implementors to override File.
 *
 * IMPLEMENTORS: This only needs to be overridden if you are not using
 * the built-in Resource/File/Collection system.
 *
 * @param {String} path 
 *   The relative path of the resource.
 * @return {File}
 *   A file object.
 */
ResourceBridge.prototype.createFile = function (path) {
  return new File(path);
}

/**
 * Create a new Collection object.
 *
 * This should not save the Collection, but just create a Resource
 * object that can be saved later.
 *
 * When creating a resource from outside of the bridge API, you should
 * always use ResourceBridge.createCollection() instead of new
 * Collection(). This allows low-level implementors to override
 * Collection.
 *
 * IMPLEMENTORS: This only needs to be overridden if you are not using
 * the built-in Resource/File/Collection system.
 *
 * @param {String} path 
 *   The relative path of the resource.
 * @return {Collection}
 *   A collection object.
 */
ResourceBridge.prototype.createCollection = function (path) {
  return new Collection(path);
}

/**
 * Make a new collection.
 *
 * Take a collection resource describing a collection and create a new
 * collection.
 *
 * The error object may have any of the following Error.status codes
 * set:
 *
 * - 403: Permission is denied
 * - 405: Something already lives at that URL
 * - 409: A parent directory is missing or is not a collection
 * - 507: Insufficient memory
 * - 500: Ooops, I did it again.
 *
 * @param {Collection|String} collection
 *   A collection resource or just the path name. Not all features may
 *   be supported if only the path name string is passed in.
 * @param {Function} fn
 *   The callback, called fn(Error e);
 */
ResourceBridge.prototype.mkcol = function (collection, fn) {
}

/**
 * Given a Resource, stream, and callback, save the stream to Resource.
 *
 * @param {Resource} resource
 *   The resource. This contains information like name and content type.
 * @param {ReadableStream} stream
 *   The stream pointing to file contents.
 * @param {Function} fn
 *   The callback. This will be invoked as fn(Error e, Object data),
 *   where Object.etag is the E-Tag (if available) and Obejct.date
 *   is the timestamp that the file save operation completed.
 */
ResourceBridge.prototype.save = function (resource, stream, fn) {
}
/**
 *
 * @param {Resource} resource
 *   The resource to delete.
 * @param {Function} fn
 *   The callback is called like this: fn(e, multistatus), 
 *   where E represents a fatal error to the entire operation
 *   and multistatus may contain a number of error status
 *   messages.
 */
ResourceBridge.prototype.delete = function (resource, fn) {
  if (resource.isCollection) {
    this.deleteCollection(resource, fn);
  }
  else {
    this.deleteFile(resource, fn);
  }
}
/**
 * Delete a collection.
 *
 * This should handle RECURSIVE deletes. The WebDAV spec
 * requires that a DELETE operation remove all children along with the
 * deleted resource.
 *
 * Normally, one calls 'ResourceBridge.delete()` rather than
 * calling this directly.
 *
 * @param {Collection} collection
 *   A collection resource. This collection and all of its contents will
 *   be deleted.
 * @param {Function} fn
 *   A callback to be executed when the deletion is complete. It will be
 *   called as fn(Error e, Array multistatus); Multistatus is an array
 *   of objects with the properties {path: some/path, status:403}, where
 *   the status is the HTTP error code for the error. Per RFC 4918, ONLY
 *   failures are returned here.
 */
ResourceBridge.prototype.deleteCollection = function (collection, fn) {
}
/**
 * Delete a single File.
 */
ResourceBridge.prototype.deleteFile = function (file, fn) {
}
ResourceBridge.prototype.copy = function (src, dest, overwrite, fn) {
}

// ==================================================================
// Concrete methods. Override at will.
// ==================================================================
ResourceBridge.prototype.move = function (src, dest, overwrite, fn) {
  var rb = this;
  rb.copy(src, dest, overwrite, function (err) {
    if (e) {
      fn(err);
      return;
    }
    rb.delete(src, fn);
  });
}
