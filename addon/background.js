var bookmarks

var initBg = async (isReload = false) => {
  browser.bookmarks.getTree().then((b) => {
    bookmarks = b
    if (isReload) {
      // if called from an event, send an update message to any open panels
      browser.runtime.sendMessage({ type:'bookmarkUpdate' }).then((msg) => {
        console.log(msg.response)
      }, (err) => {
        console.error(err)
      })
    }
  }, (err) => {
    console.error(`error reading bookmarks: ${err}`)
  })
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