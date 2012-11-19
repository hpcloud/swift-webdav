/**
 * Information about an object.
 */
module.exports = ObjectInfo;

/**
 * Build a new ObjectInfo instance.
 *
 * This represents the data about an object. It is used under the
 * following circumstances:
 *
 * - SAVING: When creating a new object, you declare the object as
 *   ObjectInfo. When saving, you will save with an ObjectInfo and a Stream
 *   of data. See Container.save().
 * - LISTING: When calling Container.objects(), a list including ObjectInfo
 *   items will be returned.
 * - FETCHING METADATA: Using Container.objectInfo(), you can get just the
 *   info about an object, without downloading the entire object.
 * - FETCHING OBJECT: When you fetch the entire object, you will also get
 *   the ObjectInfo. See RemoteObject.info().
 * - UPATING METADATA: When updating just the metadata on an object, you
 *   will supply an ObjectInfo object.
 *
 * @param {String} name
 *   The name of the object.
 * @param {String} contentType (Optional)
 *   The type of content, defaults to Application/X-Octet-Stream.
 */
function ObjectInfo(name, contentType) {
  this._name = name;
  this._type = contentType || ObjectInfo.DEFAULT_CONTENT_TYPE;
  this._partial = false;
}

/**
 * The default content type.
 */
ObjectInfo.DEFAULT_CONTENT_TYPE = 'application/x-octet-stream';

/**
 * Create a new ObjectInfo instance from JSON data.
 */
ObjectInfo.newFromJSON = function (obj) {
  var info = new ObjectInfo(obj.name);

  // JSON doesn't have all the fields.
  info._partial = true;

  info.setETag(obj.hash);
  info.setContentType(obj.content_type);
  info.setContentLength(obj.bytes);
  info.setLastModified(obj.last_modified);

  // These can't be gleaned from the JSOM, which
  // is why this is _partial.
  //info.setMetadata();
  // info.setTransferEncoding();
  // info.setDisposition();

  return info;
}

/**
 * Create a new ObjectInfo from an HTTP Client Response.
 */
ObjectInfo.newFromResponse = function (name, response, token, url) {
  var headers = response.headers;
  var metadata = ObjectInfo.decodeMetadata(headers);
  var data = {
    name: name,
    content_type: headers['content-type'],
    bytes: headers['content-length'],
    hash: headers['etag'],
    last_modified: headers['last-modified'],
    content_disposition: headers['content-disposition'],
    transfer_encoding: headers['transfer-encoding'],
    metadata: metadata,
    hasMetadata: true
  };

  var info = new ObjectInfo(name);
  info.setETag(headers['etag']);
  info.setContentType(headers['content-type']);
  info.setContentLength(headers['content-length']);
  info.setTransferEncoding(headers['transfer-encoding']);
  info.setDisposition(headers['content-disposition']);
  info.setMetadata(metadata);
  info.setLastModified(headers['last-modified']);

  return info;
}


/**
 * Fetch the metadata from the headers and return them.
 *
 * This does not decode the value, since we do not know anyting about the
 * value's encoding.
 *
 * @param {Object} headers
 *   The raw headers.
 * @param {Object}
 *   The metadata name/value pairs.
 */
ObjectInfo.decodeMetadata = function (headers) {
  var metadata = {};
  for (var header in headers) {
    var index = header.indexOf('x-object-meta-');
    if (index == 0) {
      var name = decodeURIComponent(header.substring(14));
      var val = headers[header];
      metadata[name] = val;
    }
  }

  return metadata;
}

// ==================================================================
// Mutators
// ==================================================================

/**
 * Set the new name of this object.
 *
 * Note that this only changes the local copy of the object. An object
 * must be saved before the server copy is changed.
 *
 * @param {String} name
 *   The new name.
 */
ObjectInfo.prototype.setName = function (name) {
  this._name = name;
  return this;
}
/**
 * Set the metadata for this object.
 *
 * @param {Object} metadata
 *   Name/value pairs to be added as metadata.
 */
ObjectInfo.prototype.setMetadata = function (metadata) {
  this._metadata = metadata;
  return this;
}
/**
 * Add a name/value pair to the metadata.
 *
 * If this entry exists already, it will be overwritten.
 *
 * @param {String} name
 *   The name.
 * @param {String} value
 *   The value.
 */
ObjectInfo.prototype.addMetadatum = function (name, value) {
  this._metadata[name] = value;
}
/**
 * Remove a key/value pair from the metadata.
 *
 * This will remove a named item if it exists.
 *
 * @param {String} name
 *   The metadatum name.
 */
ObjectInfo.prototype.deleteMetadatum = function (name) {
  delete this._metadata[name];
}
/**
 * Check whether a value exists.
 *
 * NULL is treated as false.
 *
 * @param {String} name
 *   The name to search for.
 */
ObjectInfo.prototype.hasMetadatum = function (name) {
  var k = this._metadata[name];
  return k != undefined && k != null;
}
/**
 * Set the content type (MIME type) of the object.
 *
 * The default type is `application/x=octet-stream'. You may
 * also add encoding information, such as `text/html; charset=iso-8859-13`.
 * In fact, any options HTTP allows, you can add.
 *
 * Content type is neither parsed nor verified before being sent to the remote
 * object storage.
 *
 * @param {String} contentType
 *   The content type.
 */
