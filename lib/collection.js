/**
 * A Collection resource.
 */
var util = require('util');
var Resource = require('./resource');

function Collection(path) {
  this.isCollection = true;
}
module.exports = Collection;
util.inherits(Collection, Resource);
