/**
 * A file Resource.
 *
 * This describes a resource that acts like a file.
 *
 * A File object is a *description* of a file, not an actor. All actions
 * are handled by the ResourceBridge implementation. To that end, a File
 * should be relatively flexible, and specific backend implementations
 * should not need to create their own File implementations.
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
// Concrete methods
// ==================================================================
File.prototype.contentType = function () {
  return this.mimeType || 'application/x-octet-stream';
}

/**
 * The encoding used internally.
 */
File.prototype.setCharacterEncoding = function (encoding) {
  this.encoding = encoding;
}

File.prototype.characterEncoding = function () {
  return this.encoding || 'utf8';
}

/**
 * Set the content type.
 *
 * Content types are of the form 'category/type', such as 'text/plain'
 * and 'application/javascript'.
 */
File.prototype.setContentType = function (type) {
  this.mimeType = type;
}
File.prototype.etag = function () {
  return this.hash;
}

/**
 * Set an ETag.
 *
 * An ETag MUST be of the form '"MD5HASH"', where the double quotes are
 * required, and MD5HASH is replaced with the MD5 hash (hex)
 * representing the contents of the stream.
 *
 * If the application can not comply with this, it should not set the
 * Etag.
 */
File.prototype.setEtag = function (md5) {
  this.hash = md5;
}

/**
 * Add a Readable Stream.
 *
 * Because there is no guarantee that the passed-in stream will have an
 * event listener attached anytime soon, implementors are advised to do
 * one of two things:
 *
 * - pause the stream before handing it to this method.
 * - wrap the stream in a buffered reader, like
 *   pronto.streams.BufferedReader.
 *
 * @param {Stream} stream
 *   A readable stream.
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
