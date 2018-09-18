const defaultOptions = {
  startCollapsed:1,
  showFavicons:0,
  displayInlineNotes:0,
  compactMode:0,
  launchWithDoubleClick:0
}
var update = async (type = '') => {
  browser.runtime.sendMessage({ type:type }).then((msg) => {
    console[msg.type](msg.response)
  }, (err) => {
    console.error(err)
  })
},
eventTgts = [
  browser.bookmarks.onChanged,
  browser.bookmarks.onCreated,
  browser.bookmarks.onMoved,
  browser.bookmarks.onRemoved
],
options = defaultOptions,
checkDefaults = (opt) => {
  let optNames = Object.getOwnPropertyNames(defaultOptions)
  isSame = 0
  optNames.forEach((item, i, arr) => {
    if (opt[item] === defaultOptions[item]) {
      isSame++
    }
  })
  if (isSame < 4) {
    return false
  } else {
    return true
  }
},
loadOptions = () => {
  browser.storage.local.get().then((res) => {
    if (res.options && !checkDefaults(res.options)) {
      options.startCollapsed = res.options.startCollapsed
      options.showFavicons = res.options.showFavicons
      options.displayInlineNotes = res.options.displayInlineNotes
      options.compactMode = res.options.compactMode
      options.launchWithDoubleClick = res.options.launchWithDoubleClick
    }
  })
}
loadOptions()

eventTgts.forEach((tgt, i, arr) => {
  tgt.addListener(() => {
    update('reload')
  })
})
browser.browserAction.onClicked.addListener((tab) => {
  browser.sidebarAction.open()
})
browser.storage.onChanged.addListener((change, area) => {
  if (area === 'local') {
    loadOptions()
  }
})