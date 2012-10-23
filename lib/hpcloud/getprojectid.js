var pronto = require('pronto');

/**
 * Get the tenant ID.
 *
 * If present, this also gets the container name, which it puts into the
 * context as containerName (unless otherwise specified).
 *
 * Params:
 * - path: The path to parse. If none supplied, this will use the
 *   request path. (OPTIONAL)
 * - containerKey: This will also try to parse out the container name,
 *   which it will store in the context as 'containerName' UNLESS you
 *   set this value. In that case, the value of 'containerKey' will be
 *   used as the key in the context. (OPTIONAL)
 *
 * Regarding the 'containerKey' param, uses('containerKey', 'foo') will
 * result in cxt.add('foo', 'someContainerName').
 */
function GetProjectId(){}
pronto.inheritsCommand(GetProjectId);
module.exports = GetProjectId;

GetProjectId.prototype.execute = function (cxt, params) {
  var req = cxt.datasource('request');
  var url = params.path || req.parsedUrl.pathname;
  var cnameLabel = params.containerKey|| 'containerName';

  cxt.log("Looking for Project ID in %s.", url, 'debug');

  var parts = url.split('/');
  if (parts.length < 2) {
    cxt.done();
    return;
  }

  // Check for a Project ID (aka Tenant ID)
  var tenantId = parts[1];
  if (tenantId.match(/^\d+$/)) {

    // Check for a container name.
    if (parts.length > 2) {
      var container = parts[2];
      cxt.log("Found container named %s", container, 'debug');
      cxt.add(cnameLabel, container);
    }

    cxt.log("Looks like a tenant Id: %s", tenantId, 'debug');
    this.done(tenantId);
    return;
  }
  return this.done();
}
