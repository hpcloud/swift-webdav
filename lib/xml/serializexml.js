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
    this.done('');
  }

  this.done(ser.serializeToString(dom));
}
