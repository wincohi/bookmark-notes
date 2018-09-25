const defaultOptions = {
  startCollapsed:1,
  showFavicons:0,
  showFaviconPlaceholder:1,
  displayInlineNotes:0,
  highlightCurrentPage:0,
  compactMode:0,
  launchWithDoubleClick:0
}
var currentOptions = defaultOptions,
optionsElements = {
  startCollapsed:document.querySelector('#start-collapsed'),
  showFavicons:document.querySelector('#show-favicons'),
  showFaviconPlaceholder:document.querySelector('#show-favicon-placeholder'),
  displayInlineNotes:document.querySelector('#inline-notes'),
  highlightCurrentPage:document.querySelector('#highlight-current-page'),
  compactMode:document.querySelector('#compact-mode'),
  launchWithDoubleClick:document.querySelector('#double-click-open'),
  import:{
    options:{
      importNotes:document.querySelector('#import-notes'),
      replaceCurrentNotes:document.querySelector('#replace-current'),
      importFavicons:document.querySelector('#import-favicons'),
    },
    element:document.querySelector('#import-file-select'),
    submit:document.querySelector('#import')
  }
},
currentItems = {
  notes:{},
  favicons:{}
},
importItems = {
  notes:{},
  favicons:{}
},
file,
invalidSchemes = /^(about|data|javascript|chrome|(jar:)?file):/i,
doImport = async (opts) => {
  if (opts.importNotes) {
    let importNotes = Object.getOwnPropertyNames(importItems.notes)
    importNotes.forEach((item, i, arr) => {
      if ((currentItems.notes[item] && opts.replaceCurrentNotes) || !currentItems.notes[item]) {
        currentItems.notes[item] = importItems.notes[item]
      }
    })
    browser.storage.sync.set({ notes:currentItems.notes })
  }
  if (opts.importFavicons) {
    let importFavicons = Object.getOwnPropertyNames(importItems.favicons)
    importFavicons.forEach((item, i, arr) => {
      currentItems.favicons[item] = importItems.favicons[item]
    })
    browser.storage.local.set({favicons:currentItems.favicons})
  }
  sendMsg({type:'reload'}).then((msg) => {
    console[msg.type](msg.response)
  })
},
updateOptions = async (ev) => {
  currentOptions[ev.currentTarget.getAttribute('name')] = Number(ev.currentTarget.checked)
  if (event.currentTarget.id === 'highlight-current-page')
    await browser.permissions.request({ permissions:['tabs'] })
  checkLocal.then((res) => {
    browser.storage.local.set({options:currentOptions})
  })
},
checkLocal = browser.storage.local.get(),
checkSync = browser.storage.sync.get(),
sendMsg = async (msg) => browser.runtime.sendMessage(msg),
addConditionListener = async (eventEl, tgt) => {
  let doCheck = async (el) => {
    if (el.checked && tgt.disabled) {
      tgt.disabled = false
    } else if (!el.checked && !tgt.disabled) {
      tgt.disabled = true
    }
  }
  eventEl.addEventListener('change', (ev) => {
    doCheck(ev.currentTarget)
  })
  doCheck(eventEl)
}

optionsElements.all = [
  optionsElements.startCollapsed,
  optionsElements.showFavicons,
  optionsElements.showFaviconPlaceholder,
  optionsElements.displayInlineNotes,
  optionsElements.highlightCurrentPage,
  optionsElements.compactMode,
  optionsElements.launchWithDoubleClick
]

checkSync.then((res) => {
  if (res.notes) {
    currentItems.notes = res.notes
  }
})
checkLocal.then((res) => {
  if (res.options) {
    currentOptions = res.options
  }
  if (res.favicons) {
    currentItems.favicons = res.favicons
  }
  optionsElements.all.forEach((item, i, arr) => {
    if (currentOptions[item.getAttribute('name')]) {
      item.checked = true
    } else {
      item.checked = false
    }
  })
  addConditionListener(optionsElements.showFavicons, optionsElements.showFaviconPlaceholder)
})
// note to self: please condense these
addConditionListener(optionsElements.import.options.importNotes, optionsElements.import.options.replaceCurrentNotes)
optionsElements.import.element.addEventListener('change', (ev) => {
  if (ev.currentTarget.files[0]) {
    let importInit = () => {
      let frame = window.frames['import-frame'].contentWindow.document,
      items = frame.querySelectorAll('dt'),
      searchBookmarks = (searchParams = {}, type = '', element) => {
        browser.bookmarks.search(searchParams).then((res) => {
          switch (type) {
            case 'notes':
              res.forEach((bookmark, i, arr) => {
                importItems.notes[bookmark.id] = element.innerText.trim()
              })
            break
            case 'favicons':
              res.forEach((bookmark, i, arr) => {
                importItems.favicons[bookmark.id] = element.getAttribute('icon')
              })
            break
            default:
            console.error(`invalid element type: '${element.nodeName}'`)
          }
        }, (err) => {
          console.error(`error querying bookmarks: ${err}`)
        })
      }
      items.forEach((item, i, arr) => {
        let description = item.nextSibling,
        bookmarkElement = item.querySelector('a')
        if (bookmarkElement) {
          if (invalidSchemes.test(bookmarkElement.getAttribute('href'))) {
            console.log(`caught invalid URL expression: ${bookmarkElement.getAttribute('href')}`)
          } else {
            if (description && description.nodeName === 'DD') {
              searchBookmarks({ url:bookmarkElement.getAttribute('href') }, 'notes', description)
            }
            if (bookmarkElement.getAttribute('icon')) {
              searchBookmarks({ url:bookmarkElement.getAttribute('href') }, 'favicons', bookmarkElement)
            }
          }
        }
      })
      optionsElements.import.submit.disabled = false
    }
    file = optionsElements.import.element.files[0]
    document.querySelector('#import-frame').addEventListener('load', importInit)
    document.querySelector('#import-frame').setAttribute('src', URL.createObjectURL(file))
  } else {
    optionsElements.import.submit.disabled = true
  }
})
optionsElements.import.submit.addEventListener('click', (ev) => {
  URL.revokeObjectURL(file)
  doImport({
    importNotes:document.querySelector('#import-notes').checked,
    replaceCurrentNotes:document.querySelector('#replace-current').checked,
    importFavicons:document.querySelector('#import-favicons').checked
  })
})
optionsElements.all.forEach((item, i, arr) => {
  item.addEventListener('change', updateOptions)
})