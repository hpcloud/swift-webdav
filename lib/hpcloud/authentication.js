var hpcloud = require('hpcloud');

/**
 * Authenticate against IdentityServices.
 *
 * @param {String} endpoint
 *   The identity services endpoint.
 */
function Authentication(endpoint) {
  this.endpoint = endpoint;
}
module.exports = Authentication;

Authentication.prototype.authenticate = function (user, password, projectId, realm) {
  var is = new hpcloud.IdentityServices(this.endpoint);

  is.setTenantId(projectId)
    .authenticateAsUser(user, password, 
}
