var assert = require('assert');
var IfParser = require('../lib/http/ifparser');

function IfQueue(rule){
  var p = new IfParser(rule);

  var events = [
    'resourceTag', // A resource tag (URI).
    'stateToken', // Lock ID
    'eTag', // ETag
    'not', // Not
    'startList', 'endList'
  ];

  var q = [];

  for (var i = 0; i < events.length; ++i) {
    var eventName = events[i];
    p.on(eventName, (function(eName) {
      return function () {
        q.push({
          event: eName,
          args: Array.prototype.slice.call(arguments)
        });
      };
    })(eventName));
  }

  this.q = q;
  this.p = p;

}

IfQueue.prototype.parse = function (fn) {
  var q = this.q;
  this.p.on('end', function () {
    fn(false, q);
  });
  this.p.on('error', function (e) {
    console.log("Error! %s", e.message);
    fn(e);
  });

  this.p.parse();
}

// ==================================================================
// THE TESTS
// ==================================================================
var test0 = new IfQueue('   ');
test0.parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal(0, queue.length);
});

var test1 = new IfQueue('()');
test1.parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal(2, queue.length);
  assert.equal('startList', queue[0].event);
  assert.equal('endList', queue[1].event);
});


var test2 = new IfQueue('( <urn:uri:I❤U>)');
test2.parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal(queue.length, 3);
  assert.equal('startList', queue[0].event);
  assert.equal('stateToken', queue[1].event);
  assert.equal('urn:uri:I❤U', queue[1].args[0]);
  assert.equal('endList', queue[2].event);
});

// Whitespace is treated as significant inside of etags.
var test3 = new IfQueue('(   ["QBert &^%$"]  )    ');
test3.parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal(queue.length, 3);
  assert.equal('startList', queue[0].event);
  assert.equal('eTag', queue[1].event);
  assert.equal('"QBert &^%$"', queue[1].args[0]);
  assert.equal('endList', queue[2].event);
});

new IfQueue('(<urn> ["etag"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('startList', queue[0].event);
  assert.equal('stateToken', queue[1].event);
  assert.equal('urn', queue[1].args[0]);
  assert.equal('eTag', queue[2].event);
  assert.equal('"etag"', queue[2].args[0]);
  assert.equal('endList', queue[3].event);
});

new IfQueue('(Illegal values)').parse(function (e, queue) {
  assert.ok(e instanceof Error);
});

new IfQueue('(Not <urn:uri:eieio> ["etag"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
    return;
  }
  console.log(queue);
  assert.equal('startList', queue[0].event);
  assert.equal('not', queue[1].event);
  assert.equal('stateToken', queue[2].event);
  assert.equal('eTag', queue[3].event);
  assert.equal('"etag"', queue[3].args[0]);
  assert.equal('endList', queue[4].event);
});

new IfQueue('(Nat <urn:uri:eieio> ["etag"])').parse(function (e, queue) {
  assert.ok(e instanceof Error);
});

new IfQueue('<urn> (["etag"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('resourceTag', queue[0].event);
  assert.equal('urn', queue[0].args[0]);

  assert.equal('startList', queue[1].event);
  assert.equal('eTag', queue[2].event);
  assert.equal('"etag"', queue[2].args[0]);
  assert.equal('endList', queue[3].event);
});

new IfQueue('<urn>(<foo>["etag"])').parse(function (e, queue) {
  if (e) {
    console.log(e);
  }
  console.log(queue);
  assert.equal('resourceTag', queue[0].event);
  assert.equal('urn', queue[0].args[0]);

  assert.equal('startList', queue[1].event);
  assert.equal('stateToken', queue[2].event);
  assert.equal('eTag', queue[3].event);
  assert.equal('endList', queue[4].event);
});

new IfQueue('</ref <urn:uri:eieio> ["etag"])>').parse(function (e, queue) {
  assert.ok(e instanceof Error);
});


new IfQueue('(Not ["etag1"] ["etag2"] <stateTag>)').parse(function (e, queue) {
  if (e) {
    console.log(e);
    return;
  }
  console.log(queue);
  assert.equal('startList', queue[0].event);
  assert.equal('not', queue[1].event);
  assert.equal('eTag', queue[2].event);
  assert.equal('"etag1"', queue[2].args[0]);
  assert.equal('eTag', queue[3].event);
  assert.equal('"etag2"', queue[3].args[0]);
  assert.equal('stateToken', queue[4].event);
  assert.equal('endList', queue[5].event);
});
