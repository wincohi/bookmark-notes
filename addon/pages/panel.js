/* todo:
 * [ ] re-evaluate options when they change
 * [ ] update items with [data-has-note]...
 *   [ ] ...in panel initially
 *   [ ] ...when storage.sync changes
 * [-] fix updating bookmarks
 *   [x] add
 *   [ ] change
 */
var popup = { element:document.querySelector('#popup-bg') },
popupTitle = document.querySelector('#popup-title'),
popupUrl = document.querySelector('#popup-url'),
buttonSave = document.querySelector('.button.save'),
buttonCancel = document.querySelector('.button.cancel'),
treeElement = document.querySelector('#tree'),
options = {},
optionClasses = {
  showFavicons:'show-favicons',
  showFaviconPlaceholder:'show-default-favicons',
  displayInlineNotes:'inline-notes',
  highlightCurrentPage:'highlight-tab',
  displayNoteIndicator:'note-highlight',
  compactMode:'compact-mode',
},
notes = {},
collapsedFolders = [],
openedFolders = [],
bookmarkLaunching = false,
timerId

var $ = async (selector, context = document) => {
  let res = context.querySelectorAll(selector)
  switch (res.length) {
    case 0: return undefined
    case 1: return res[0]
    default: return res
  }
},
updateClasses = async () => {
  let classes = []
  if (options.compactMode)
    classes.push('compact-mode')
  if (options.displayNoteIndicator)
    classes.push('note-highlight')
  if (options.showFavicons)
    classes.push('show-favicons')
  let classString = classes.toString().replace(',', ' ')
  document.body.setAttribute('class', classString)
},
markNotes = async () => {
  let noteIds = Object.getOwnPropertyNames(notes)
  if ($('[data-has-note]')) {

    $('[data-has-note]').forEach((el) => el.classList.remove('has-note'))
  }
  noteIds.forEach((id, i, arr) => {
    let el = $(`[data-id="${id}"]`)
    if (el)
      el.classList.add('has-note')
  })
},
toggleSearchFocused = async (c = '', s = document.querySelector('#search-bar-outer')) => {
  switch (c) {
    case 'focus':
      s.setAttribute('focused', 'true')
    break
    case 'blur':
      s.removeAttribute('focused')
    break
    default:
      // nothing here
  }
},
filter = async (query = '') => {
  let oldMatches = await $('[filter-match]')
  if (oldMatches) oldMatches.forEach((el, i, arr) => el.removeAttribute('filter-match'))
  if (query === '' && document.body.hasAttribute('filtering')) {
    document.body.removeAttribute('filtering')
  } else {
    let queryR = new RegExp(query, 'i')
    if (!document.body.hasAttribute('filtering'))
      document.body.setAttribute('filtering', 'true')
    let allElements = await $('li>.title')
    matches = {
      liArray:[],
      ulArray:[]
    },
    markParents = async (el) => {
      if (el.parentElement && el.parentElement.nodeName === 'UL') {
        matches.ulArray.push(el.parentElement)
        markParents(el.parentElement)
      }
    }
    allElements.forEach((el, i, arr) => {
      let title = el.getAttribute('data-title'),
      url = el.getAttribute('title')
      if (queryR.test(title) || queryR.test(url))
        matches.liArray.push(el.parentElement)
    })
    matches.liArray.forEach((el, i, arr) => {
      el.setAttribute('filter-match', 'true')
      markParents(el)
    })
    matches.ulArray.forEach((el, i, arr) => el.setAttribute('filter-match', 'true'))
  }
},
expandCollapse = async (elId, tgt) => {
  tgt.classList.toggle('collapsed')
  let collEl = getAttributes(document.querySelectorAll('.collapsed'), 'data-id'),
  openEl = getAttributes(document.querySelectorAll('.folder:not(.collapsed)'), 'data-id'),
  newColl = collapsedFolders || [],
  newOpen = openedFolders || []
  if (options.startCollapsed) {
    switch (collEl.length) {
      case 0:
        /* if there are no open elements, but there are
        * still folder IDs in openedFolders, remove them all */
        if (openedFolders !== []) {
          newOpen = []
        }
      break
      default:
        // add new items to storage, and remove old ones
        openEl.forEach((item, index, arr) => {
          if (!openedFolders.includes(item)) {
            newOpen.push(item)
          }
        })
        openedFolders.forEach((item, index, arr) => {
          if (!openEl.includes(item)) {
            newOpen.splice(newOpen.indexOf(item), 1)
          }
        })
    }
    openedFolders = newOpen
  } else {
    switch (collEl.length) {
      case 0:
        if (collapsedFolders !== []) {
          newColl = []
        }
      break
      default:
        collEl.forEach((item, index, arr) => {
          if (!collapsedFolders.includes(item)) {
            newColl.push(item)
          }
        })
        collapsedFolders.forEach((item, index, arr) => {
          if (!collEl.includes(item)) {
            newColl.splice(newColl.indexOf(item), 1)
          }
        })
    }
    collapsedFolders = newColl
  }
  browser.storage.local.set({ collapsed:newColl, opened:newOpen })
},
openPopup = async (obj) => {
  let delayedOpen = () => {
    if (notes[obj.id]) {
      document.querySelector('#note-input').value = notes[obj.id]
    }
    setAttributes([document.body, popup.element, popupTitle, popupUrl],
      [{ 'popup-opened': 'true' },
      { 'data-open-id': obj.id },
      { 'title': obj.title },
      { 'title': obj.url, 'href': obj.url }])
    document.querySelector('#note-input').focus()
    bookmarkLaunching = false
  },
  launchBookmark = () => {
    window.clearTimeout(timerId)
    window.open(obj.url)
  }
  if (options.launchWithDoubleClick) {
    if (!bookmarkLaunching) {
      timerId = window.setTimeout(delayedOpen, 200)
      bookmarkLaunching = true
    } else {
      launchBookmark()
      bookmarkLaunching = false
    }
  } else {
    delayedOpen()
  }
},
closePopup = async (method) => {
  popup.id = popup.element.getAttribute('data-open-id')
  switch (method) {
    case 'save':
      let note = document.querySelector('#note-input').value
      if (note !== '')
        notes[popup.id] = note
      else if (notes[popup.id]) {
        delete notes[popup.id]
      }
      browser.storage.sync.set({ notes:notes })
    case 'cancel':
      setAttributes([document.body, popup.element], ['popup-opened', 'data-open-id'], 'remove')
      document.querySelector('#note-input').value = ''
    break
    default:
      console.error(`unknown popup handling method: ${method}`)
  }
},
doOptions = async () => {
  document.body.className = ''
  let opts = Object.getOwnPropertyNames(options)
  opts.forEach((opt) => {
    if (options[opt] && optionClasses[opt]) document.body.classList.add(optionClasses[opt])
  })
},
handleClick = async (ev) => {
  let tgt = ev.target
  if (tgt.getAttribute('class') === 'title') {
    expandCollapse(null, tgt.parentElement)
  } else if (tgt.nodeName === 'LI') {
    openPopup({
      id:tgt.getAttribute('data-id'),
      title:tgt.querySelector('.title').getAttribute('data-title'),
      url:tgt.querySelector('.title').getAttribute('title')
    })
  }
},
panelInit = async () => {
  browser.runtime.getBackgroundPage().then((bgWindow) => {
    notes = bgWindow.notes
    options = bgWindow.options
    collapsedFolders = bgWindow.collapsedFolders,
    openedFolders = bgWindow.openedFolders
    let shareFunctions = Object.getOwnPropertyNames(bgWindow.SHARE)
    shareFunctions.forEach((prop) => window[prop] = bgWindow.SHARE[prop])
    addListeners('click', [buttonCancel, buttonSave], closePopup, ['cancel', 'save'])
    document.body.addEventListener('click', handleClick)
    if (bgWindow.firstLoad) {
      document.querySelector('#panel').replaceChild(bgWindow.treeHTML.cloneNode(true), treeElement)
    }
    doOptions()
  })
},
newBookmark = async (item) => {
  let parent, el
  if (item) {
    await browser.runtime.getBackgroundPage().then((w) => el = w.tempElement)
    parent = await $(`[data-id="${item.parentId}"]`)
    addListeners('click', el, openPopup, {
      title:el.querySelector('.title').getAttribute('data-title'),
      url:el.querySelector('.title').getAttribute('title'),
      id:el.getAttribute('data-id')
    })
    parent.insertBefore(el, parent.children[item.index])
  }
},
moveBookmark = async (id, oldInfo, newInfo) => {
  let newParent = await $(`[data-id=${newInfo.parent}]`),
  el = await $(`[data-id="${id}"]`),
  newIndex = () => {
    // if the entry is being moved within the same folder, we need to correct for that
    if (oldInfo.parent === newInfo.parent && oldInfo.index < newInfo.index)
      return 2
    else
      return 1
  }
  if (el)
    newParent.insertBefore(el, newParent.children[newInfo.index + newIndex()])
  else
    browser.bookmarks.get(id).then((res) => newBookmark(res[0], null, id))
},
deleteBookmark = async (id) => {
  let b = await $(`[data-id="${id}"]`)
  if (b)
    b.remove()
  else
    console.warn(`bookmarks.onRemoved fired, but no element exists with id '${id}'`)
},
updateBookmark = async (id, info) => {
  let b = await $(`[data-id="${id}"]>.title`)
  if (b) {
    if (info.title) {
      b.innerText = info.title
      b.setAttribute('data-title', info.title)
    }
    if (info.url)
      b.setAttribute('title', info.url)
  } else {
    browser.bookmarks.get(id).then((res) => newBookmark(res[0], null, id))
  }
},
checkActive = async (url) => {
  if (options.highlightCurrentPage) {
    let matchingBookmark = await $(`[title="${url}"]`),
    prev = await $('[current-tab]')
    console.log(`searching for bookmark to match '${url}'`)
    if (prev)
      prev.removeAttribute('current-tab')
    if (matchingBookmark)
      matchingBookmark.parentElement.setAttribute('current-tab', 'true')
  }
}

