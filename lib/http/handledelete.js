var pronto = require('pronto');

/**
 * Delete a Resource.
 *
 * Params:
 * - resourceBridge: the bridge. (REQUIRED)
 * - resource: the resource to delete (OPTIONAL). If none is
 *   given, a 404 will be returned. Otherwise, this tries to
 *   return a 204 or a 207 (on errors for deletion of a collection)
 */
function HandleDelete () {
}
pronto.inheritsCommand(HandleDelete);
module.exports = HandleDelete;

HandleDelete.prototype.execute = function (cxt, params) {
  this.required(params, ['resourceBridge']);

  var bridge = params.resourceBridge;
  var resource = params.resource;

  if (!resource) {
    //this.done(404);
    this.reroute('@404', cxt);
    done;
  }

  var cmd =  this;
  bridge.delete(resource, function (e, status) {
    if (status === true) {
      cxt.add('httpHeaders', {
        'Content-Length': 0 // Not required by HTTP spec.
      });
      cmd.done(204);
    }
    else if (e) {
      cmd.reroute('@500', cxt);
    }
    else if (status.length > 0) {
      cmd.sendMultiStatus(status);
    }
  });

}

HandleDelete.prototype.sendMultiStatus = function (status) {
  this.error("Not implemented.");
}
