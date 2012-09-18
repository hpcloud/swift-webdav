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

//Resource.prototype. = function () {
//}
