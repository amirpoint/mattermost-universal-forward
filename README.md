# Universal Forward

Mattermost plugin that forwards a post to any channel or direct message. On a private channel, group message, or direct message, Mattermost's own Forward dialog refuses any other destination. This plugin opens instead and sends the post anyway.

Requires Mattermost 10.5.0 or newer.

## Install

1. Download `com.example.universal-forward.tar.gz` from the [latest release](https://github.com/amirpoint/mattermost-universal-forward/releases).
2. In the System Console, open **Plugin Management** and upload the archive.
3. Enable **Universal Forward**.

Plugin uploads must be allowed on the server, and this build is not signed.

## Use

Open the **⋯** menu on a message and choose **Forward**. Search for a channel or a person, add an optional comment, and send.

- When the recipient can open the original message, the plugin sends a permalink.
- When they cannot (a private channel, a group message, or a direct message they are not in), the plugin copies the message and adds a line saying who posted it and where. Images, videos, and other files are uploaded to that conversation; the copy does not stop at the file name.

Public channels on the same team still use Mattermost's built-in Forward dialog.

## Build

```sh
cd webapp
npm ci
npm test
npm run dist
```

The installable archive is `dist/com.example.universal-forward.tar.gz`.
