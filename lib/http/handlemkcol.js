var pronto = require('pronto');
var HTTPUtil = require('./util');
/**
 * Handle HTTP MKCOL requests.
 *
 * MKCOL is a WebDAV verb for creating collections.
 * See RFC 4918, section 9.3
 *
 * Params:
 *
 * - path: Path to the new collection (REQUIRED)
 * - resource: The existing Resource, if there is one (OPTIONAL)
 * - xml: The DOM of the XML body, if there is one (OPTIONAL)
 */
function HandleMkcol() {
}
pronto.inheritsCommand(HandleMkcol);
module.exports = HandleMkcol;

HandleMkcol.prototype.execute = function (cxt, params) {
  this.required(params, ['path']);
  var path = params.path;
  var resource = params.resource;
  var xml = params.xml;


}
