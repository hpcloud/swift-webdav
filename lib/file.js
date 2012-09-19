/**
 * A file Resource.
 *
 */

var util = require('util');
var Resource = require('./resource');

function File(path) {
  Resource.call(this, path);
}
module.exports = File;

// ==================================================================
// Abstract methods
// ==================================================================
File.prototype.put = function (data, fn) {
}
File.prototype.get = function (fn) {
}
File.prototype.contentType = function () {
  return 'application/x-octet-stream';
}
File.prototype.etag = function () {
}
File.prototype.length = 0;