// - - - end function defs - - -

panelInit()

browser.permissions.contains({ permissions:['tabs'] }).then((res) => {
  if (res) {
    [browser.tabs.onUpdated, browser.tabs.onActivated].forEach((ev, i, arr) => {
      ev.addListener((tId) => browser.tabs.query({ active: true, currentWindow: true }).then((tabs) =>
        tabs.forEach((t) => checkActive(t.url))
      ))
    })
  }
})
browser.runtime.onMessage.addListener((msg, sender, respond) => {
  switch (msg.type) {
    case 'created':
      newBookmark(msg.info.bookmark)
    break
    case 'moved':
      let oldInfo = {
        parent:msg.info.oldParentId,
        index:msg.info.oldIndex
      },
      newInfo = {
        parent:msg.info.parentId,
        index:msg.info.index
      }
      moveBookmark(msg.id, oldInfo, newInfo)
    break
    case 'removed':
      deleteBookmark(msg.id)
    break
    case 'changed':
      updateBookmark(msg.id, { title:msg.info.title, url:msg.info.url })
    break
    case 'permissionsAdded':
      [browser.tabs.onUpdated, browser.tabs.onActivated].forEach((ev, i, arr) => {
        ev.addListener((tId) => browser.tabs.query({ active: true, currentWindow: true }).then((tab) =>
          checkActive(tab.url)
        ))
      })
    break
    case 'load':
      $('#panel').replaceChild(msg.info.treeHTML, treeElement)
    break
    default:
      // there's literally nothing here
  }
  respond({ type:'log', response:`processed message type: '${msg.type}'` })
})
document.querySelector('#search').addEventListener('click', (ev) => document.querySelector('#search-bar-inner').focus())
;['blur', 'focus'].forEach((ev, i, arr) =>
  document.querySelector('#search-bar-inner').addEventListener(ev, () =>
    toggleSearchFocused(ev)))
document.querySelector('#search-bar-inner').addEventListener('input', (ev) => filter(document.querySelector('#search-bar-inner').value))