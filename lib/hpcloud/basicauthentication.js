var util = require('util');
var BasicBasicAuth = require('../http/basicauthentication');
var hpcloud = require('hpcloud-js');

/**
 * Basic authentication against IdentityServices.
 *
 * Params:
 * - endpoint: URL to the IdentityServices endpoint. (REQUIRED)
 * - projectId: The project (tenant) ID. (OPTIONAL)
 * - realm: The realm name. (OPTIONAL)
 */
function BasicAuthentication(){}
util.inherits(BasicAuthentication, BasicBasicAuth);
module.exports = BasicAuthentication;

// Override
BasicAuthentication.prototype.execute = function(cxt, params) {

  var realm = params.realm || 'WebDAV';
  var req = cxt.getDatasource('request');

  this.tenantId = params.projectId;
  this.endpoint = params.endpoint || '';
  
  cxt.log("Connecting to %s", this.endpoint, 'debug');

  this.is = new hpcloud.IdentityServices(this.endpoint);
  this.is.setTenantId(this.tenantId);

  this.handleAuthentication(req, realm, cxt);
}

// Override
BasicAuthentication.prototype.authenticate = function (user, realm, cxt) {
  var cmd = this;

  this.is.authenticateAsUser(user.name, user.pass, function (e, data) {
    if (e) {
      cxt.log("Failed HPCloud BasicAuth: %s", e.message, 'debug');
      cmd.handleUnauthorized(cxt, realm);
      return;
    }
    cxt.log("Identity: %j", data, 'debug');

    cmd.done(data);
  });
}
