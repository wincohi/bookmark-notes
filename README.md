**Bookmark Notes** is a WebExtension that brings back (to some degree) the pre-v62 ability to add descriptions, sometimes called annotations, to bookmark entries. Notes are synced across Firefox browsers and can be imported from a `bookmarks.html` file from any current version of Firefox.

This extension was built in a day.

~~Download & install from AMO or use the latest release~~

- - - - -

This is a **pre-release** branch for the development of version `1.2.1`.

Roadmap for this release, in order of priority:

- [x] Generate bookmarks tree element in the background (#25)
- [ ] Add a status and error log when importing items (#22)
- [ ] Misc: #23, #30, #40

Known issues:

- Changing options requires re-opening the sidebar for them to take effect
- Updating notes doesn't mark or un-mark bookmarks
- ~~Adding and~~ updating bookmarks doesn't update the sidebar appropriately