var util = require('util');
var HTTPUtil = require('./util');
var URL = require('url');
var HandleCopy = require('./handlecopy');
/**
 * Handle HTTP MOVE.
 *
 * MOVEis defined in RFC 4918, 9.9.
 *
 * Params:
 * -resource: The resource to be copied. (REQUIRED)
 *
 */
function HandleMove() {
}
util.inherits(HandleMove, HandleCopy);
module.exports = HandleMove;

HandleMove.prototype.execute = function (cxt, params) {
  HandleCopy.prototype.execute.call(this, cxt, params);
}
HandleMove.prototype.doAction = function (resource, destination, overwrite) {
  var cmd = this;
  this.bridge.move(resource, destination, overwrite, function (e, multistatus) {
    if (e) {
      if (e.status) {
        cmd.cxt.log('Failed Move: %s %s', e.status, e.message, 'warning');
        cmd.reroute('@' + e.status, cmd.cxt);
      }
      else {
        cmd.cxt.log('Failed Move: %s', e.message, 'warning');
        cmd.reroute('@403', cmd.cxt);
      }
      return;
    }

    if (multistatus.length > 0) {
      cmd.cxt.log('MULTISTATUS: %j', multistatus, 'info');
      cmd.cxt.add('multistatus', cmd.toMultistatus(multistatus));
      cmd.done(207)
      return;
    }
    cmd.done(cmd.retval);

  });
}
