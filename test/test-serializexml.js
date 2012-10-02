var pronto = require('pronto');
var fs = require('fs');
var webdav = require('../lib');
var assert = require('assert');

var xmlfile = 'test/test-parsexml.xml';
var register = new pronto.Registry();

register
  .route('test')
    .does(pronto.commands.Closure, 'file')
      .using('fn', function(cxt, params, cmd) {
        cmd.done(fs.createReadStream(xmlfile));
      })
    .does(webdav.xml.ParseXML, 'xml')
      .using('encoding', 'utf8')
      .using('input').from('cxt:file')
    .does(webdav.xml.SerializeXML, 'out')
      .using('xml').from('cxt:xml')
    .does(pronto.commands.Closure, 'file')
      .using('fn', function(cxt, params, cmd) {
        var out = cxt.get('out');

        console.log(out);

        assert.equal('string', typeof out);
        assert.ok(out.length > 100);

      })

;

var router = new pronto.Router(register);
router.handleRequest('test');
