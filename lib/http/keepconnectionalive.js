var pronto = require('pronto');

/**
 * Keep an HTTP connection alive until we respond.
 *
 * This is used to keep the connection alive while we handle very large
 * uploads.
 */
function KeepConnectionAlive(){}
pronto.inheritsCommand(KeepConnectionAlive);
module.exports = KeepConnectionAlive;

KeepConnectionAlive.prototype.execute = function (cxt, params) {
  var sock = cxt.datasource('request').socket;
  // SSL cleartext streams do not have this.
  if (sock.setKeepAlive) {
    sock.setKeepAlive(true);
  }
  sock.setTimeout(0);

  this.done();
}
