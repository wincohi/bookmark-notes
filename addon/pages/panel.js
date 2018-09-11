var tree = { id:'_root', children:[] },
    storedNotes,
    bookmarks,
    printTgt = document.querySelector('#tree')

var checkTitle = (input = '') => {
  if (input === '') {
    return '(No title)'
  } else {
    return input
  }
},
setAttributes = async (el, a) => {
  let aNames = Object.getOwnPropertyNames(a)
  aNames.forEach((item, index) => {
    el.setAttribute(aNames[index], a[aNames[index]])
  })
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
    setAttributes(el, { "class":`item ${i.type}`, "data-id":i.id })
    setAttributes(elChild, { "class":"title" })
    if (i.type === 'bookmark') {
      setAttributes(el, { "title":i.url, "data-title":checkTitle(i.title) })
    }
    elChild.appendChild(document.createTextNode(`${checkTitle(i.title)}`))
    el.appendChild(elChild)
    return el
  }
  if (item.url) {
    // if the item has a URL, it's a bookmark; otherwise, it's a folder
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
  let popup = document.querySelector('#popup-bg'),
  popupTitle = document.querySelector('#popup-title'),
  popupUrl = document.querySelector('#popup-url')
  browser.storage.sync.get().then((result) => {
    storedNotes = result.notes || {}
    if (storedNotes[obj.id]) {
      document.querySelector('#note-input').value = storedNotes[obj.id]
    }
  })
  document.body.setAttribute('popup-opened','true')
  popup.setAttribute('data-open-id', obj.id)
  popupTitle.setAttribute('title', obj.title)
  popupUrl.setAttribute('title', obj.url)
  document.querySelector('#note-input').focus()
},
closePopup = async (method, event) => {
  let popup = {
    element:document.querySelector('#popup-bg'),
    id: document.querySelector('#popup-bg').getAttribute('data-open-id')
  }
  switch (method) {
    case 'save':
      let notes
      storedNotes[popup.id] = document.querySelector('#note-input').value
      notes = storedNotes
      console.log(notes)
      browser.storage.sync.set({ notes })
    case 'cancel':
      document.body.removeAttribute('popup-opened')
      popup.element.removeAttribute('data-open-id')
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
      respond({ type:'success', response:'*thumbs up emoji*' })
      break
    default:
      respond({ type:'error', response:`unknown or missing message type: '${msg.type}'` })
  }
})