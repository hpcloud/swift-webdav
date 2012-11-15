# Using the Cadaver WebDAV Client

This document explains how to configure Cadaver for using the WebDAV
proxy.

## What Is Cadaver?

Cadaver is a commandline client for working with WebDAV. Because it is
linked against the popular `libneon` library, it is a good testing
platform.

On Ubuntu Linux, you can install Cadaver as follows:

```
$ sudo apt-get install cadaver
```

## Using Cadaver

Using Cadaver to connect to the WebDAV proxy is simple. Begin by
entering the following command, adjusting the URL as necessary:

```
$ cadaver http://localhost:8000/
```

The URL should be the base URL to your proxy server. If you know your
tenant ID, you can connect directly to that (and save yourself one level
of navigation) by using this URL:

```
$ cadaver http://localhost:8000/12345678/
```

Where the number at the end is replaced with your tenant ID.

Upon entering the command, you will be prompted for a username and
password. You may use any user account on HP Cloud. Typically, you will
use the account that you use to log into the management console.
However, subaccounts should work too.

Once you have authenticated, you will be presented with a new DAV shell:

```
dav:/>
```

Inside of this shell you have access to a number of UNIX-like and
FTP-like commands, including `ls`, `cd`, `cat`, and `lls`. You also have
access to a number of special WebDAV commands, like `mkcol` and
`propget`.

To obtain a full listing from inside the cadaver shell, type `help`.
Command help is available, too: `help mkcol`.

When you are done in Cadaver, type `quit` to exit the shell.

## Example Session

```
$ cadaver http://localhost:8000/
Authentication required for HPCloud on server `localhost':
Username: technosophos
Password: ************
dav:/> ls
Listing collection `/': succeeded.
Coll:   18552685588712                         0  Dec 30  0
dav:/> cd 18552685588712/
dav:/18552685588712/> ls
Listing collection `/18552685588712/': succeeded.
Coll:   FirstPost                              0  Dec 30  0
Coll:   Litmus                                 0  Dec 30  0
Coll:   TEST                                   0  Dec 30  0
dav:/18552685588712/> cd TEST
dav:/18552685588712/TEST/> ls
Listing collection `/18552685588712/TEST/': succeeded.
Coll:   v1                                     0  Dec 30  0
Coll:   v2                                     0  Dec 30  0
Coll:   v3                                     0  Dec 30  0
Coll:   v4                                     0  Dec 30  0
Coll:   v5                                     0  Dec 30  0
Coll:   v6                                     0  Dec 30  0
        README.md                           2235  Dec 30  0
        foo.md                              2235  Dec 30  0
        test.md                             2277  Dec 30  0
        test2.md                            2235  Dec 30  0
dav:/18552685588712/TEST/> quit
$
```
