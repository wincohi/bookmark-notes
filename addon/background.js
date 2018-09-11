var initBg = async (isFromEvent = false, type = '') => {
  if (isFromEvent) {
    // if called from an event, send an update message to any open panels
    browser.runtime.sendMessage({ type:type }).then((msg) => {
      console.log(msg.response)
    }, (err) => {
      console.error(err)
    })
  }
},
sendMsg = (reason = '') => {
  initBg(true, reason)
},
eventTgts = [
  browser.bookmarks.onChanged,
  browser.bookmarks.onCreated,
  browser.bookmarks.onMoved,
  browser.bookmarks.onRemoved
]

initBg()

eventTgts.forEach((tgt, i, arr) => {
  tgt.addListener(() => {
    sendMsg('bookmarkUpdate')
  })
})
browser.browserAction.onClicked.addListener((tab) => {
  browser.sidebarAction.open()
})