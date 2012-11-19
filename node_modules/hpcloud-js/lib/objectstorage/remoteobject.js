/**
 * Represents a remote object -- an object retrieved from object storage.
 *
 * This is a Readable Stream.
 */
module.exports = RemoteObject;

var util = require('util');
var Stream = require('stream');
var ObjectInfo = require('./objectinfo');

function RemoteObject(name, response) {
  // I don't think this is strictly necessary.
  Stream.call(this);

  // A readable stream.
  this.readable = true;
  this._paused = false;
  this._data = response;

  var emitter = this;
  // The event handlers for stream.
  function ondata(chunk) {
    emitter.emit('data', chunk);
  }
  function onerror(e) {
    emitter.emit('error', e);
  }
  function onend() {
    emitter.emit('end');
  }
  function onclose(e) {
    emitter.emit('close', e);
  }

  // Pipe these events through.
  this._data.on('data', ondata);
  this._data.on('error', onerror);
  this._data.on('end', onend);
  this._data.on('close', onclose);

  this._objectinfo = ObjectInfo.newFromResponse(name, response);
}
util.inherits(RemoteObject, Stream);

/**
 * Get the ObjectInfo about this object.
 */
RemoteObject.prototype.info = function () {
  return this._objectinfo;
}


// ==================================================================
// Stream implementation.
//
// Largely, we pass events down to the HTTP IncomingMessage object.
// ==================================================================

RemoteObject.prototype.destroy = function () {
  this._data.destroy();
}
RemoteObject.prototype.pause = function () {
  this._paused = true;
  this._data.pause();
}
RemoteObject.prototype.resume = function () {
  this._paused = false;
  if (this._data) {
    this._data.resume();
  }
}
RemoteObject.prototype.setEncoding = function (encoding) {
  this._data.setEncoding(encoding);
}
