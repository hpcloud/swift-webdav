# Using Mac OS-X Finder with the WebDAV Proxy

Mac OS-X has a built-in file navigation tool called Finder. This tool
can be used to browse your local filesystem, but it can also be used to
connect to WebDAV endpoints.

## Installation

It comes with OS-X.

## Configuration

Begin by opening Finder, and then follow these instructions:

1. In finder's menu bar, go to the `Go` menu and select 
   `Connect to Server` (at the bottom). This will bring up a new dialog.
2. In the `Server Address` field, enter a complete URL to the WebDAV
   proxy: `https://localhost:8000/12345678`, where the trailing number
   is (optionally) a tenant ID. Then press `Connect`
3. You will be prompted for a Name and Password. Enter your HP Cloud
   credentials and click `Connect`

In a moment, a new Finder window should pop open with the contents of
your object storage account.

*Note:* The OS-X WebDAV client is very verbose, sending numerous
requests to the remote server before displaying the contents of a
folder. For this reason, initial loading of a WebDAV volume will be
slow. 

## Performance

OS X writes `.DS_Store` files to every directory it reads. This can be
extremely time consuming on WebDAV volumes.

Reports suggest that this behavior can be altered
See [this reference](http://plone.org/documentation/faq/mac-os-x-ds-store-files-webdav)
for details.
