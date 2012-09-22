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
