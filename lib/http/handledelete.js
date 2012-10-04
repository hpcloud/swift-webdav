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
    //this.done(404)
    this.reroute('@404', cxt);
    return;
  }

  var cmd =  this;

  // Delete a collection.
  if (resource.isCollection) {
    cxt.log('Deleting collection ' + resource.name(), 'debug');
    bridge.deleteCollection(resource, function (e, multistatus) {
      if (e) {

      }
      else if (multistatus.length > 0) {
        cmd.add('multistatus', cmd.generateMultistatus(multistatus));
        cmd.done(204);
      }
      else {
        // If there are no errors we can return a 204.
        cmd.done(204);
      }
      return;
    });
  }
  // Delete a file.
  else {
    cxt.log('Deleting file ' + resource.name(), 'debug');
    bridge.deleteFile(resource, function (e) {
      // Reroute to an error handler.
      if (e) {
        var status = e.status || 500;
        cxt.add('body', 'No files deleted.');
        cmd.reroute('@' + status, cxt);
        return;
      }

      // No content for a standard delete.
      cmd.done(204);
      return;
    });
  }
}

/**
 * Generate a multistatus for errors.
 *
 * @param {Array} messages
 *   An array of messages with msg.href and msg.status defined for each
 *   element.
 * @return {DOMDocument}
 *   An XML DOM document.
 */
HandleDelete.prototype.generateMultistatus = function (messages) {
  var MultiStatus = require('./multistatus');
  var ms = new MultiStatus();

  for (var i = 0; i < messages.length; ++i) {
    var msg = messages[i];
    ms.addStatus(msg.href, msg.status);
  }

  return ms.toXML();
}
