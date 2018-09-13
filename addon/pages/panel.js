var tree = { id:'root________', children:[] },
    notes,
    collapsedFolders,
    popup = { element:document.querySelector('#popup-bg') },
    popupTitle = document.querySelector('#popup-title'),
    popupUrl = document.querySelector('#popup-url')

// initial storage gets
browser.storage.local.get('collapsed').then((res) => {
  collapsedFolders = res.collapsed || []
}, (err) => {
  console.error(`error getting local storage: '${err}'`)
})
browser.storage.sync.get('notes').then((res) => {
  notes = res.notes || {}
}, (err) => {
  console.error(`error getting synced notes: '${err}`)
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
    if (atts.length) {
      el.forEach((item, index) => {
        doAttr(item, atts[index])
      })
    } else {
      el.forEach((item, index) => {
        doAttr(item)
  })
    }
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
makeTemplate = async (i) => {
  let elType = 'li',
  handleFunc,
  handleParams,
  setParams = [{ 'data-id':i.id, 'class':'item' }, { 'class':'title' }],
  el,
  elChild = document.createElement('span'),
  elTarget = {
    arr:[],
    v:0
  },
  isCollapsed = (id) => {
    if (collapsedFolders.length !== 0 && collapsedFolders.includes(id)) {
      return true
    } else {
      return false
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
      if (isCollapsed(i.id)) {
        setParams[0].class += ' collapsed'
      }
    break
    default:
      // do nothing
    break
  }
  el = document.createElement(elType)
  elTarget.arr = [el, elChild]
  el.appendChild(elChild)
  setParams[0].class += ` ${i.type}`
  setAttributes([el, elChild], setParams)
  if (i.type !== 'separator') {
    addListeners('click', elTarget.arr[elTarget.v], handleFunc, handleParams)
  }
  return el
},
addListeners = async (event = '', element, func, params) => {
  element.addEventListener(event, (ev) => {
    func(params, ev)
  })
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
  browser.storage.sync.get('notes').then((res) => {
    notes = res.notes || {}
    if (notes[obj.id]) {
      document.querySelector('#note-input').value = notes[obj.id]
    }
  })
  setAttributes([document.body, popup.element, popupTitle, popupUrl],
    [{ 'popup-opened':'true' },
    { 'data-open-id':obj.id },
    { 'title':obj.title },
    { 'title':obj.url, 'href':obj.url}])
  document.querySelector('#note-input').focus()
},
closePopup = async (method, event) => {
  popup.id = popup.element.getAttribute('data-open-id')
  switch (method) {
    case 'save':
      notes[popup.id] = document.querySelector('#note-input').value
      browser.storage.sync.set({ notes })
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
  newColl = collapsedFolders || []
  switch (collEl.length) {
    case 0:
      /* if there are no collapsed elements, but there are
       * still folder IDs in collapsedFolders, remove them all */
      if (collapsedFolders !== []) {
        newColl = []
      }
      break
    default:
      // add new items to storage, and remove old ones
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
  browser.storage.local.set({ collapsed:newColl })
},
panelInit = async (isReload = false) => {
  if (!isReload) {
    // we don't need to add listeners to Save & Cancel buttons if we already have, so don't
    document.querySelector('#popup-buttons>.button.cancel').addEventListener('click', (ev) => {
      closePopup('cancel', ev)
    })
    document.querySelector('#popup-buttons>.button.save').addEventListener('click', (ev) => {
      closePopup('save', ev)
    })
  } else {
    // clear the tree if we're reloading the bookmarks from scratch
    document.querySelector('#tree').innerHTML = ''
  }
  await browser.bookmarks.getTree().then((res) => {
    tree = res[0]
  }, (err) => {
    console.error(`error getting bookmarks: '${err}'`)
  })
  tree.children.forEach((b, i, arr) => {
    makeTree(b)
  })
}

// - - - end function defs - - -

panelInit()

browser.runtime.onMessage.addListener((msg, sender, respond) => {
  switch (msg.type) {
    case 'bookmarkUpdate':
      panelInit(true)
      respond({ type:'log', response:'*thumbs up emoji*' })
      break
    default:
      respond({ type:'error', response:`unknown or missing message type: '${msg.type}'` })
  }
})