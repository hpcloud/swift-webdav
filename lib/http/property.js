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
var DOMParser = require('xmldom').DOMParser;
var xmlutil = require('../xml/xmlutil');
/**
 * A WebDAV property, expressable as XML.
 *
 * The following properties are defined in RFC 4918
 *
 * - creationdate: date-time SHOULD
 * - displayname:  text MAY?
 * - getcontentlanguage: language-tag MAY, must be returned if
 *   Content-Language header is set.
 * - getcontentlength: integer SHOULD, byte count 
 * - getcontenttype: media-type MUST
 * - getetag: etag SHOULD, MUST if an etag can be returned
 * - getlastmodified: date-time SHOULD
 * - lockdiscovery: activelock MAY, MUST if locking enabled
 *   (see 15.8)
 * - resourcetype resource-element MUST
 * - supportedlock: lockentry(s) ???
 *
 * The following properties are defined in RFC 4331:
 * 
 * - quota-used-bytes: integer MUST
 * - quota-available-bytes: integer MUST (actually, MAY, since the only
 *   way to suggest "unlimited" is to omit the property.
 */
function Property(namespace, name, value) {
  this.ns = namespace;
  this.name = name;
  if (value) this.value = value;
}
module.exports = Property;

Property.STRING_VALUE = 0;
Property.XML_VALUE = 1;

Property.prototype.value = '';
Property.prototype.status = 404;
Property.prototype.protected = true;

/**
 * Attribute name/value pairs.
 *
 * If anything is added here, it will be added to the property node when
 * the node is serialized to XML.
 */
Property.prototype.attributes = {};

// If this is set to Property.XML_VALUEthen the value will be parsed
// into XML.
Property.prototype.valueType = 0;

Property.prototype.toXML = function (parentNode, omitValue) {
  //var ele = parentNode.ownerDocument.createElementNS(this.ns, 'D:' + this.name);
  var ele = xmlutil.createNSElement(this.ns, this.name, parentNode.ownerDocument);
  var val = this.value == undefined || this.value == null ? '' : this.value;

  // If the top level element needs any attributes, add them.
  if (this.attributes) {
    for (var aname in this.attributes) {
      ele.setAttribute(aname, this.attributes[aname]); 
    }
  }

  if (!omitValue) {
    // The DOM API does not make Node a public member, so we
    // feature-sniff.
    if (this.valueType == 1) {
      var xmlstr = '<?xml version="1.0"?><root xmlns:D="DAV:">' + val + '</root>';
      var frag = new DOMParser().parseFromString(xmlstr);
      for (var i = 0; i < frag.documentElement.childNodes.length; ++i) {
        ele.appendChild(frag.documentElement.childNodes.item(i));
      }
    }
    else {
      node = parentNode.ownerDocument.createTextNode(val);
      ele.appendChild(node);
    }
  }
  parentNode.appendChild(ele);
}

Property.prototype.clarkName = function () {
  return xmlutil.clarkNS(this.ns, this.name);
}
