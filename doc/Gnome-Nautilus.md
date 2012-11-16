# Using Gnome Nautilus with the WebDAV Proxy

[Nautilus](https://live.gnome.org/Nautilus) is the official Gnome file manager and is the default for a Ubuntu desktop installation. In addition to managing files on a location file system it enables you to mount servers as drives including WebDAV mount points.

## Installing Gnome and Nautilus.

The simpliest method is to install [Ubuntu Desktop](http://www.ubuntu.com/download/desktop) as Nautilus is the default file manager in that enviornment. Other than installing Ubuntu Desktop it will be available in an enviornment where Gnome is available.

## Configuring Nautilus

To configure Nautilus to connect to WebDAV, launch the file browser (Nautilus), then follow the following steps:

1. In the top navigation click _File_ and then _Connect to Server..._.
2. Next to _Type_ choose _WebDav (HTTP)_.
3. In the fields present input the following information:
	- Server: localhost
	- Port: 8000
	- User name: username (your username)
	- Password: password (your password)
	- Folder: /12345678 (your tenant ID, OPTIONAL)
4. Click on Connect

You can now work with the contents of objct storage.

At any time you can delete (unmout) the connection without any impact on the remote WebDAV. This is done by opening a file manager window, then under Network in the sidebar click on the eject button next to the WebDAV mount point.