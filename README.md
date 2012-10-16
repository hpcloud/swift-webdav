# Pronto WebDAV

A WebDAV library for Pronto.

## How It Works

Pronto-WebDAV provides two things:

- A complete WebDAV library.
- A WebDAV server.

The library can be used to build your own WebDAV servers, while the
included server shows how you can quickly assemble a WebDAV server,
making you own modifications.

## Installation

~~~
$ cd Pronto-WebDAV
$ npm install
$ node server.js
~~~

## Pronto.js and Pronto-WebDAV

Pronto is an application framework for Node.js. Pronto-WebDAV is built
for that framework. It assumes the basic model, and is designed to make
it trivially easy to modify WebDAV behavior using the Pronto
configuraiton.

## Extending

Pronto-WebDAV is built to be extended.

To add your own backend:

* Create your own ResourceBridge
* Create a server (or copy and modify `server.js`)

The code in `lib/fs` will get you started.

## External Utilities

There are a few command line utilities that can be used for testing
Pronto-WebDAV:

- cadaver: http://www.webdav.org/cadaver/
- nd: http://gohome.org/nd/

## FAQ

### Why don't you use Content-Length?

We prefer chunked transfer where possible, letting the server optimize
the network layer. Node.js handles this for us, provided we don't set
the Content-Length header.

### Why do some Litmus tests fail?

All major Litmus tests pass. However, there are a few regression tests
that do not pass. These are explained below.

Currently, the following Litmus tests fail:

- props: 15 propnullns, 16 propget: These two tests were a regression
test on a bug in Apache mod_dav. Because we respond with the correct
error code (400) to both of these requests, the regression (which
assumes the bug) breaks. THIS IS THE CORRECT BEHAVIOR.
- prop: 17 prophighunicode, 18 propget: This tests Plane 1 unicode,
which JavaScript does not support
(http://en.wikipedia.org/wiki/Mapping_of_Unicode_character_planes). 


