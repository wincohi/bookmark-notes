const defaultOptions = {
  startCollapsed:1,
  displayInlineNotes:0,
  compactMode:0,
  launchWithDoubleClick:0
}
var currentOptions = defaultOptions,
optionsElements = {
  startCollapsed:document.querySelector('#start-collapsed'),
  displayInlineNotes:document.querySelector('#inline-notes'),
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
doImport = async (opts) => {
  if (opts.importNotes) {
    let importNotes = Object.getOwnPropertyNames(importItems.notes)
    importNotes.forEach((item, i, arr) => {
      if ((currentItems.notes[item] && opts.replaceCurrentNotes) || !currentItems.notes[item]) {
        currentItems.notes[item] = importItems.notes[item]
      }
    })
  }
  browser.storage.sync.set({ notes:currentItems.notes })
  browser.runtime.sendMessage({ type:'reload' })
},
updateOptions = async (ev) => {
  currentOptions[ev.currentTarget.getAttribute('name')] = Number(ev.currentTarget.checked)
  browser.storage.local.get().then((res) => {
    let oldStorage = res,
    newStorage = oldStorage
    newStorage.options = currentOptions
    browser.storage.local.set(newStorage)
  })
}

optionsElements.all = [
  optionsElements.startCollapsed,
  optionsElements.displayInlineNotes,
  optionsElements.compactMode,
  optionsElements.launchWithDoubleClick
]

browser.storage.sync.get().then((res) => {
  if (res.notes) {
    currentItems.notes = res.notes
  }
})
browser.storage.local.get().then((res) => {
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
}, (err) => {
  console.error(`error reading local storage: ${err}`)
})
// note to self: please condense these
optionsElements.import.options.importNotes.addEventListener('change', (ev) => {
  if (ev.currentTarget.checked === true && optionsElements.import.options.replaceCurrentNotes.hasAttribute('disabled')) {
    optionsElements.import.options.replaceCurrentNotes.removeAttribute('disabled')
  } else if (ev.currentTarget.checked === false && !optionsElements.import.options.replaceCurrentNotes.hasAttribute('disabled')) {
    optionsElements.import.options.replaceCurrentNotes.setAttribute('disabled', 'true')
  }
})
optionsElements.import.element.addEventListener('change', (ev) => {
  if (ev.currentTarget.files[0]) {
    let importInit = () => {
      let frame = window.frames['import-frame'].contentWindow.document,
      items = frame.querySelectorAll('dt'),
      notes = {}
      console.log(items)
      items.forEach((item, i, arr) => {
        console.log(`reading ${i+1} of ${arr.length}...`)
        if (item.nextSibling && item.nextSibling.nodeName === 'DD') {
          browser.bookmarks.search({ url:item.querySelector('a').getAttribute('href') }).then((res) => {
            res.forEach((bookmark, i, arr) => {
              notes[bookmark.id] = item.nextSibling.innerText.trim()
            })
          }, (err) => {
            console.error(`error querying bookmarks: ${err}`)
          })
        }
      })
      importItems.notes = notes
    }
    file = optionsElements.import.element.files[0]
    document.querySelector('#import-frame').addEventListener('load', importInit)
    document.querySelector('#import-frame').setAttribute('src', URL.createObjectURL(file))
    if (optionsElements.import.submit.hasAttribute('disabled')) {
      optionsElements.import.submit.removeAttribute('disabled')
    }
  } else if (!optionsElements.import.submit.hasAttribute('disabled')) {
    optionsElements.import.submit.setAttribute('disabled', 'true')
  }
})
optionsElements.import.submit.addEventListener('click', (ev) => {
  URL.revokeObjectURL(file)
  doImport({
    importNotes:optionsElements.import.options.importNotes.checked,
    replaceCurrentNotes:optionsElements.import.options.replaceCurrentNotes.checked,
    importFavicons:optionsElements.import.options.importFavicons.checked
  })
})
optionsElements.all.forEach((item, i, arr) => {
  item.addEventListener('change', updateOptions)
})