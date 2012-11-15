# HPCloud WebDAV

A WebDAV library for connecting to HP Cloud services.

This library provides a general WebDAV implementation along with support
for connecting to HP Cloud.

## How It Works

HPCloud-WebDAV provides three things:

- A complete WebDAV library.
- A WebDAV server.
- An OpenStack Swift backend (and a file system backend for testing)

The library is built to make it easy to add a custom backend.

## Installation

Short version:

~~~
$ cd HPCloud-WebDAV
$ npm install
$ cp example.settings.json settings.json
$ edit settings.json
$ node server.js
~~~

Detailed version:

1. Clone the HPCloud-JS repository from GitHub Enterprise:
   `git clone https://git.hpcloud.net/butchema/HPCloud-JS`
2. Clone the HPCloud-WebDAV repository from GitHub Enterprise:
   `git clone https://git.hpcloud.net/butchema/HPCloud-WebDAV`
3. Install Node.JS. On Ubuntu Linux, you can install with:
   `sudo apt-get install nodejs`
4. Install NPM. On Ubuntu Linux, you can install with:
   `sudo apt-get install npm`
5. Install Memcached. On Ubuntu Linux you can install that with:
   `sudo apt-get install memcached` (Make sure memcached starts.)
6. At a commandline, change directories into the HPCloud-WebDAV
   directory: `cd HPCloud-WebDAV`
7. Using NPM, install HPCloud-JS as a node module:
   `npm install -f path/to/HPCloud-JS`
8. Now run `npm install`. This will install additional dependencies,
   including Pronto.js, a memcached client, and several supporting
   libraries.
9. Create a settings file. The easiest way to do this is:
   `cp example.settings.json settings.json && edit settings.json`
10. Start the WebDAV server: `node server.js`.

You will now have a sing WebDAV server. By default, it is listening on
`localhost:8000`, though you can change that in the settings.

You may now use any supported WebDAV client to connect to the service.
(see [doc/](doc/) for examples.)

## Pronto.js and HPCloud-WebDAV

Pronto is an application framework for Node.js. HPCloud-WebDAV is built
for that framework. It assumes the basic model, and is designed to make
it trivially easy to modify WebDAV behavior using the Pronto
configuration.

Start with the `server.js` file.

## Extending

HPCloud-WebDAV is built to be extended.

To add your own backend:

* Create your own ResourceBridge
* Create a server (or copy and modify `server.js`)

The code in `lib/fs` will get you started.

## External Utilities

There are a few command line utilities that can be used for testing
HPCloud-WebDAV:

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


