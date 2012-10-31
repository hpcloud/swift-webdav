var util = require('util');
var hpcloud = require('hpcloud-js');
var async = require('async');
var ResourceBridge = require('../resourcebridge');
var BufferedReader = require('pronto').streams.BufferedReader
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
  var now = Date.now();
  if (!this.identity.tenantId()) {
    // Document root.
    var root = this._pseudoCollection('/', now);
    root.isRoot = true;
    fn(false, root);
    return;
  }
  else if (!this.containerName) {
    // Tenant root.
    var project = this._pseudoCollection('/' + this.identity.tenantId() + '/', now);
    project.isTenant = true;
    fn(false, project);
    return;
  }
  else {
    var path = this.pathTo(name);
    // We're somewhere inside of a container.
    this.cxt.log("Container: %s, URI: %s, Path: %s", this.containerName, name, this.pathTo(name), 'debug');

    var self = this;
    this.store.container(this.containerName, function (e, container){
      if (e) {
        e.status = 404;
        fn(e);
        return;
      }
      if (path) {
        self.cxt.log("Loading path %s", path, "debug");
        self.loadObject(path, name, container, fn);
      }
      else {
        var col = self._pseudoCollection(name, now);
        col.isCollection = true;
        fn(false, col);
        return;
      }
    });
  }
}

SwiftBridge.prototype.listContents = function (collection, deep, fn){
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
    this.listObjects(collection, deep, fn);
  }
}

SwiftBridge.prototype.mkcol = function (collection, fn){
  var path = this.pathTo(collection.name());
  // Cannot trust that isRoot will always be set. An empty collection
  // object may not have the right flags set.
  if (collection.isRoot || !this.identity.tenantId()) {
    var e = new Error('Cannot create containers outside of project.');
    e.status = 403;
    fn(e);
  }
  else if (collection.isCollection && path.length == 0) {
    this.cxt.log("Creating container.", "debug");
    this.mkContainer(collection, fn);
  }
  else {
    this.cxt.log("Creating directory marker.", "debug");
    this.mkDirectory(collection, fn);
  }
}

SwiftBridge.prototype.save = function (resource, stream, fn){
  var objInfo = this.resourceToObject(resource);

  // Get the parent container.
  // NOTE: e.status  is the code that will get sent to the client, but
  // e.statusCode (returned from HPCloud-JS) is the status code Swift
  // sent. This may differ from what we send to the client.
  this.store.container(this.containerName, function (e, container) {
    if (e) {
      e.status = 409; // Conflict. Assume container does not exist.
      fn(e);
      return;
    }

    // Save the object.
    container.save(objInfo, stream, function (e, data) {
      if (e) {
        e.status = e.statusCode == 0 ? 500 : 403; // Permission denied (412 or 422 caused it)
        fn(e);
        return;
      }
      var h = data.headers;
      var ret = {
        etag: h.etag || null,
        date: Date.parse(h.date),
        created: data.statusCode == 201
      };
      fn(false, ret);
    });
    // The stream is probably paused.
    console.log("calling resume.");
    stream.resume();
  });
}

SwiftBridge.prototype.resourceToObject = function (resource) {
  var name = this.pathTo(resource.name());
  var o = new hpcloud.ObjectStorage.ObjectInfo(name, resource.contentType());

  // XXX: Properties!
  // XXX: Locks!

  o.setLastModified(resource.lastModified());
  o.setTransferEncoding(resource.contentEncoding());
  o.setETag(resource.etag());
  o.setContentLength(resource.length);

  return o;
}

SwiftBridge.prototype.deleteCollection = function (resource, fn){
  var self = this;

  // If collection is a tenantID, return 403.
  if (!this.identity.tenantId() || !this.containerName) {
    var err = new Error("Cannot delete projects or the document root");
    err.status = 403;
    fn(err);
    return;
  }

  var path = this.pathTo(resource.name());
  // If collection is a container, destroy the container.
  if (path.length == 0) {
    this.store.deleteContainer(this.containerName, function (e, wasThere) {
      if (e) {
        e.status = (e.statusCode && e.statusCode == 409) ? 409 : 403;
        fn(e);
      }
      else if (!wasThere) {
        var err = new Error('Collection not found.');
        err.status = 404;
        fn(e);
      }
      else {
        fn(false, resource.name());
      }
    });
    return;
  }
  // If collection is a directory marker, delete contents.
  // The one complexity here is that a non-directory marker can also be
  // "deleted".
  else {
    this.deleteDirectory(resource, path, fn);
    return;
  }
}
/**
 * Helper function for deleting directory markers and subdirs.
 */
