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
 * - resourceBridge: The resource bridge (REQUIRED)
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
  this.bridge = params.resourceBridge
  this.cxt = cxt;

  // XXX: Should this get moved after the extended mkcol?
  if (path == '/' || resource) {
    cxt.add('body', 'The resource already exists.');
    this.reroute('@405', cxt);
    return;
  }

  // We can do an extended mkcol.
  if (xml) {
    this.doExtendedMkcol(xml);
    return;
  }

  // Vanilla mkcol
  var col = this.bridge.createCollection(path);
  this.doMkcol(col);
  return;
}

/**
 * Basic mkcol.
 */
HandleMkcol.prototype.doMkcol = function (collection) {
  var cmd = this;
  this.bridge.mkcol(collection, function (e) {
    if (e) {
      // Valid statuses are: 403, 405, 409, 415, 500
      var status = e.status || 500;
      cmd.cxt.log("Failed mkcol with " + status + ": " + e.message, 'warning');
      cmd.reroute('@' + status, cmd.cxt);
      return;
    }
    cmd.done(201);
  });
}
/**
 * Extended mkcol.
 */
HandleMkcol.prototype.doExtendedMkcol = function (xml) {
  this.reroute('@415', this.cxt);

  // This needs to put the XML DOM into extendedMkcol:
  var multistatus = '';
  this.cxt.add('extendedMkcol', multistatus);

}
