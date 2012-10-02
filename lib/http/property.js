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
function Property(namespace, name) {
  this.ns = namespace;
  this.name = name;
}
module.exports = Property;

Property.prototype.value = '';

Property.prototype.toXML = function (parentNode, omitValue) {
  var ele = parentNode.ownerDocument.createElementNS(this.ns, this,name);

  if (!omitValue) {
    var txt = parentNode.ownerDocument.createTextNode(this.value || '');
    ele.appendChild(txt);
  }
  parentNode.appendChild(ele);
}