ObjectInfo.prototype.setContentType = function (contentType) {
  this._type = contentType;
  return this;
}

ObjectInfo.prototype.setETag = function (md5) {
  this._etag = md5;
  return this;
}

ObjectInfo.prototype.setContentLength = function (bytes) {
  this.length = bytes;
  return this;
}

/**
 * Set the transfer encoding.
 *
 * NOTE: This is informational, and will not cause any processing. If you
 * mark an object as gzipped, it is up to you to do the gzipping.
 *
 * This allows you to save, say, a compressed copy of a file and tell
 * Object Storage that the file is of type foo/bar, but is encoded
 * with gzip.
 *
 * Common encoding types:
 * - gzip
 * - zip
 * - compress
 *
 * Since object storage does not attempt to decode objects, you can use
 * any value your system supports.
 *
 * @param {String} encoding
 *   The encoding.
 */
ObjectInfo.prototype.setTransferEncoding = function (encoding) {
  this._encoding = encoding;
  return this;
}
/**
 * Set the content disposition.
 *
 * Commonly, this is used to force a user agent to prompt for download instead of
 * attempting to display.
 *
 * Example: `o->setDisposition('attachment; filename=foo.png')`
 *
 * When a disposition is submitted, it will be returned in the object headers
 * upon GET request.
 *
 * @param {String} disposition
 *   The content disposition.
 */
ObjectInfo.prototype.setDisposition = function (disposition) {
  this._disposition = disposition;
  return this;
}
/**
 * EXPERT: Set additional headers.
 *
 * Set additional HTTP headers for Swift.
 */
ObjectInfo.prototype.setAdditionalHeaders = function (headers) {
  this._headers = headers;
  return this;
}

ObjectInfo.prototype.setLastModified = function (lastmod) {
  this._modified = lastmod;
  return this;
}
/**
 * EXPERT: Remove headers from the additional header field.
 */
ObjectInfo.prototype.removeHeaders = function (list) {
  if (this._headers == undefined) {
    return;
  }
  for (var i; i < list.length; ++i) {
    // XXX: There should be a better way to do this.
    if (this._headers[list[i]]) {
      this._headers[list[i]] = undefined;
    }
  }
}

// ==================================================================
// Accessors
// ==================================================================

ObjectInfo.prototype.name = function () {
  return this._name;
}

ObjectInfo.prototype.eTag = function () {
  return this._etag;
}
ObjectInfo.prototype.contentLength = function () {
  return this.length;
}
/**
 * Get the name of the object.
 *
 * @return {String}
 *   The name of the object.
 */
ObjectInfo.prototype.name = function () {
  return this._name;
}
/**
 * Get the content type of the current object.
 */
ObjectInfo.prototype.contentType = function () {
  return this._type;
}
/**
 * Get the object's trasport encoding.
 * @throws Error
 *   When the results are partial, and error is thrown.
 */
ObjectInfo.prototype.transferEncoding = function () {
  if (this._partial && this._encoding == undefined) {
    throw new Error('Results are partial. Transfer encoding is not available.');
  }
  return this._encoding;
}

ObjectInfo.prototype.lastModified = function () {
  return this._modified;
}
/**
 * Get the object's disposition.
 * @throws Error
 *   When the results are partial, and error is thrown.
 */
ObjectInfo.prototype.disposition = function () {
  if (this._partial && this._disposition== undefined) {
    throw new Error('Results are partial. Disposition is not available.');
  }
  return this._disposition;
}

/**
 * Get metadata.
 *
 * This will only be available if ObjectInfo.is
 *
 * @returns {Object}
 *   An object containting names/values of metadata.
 * @throws Error
 *   When the results are partial, and error is thrown.
 */
ObjectInfo.prototype.metadata = function () {
  if (this._partial && this._metadata == undefined) {
    throw new Error('Results are partial. Metadata is not available.');
  }
  return this._metadata;
}

/**
 * EXPERT: Get any additional headers.
 */
ObjectInfo.prototype.additionalHeaders = function () {
  return this._headers;
}

/**
 * Merge metadata into a supplied headers object.
 *
 * Headers are modified in place.
 *
 * @param {Object} headers
 *   The existing headers.
 */
ObjectInfo.prototype.mergeMetadataHeaders = function (headers) {
  // Make sure there is no case where this is not set when it
  // should be.
  if (!this._metadata) {
    return;
  }

  for (var m in this._metadata) {
    var mheader = 'X-Object-Meta-' + encodeURIComponent(m);
    headers[mheader] = this._metadata[m];
  }

}

/**
 * Merge additional headers into a supplied headers object.
 *
 * Headers are modified in place.
 *
 * @param {Object} headers
 *   The existing headers.
 */
ObjectInfo.prototype.mergeAdditionalHeaders = function (headers) {
  if (!this._headers) {
    return;
  }

  for (var h in this._headers) {
    headers[h] = this._headers[h]
  }
}
