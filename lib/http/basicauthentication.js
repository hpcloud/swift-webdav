var pronto = require('pronto');
var Buffer = require('buffer').Buffer;
/**
 * Perform HTTP Basic authentication.
 *
 * This is an abstract command. The following methods should be
 * overridden:
 *
 * - execute
 * - authenticate
 *
 * This assumes the presence of an 'authentication' datasource.
 *
 * Params:
 * - realm: The Basic auth realm. If not set, defaults to 'WebDAV'.
 *   (OPTIONAL)
 */
function BasicAuthentication(){}
pronto.inheritsCommand(BasicAuthentication);
module.exports = BasicAuthentication;

/**
 * Probably should override this.
 */
BasicAuthentication.prototype.execute = function(cxt, params) {

  var realm = params.realm || 'WebDAV';
  var req = cxt.getDatasource('request');

  this.handleAuthentication(req, realm, cxt);
}

/**
 * Override this.
 *
 * This can (should) call handleUnauthorized() for any authentication
 * failures.
 *
 * @param {Object} user
 *   An object with 'name' and 'pass' set. 'pass' may be empty.
 * @param {String} realm
 *   The realm string.
 * @param {Context} cxt
 *   The context.
 */
BasicAuthentication.prototype.authenticate = function (user, realm, cxt) {
  this.reroute('@401', cxt);
  return;
}

/**
 * Handle the mechanics of authentication.
 *
 * When possible, this will call authenticate() for authentication.
 */
BasicAuthentication.prototype.handleAuthentication = function (req, realm, cxt) {
  if (!req.headers.authorization) {
    this.handleUnauthorized(cxt, realm);
  }

  // Get the user.
  var user = this.parseAuthorization(req.headers.authorization);

  // If no user, 401.
  if (!user) {
    this.handleUnauthorized(cxt, realm);
    return;
  }

  this.authenticate(user, realm, cxt);
}

/**
 * Redirect to a 401-unauthorized page.
 */
BasicAuthentication.prototype.handleUnauthorized = function (cxt, realm, headers) {
  if (!headers) {
    headers = {};
  }

  headers['WWW-Authenticate'] = 'Basic realm="' + realm + '"';

  cxt.add('httpHeaders', headers);
  this.reroute('@401', cxt);
}

/**
 * Parse the Authorization header.
 */
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
