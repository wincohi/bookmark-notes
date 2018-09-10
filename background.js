var bookmarks,
storedNotes

browser.bookmarks.getTree().then((b) => {
  bookmarks = b
}, (err) => {
  console.error(`error reading bookmarks: ${err}`)
})
browser.storage.sync.get().then((s) => {
  storedNotes = s.notes
}, (err) => {
  console.error(`error getting storage: ${err}`)
})