
var pronto = require('pronto');
var HTTPUtil = require('./util');
/**
 * Handle HTTP REPORT requests.
 *
 * Report is an extension to WebDAV, and is not part of the WebDAV core.
 * See http://tools.ietf.org/html/rfc3253#page-25
 *
 * Params:
 */
function HandleReport() {
}
pronto.inheritsCommand(HandleReport);
module.exports = HandleReport;

HandleReport.prototype.execute = function (cxt, params) {
  // Not implemented yet.
  this.reroute('@501');
}
