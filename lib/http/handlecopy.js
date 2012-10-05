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
  this.required(params, ['resourceBridge', 'destination']);
  var cmd = this;

  var request = cxt.getDatasource('request');
  var resource = params.resource;
  var destination = params.destination;
  this.bridge = params.resourceBridge;
  var targetResource = params.targetResource;
  var overwrite = true;

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
    cxt.log('Destination exists already and overwrite is off.', 'debug');
    this.reroute('@412', cxt);
    return;
  }
  // RFC 4918 9.8.4 says that we need to destroy the target resource if
  // it exists.
  else if (targetResource) {
    this.bridge.delete(targetResource, function (e, status) {
      if (e || status.push && status.length > 0) {
        cmd.reroute('@412', cxt);
        return;
      }
      cxt.log('Removed the old file.' , 'debug');
      cmd.doAction(resource, destination, overwrite);
    });
  }

  // Otherwise, we just copy.
  else {
    this.doAction(resource, destination, overwrite);
  }
}

/**
 * Make it convenient to piggyback MOVE on COPY.
 */
HandleCopy.prototype.doAction = function (resource, destination, overwrite) {
  // this.reroute('@403', this.cxt);
  // return;
  var cmd = this;
  this.bridge.copy(resource, destination, overwrite, function (e, multistatus) {
    if (e) {
      if (e.status) {
        cmd.cxt.log('Failed Move: %s %s', e.status, e.message, 'warning');
        cmd.reroute('@' + e.status, cxt);
      }
      else {
        cmd.cxt.log('Failed Move: %s', e.message, 'warning');
        cmd.reroute('@403', cmd.cxt);
      }
      return;
    }

    if (multistatus && multistatus.length > 0) {
      cmd.cxt.add('multistatus', multistatus);
      cmd.done(207)
      return;
    }
    cmd.done(201);
  });
}
