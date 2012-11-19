var ObjectStorage = require('../lib/objectstorage');
var ACL = require('../lib/objectstorage/acl');
var Container = require('../lib/objectstorage/container');
var IdentityService = require('../lib/identityservices');
var config = require('./config');
var ObjectInfo = require('../lib/objectstorage/objectinfo');
var Subdir= require('../lib/objectstorage/subdir');

// For testing.
var assert = require('assert');
var pronto = require('pronto');
var Closure = require('../node_modules/pronto/lib/commands/closure');
var Test = require('./testcommand');

var fs = require('fs');

var reg = new pronto.Registry();
reg.route('tests')
  .does(Closure, 'CreateIdentity').using('fn', function (cxt, params, cmd) {
    console.log('Setup');
    var is = new IdentityService(config.identity.endpoint);
    is
      .setTenantId(config.identity.tenantid)
      .authenticateAsAccount(config.identity.account, config.identity.secret, function (e, i) {
        // Store the identity.
        cxt.add('identity', i);
        console.log('Logged into %s as %s', config.identity.endpoint, config.identity.account);
        cmd.done();
      });
  })

  // Setup object storage.
  .does(Closure, 'SetupObjectStore').using('fn', function (cxt, params, status) {
    // Setup
    var identity = cxt.get('identity');
    var store = ObjectStorage.newFromIdentity(identity, 'region-a.geo-1');
    cxt.add('store', store);

    // Make sure we don't have an old container hanging around.
    store.deleteContainer(config.swift.container, function (e, f) {
      status.done();
    });
  })
  // Create a container.
  .does(Closure, 'CreateContainer').using('fn', function (cxt, params, status) {
    var store = cxt.get('store');
    var metadata = {
      'foo': 1,
      'bar': 'baz'
    }

    var acl = ACL.makePrivate();
    store.createContainer(config.swift.container, acl, metadata, function (e, container) {
      console.log('Setup complete. Beginning tests.');
      status.done();
    });
  })
  .does(Test, 'testContainerFromJSON').using('fn', function (cxt, params, status) {
    var store = cxt.get('store');
    store.containers(function (e, list) {
      assert.ok(list.length > 0);

      var container;
      for (var i = 0; i < list.length; ++i) {
        if (list[i].name() == config.swift.container) {
          container = list[i];
          break;
        }
      }

      assert.ok(container != undefined);

      // The following attributes are set in JSON: name, count, bytes.
      assert.ok(container.count() >= 0);
      assert.ok(container.bytes() >= 0);
      // Duplicate: assert.equal(container.name() == config.swift.container);

      cxt.add('v1', container);
      status.passed();
    });
  })
  .does(Test, 'testContainerFromResponse').using('fn', function (cxt, params, status) {
    var store = cxt.get('store');
    store.container(config.swift.container, function (e, container) {
      cxt.add('v2', container);

      assert.ok(container != undefined);

      // The following attributes are set in JSON: name, count, bytes.
      assert.ok(container.count() >= 0);
      assert.ok(container.bytes() >= 0);
      // Duplicate: assert.equal(container.name() == config.swift.container);

      status.passed();
    });

  })
  .does(Test, 'testMetadata').using('fn', function (cxt, params, status) {
    var v1 = cxt.get('v1');
    var v2 = cxt.get('v2');

    if (v1 == undefined || v2 == undefined) {
      status.failed();
    }

    v1.metadata(function (e, md) {
      assert.equal(1, md.foo);
      assert.equal('baz', md.bar);

      // This will require a server round-trip, so it'll be slower.
      status.passed();
    });
    v2.metadata(function (e, md) {
      assert.equal(1, md.foo);
      assert.equal('baz', md.bar);
    });

  })
  .does(Test, 'testACL').using('fn', function (cxt, params, status) {
    var v1 = cxt.get('v1');
    var v2 = cxt.get('v2');

    // Both of these require a callback, so we nest the tests.
    v1.acl(function (e, acl) {
      assert.ok(acl.isPrivate());
      v2.acl(function (e, acl) {
        assert.ok(acl.isPrivate());
        status.passed();
      });
    });
  })
  .does(Test, 'testSave').using('fn', function (cxt, params, thisTest) {
    var container = cxt.get('v2');
    var name = 'TEST-CONTAINER.js';
    var handle = fs.createReadStream('./test/test-container.js');
    // Test a larger payload.
    //var handle = fs.createReadStream('/var/log/dpkg.log');

    // When the stream is open, do the test.
    handle.on('open', function () {
      var o = new ObjectInfo(name, 'application/javascript');
      o.setMetadata({
        'knock-knock': 'whos there',
        'orange': 'orange who',
        'orange-you-glad': 'I didnt say banana.'
      });
      o.setDisposition('attachment; filename=foo.js');
      //o.setContent(handle);

      container.save(o, handle, function (e) {
        if (e) {
          console.log(e);
          thisTest.failed();
        }
        assert.ok(true);
        thisTest.passed();
      });
    });

    // If the stream errors out, die.
    handle.on('error', function (e) {
      thisTest.failed("Cannot get the file contents.");
      return;
    });

    var o2 = new ObjectInfo('TEST/2.txt', 'text/plain');
    var o3 = new ObjectInfo('TEST/3.txt', 'text/plain');
    container.save(o2, 'This is a test.', function (e) {
      assert.ok(e == false || e == undefined);
    });
    container.save(o3, new Buffer('This is a test.'), function (e) {
      assert.ok(e == false || e == undefined);
    });

  })
  .does(Test, 'testObjectInfo').using('fn', function (cxt, params, thisTest) {
    var container = cxt.get('v2');
    container.objectInfo('TEST-CONTAINER.js', function (e, info) {
      if(e) {
        thisTest.failed(e);
      }
      assert.equal('application/javascript', info.contentType());
      assert.equal('TEST-CONTAINER.js', info.name());
      assert.ok(info.contentLength() > 0);
      assert.ok(info.eTag().length > 0);
      assert.ok(info.lastModified().length > 0);
      var md = info.metadata();
      assert.equal('orange who', md.orange);
      thisTest.passed();
    });
  })
  .does(Test, 'testObjects').using('fn', function (cxt, params, thisTest) {
    var container = cxt.get('v1');
    container.objects(function (e, list) {
      assert.ok(list.length > 0);
      var info;
      for (var i = 0; i < list.length; ++i) {
        if (list[i].name() == 'TEST-CONTAINER.js') {
          info = list[i];
        }
      }
      assert.ok(info instanceof ObjectInfo);
      assert.equal('application/javascript', info.contentType());
      assert.equal('TEST-CONTAINER.js', info.name());
      assert.ok(info.contentLength() > 0);
      assert.ok(info.eTag().length > 0);
      assert.ok(info.lastModified().length > 0);

      // Shouldn't be able to get MD on this object.
      var gotAnError = false;
      try {
        info.matadata();
      }
      catch (e) {
        gotAnError = true;
      }
      assert.ok(gotAnError);

      // But if I call setMetadata, this should be okay.
      info.setMetadata({});
      assert.ok(typeof info.metadata() == 'object');

      thisTest.passed();
    });
  })
  .does(Test, 'testRemoteObject').using('fn', function (cxt, params, thisTest) {
    var container = cxt.get('v1');

    container.remoteObject('TEST-CONTAINER.js', function (e, obj) {
      if (e) {
        thisTest.failed(e);
        return;
      }
      var info = obj.info();
      assert.ok(info instanceof ObjectInfo);
      assert.equal('application/javascript', info.contentType());
      assert.equal('TEST-CONTAINER.js', info.name());
      assert.ok(info.contentLength() > 0);
      assert.ok(info.eTag().length > 0);
      assert.ok(info.lastModified().length > 0);

      var md = info.metadata();
      assert.equal('orange who', md.orange);

      var md5 = crypto.createHash('md5');
      obj.on('data', function (chunk) {
        md5.update(chunk);
      });
      obj.on('end', function () {
        assert.equal(info.eTag(), md5.digest('hex'));

        thisTest.passed();
      });


    });
  })
  .does(Test, 'testUpdateObjectMetadata').using('fn', function (cxt, params, thisTest) {
    var container = cxt.get('v2');
    container.objectInfo('TEST-CONTAINER.js', function (e, info) {
      var md = info.metadata();
      // Change one:
      md['knock-knock'] = 'whodat';
      // Add one
      md['test-update'] = 'http://httpcats.herokuapp.com/';

      info.setMetadata(md);
      container.updateObjectMetadata(info, function (e) {
        if (e) {
          thisTest.failed();
        }
        else {
          container.objectInfo('TEST-CONTAINER.js', function (e, info) {
            var metadata = info.metadata();
            assert.equal('whodat', metadata['knock-knock']);
            assert.equal('http://httpcats.herokuapp.com/', metadata['test-update']);
            thisTest.passed();
          });
        }
      });
    });

  })
  .does(Test, 'testCopy').using('fn', function (cxt, params, thisTest) {
    var container = cxt.get('v2');
    container.objectInfo('TEST-CONTAINER.js', function (e, info) {
      // Verify that we can change the content type.
      info.setContentType('text/plain');
      container.copy(info, 'TEST/4.txt', function (e) {
        if (e) {
          thisTest.failed('Could not copy');
          return;
        }
        container.objectInfo('TEST/4.txt', function (e, info) {
          assert.equal('TEST/4.txt', info.name());
          assert.equal('text/plain', info.contentType());
          assert.equal('orange who', info.metadata().orange);
          thisTest.passed();
        });
      });
    });
  })
  .does(Test, 'testObjectsWithPrefix').using('fn', function (cxt, params, thisTest) {
    var c = cxt.get('v1');
    c.objectsWithPrefix('TEST-', function  (e, list) {
      assert.equal(1, list.length);
      c.objectsWithPrefix('', '/', function  (e, list) {
        assert.ok(list.length >= 2);
        var dir;
        for (var i = 0; i < list.length; ++i) {
          if (list[i] instanceof Subdir) {
            dir = list[i];
            break;
          }
        }
        assert.ok(dir != undefined);
        assert.equal('TEST/', dir.name());
        assert.equal('/', dir.delimiter());
        thisTest.passed();
      })
    });
  })
  .does(Test, 'testObjectsByPath').using('fn', function (cxt, params, thisTest) {
    var c = cxt.get('v1');
    c.objectsByPath('TEST', function  (e, list) {
      assert.ok(list.length >= 2);
      c.objectsByPath('', '/', function (e, list) {
        // Nothing starts with TEST:
        for (var i = 0; i < list.length; ++i) {
          assert.ok(list[i].name().substring('TEST/') != 0);
        }
        thisTest.passed();
      });

    });
  })
  .does(Test, 'testDeleteObject').using('fn', function (cxt, params, thisTest) {
    Transport.debug = true;
    var container = cxt.get('v1');
    container.delete('TEST-CONTAINER.js', function (e, success){
      if (e) {
        thisTest.failed();
        return;
      }
      if (!success) {
        thisTest.failed('Could not delete');
        return;
      }
      thisTest.passed();
    });

    // Clean up other files.
    container.delete('TEST/2.txt', function (e) {});
    container.delete('TEST/3.txt', function (e) {});
    container.delete('TEST/4.txt', function (e) {});
  })


  .does(Closure, 'DeleteContainer').using('fn', function (cxt, params, status) {
    console.log('Teardown complete.');
    var store = cxt.get('store');
    store.deleteContainer(config.swift.container, function (e, f) {
      if (e) {throw e};
      assert.ok(f);

      status.done();
    });
  })


var router = new pronto.Router(reg);
router.handleRequest('tests');
