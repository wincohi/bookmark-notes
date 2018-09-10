var bookmarks,
storedNotes

var initBg = async (isReload = false) => {
  browser.bookmarks.getTree().then((b) => {
    bookmarks = b
    if (isReload) {
      browser.runtime.sendMessage({ type:'bookmarkUpdate', obj:{ storedNotes:storedNotes }}).then((msg) => {
        console.log(msg.response)
      }, (err) => {
        console.error(err)
      })
    }
  }, (err) => {
    console.error(`error reading bookmarks: ${err}`)
  })
  if (!isReload) {
    browser.storage.sync.get().then((s) => {
      storedNotes = s.notes
    }, (err) => {
      console.error(`error getting storage: ${err}`)
    })
  }
},
sendMsg = (reason = '') => {
  initBg(true)
}

initBg()

var eventTgts = [
  browser.bookmarks.onChanged,
  browser.bookmarks.onCreated,
  browser.bookmarks.onMoved,
  browser.bookmarks.onRemoved
]
eventTgts.forEach((tgt, i, arr) => {
  tgt.addListener(() => {
    sendMsg('bookmarkUpdate')
  })
})