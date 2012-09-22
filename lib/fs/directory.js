/**
 * A collection backed by a file system directory.
 */
var Collection = require('../collection');
var util = require('util');

function Directory(path) {
  Collection.prototype.call(this, path);
}
util.inherits(Directory, Collection);
module.exports = Directory;
