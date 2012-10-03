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
      cxt.log("Load error: " + e.message, 'info');

      if (!e.status) {
        cxt.log('No code was set: ' + e.message, 'warning');
        cmd.reroute('@500');
        return;
      }

      switch (e.status) {
        case 404:
          break;
        case 403:
          cmd.reroute('@403');
          return;
        case 500:
        default:
          cxt.log('A low level i/o error occured: ' + e.message, 'warning');
          cmd.reroute('@500');
          return;
      }
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
