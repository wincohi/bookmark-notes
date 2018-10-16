var DEFAULT_OPTIONS = {
  startCollapsed:1,
  showFavicons:0,
  showFaviconPlaceholder:1,
  displayInlineNotes:0,
  highlightCurrentPage:0,
  displayNoteIndicator:1,
  compactMode:1,
  launchWithDoubleClick:0
},
SHARE = {
  setAttributes: async (el, atts, method = 'set') => {
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
  getAttributes: (input, attr) => {
    let output = []
    input.forEach((item, index, arr) => {
      output.push(item.getAttribute(attr))
    })
    return output
  },
  addListeners: async (event, element, func, params) => {
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
  checkLocal: async (filter) => browser.storage.local.get(filter || null),
  checkSync: async (filter) => browser.storage.sync.get(filter || null),
  sendMsg: async (msg) => browser.runtime.sendMessage(msg)
}

var tree = { id: 'root________', children: [] },
treeHTML = document.createElement('div'),
tempElement,
notes = {},
collapsedFolders = [],
openedFolders = [],
favicons = {},
firstLoad = false


Object.getOwnPropertyNames(SHARE).forEach((prop) => window[prop] = SHARE[prop])
setAttributes(treeHTML, { id: 'tree', 'data-id': tree.id })

var $ = (selector, context = document) => {
  let res = context.querySelectorAll(selector)
  switch (res.length) {
    case 0: return undefined
    case 1: return res[0]
    default: return res
  }
},
update = async (id, info) => {
  let updTree = async () => {
    treeHTML = document.createElement('div')
    await browser.bookmarks.getTree().then((t) => tree = t[0])
    setAttributes(treeHTML, { id: 'tree', 'data-id': tree.id })
    tree.children.forEach((item) => makeTree(item))
  }
  updTree()
  let type = '', el
  if (info.bookmark) type = 'created'
  else if (info.oldParentId) type = 'moved'
  else if (info.parentId) type = 'removed'
  else if (info.title || info.url) type = 'changed'
  switch (type) {
    case 'created':
      el = await makeTemplate(info.bookmark)
      tempElement = el
      break
    case 'moved':
    case 'changed':
      let bItem = await browser.bookmarks.get(id)
      el = await makeTemplate(bItem[0])
      tempElement = el
      break
    default:
      // nothin'
  }
  sendMsg({ type:type, id:id, info:info }).then((msg) => console[msg.type](msg.response))
},
eventTgts = [
  browser.bookmarks.onChanged,
  browser.bookmarks.onCreated,
  browser.bookmarks.onMoved,
  browser.bookmarks.onRemoved
],
options = DEFAULT_OPTIONS,
checkDefaults = (opt) => {
  let optNames = Object.getOwnPropertyNames(DEFAULT_OPTIONS)
  isSame = 0
  optNames.forEach((item, i, arr) => {
    if (opt[item] === DEFAULT_OPTIONS[item]) {
      isSame++
    }
  })
  if (isSame < optNames.length)
    return false
  else
    return true
},
loadOptions = (obj) => {
  if (obj.options && !checkDefaults(obj.options)) {
    Object.getOwnPropertyNames(obj.options).forEach((opt) => options[opt] = obj.options[opt])
  }
},
checkTitle = (input = { title:'', url:'' }) => {
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
makeTemplate = async (i) => {
  let elType = 'li',
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
    break
    case 'folder':
      elType = 'ul'
      handleParams = i.id
      elTarget.v = 1
      setParams[0].class += isCollapsed(i.id)
    break
    default:
      // nothing to see here, go home
  }
  el = document.createElement(elType)
  elTarget.arr = [el, elChild]
  switch (favicons[i.id]) {
    case undefined:
      if (i.type === 'bookmark') {
        await setAttributes(favicon, {
          'src': '/img/default.svg',
          'class': 'favicon default-favicon'
        })
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
  if (notes[i.id]) setParams[0]['data-has-note'] = 'true'
  el.appendChild(elChild)
  setParams[0].class += ` ${i.type}`
  setAttributes([el, elChild], setParams)
  return el
},
makeTree = async (item, parent = tree) => {
  let parentEl
  if (parent.id === tree.id) parentEl = treeHTML
  else parentEl = $(`[data-id="${parent.id}"]`, treeHTML)
  parentEl.appendChild(await makeTemplate(item))
  if (item.children) {
    for (child of item.children) {
      // we iterate on this function for each child of the folder
      await makeTree(child, parent.children.find(el => el.id === item.id))
    }
  }
},
init = async () => {
  await checkLocal().then((res) => {
    loadOptions(res)
    collapsedFolders = res.collapsed || []
    openedFolders = res.opened || []
    favicons = res.favicons || {}
  })
  await checkSync().then((res) => {
    notes = res.notes || {}
  })
  await browser.bookmarks.getTree().then((t) => {
    tree = t[0]
    tree.children.forEach((item, i, arr) => makeTree(item))
    firstLoad = true
  })
  sendMsg({ type:'load', info:Window })
}

init()

eventTgts.forEach((tgt, i, arr) => {
  tgt.addListener((id, info) => update(id, info))
})
browser.browserAction.onClicked.addListener((tab) => browser.sidebarAction.open())
browser.storage.onChanged.addListener((change, area) => {
  switch (area) {
    case 'sync':
      notes = change.notes.newValue
      sendMsg({ type:'updateNotes', notes:change.notes.newValue }).then((msg) => console[msg.type](msg.response))
      break
    case 'local':
      if (change.favicons)
        favicons = change.favicons.newValue
      if (change.options) {
        loadOptions(change)
        sendMsg({ type:'updateOptions', options:options }).then((msg) => console[msg.type](msg.response))
      }
      break
    default:
      // nope.
  }
})