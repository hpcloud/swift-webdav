var IfRules = require('../lib/http/ifrules');
var assert = require('assert');

var headers = [
  '(<urn:uid:oldmcdonaldhadafarm>)',
  '(["Im a little etag short and stout"])',
  '([etaginalist] [another])',
  '(Not <urn:uid:strongbadtrogdor>)',
  '(Not <urn:one> <urn:two>)',
  '<resource/> (<urn:teapotteapot>)',
  '<very/long/resource/> (<urn:teapotteapot>)',
  '<resource/> (<urn:teapotteapot> ["etagetag"])',
  '<resource/> (<urn:teapotteapot> ["etagetag"]) <resource2/> (<urn:TEST>)',
  '<resource/> (<urn:teapotteapot> ["etagetag"]) (["another etag"])'
];

for (var i = 0; i < headers.length; ++i) {
  new IfRules(headers[i]).evaluate(null, null, function (e, data) {
    //console.log(e);
    console.log("Evaluate: %s", headers[i]);
    console.log("Becomes: %j", data);
  });
}
