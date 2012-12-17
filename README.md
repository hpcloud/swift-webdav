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
$ sudo apt-get intall nodejs npm memcached libcap2-bin
$ cd HPCloud-WebDAV
$ cp example.settings.json settings.json
$ edit settings.json
$ node server.js
~~~

Detailed version:

1. Clone the HPCloud-JS repository from GitHub Enterprise:
   `git clone https://git.hpcloud.net/butchema/hpcloud-js`
2. Clone the HPCloud-WebDAV repository from GitHub Enterprise:
   `git clone https://git.hpcloud.net/butchema/hpcloud-webdav`
3. Install Node.JS. On Ubuntu Linux, you can install with:
   `sudo apt-get install nodejs`
4. (ONLY FOR DEVS) Install NPM. On Ubuntu Linux, you can install with:
   `sudo apt-get install npm`
5. Install Memcached. On Ubuntu Linux you can install that with:
   `sudo apt-get install memcached` (Make sure memcached starts.)
6. At a commandline, change directories into the HPCloud-WebDAV
   directory: `cd hpcloud-webdav`
7. Create a settings file. The easiest way to do this is:
   `cp example.settings.json settings.json && edit settings.json`
8. Start the WebDAV server: `node server.js`.

You will now have a sing WebDAV server. By default, it is listening on
`localhost:8000`, though you can change that in the settings.

You may now use any supported WebDAV client to connect to the service.
(see [doc/](doc/) for examples.)

### Installation on a Server

To install on a server (running on port 443), the following additional
steps should be done:

* Install `libcap2-bin`: `sudo apt-get install libcap2-bin`
* Allow Node.js to bind to low ports: `sudo setcap cap_net_bind_service=+ep /usr/bin/node`
* Run as a non-privileged user: `node server.js` 

**DO NOT** install `npm` on a production system.
 
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

#### Properties Tests

- props: 15 propnullns, 16 propget: These two tests were a regression
test on a bug in Apache mod_dav. Because we respond with the correct
error code (400) to both of these requests, the regression (which
assumes the bug) breaks. THIS IS THE CORRECT BEHAVIOR.
- prop: 17 prophighunicode, 18 propget: This tests Plane 1 unicode,
which JavaScript does not support
(http://en.wikipedia.org/wiki/Mapping_of_Unicode_character_planes). 

### Locks Tests

- locks 23-30: We do not implement the OPTIONAL shared locks portion of
RFC-4918. So these tests are skipped by Litmus.
- locks 33: Some versions of Litmus fail test 33 because of a bug in
Litmus. It fails to send an If header for a locked resource.
