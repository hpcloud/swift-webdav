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
    .does(pronto.commands.Closure, 'file')
      .using('fn', function(cxt, params, cmd) {
        var dom = cxt.get('xml');

        // Basic test
        var nl = dom.getElementsByTagName('D:hi');
        assert.equal(1, nl.length);
        assert.equal('Hello', nl.item(0).textContent);

        // Namespace test
        var nl = dom.getElementsByTagNameNS('http://technosophos.com/schemata/D', 'hi');
        assert.equal(1, nl.length);
        assert.equal('Hello', nl.item(0).textContent);
      })

;

var router = new pronto.Router(register);
router.handleRequest('test');
