var pronto = require('pronto');
var HTTPUtils = require('./util');

/**
 * Verify HTTP preconditions.
 */
function VerifyPreconditions(){}
pronto.inheritsCommand(VerifyPreconditions);
module.exports = VerifyPreconditions;

VerifyPreconditions.prototype.execute = function (cxt, params) {
  var request = cxt.getDatasource('request');
  var resource = params.resource;

  var status = HTTPUtils.checkPreconditions(request, resource);

  if (status != 200) {
    cxt.log("Preconditions failed for %s: %s", request.url, status, 'debug');
    this.reroute('@' + status, cxt);
    return;
  }

  this.done();
}
