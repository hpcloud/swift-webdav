/**
 * Given a resource bridge, load a resource.
 *
 * Params:
 * - resourceBridge: an instance of a webdav.ResourceBridge (REQUIRED)
 * - name: If given, the name of the resource. If this is not specified,
 *   the request path will be used.
 * - addDatasource: If this is set to `true` then the resource will be
 *   added as a datasource, which makes it usable in `from()` clauses.
 */

var pronto = require('pronto');

function LoadResource() {
}
module.exports = LoadResource;
pronto.inheritsCommand(LoadResource);

LoadResource.prototype.execute = function (cxt, params) {
  this.required(params, ['resourceBridge']);

  var bridge = params.resourceBridge;
  var name = params.name || cxt.getDatasource('request').parsedUrl.pathname;
  var addDatasource= params.addDatasource || false;

  var cmd = this;
  bridge.load(name, function (e, resource) {
    // FIXME: What should be done here?
    if (e) {
      console.log(e);
    }

    // If we should add a datasource, put the resource in as a
    // datasource with the name of the command. This makes
    // `from('resource:stream')` work.
    if (addDatasource) {
      cxt.addDatasource(cmd.name, resource);
    }
    cmd.done(resource);
  });

}
