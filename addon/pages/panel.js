const defaultOptions = {
  startCollapsed:1,
  showFavicons:0,
  showFaviconPlaceholder:1,
  displayInlineNotes:0,
  highlightCurrentPage:0,
  displayNoteIndicator:1,
  compactMode:1,
  launchWithDoubleClick:0
}
var tree = { id:'root________', children:[] },
    notes,
    collapsedFolders = [],
    openedFolders = [],
    favicons = {},
    popup = { element:document.querySelector('#popup-bg') },
    popupTitle = document.querySelector('#popup-title'),
    popupUrl = document.querySelector('#popup-url'),
    options = defaultOptions,
    bookmarkLaunching = false,
    timerId

// initial storage gets
browser.storage.local.get().then((res) => {
  if (res.collapsed)
    collapsedFolders = res.collapsed
  if (res.opened)
    openedFolders = res.opened
  if (res.options) {
    options = res.options
    updateClasses()
  }
  if (res.favicons)
    favicons = res.favicons
})

browser.storage.sync.get('notes').then((res) => {
  notes = res.notes || {}
  markNotes()
})

var checkTitle = (input = { title:'', url:'' }) => {
  switch (input.title) {
    case '':
    case undefined:
      if (input.url && input.url !== '') {
        return input.url
      } else {
        return '(No data)'
      }
    default:
      return input.title
  }
},
updateClasses = async () => {
  let classes = []
  if (options.compactMode)
    classes.push('compact-mode')
  if (options.displayNoteIndicator)
    classes.push('note-highlight')
  let classString = classes.toString().replace(',', ' ')
  document.body.setAttribute('class', classString)
},
markNotes = async () => {
  let noteIds = Object.getOwnPropertyNames(notes)
  if (document.querySelector('[data-has-note]')) {
    document.querySelectorAll('[data-has-note]').forEach((el) => el.removeAttribute('data-has-note'))
  }
  noteIds.forEach((id, i, arr) => {
    let el = document.querySelector(`[data-id="${id}"]`)
    if (el)
      el.setAttribute('data-has-note', 'true')
  })
},
setAttributes = async (el, atts, method = 'set') => {
  let doAttr = (e, a = atts) => {
    let attNames = Object.getOwnPropertyNames(a)
    attNames.forEach((item, index) => {
      switch (method) {
        case 'set':
          e.setAttribute(attNames[index], a[attNames[index]])
        break
        case 'remove':
          e.removeAttribute(atts[index])
        break
        default:
          console.error(`invalid method for setAttributes: '${method}'`)
      }
    })
  }
  if (el.length) {
    // if el is an array instead of a single NodeObject, handle it appropriately
    if (atts.length)
      el.forEach((item, index) => doAttr(item, atts[index]))
    else
      el.forEach((item, index) => doAttr(item))
  } else {
    doAttr(el)
  }
},
getAttributes = (input, attr) => {
  let output = []
  input.forEach((item, index, arr) => {
    output.push(item.getAttribute(attr))
  })
  return output
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
  document.querySelectorAll('[filter-match]').forEach((el, i, arr) => el.removeAttribute('filter-match'))
  if (query === '' && document.body.hasAttribute('filtering')) {
    document.body.removeAttribute('filtering')
  } else {
    let queryR = new RegExp(query, 'i')
    if (!document.body.hasAttribute('filtering'))
      document.body.setAttribute('filtering', 'true')
    let allElements = document.querySelectorAll('li>.title')
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
makeTemplate = async (i) => {
  let elType = 'li',
  handleFunc,
  handleParams,
  setParams = [{ 'data-id':i.id, 'class':'item' }, { 'class':'title' }],
  el,
  favicon = document.createElement('img'),
  elChild = document.createElement('span'),
  elTarget = {
    arr:[],
    v:0
  },
  isCollapsed = (id) => {
    switch (options.startCollapsed) {
      case 1:
        if (openedFolders.length !== 0 && openedFolders.includes(id)) {
          return ''
        } else {
          return ' collapsed'
        }
      default:
        if (collapsedFolders.length !== 0 && collapsedFolders.includes(id)) {
          return ' collapsed'
        } else {
          return ''
        }
    }
  }
  elChild.appendChild(document.createTextNode(`${checkTitle(i)}`))
  switch (i.type) {
    case 'bookmark':
      setParams[1].title = i.url
      setParams[1]['data-title'] = checkTitle(i)
      handleFunc = openPopup
      handleParams = { title:i.title, url:i.url, id:i.id }
    break
    case 'folder':
      elType = 'ul'
      handleFunc = expandCollapse
      handleParams = i.id
      elTarget.v = 1
      setParams[0].class += isCollapsed(i.id)
    break
    default:
      // nothing to see here, go home
  }
  el = document.createElement(elType)
  elTarget.arr = [el, elChild]
  if (options.showFavicons) {
    switch (favicons[i.id]) {
      case undefined:
        if (options.showFaviconPlaceholder && i.type === 'bookmark') {
          await setAttributes(favicon, {
            'src': '/img/default.svg',
            'class': 'favicon'
          })
          setParams[0].class += ' has-favicon'
          el.appendChild(favicon)
        }
      break
      default:
        await setAttributes(favicon, {
          'src':favicons[i.id],
          'class':'favicon'
        })
        setParams[0].class += ' has-favicon'
        el.appendChild(favicon)
    }
  }
  if (notes[i.id])
    setParams[0]['data-has-note'] = 'true'
  el.appendChild(elChild)
  setParams[0].class += ` ${i.type}`
  setAttributes([el, elChild], setParams)
  if (i.type !== 'separator') {
    addListeners('click', elTarget.arr[elTarget.v], handleFunc, handleParams)
  }
  return el
},
addListeners = async (event, element, func, params) => {
  if (element.length) {
    element.forEach((el, i, arr) => {
      let thisEvent = event,
      thisFunc = func[i] || func,
      thisParams = params
      if (typeof(event) === 'object') thisEvent = event[i]
      if (typeof(params) === 'object' && params.length) thisParams = params[i]
      el.addEventListener(thisEvent, (ev) => thisFunc(thisParams, ev))
    })
  } else {
    element.addEventListener(event, (ev) => func(params, ev))
  }
},
makeTree = async (item, parent = tree) => {
  let parentEl = document.querySelector(`[data-id="${parent.id}"]`)
  parentEl.appendChild(await makeTemplate(item))
  if (item.children) {
    for (child of item.children) {
      // we iterate on this function for each child of the folder
      await makeTree(child, parent.children.find(el => el.id === item.id))
    }
  }
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
expandCollapse = async (elId, ev) => {
  ev.currentTarget.parentElement.classList.toggle('collapsed')
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
panelInit = async (isReload = false) => {
  if (!isReload) {
    // we don't need to add listeners to Save & Cancel buttons if we already have, so don't
    let elements = [
      document.querySelector('#popup-buttons>.button.cancel'),
      document.querySelector('#popup-buttons>.button.save')
    ]
    addListeners('click', elements, closePopup, ['cancel', 'save'])
  } else {
    // clear the tree if we're reloading the bookmarks from scratch
    document.querySelector('#tree').innerHTML = ''
  }
  if (isReload)
    updateClasses()
  await browser.bookmarks.getTree().then((t) => tree = t[0])
  tree.children.forEach((b, i, arr) => makeTree(b))
},
newBookmark = async (item) => {
  let newItem,
  parent
  if (item) {
    newItem = await makeTemplate(item)
    parent = document.querySelector(`[data-id="${item.parentId}"]`)
    parent.insertBefore(newItem, parent.children[item.index])
  }
},
moveBookmark = async (id, oldInfo, newInfo) => {
  let newParent = document.querySelector(`[data-id=${newInfo.parent}]`),
  el = document.querySelector(`[data-id="${id}"]`),
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
    browser.bookmarks.get(id).then((res) => newBookmark(res[0]))
},
deleteBookmark = async (id) => {
  let b = document.querySelector(`[data-id="${id}"]`)
  if (b)
    b.remove()
  else
    console.log(`bookmarks.onRemoved fired, but no element exists with id '${id}'`)
},
updateBookmark = async (id, info) => {
  let b = document.querySelector(`[data-id="${id}"]>.title`)
  if (b) {
    if (info.title) {
      b.innerText = info.title
      b.setAttribute('data-title', info.title)
    }
    if (info.url)
      b.setAttribute('title', info.url)
  } else {
    browser.bookmarks.get(id).then((res) => newBookmark(res[0]))
  }
}

panelInit()

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
    default:
      // there's literally nothing here
  }
  browser.bookmarks.getTree().then((t) => tree = t[0])
  respond({ type:'log', response:`processed message type: '${msg.type}'` })
})
browser.storage.onChanged.addListener((change, area) => {
  switch (area) {
    case 'sync':
      notes = change.notes.newValue
      markNotes()
    break
    case 'local':
      if (change.favicons)
        favicons = change.favicons.newValue
      if (change.options) {
        options = change.options.newValue
        panelInit(true)
      }
    break
    default:
      // nope.
  }
})
document.querySelector('#search').addEventListener('click', (ev) => document.querySelector('#search-bar-inner').focus())
;['blur', 'focus'].forEach((ev, i, arr) =>
  document.querySelector('#search-bar-inner').addEventListener(ev, () =>
    toggleSearchFocused(ev)))
document.querySelector('#search-bar-inner').addEventListener('input', (ev) => filter(document.querySelector('#search-bar-inner').value))