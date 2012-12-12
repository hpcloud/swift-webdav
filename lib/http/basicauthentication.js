var pronto = require('pronto');
var HTTPUtil = require('./util');

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
  if (!req.headers.authorization || req.headers.authorization.length == 1) {
    this.handleUnauthorized(cxt, realm);
    return;
  }

  // Get the user.
  var user = HTTPUtil.userFromAuthString(req.headers.authorization);

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
