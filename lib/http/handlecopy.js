var pronto = require('pronto');
var HTTPUtil = require('./util');
var URL = require('url');
/**
 * Handle HTTP COPYrequests.
 *
 * COPY is defined in RFC 4918, 9.8.
 *
 * Params:
 * - resourceBridge: The resource bridge (REQUIRED)
 * - destination: A string naming the destination. (REQUIRED)
 * - resource: The resource to be copied. If it is NOT present, a 404
 *   will be issued.(OPTIONAL)
 * - targetResource: The destination resource. (OPTIONAL)
 *
 */
function HandleCopy() {
}
pronto.inheritsCommand(HandleCopy);
module.exports = HandleCopy;

HandleCopy.prototype.execute = function (cxt, params) {
  this.required(params, ['resource', 'resourceBridge', 'destination']);

  var request = this.getDatasource('request');
  var resource = params.resource;
  var destination = params.destination;
  this.bridge = params.resourceBridge;
  var targetResource = params.targetResource;
  var overwite = true;

  this.cxt = cxt;

  if (request.headers.overwrite && request.headers.overwrite.toLowerCase() == 'f') {
    overwrite = false;
  }

  if (!resource) {
    this.reroute('@404', cxt);
    return;
  }

  if (targetResource && !overwrite) {
    // Precondition failed.
    this.reroute('@412', cxt);
    return;
  }

  this.doAction(resource, destination, overwrite);
}

HandleCopy.prototype.doAction = function (resource, destination, overwrite) {
  this.reroute('@403', cxt);
  return;
  this.bridge.copy(resource, destination, overwrite, function (e, multistatus) {
    if (e) {
      if (e.status) {
        cxt.log('Failed Move: %s %s', e.status, e.message, 'warning');
        cmd.reroute('@' + e.status, cxt);
      }
      else {
        cxt.log('Failed Move: %s', e.message, 'warning');
        cmd.reroute('@403', cxt);
      }
      return;
    }

    if (multistatus.length > 0) {
      cxt.add('multistatus', multistatus);
      cmd.done(207)
      return;
    }
    cmd.done(201);
  });
}
