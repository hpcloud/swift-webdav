var pronto = require('pronto');
var Buffer = require('buffer').Buffer;
/**
 * Perform HTTP Basic authentication.
 *
 * This assumes the presence of an 'authentication' datasource.
 *
 * Params:
 * - realm: The Basic auth realm. If not set, defaults to 'WebDAV'.
 *   (OPTIONAL)
 * - authenticationStore: An authentication backend. If none is
 *   provided, this will attempt to get the datasource "authentication".
 *   (OPTIONAL)
 */
function BasicAuthentication(){}
pronto.inheritsCommand(BasicAuthentication);
module.exports = BasicAuthentication;

BasicAuthentication.prototype.execute = function(cxt, params) {

  var realm = params.realm || 'WebDAV';
  var req = cxt.getDatasource('request');
  var authStore = params.authenticationStore || cxt.datasource('authentication');
  var headers = {};

  this.cxt = cxt;

  if (!req.headers.authorization) {
    headers['WWW-Authenticate'] = 'Basic realm="' + realm + '"';

    cxt.add('httpHeaders', headers);
    this.reroute('@401', cxt);
    return;
  }

  var user = this.parseAuthorization(req.headers.authorization);

  var cmd = this;
  authStore.authenticate(user.name, user.pass, function (e, data) {
    if (e) {
      cmd.reroute('@401', cmd.cxt);
      return;
    }
    cmd.done(user.name);
  });
}

BasicAuthentication.prototype.parseAuthorization = function (header) {
  this.cxt.log(header);

  // RFC-2045 Base64
  var authStr = header.match(/^Basic\s([a-zA-Z0-9=\+/]+)$/);
  if (!authStr || !authStr[1]) {
    this.cxt.log("Authentication type is not Basic.", "debug");
    return;
  }

  var buff = new Buffer(authStr[1], 'base64');
  var userPassStr = buff.toString('utf8');

  // VERY unclear about which chars are actually allowed here. So we go
  // with a fairly permissive set: No NULL chars, line feeds, or
  // carriage returns.
  var uMatch = userPassStr.match(/^([^:\r\n\0]+):([^\r\n\0]*)$/);

  if (!uMatch) {
    return;
  }

  var user = {
    name: uMatch[1],
    pass: uMatch[2]
  }
  return user;
}
