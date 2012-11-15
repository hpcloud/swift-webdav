# Using KDE (Dolphin) with the WebDAV Proxy

KDE (K Desktop Environment) is a window manager for Linux operating
systems. Like most window managers, it comes with its own file browser.
The current file browser is called Dolphin.

You can use KDE Dolphin to browse local files, but it can also be used
to browse remote file systems, including WebDAV mount points.

## Installing KDE and Dolphin

KDE and Dolphin can be installed on a wide variety of UNIX-like
platforms. Typically, distributions come with KDE already installed and
configured.

For example, Ubuntu users tend to favor the
[Kubuntu](http://www.kubuntu.org/) distribution. Alternately, the KDE
packages may be installed separately using a command like
`apt-get install kde-plasma-desktop`. Consult your OS documentation.

## Configuring Dolphin

To configure Dolphin, first launch the Dolphin file browser, then follow
the steps below:

1. In the left-hand pane, click `Network`
2. In the center (browser) pain, click `Add Network Folder`. This will
   pop open a wizard.
3. On the first screen of the wizard, choose `WebFolder (webdav)` and
   then click `next`.
4. On the second, fill in the fields as described below, and then click
   `Save and Connect`.
  - Name: HPCloud (name this whatever you want)
  - User: username (your username)
  - Server: localhost
  - Port: 8000
  - Folder: 12345678 (your tenant ID, OPTIONAL)
  - Create Icon for this remote folder: CHECKED
  - Use encryption: CHECKED (unless your server is not running SSL)
5. The wizard should exit, and you should have a new file browser
   pointing to this new WebDAV mount point.

You may now work with the contents of your object storage account.

At any point you can delete a mount point from Dolphin without having
any impact on the remote WebDAV. This is done by going to the `Network`
icon on the left-hand pane, and then right-clicking the mount point (in
the center frame) that you want to delete.

By choosing `delete` you will be prompted with a confirmation dialog.
Clicking `Delete` on this dialog will remove the mount point, but leave
your object storage account (the remote data) in place.
