var update = async (type = '') => {
  browser.runtime.sendMessage({ type:type }).then((msg) => {
    console.log(msg.response)
  }, (err) => {
    console.error(err)
  })
},
sendMsg = (reason = '') => {
  update(reason)
},
eventTgts = [
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
browser.browserAction.onClicked.addListener((tab) => {
  browser.sidebarAction.open()
})