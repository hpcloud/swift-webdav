module.exports = Identity;

/**
 * Identity object.
 */
function Identity(jsonObject) {
  this.data = jsonObject;
}

/**
 * Get the token.
 * 
 * @return {String} The token.
 */
Identity.prototype.token = function () {
  return this.data.access.token.id;
}

/**
 * Check if the current token has expired.
 * 
 * @return {Boolean} TRUE if the token as expired and FALSE if still valid.
 */
Identity.prototype.isExpired = function () {
  var expires = this.data.access.token.expires;
  var expTime = Date.parse(expires);
  return expTime < Date.now();
}

/**
 * Get the current tenantId.
 * 
 * @return {String} The tenantId.
 */
Identity.prototype.tenantId = function () {
  return this.data.access.token.tenant.id;
}

/**
 * Get the current tenantName.
 * 
 * @return {String} The tenantName.
 */
Identity.prototype.tenantName = function () {
  return this.data.access.token.tenant.name;
}

/**
 * The details around a token including expires, tenant, etc.
 * 
 * @return {Object} An object with the details about the token.
 */
Identity.prototype.tokenDetails = function () {
  return this.data.access.token;
}

/**
 * The catalog of activated services.
 *
 * @return {Object} The service catalog.
 */
Identity.prototype.serviceCatalog = function () {
  return this.data.access.serviceCatalog;
}

/**
 * Given a service name, get the service endpoint.
 *
 * This also takes a zone name.
 *
 * @param {string} name
 *   The name of the service, e.g. 'objectStorage' or 'ext:cdn'.
 * @param {string} region
 *   The name of the availability zone, e.g. 'az-1.region-a.geo-1'
 * @return {object}
 *   The service record.
 */
Identity.prototype.serviceByName = function (name, region) {

  var catalog = this.serviceCatalog();

  var entry;
  for (var i = 0; i < catalog.length; ++i) {
    if (catalog[i].type == name) {
      entry = catalog[i];
    }
  }

  if (!entry) {
    throw new Error('No such service: ' + name);
  }

  if (region) {

    for (var i = 0; i < entry.endpoints.length; ++i) {
      if (entry.endpoints[i].region == region) {
        return entry.endpoints[i];
      }
    }

    if (!entry) {
      throw new Error('No service found in region ' + region);
    }
  }

  return entry.endpoints[0];
}

/**
 * Get the user object.
 * 
 * @return {Object} The user object.
 */
Identity.prototype.user = function () {
  return this.data.access.user;
}

Identity.prototype.roles = function () {
  return this.user().roles;

}
