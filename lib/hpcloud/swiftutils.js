//var StringDecoder = require('string_encoder').StringDecoder;
//var Buffer = require('buffer').Buffer;

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
