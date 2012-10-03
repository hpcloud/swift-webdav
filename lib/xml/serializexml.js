var pronto = require('pronto');
var XMLSerializer = require('xmldom').XMLSerializer;

function SerializeXML() {
}
pronto.inheritsCommand(SerializeXML);
module.exports = SerializeXML;

SerializeXML.prototype.execute = function (cxt, params) {
  var dom = params.xml;
  var ser = new XMLSerializer();

  // We allow for a silent exit.
  if (!dom) {
    cxt.log('No xml logged', 'debug');
    this.done('');
    return;
  }

  var xml = ser.serializeToString(dom);
  cxt.log(xml, 'debug');

  this.done(xml);
}
