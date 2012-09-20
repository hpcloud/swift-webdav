/**
 * A file Resource.
 *
 */

var util = require('util');
var Resource = require('./resource');

function File(path) {
  Resource.call(this, path);
}
util.inherits(File, Resource);
module.exports = File;

// ==================================================================
// Abstract methods
// ==================================================================
File.prototype.put = function (data, fn) {
}
File.prototype.get = function (fn) {
}
File.prototype.length = 0;


// ==================================================================
// Concrete methods
// ==================================================================
File.prototype.contentType = function () {
  return this.mimeType || 'application/x-octet-stream';
}
File.prototype.setContentType = function (type) {
  this.mimeType = type;
}
File.prototype.etag = function () {
  return this.hash;
}
File.prototype.setEtag = function (md5) {
  this.hash = md5;
}
