var fs = require('fs');
var Property = require('../http/property');
/**
 * JSON-based property storage.
 *
 * Store WebDAV properties in JSON, and access as a datasource.
 *
 * This is an EXAMPLE. It should NOT be used in production.
 *
 * This stores properties in a JSON file. The JSON file is synced to the
 * filesystem. But there is no locking or anything sophisticated.
 *
 * The APIs for this are only accessed via the FSBridge. The public
 * methods are assumed to be:
 *
 * - set
 * - get
 * - remove
 */
function JSONPropStore(path) {
  this.path = path;
}
module.exports = JSONPropStore;

JSONPropStore.prototype.get = function (path, fn) {
  var self = this;
  if (!this.store) {
    this.open(function(e) {
      if (e) {
        fn(e);
        return;
      }
      self.get(path, fn);
    });
    return;
  }

  fn(false, this.store[path]);
}

JSONPropStore.prototype.remove = function (path, fn) {
  var self = this;
  if (!this.store) {
    this.open(function(e) {
      if (e) {
        fn(e);
        return;
      }
      self.remove(path, fn);
    });
    return;
  }

  delete this.store[path];

  fn(false);
}


JSONPropStore.prototype.set = function (path, obj, fn) {
  var self = this;
  if (!this.store) {
    this.open(function(e) {
      if (e) {
        fn(e);
        return;
      }
      self.set(path, obj, fn);
    });
    return;
  }
  this.store[path] = obj;
  this.flush(fn);
}

JSONPropStore.prototype.reload =
JSONPropStore.prototype.open = function (fn) {
  var self = this;
  fs.readFile(this.path, 'utf8', function (e, contents) {
    if (e) {
        if (e.code == 'ENOENT') {
          self.store = {};
          fn(false);
        }
        else {
          fn(e);
        }
      return
    }
    self.store = {}; // reset.
    var json = JSON.parse(contents);
    for (var path in json) {
      self.store[path] = _reconstitute(json[path]);
    }
    fn(false);
  });
}

JSONPropStore.prototype.close =
JSONPropStore.prototype.flush = function (fn) {
  fs.writeFile(this.path, JSON.stringify(this.store), 'utf8', fn);
}

function _reconstitute(properties) {
  var holding = [];
  for (var i = 0; i < properties.length; ++i) {
    var p = properties[i];
    var prop = new Property(p.ns, p.name, p.value);
    prop.valueType = p.valueType;
    prop.protected = p.protected;
    holding.push(prop);
  }
  return holding;
}
