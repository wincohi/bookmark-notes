var tree = { id:'_root', children:[] },
    savedNotes,
    bookmarks,
    popup = { element:document.querySelector('#popup-bg') },
    popupTitle = document.querySelector('#popup-title'),
    popupUrl = document.querySelector('#popup-url')

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
makeTree = async (item, parent = tree) => {
  let parentEl = document.querySelector(`[data-id="${parent.id}"]`),
  mkTemplate = (i) => {
    let elType = 'li'
    if (i.type === 'folder') {
      elType = 'ul'
    }
    let el = document.createElement(elType),
    elChild = document.createElement('span')
    setAttributes([el, elChild],
      [{ 'class':`item ${i.type}`, 'data-id':i.id },
      { 'class':'title' }])
    if (i.type === 'bookmark') {
      setAttributes(el, { 'title':i.url, 'data-title':checkTitle(i) })
    }
    elChild.appendChild(document.createTextNode(`${checkTitle(i)}`))
    el.appendChild(elChild)
    return el
  }
  if (item.url) {
    // if the item has a URL, it's a bookmark; otherwise, it's a folder or separator
    let bookmark = {
      title: item.title,
      url: item.url,
      id: item.id,
      type: 'bookmark'
    }
    parentEl.appendChild(mkTemplate(bookmark))
    parent.children.push(bookmark)
  } else if (item.children) {
    let folder = {
      title: item.title,
      id: item.id,
      type: 'folder',
      children: []
    }
    parentEl.appendChild(mkTemplate(folder))
    parent.children.push(folder)
    for (child of item.children) {
      // we iterate on this function for each child of the folder
      makeTree(child, parent.children.find((el) => {
        return el.id === item.id
      }))
    }
  }
},
openPopup = async (obj) => {
  browser.storage.sync.get().then((result) => {
    savedNotes = result.notes || {}
    if (savedNotes[obj.id]) {
      document.querySelector('#note-input').value = savedNotes[obj.id]
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
      let notes
      savedNotes[popup.id] = document.querySelector('#note-input').value
      notes = savedNotes
      console.log(notes)
      browser.storage.sync.set({ notes })
    case 'cancel':
      setAttributes([document.body, popup.element], ['popup-opened', 'data-open-id'], 'remove')
      document.querySelector('#note-input').value = ''
      break
    default:
      console.error(`unknown popup handling method: ${method}`)
  }
},
expandCollapse = async (tgt) => {
  tgt.classList.toggle('collapsed')
},
panelInit = async (isReload = false, bkmkObject) => {
  let addListeners = async () => {
    if (!isReload) {
      // we don't need to add listeners to Save & Cancel buttons if we already have, so don't
      document.querySelector('#popup-buttons>.button.cancel').addEventListener('click', (ev) => {
        closePopup('cancel', ev)
      })
      document.querySelector('#popup-buttons>.button.save').addEventListener('click', (ev) => {
        closePopup('save', ev)
      })
    }
    document.querySelectorAll('li.bookmark').forEach((el, i, arr) => {
      el.addEventListener('click', (ev) => {
        openPopup({
          title: ev.currentTarget.getAttribute('data-title'),
          url: ev.currentTarget.getAttribute('title'),
          id: ev.currentTarget.getAttribute('data-id')
        })
      })
    })
    document.querySelectorAll('ul>.title').forEach((el, i, arr) => {
      el.addEventListener('click', (ev) => {
        expandCollapse(ev.currentTarget.parentNode)
      })
    })
  }
  if (isReload) {
    // clear the tree if we're reloading the bookmarks from scratch
    document.querySelector('#tree').innerHTML = ''
  }
  browser.bookmarks.getTree().then((bkm) => {
    bkm[0].children.forEach((b, i, arr) => {
      makeTree(b)
    })
    addListeners()
  }, (err) => {
    console.error(`error getting bookmarks: ${err}`)
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