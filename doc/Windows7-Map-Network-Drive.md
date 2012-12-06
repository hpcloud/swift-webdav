# Using Windows 7 to Map a Network Drive

Windows 7 has built-in support for WebDAV. This describes how to set up
Windows 7. A similar process can be done for Windows Vista.

## Basics

The following process should work on a Windows 7 computer already
configured for WebDAV.

1. In Windows Explorer, right-click on "Network"
2. From the context menu, select "Map a network drive"
3. Type in the URL for the WebDAV mount point and choose a drive letter
4. Clock the finished button (lower right)
5. You will be prompted for a username and password. Enter your HP Cloud
   credentials.

The initial load may take a few minutes. *If you are having severe
performance issues*, read the **Performance** section below.

## Problems Connecting

Some systems are not configured to properly connect to a WebDAV volume.
The following steps may need to be taken:

* Using regedit, set HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WebClient\Parameters\BasicAuthLevel to 2.
* Restart the WebClient service
* Install the Microsoft WebClient patch. http://www.microsoft.com/en-us/download/details.aspx?id=15123

Then you should be able to map a network drive as explained above.

## Performance

The default Windows configuration on recent Windows 7 updates is slow,
but can be easily sped up.

To improve performance:

http://owncloud.org/support/webdav/

## Windows and WebDAV References

Basic summary of configuration of Windows WebDAV: http://owncloud.org/support/webdav/

Known issues by version: http://greenbytes.de/tech/webdav/webdav-redirector-list.html
