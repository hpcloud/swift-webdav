var IfRules = require('../lib/http/ifrules');
var assert = require('assert');

var headers = {
  '(<urn:uid:oldmcdonaldhadafarm>)': function (data) {
    assert.equal('*', data[0].name);
    assert.equal(data[0].conditions[0].token.length, 1);
  },
  '(["Im a little etag short and stout"])': function (data) {
     assert.equal(data[0].conditions[0].etag.length, 1);
  },
  '([etaginalist] [another])': function (data) {
     assert.equal(2, data[0].conditions[0].etag.length);
  },
  '(Not <urn:uid:strongbadtrogdor>)': function(data) {
    assert.equal(1, data[0].conditions[0].notToken.length);
  },
  '(Not <urn:one> <urn:two>)': function (data) {
    assert.equal('*', data[0].name);
    assert.equal(data[0].conditions[0].token.length, 1);
    assert.equal(data[0].conditions[0].notToken.length, 1);
  },
  '<resource/> (<urn:teapotteapot>)': function (data) {
    assert.equal(data[0].name, 'resource/');
    assert.equal(data[0].conditions[0].token[0], 'urn:teapotteapot');
  },
  '<very/long/resource/> (<urn:teapotteapot>)': function (data) {
    assert.equal(data[0].name, 'very/long/resource/');
    assert.equal(data[0].conditions[0].token[0], 'urn:teapotteapot');
  },
  '<resource/> (<urn:teapotteapot> ["etagetag"])': function (data) {
    assert.equal(data.length, 1);
    assert.equal(data[0].name, 'resource/');
    assert.equal(data[0].conditions[0].etag.length, 1);
    assert.equal(data[0].conditions[0].token.length, 1);

  },
  '<resource/> (<urn:teapotteapot> ["etagetag"]) <resource2/> (<urn:TEST>)': function(data) {
    assert.equal(data.length, 2);
    assert.equal(data[0].name, 'resource/');
    assert.equal(data[1].name, 'resource2/');
  },
  '<resource/> (<urn:teapotteapot> ["etagetag"]) (["another etag"])': function(data) {
    assert.equal(data.length, 1);
    assert.equal(data[0].conditions.length, 2);
    assert.equal(data[0].conditions[0].etag.length, 1);
    assert.equal(data[0].conditions[0].token.length, 1);
    assert.equal(data[0].conditions[1].etag.length, 1);
  },
};

for (var header in headers) {
  new IfRules(header).evaluate(null, null, function (e, results) {
    if (e) {
      console.log(e.message);
      throw e;
      return;
    }
    var test = headers[header];
    /*
    console.log("Evaluate: %s", header);
    console.log("Becomes: %j", results);
    */
    test(results);
  });
}
