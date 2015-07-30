/**
 * (c) Copyright 2015 Hewlett-Packard Development Company, L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
//var StringDecoder = require('string_encoder').StringDecoder;
//var Buffer = require('buffer').Buffer;
var Lock = require('../backend/lock');
var Crypto = require('crypto');
//var Resource = require('../resource');

module.exports = SwiftUtils = {};

/**
 * Encode a value to be sent as a header.
 */
SwiftUtils.encodeHeaderValue = function (value, isJSON) {
  if (isJSON) {
    value = JSON.stringify(value);
  }
  //var buff = new Buffer(value, 'base64')
  //return buff.toString();
  return encodeURI(value);
}

/**
 * Decode a header value.
 */
SwiftUtils.decodeHeaderValue = function (value, isJSON) {
  //var dec = StringDecoder('base64');
  //var decoded = dec.write(value);
  var decoded = decodeURI(value);

  if (isJSON) {
    decoded = JSON.parse(decoded);
  }
  return decoded;
}

// Semi-efficient lock storage format.
SwiftUtils.serializeLock = function (lock) {
  var md5 = Crypto.createHash('md5');
  md5.update(lock.root);
  var hash = md5.digest('hex');
  var list = [
    lock.expires,
    lock.token,
    hash,
    lock.owner
  ];
  return JSON.stringify(list);
}

SwiftUtils.unserializeLock = function (ser, resource) {
  var md5 = Crypto.createHash('md5');
  md5.update(resource.name());
  var hash = md5.digest('hex');

  var list;
  try {
    list = JSON.parse(ser);
  }
  catch (e) {
    //console.log("JSON parse of %s failed.", ser);
    return;
  }

  if (list.length < 4) {
    //console.log("Lock too short.");
    return;
  }

  // This is a hack. The only root that a lock is allowed to have is its
  // own path. But if the hashes don't match, then this is a copied
  // lock.
  if (list[2] != hash) {
    //console.log("Lock hash %s did not match %s.", list[2], hash);
    return;
  }

  // Now we can create a lock.
  var lock = new Lock();
  lock.scope = Lock.EXCLUSIVE;
  lock.timeout = 3600;
  
  lock.expires = parseInt(list[0]);
  lock.token = list[1] || '';
  lock.hash = list[2];
  lock.owner = list[3];
  lock.root = resource.name();
  return lock;
}
