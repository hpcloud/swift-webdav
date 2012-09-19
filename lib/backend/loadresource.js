/**
 * Given a resource bridge, load a resource.
 *
 * Params:
 * - resourceBridge: an instance of a webdav.ResourceBridge (REQUIRED)
 * - name: If given, the name of the resource. If this is not specified,
 *   the request path will be used.
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

  var cmd = this;
  bridge.load(name, function (e, resource) {
    // FIXME: What should be done here?
    if (e) {
      console.log(e);
    }
    cmd.done(resource);
  });

}
