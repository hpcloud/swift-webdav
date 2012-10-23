var util = require('util');
var hpcloud = require('hpcloud-js');
var ResourceBridge = require('../resourcebridge');
/**
 * A resource bridge for Swift.
 */
function SwiftBridge(identity, endpoint, baseURI, region, container){
  this.identity = identity;
  this.region = region;
  this.baseURI = baseURI;
  this.containerName = container;
  this.endpoint = endpoint;

  if (identity.tenantId() && region) {
    this.store = hpcloud.ObjectStorage.newFromIdentity(identity, region);
    //console.log(this.store);
  }
}
util.inherits(SwiftBridge, ResourceBridge);
module.exports = SwiftBridge;

SwiftBridge.prototype.setContext = function (cxt) {
  this.cxt = cxt;
}

SwiftBridge.prototype.load = function (name, fn){
  if (!this.identity.tenantId()) {
    // Document root.
    var root = this.createCollection('/');
    root.setLastModified(Date.now());
    root.setCreationDate(Date.now());
    root.isRoot = true;
    fn(false, root);
    return;
  }
  else if (!this.containerName) {
    // Tenant root.
    var project = this.createCollection('/' + this.identity.tenantId() + '/');
    project.setLastModified(Date.now());
    project.setCreationDate(Date.now());
    project.isTenant = true;
    fn(false, project);
    return;
  }
  else {
    // We're somewhere inside of a container.

  }
}

SwiftBridge.prototype.listContents = function (collection, shallow, fn){
  if (collection.isRoot) {
    this.listProjects(fn);
  }
  else if (collection.isTenant) {
    this.listContainers(fn);
  }
  else {
    this.listObjects(fn);
  }
}


SwiftBridge.prototype.mkcol = function (collection, fn){
  if (collection.isRoot) {
    var e = new Error('Cannot create containers outside of project.');
    e.status = 403;
    fn(e);
  }
  else if (collection.isTenant) {
    this.mkContainer(collection, fn);
  }
  else {
    this.mkDirectory(collection, fn);
  }
}
SwiftBridge.prototype.save = function (resource, stream, fn){
}
SwiftBridge.prototype.deleteCollection = function (resource, fn){
}
SwiftBridge.prototype.deleteFile = function (file, fn){
}
SwiftBridge.prototype.copy = function (src, dest, overwrite, fn){
}
SwiftBridge.prototype.move = function (src, dest, overwrite, fn){
}
SwiftBridge.prototype.saveProperties = function (resource, fn){
}
SwiftBridge.prototype.loadProperties = function (resource, fn){
}

// ==================================================================
// INTERNAL
// ==================================================================

/**
 * List all Tenants as if they were collections.
 */
SwiftBridge.prototype.listProjects = function (fn) {
  var is = new hpcloud.IdentityServices(this.endpoint);
  var self = this;
  is.tenants(this.identity, function (e, projects) {
    if (e) {
      fn(e);
      return;
    }
    var col = [];
    for (var i = 0; i < projects.length; ++i) {
      var proj = projects[i];
      if (!proj.enabled) {
        self.cxt.log("Project %s is marked disabled.", proj.id, 'debug');
        continue;
      }
      var res = self.createCollection('/' + proj.id + '/');
      res.setLastModified(Date.parse(proj.updated));
      res.setCreationDate(Date.parse(proj.created));

      // TODO: Can we set a display name property on this?

      col.push(res);
    }
    fn(false, col);
  });
}

SwiftBridge.prototype.uriTo = function (path) {
  if (path.indexOf('/') === 0) {
    path = path.substring(1);
  }
  return this.baseURI + path;
}

SwiftBridge.prototype.listContainers = function (fn) {
  var self = this;
  this.store.containers(function (e, list) {
    if (e) {
      self.cxt.log("ObjectStorage error on listing containers: %s", e.message, 'debug');
      e.status = 403;
      fn(e);
      return;
    }
    var cols = [];
    var now = Date.now();
    for (var i = 0; i < list.length; ++i) {
      var container = list[i];
      var res = self.createCollection(self.uriTo(container.name()));
      res.setLastModified(now);
      res.setCreationDate(now);

      cols.push(res);
    }
    fn(false, cols);
  });
}

SwiftBridge.prototype.listObjects= function (fn) {
}

SwiftBridge.prototype.mkContainer = function (collection, fn) {
}
SwiftBridge.prototype.mkDirectory = function (collection, fn) {
}
