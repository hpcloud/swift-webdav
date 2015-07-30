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
var IfRules = require('../lib/backend/ifrules');
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
  '<resource/> (<urn:teapotteapot> ["etagetag"]) <resource2/> (<urn:TEST>)': function (data) {
    assert.equal(data.length, 2);
    assert.equal(data[0].name, 'resource/');
    assert.equal(data[1].name, 'resource2/');
  },
  '<resource/> (<urn:teapotteapot> ["etagetag"]) (["another etag"])': function (data) {
    assert.equal(data.length, 1);
    assert.equal(data[0].conditions.length, 2);
    assert.equal(data[0].conditions[0].etag.length, 1);
    assert.equal(data[0].conditions[0].token.length, 1);
    assert.equal(data[0].conditions[1].etag.length, 1);
  },
};

for (var header in headers) {
  new IfRules(header).parseRules(function (e, results) {
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

function MockResource() {
  this.name = function() { return 'resource/'; };
  this.etag = function () { return '"abc"'; };
  this.lock = function() {
    return {
      token: 'locktoken'
    };
  }
}
var mockres = [new MockResource()];

new IfRules('(<locktoken>)').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  assert.equal(token, 'locktoken');
});

new IfRules('<resource/> (<locktoken>)').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  assert.equal(token, 'locktoken');
});

new IfRules('<resource/> (["abc"])').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  //assert.equal(token, 'locktoken');
  assert.ok(!token);
});

new IfRules('(<locktoken> ["abc"])').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  assert.equal(token, 'locktoken');
});

new IfRules('(<nosuchtoken>) (<locktoken>)').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  assert.equal(token, 'locktoken');
});

new IfRules('(Not <nolocktoken>)').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  //assert.equal(token, 'locktoken');
  assert.ok(!token);
});

new IfRules('(<nolocktoken>)').evaluate(mockres, function (e, token) {
  assert.equal(e.status, 412);
});

new IfRules('(<locktoken> ["eieio"])').evaluate(mockres, function (e, token) {
  assert.equal(e.status, 412);
});

new IfRules('<resource/> (<nolocktoken>) <resource2/> (<locktoken>)').evaluate(mockres, function (e, token) {
  assert.equal(e.status, 412);
});

var res2 = new MockResource();
res2.name = function(){return 'resource2/';};
res2.etag = function(){return '"monkey"';};
mockres.push(res2);

new IfRules('(<locktoken>)').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  assert.equal(token, 'locktoken');
});

new IfRules('<resource2/> (<locktoken>)').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  assert.equal(token, 'locktoken');
});

new IfRules('<resource2/> (<locktoken>) <resource/> (["abc"]) (["def"])').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  assert.equal(token, 'locktoken');
});

new IfRules('<resource/> (<nolocktoken>) <resource2/> (<locktoken>)').evaluate(mockres, function (e, token) {
  assert.equal(e.status, 412);
});

new IfRules('<resource/> (<locktoken>) <resource2/> (["monkey"])').evaluate(mockres, function (e, token) {
  if (e) {
    throw e;
  }
  assert.equal(token, 'locktoken');
});
new IfRules('<resource/> (<locktoken>) <resource2/> (["monkey2"])').evaluate(mockres, function (e, token) {
  assert.equal(e.status, 412);
});

// Litmus locks: 18
new IfRules('(<notoken>) (Not <DAV:no-lock>)').evaluate(mockres, function (e, token) {
  //assert.equal(e.status, 412);
  assert.equal(token, 'notoken');
});


// Litmus locks: 22
new IfRules('(<DAV:no-lock>)').evaluate(mockres, function (e, token) {
  assert.equal(e.status, 412);
});