SwiftBridge.prototype.deleteDirectory = function (resource, path, fn) {
  var self = this;
  this.store.container(this.containerName, function (e, container) {
    if (e) {
      e.status = 404;
      fn(e);
      return;
    }
    container.objectsWithPrefix(path, function (e, list) {
      if (e) {
        e.status = (e.statusCode && e.statusCode == 404)? 404: 403;
        fn(e);
        return;
      }
      function _iter(info, _cb) {
        self.deleteFile(info, _cb);
      }
      function _done(err) {
        if (err) {
          fn(err);
          return;
        }
        fn(false, []);
      }
      async.forEach(list, _iter, _done);
      //self.cxt.log(list);
      //fn(new Error("Suffered panic attack."));
    });
    /*
    container.delete(path, function (e, wasThere) {
      if (e) {
        e.status = (e.statusCode && e.statusCode == 404)? 404: 403;
        fn(e);
        return;
      }
      else if (!wasThere) {
        var err = new Error('Not found');
        err.status = 404;
        fn(err);
        return;
      }
      else {
        fn(false, resource.name());
        return;
      }
    });
   */
  });
}
SwiftBridge.prototype.deleteFile = function (file, fn){
  var self = this;
  var path = this.pathTo(file.name());
  this.cxt.log("Get container: deleteFile", 'custom');
  this.store.container(this.containerName, function (e, container) {
    if (e) {
      e.status = 404;
      fn(e);
      return;
    }

    self.cxt.log("Delete file: deleteFile", 'custom');
    container.delete(path, function (e, status) {
      if (e) {
        // Real error. 403?
        e.status = 403;
        fn(e, file.name());
      }
      else if (!status) {
        // 404
        var err = new Error('File not found');
        err.status = 404;
        fn(err, file.name());
      }
      else {
        // Success
        fn(false, file.name());
      }
    });

  });
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
 * Load an object, and correct for directory markers.
 *
 * The returned object may be a File or a Collection.
 *
 * @param {String} path
 *   The Swift name of the object.
 * @param {String} name
 *   The WebDAV name of the object.
 * @param {Container} container
 *   A container
 * @param {Function} fn
 *   Called fn(Error e, Resource r);
 */
SwiftBridge.prototype.loadObject = function (path, name, container, fn) {
  var self = this;
  this.cxt.log("Get object: loadObject.", "custom");
  container.remoteObject(path, function (e, obj) {
    if (e) {
      // If this looks like a Subdir, create a fake directory marker.
      // Subdirs can have some wonky side effects -- like the fact that
      // if all their children disappear, so do they. WebDAV provides no
      // way of accounting for this.
      if(path.slice(-1) == '/') {
        self.loadSubdir(path, name, container, fn);
        return;
      }
      // Otherwise we assume it's a missing object.
      self.cxt.log("Error loading object: %s", e.message, "debug");
      e.status = 404;
      fn(e);
      return;
    }

    var item = obj.info();

    var res;
    if (self.isDirectoryMarker(item)) {
      res = self.createCollection(name);
    }
    else {
      res = self.createFile(name);
      res.setReader(new BufferedReader(obj));
      res.setEtag('"' + item.eTag() + '"');
      res.setContentType(item.contentType());
      res.setLength(item.contentLength());
      try {
        // This will be set.
        res.setContentEncoding(item.transferEncoding());
      } catch (e) {
        this.cxt.log("Could not get transfer encoding.", "debug");
      }
    }
    res.setLastModified(item.lastModified());
    res.setCreationDate(item.lastModified());

    fn(false, res);
  });
}

/**
 * Load a subdir marker.
 *
 * Generally speaking, this is a helper function, but you can call it
 * directly if you need a subdir, but not a directory marker.
 *
 * This loads a subdir as a resource ONLY IF the subdir has contents.
 *
 * @param {String} path
 *   The Swift name of the object.
 * @param {String} name
 *   The WebDAV name of the object.
 * @param {Container} container
 *   A container
 * @param {Function} fn
 *   Called fn(Error e, Resource r);
 */
SwiftBridge.prototype.loadSubdir = function (path, name, container, fn) {
  var self = this;
  this.cxt.log("Check if subdir exists: loadSubdir.", "custom");
  container.objectsWithPrefix(path, '/', function (e, list) {
    if (e || list.length == 0) {
      e.status = 404;
      fn(e);
      return;
    }
    else {
      var col = self._pseudoCollection(name, Date.now());

      // This indicates that it's not a directory marker.
      col.isSubdir = true; 

      fn(false, col);
      return;
    }
  });
}

/**
 * List all Tenants as if they were collections.
 */
SwiftBridge.prototype.listProjects = function (fn) {
  var is = new hpcloud.IdentityServices(this.endpoint);
  var self = this;
  this.cxt.log("Get tenants: listProjects.", "custom");
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
SwiftBridge.prototype.pathTo = function (resourceName, baseURI) {
  if (!baseURI) {
    baseURI = this.baseURI;
  }
  this.cxt.log("Adjusting %s relative to %s", resourceName, baseURI, "debug");
  if (resourceName.indexOf(this.baseURI) == 0) {
    var len = baseURI.length;
    return resourceName.substring(len);
  }
  return resourceName;
}

SwiftBridge.prototype.listContainers = function (fn) {
  var self = this;
  this.cxt.log("Get containers: listContainers.", "custom");
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

SwiftBridge.prototype.listObjects = function (collection, deep, fn) {
  var path = this.pathTo(collection.name());
  var self = this;
  // this.loadContainer(collection.name(), function (e, container) {
  this.loadContainer(this.containerName, function (e, container) {
    if (e) {
      fn(e);
      return;
    }
    var delimiter = deep? '' : '/';
    container.objectsWithPrefix(path, delimiter, function (e, list) {
      if (e) {
        fn(e);
        e.status = 403;
        return;
      }
      self.unpackObjects(list, fn);
    });
    /* Unnecessary.
    if (deep) {
      self.cxt.log("Get objectsWithPrefix.", "custom");
      container.objectsWithPrefix(path, function (e, list) {
        if (e) {
          fn(e);
          e.status = 403;
          return;
        }
        self.unpackObjects(list, fn);
      });
    }
    else {
      self.cxt.log("Get objectsByPath.", "custom");
      //container.objectsByPath(path, '/', function (e, list) {
      container.objectsWithPrefix(path, '', function (e, list) {
        if (e) {
          fn(e);
          e.status = 403;
          return;
        }
        self.unpackObjects(list, fn);
      });
    }
   */
  });
}

SwiftBridge.prototype.unpackObjects = function (list, fn) {
  var contents = [];
  var now = Date.now();
  for (var i = 0; i < list.length; ++i) {
    var item = list[i];
    var res;
    // this.cxt.log("Unpacking %j", item, 'debug');
    //if (item instanceof hpcloud.ObjectStorage.Subdir) {
    if (item.delimiter) {
      res = this._pseudoCollection(this.uriTo(item.name()), now);
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
      res.setEtag('"' + item.eTag() + '"');
      res.setContentType(item.contentType());
      res.setLength(item.contentLength());
      try {
        // This might be a bad idea altogether.
        res.setContentEncoding(item.transferEncoding());
      } catch (e) {
        this.cxt.log("Could not get transfer encoding.", "debug");
      }
    }
    contents.push(res);

  }
  //console.log("CONTENTS: %j", contents);
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
  this.cxt.log("Get container: loadContainer.", "custom");
  this.store.container(containerName, fn);
}

SwiftBridge.prototype.mkContainer = function (collection, fn) {
  var self = this;
  var cname = this.containerName; //typeof collection == "string" ? collection : collection.name();
  //cname = this.pathTo(cname);
  this.store.container(cname, function (noContainer, container) {
    if (noContainer) {
      // Try to create a new collection.
      var acl = new hpcloud.ObjectStorage.ACL();
      self.store.createContainer(cname, acl, {}, function (e) {
        if (e) {
          e.status = 403;
        }
        fn(e);
      });
      return;
    }
    else {
      // If the collection does exist, we have an error condition.
      var err = new Error("Collection exists.");
      err.status = 405;
      fn(err);
      return;
    }
  });
}
SwiftBridge.prototype.mkDirectory = function (collection, fn) {
  var self = this;
  var cname = typeof collection == "string" ? collection : collection.name();
  cname = this.pathTo(cname);
  this.store.container(this.containerName, function (noContainer, container) {
    // If there is no container, we refuse to create a subdirectory.
    if (noContainer) {
      noContainer.status = 409;
      fn(noContainer);
      return;
    }

    var marker = new hpcloud.ObjectStorage.ObjectInfo(cname, 'application/directory');

    // We're basically ignoring RFC-4918's requirement that we must
    // check that all parent directories exist before creating a
    // subdirectory (See 9.3.1). That would introduce a HUGE performance
    // penalty for deeply nested structures.
    container.save(marker, '', function (e, r) {
      if (e) {
        e.status = 403;
      }
      fn(e);
      return;
    });
  });

}
SwiftBridge.prototype._pseudoCollection = function (name, time) {
  var col = this.createCollection(name);
  col.setLastModified(time);
  col.setCreationDate(time);

  return col;
}

