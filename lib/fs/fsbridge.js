/**
 * File system bridge.
 */

var fs = require('fs');
var util = require('util');
var crypto = require('crypto');
var ResourceBridge = require('../resourcebridge');
var Collection = require('../collection');
var File = require('../file');
var BufferedReader = require('pronto').streams.BufferedReader

function FSBridge(documentRoot) {
  this.documentRoot = documentRoot;
}
util.inherits(FSBridge, ResourceBridge);
module.exports = FSBridge;

/**
 * Default mode.
 */
FSBridge.DEFAULT_MODE = 0755;

FSBridge.prototype.load = function (resourceName, fn) {
  var name = this.pathTo(resourceName);
  console.log("Loading %s", name);
  fs.stat(name, function (e, stat) {
    if (e) {
      fn(e);
      return;
    }
    if (stat.isFile()) {
      var file = new File(resourceName);
      file.setLastModified(Date.parse(stat.mtime));
      file.setLength(stat.size);
      file.setReader(new BufferedReader(fs.createReadStream(name)));
      // file.setReader(function (fun) {var stream = fs.createReadStream(name); fun(false, stream);});
      fn(false, file);
    }
    else if (stat.isDirectory()) {
      var col = new Collection(name);
      fn(false, col);
    }
    else {
      fn(new Error("Unsupported file type for " + name));
      return;
    }
  });
}
FSBridge.prototype.save = function (resource, stream, fn) {
  // 1. Create a listener to build the eTag
  var digest = crypto.createHash('md5');
  var md5;

  stream.on('data', function (data) {
    digest.update(data);
  });
  stream.on('end', function () {
    md5 = '"' + digest.digest('hex'); + '"';
    // 5. Return save data.
    fn(false, {etag: md5, date: Date.now()});
  });

  // 2. Open the output file
  var path = this.pathTo(resource.name());
  // Note that we clobber the file.
  var out = fs.createWriteStream(path, {
    flags: 'w',
    mode: FSBridge.DEFAULT_MODE
  });

  // 3. set up the data pipe
  stream.pipe(out);
  // 4. resume the stream
  stream.resume();
}

FSBridge.prototype.delete = function (resource, fn) {
  if (resource.isCollection) {
    fn(new Error("Not implemented."));
    return;
  }

  var path = this.pathTo(resource.name());
  console.log("Deleting %s", path);

  fs.unlink(path, function (e) {
    if (e) {
      fn(e);
      return;
    }
    // true indicates that there is no multi-status.
    fn(false, true);
  });
}

FSBridge.prototype.copy = function (src, dest, fn) {
}

FSBridge.prototype.pathTo = function (name) {
  return this.documentRoot + this.normalize(name);
}

FSBridge.prototype.normalize = function (path) {
  // XXX: Do we normalize the trailing slash off of
  // the name?
  return path;
}
