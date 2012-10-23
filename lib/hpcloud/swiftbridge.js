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
  // For performance reasons, we don't honor depth-infinity listings on
  // the root or on the container listing, as each of these could
  // potentially result in tens of thousands of HTTP requests. However,
  // we can easily accomodate when listing container contents.
  if (collection.isRoot) {
    this.listProjects(fn);
  }
  else if (collection.isTenant) {
    this.listContainers(fn);
  }
  else {
    this.listObjects(collection, shallow, fn);
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

/**
 * Given an internal path, build the full path.
 *
 * For a resource inside of a container (e.g. /foo/bar) this will return
 * the full path (/TENANT/CONTAINER/foo/bar). For a container
 * (/myContainer) this will return a tenant/container URL
 * (/TENANT/myContainer). This last piece is accomplished by
 * introspecting the client's URL.
 */
SwiftBridge.prototype.uriTo = function (path) {
  if (path.indexOf('/') === 0) {
    path = path.substring(1);
  }
  return this.baseURI + path;
}

/**
 * Given a resource name, get the Swift path to the resource.
 *
 * That is, it converts between a full path (/TENANT/CONTAINER/foo/bar)
 * to a path relative to the container (/foo/bar)
 *
 * @param {String} resourceName
 *   The name of a resource.
 * @return {String}
 *   The relative path within a container.
 */
SwiftBridge.prototype.pathTo = function (resourceName) {
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

SwiftBridge.prototype.listObjects= function (collection, shallow, fn) {
  var path = this.pathTo(collection.name());
  var self = this;
  this.loadContainer(path, function (e, container) {
    if (shallow) {
      container.objectsWithPrefix(path, function (e, list) {
        if (e) {
          fn(e);
          e.status = 403;
          return;
        }
        self.unpackObjects(fn);
      });
    }
    else {
      container.objectsByPath(path, function (e, list) {
        if (e) {
          fn(e);
          e.status = 403;
          return;
        }
        self.unpackObjects(fn);
      });
    }
  });
}

SwiftBridge.prototype.unpackObjects = function (list, fn) {
  var contents = [];
  var now = Date.now();
  for (var i = 0; i < list.length; ++i) {
    var item = list[i];
    var res;
    this.cxt.log("Unpacking %j", item, 'debug');
    if (item instanceof hpcloud.ObjectStorage.Subdir) {
      res = this.createCollection(this.uriTo(item.name()));
      res.setLastModified(now);
      res.setCreationDate(now);
    }
    else if (this.isDirectoryMarker(item)) {
      res = this.createCollection(this.uriTo(item.name()));
      res.setLastModified(item.lastModified());
      res.setCreationDate(item.lastModified());
    }
    else {
      res = this.createFile(this.uriTo(item.name()));
      res.setLastModified(item.lastModified());
      res.setCreationDate(item.lastModified());
      res.setEtag('"' + item.etag() + '"');
      res.setContentType(item.contentType());
      try {
        // This might be a bad idea altogether.
        res.setContentEncoding(item.transferEncoding());
      } catch (e) {
        this.cxt.log("Could not get transfer encoding.", "debug");
      }
    }
    contents.push(res);

  }
  fn(false, contents);
}

/**
 * Check whether the item looks like a directory.
 *
 * This is nothing better than a guess, based on suggested best
 * practices from a few sources. There is no standard, though, for what
 * makes a directory marker a marker and not a file.
 *
 * XXX: Should we also check file size? At least hypothetically, a
 * directory marker should not have any contents.
 *
 * @param {ObjectInfo} item
 */
SwiftBridge.prototype.isDirectoryMarker = function (item) {
  var ctype = item.contentType();
  // Match x-application/directory and application/directory
  if (ctype && ctype.indexOf('application/directory') > -1) {
    return true;
  }

  return false;
}

/**
 * Fetch a container.
 *
 * XXX: This should be extended to support caching of containers.
 *
 * @param {String} containerName
 * @param {Function} fn
 *   Called: fn(Error e, Container c)
 */
SwiftBridge.prototype.loadContainer = function (containerName, fn) {
  this.cxt.log("Loading container %s.", containerName, 'debug');
  // XXX: Add local caching here?
  this.store.container(containerName, fn);
}

SwiftBridge.prototype.mkContainer = function (collection, fn) {
}
SwiftBridge.prototype.mkDirectory = function (collection, fn) {
}
