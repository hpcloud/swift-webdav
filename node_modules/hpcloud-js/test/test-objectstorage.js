/**
 * Test Object Storage.
 *
 * These tests use Pronto to manage the async callbacks.
 *
 * How to read this:
 *
 * - Each line that begins with '.does()' represents the beginning of a
 *   new test.
 * - Each test is actually just a closure that executes a self-contained
 *   step in the test.
 * - As each test is finished, it calls cmd.done() to let Pronto know
 *   that it can move on to the next test.
 * - Each step in the chain of does() commands is executed
 *   asynchronously.
 */

var ObjectStorage = require('../lib/objectstorage');
var ACL = require('../lib/objectstorage/acl');
var Container = require('../lib/objectstorage/container');
var IdentityService = require('../lib/identityservices');
var config = require('./config');

// For testing.
var assert = require('assert');
var pronto = require('pronto');
var Closure = require('../node_modules/pronto/lib/commands/closure');
var Test = require('./testcommand');

var reg = new pronto.Registry();
reg.route('tests')
  .does(Test, 'canary').using('fn', function (c, p, status){console.log('Got here'); status.passed()})

  // Do authentication.
  .does(Test, 'CreateIdentity').using('fn', function (cxt, params, status) {
    var is = new IdentityService(config.identity.endpoint);
    is
      .setTenantId(config.identity.tenantid)
      .authenticateAsAccount(config.identity.account, config.identity.secret, function (e, i) {
        // Store the identity.
        cxt.add('identity', i);
        status.passed();
      });
  })

  // Setup object storage.
  .does(Test, 'SetupObjectStore').using('fn', function (cxt, params, status) {
    // Setup
    var identity = cxt.get('identity');
    var store = ObjectStorage.newFromIdentity(identity, 'region-a.geo-1');
    cxt.add('store', store);

    // Make sure we don't have an old container hanging around.
    store.deleteContainer(config.swift.container, function (e, f) {
      status.passed();
    });
  })
  .does(Test, 'testDecodeContainerMetadata').using('fn', function (cxt, params, status) {
    var test = {
      'x-container-meta-a': 'a',
      'x-container-meta-b': 'b',
      'x-container-meta-some-long-string': 'long value',
      'x-container-meta-c': 'string'
    };

    var md = ObjectStorage.Container.decodeMetadata(test);

    assert.equal('a', md.a);
    assert.equal('long value', md['some-long-string']);
    status.passed();
  })

  // Create a container.
  .does(Test, 'testCreateContainer').using('fn', function (cxt, params, status) {
    var store = cxt.get('store');
    var metadata = {
      'foo': 1,
      'bar': 'baz'
    }

    // Test creation of a container.
    var acl = ACL.makePrivate();
    store.createContainer(config.swift.container, acl, metadata, function (e, container) {
      // assert.fail(e);
      assert.ok(container.isNew);
      assert.equal(config.swift.container, container.name());
      assert.equal(store.endpoint + '/' + encodeURI(config.swift.container), container.url());

      status.passed();
    });
  })

  // Test account info
  .does(Test, 'testAccountInfo').using('fn', function (cxt, params, status) {
    var store = cxt.get('store');
    store.accountInfo(function (e, data) {
      assert.ok(data.objects);
      assert.ok(data.bytes);
      assert.ok(data.containers);

      status.passed();
    });
  })

  .does(Test, 'testHasContainer').using('fn', function (cxt, params, status) {
    var store = cxt.get('store');

    store.hasContainer(config.swift.container, function (yes) {
      assert.ok(yes);
      store.hasContainer('NO_SUCH_CONTAINER', function (yes) {
        assert.ok(yes == false);
        status.passed();
      });
    });

  })

  .does(Test, 'testContainer').using('fn', function (cxt, prams, status) {
    var store = cxt.get('store');

    store.container(config.swift.container, function (e, container) {
      if (e) {
        status.failed('Unexpected exception: ' + e.message);
      }

      assert.ok(typeof container == 'object');
      assert.ok(container instanceof Container);

      status.passed();
    });

  })
  .does(Test, 'testContainers').using('fn', function (cxt, prams, status) {
    var store = cxt.get('store');

    store.containers(function (e, list) {
      if (e) assert.fail(true, "Unexpected error: " + e.message);

      assert.ok(list.length > 0);
      assert.ok(typeof list[0] == 'object');
      assert.ok(list[0] instanceof Container);

      var myContainer;
      for (var i =0; i < list.length; ++i) {
        if (list[i].name() == config.swift.container) {
          myContainer = list[i];
          break;
        }
      }

      assert.ok(myContainer != undefined);

      status.passed();
    });

  })
  .does(Test, 'testContainersWithLimit').using('fn', function (cxt, prams, status) {
    var store = cxt.get('store');

    store.containers(1, function (e, list) {
      if (e) assert.fail(true, "Unexpected error: " + e.message);

      assert.ok(list.length = 1);
      assert.ok(typeof list[0] == 'object');
      assert.ok(list[0] instanceof Container);
      status.passed();
    });

  })
  .does(Test, 'testUpdateContainer').using('fn', function (cxt, prams, status) {
    var store = cxt.get('store');

  })

  // Delete a container.
  .does(Test, 'testDeleteContainer').using('fn', function (cxt, params, status) {
    var store = cxt.get('store');
    store.deleteContainer(config.swift.container, function (e, f) {
      if (e) {throw e};
      assert.ok(f);

      status.passed();
    });

  })
  ;

var router = new pronto.Router(reg);
router.handleRequest('tests');
