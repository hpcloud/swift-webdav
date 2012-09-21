/**
 * A file Resource.
 *
 */

var util = require('util');
var Resource = require('./resource');

function File(path) {
  Resource.call(this, path);
  this.length = 0;
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

/**
 * Add a Readable Stream.
 *
 * You are encouraged to use some sort of buffered
 * stream.
 */
File.prototype.setReader = function (stream) {
  this.stream = stream;
}

File.prototype.reader = function () {
  return this.stream;
}

// Witness the inner turmoil of an ex-Java developer who upon principle
// can't quite bring himself to abandon accessor/mutator in favor of
// setting public variables.
File.prototype.setLength = function (bytes) {
  this.length = bytes;
}
