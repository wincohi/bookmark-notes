var tree = { // this obj is mostly for debugging
      id: '_root',
      children: []
    },
    storedNotes,
    printTgt = document.querySelector('#tree')

var checkTitle = (input = '') => {
  if (input === '') {
    return '(No title)'
  } else {
    return input
  }
},
setAttributes = (el, a) => {
  let aNames = Object.getOwnPropertyNames(a)
  aNames.forEach((item, index) => {
    el.setAttribute(aNames[index], a[aNames[index]])
  })
},
makeTree = async (item, parent = tree) => {
  let parentEl = document.querySelector(`[data-id="${parent.id}"]`),
  template = {
    bookmark:(b) => {
      let el = document.createElement('li'),
      elChild = document.createElement('span')
      setAttributes(el, { "class":"item bookmark", "data-id":b.id, "title":b.url, "data-title":checkTitle(b.title) })
      setAttributes(elChild, { "class":"title" })
      elChild.appendChild(document.createTextNode(`${checkTitle(b.title)}`))
      el.appendChild(elChild)
      return el
    },
    folder:(f) => {
      let el = document.createElement('ul'),
      elChild = document.createElement('span')
      setAttributes(el, { "class":"item folder", "data-id":f.id })
      setAttributes(elChild, { "class":"title" })
      elChild.appendChild(document.createTextNode(`${checkTitle(f.title)}`))
      el.appendChild(elChild)
      return el
    }
  }
  if (item.url) {
    // if the item has a URL, it's a bookmark; otherwise, it's a folder
    let bookmark = {
      title: item.title,
      url: item.url,
      id: item.id,
      type: 'bookmark'
    }
    parentEl.appendChild(template.bookmark(bookmark))
    parent.children.push(bookmark)
  } else if (item.children) {
    let folder = {
      title: item.title,
      id: item.id,
      type: 'folder',
      children: []
    }
    parentEl.appendChild(template.folder(folder))
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
  if (storedNotes[obj.id]) {
    document.querySelector('#note-input').value = storedNotes[obj.id]
  }
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
      let notes = storedNotes
      notes[popup.id] = document.querySelector('#note-input').value
      console.log(notes)
      browser.storage.sync.set({ notes })
      storedNotes = notes
    case 'cancel':
      document.body.removeAttribute('popup-opened')
      popup.element.removeAttribute('data-open-id')
      document.querySelector('#note-input').value = ''
      break
    default:
      console.error(`unknown popup handling method: ${method}`)
  }
},
expandCollapse = (tgt) => {
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
  browser.runtime.getBackgroundPage().then((w) => {
    if (!isReload) {
      storedNotes = w.storedNotes || {}
    }
    w.bookmarks[0].children.forEach((b, i, arr) => {
      makeTree(b)
    })
    addListeners()
  }, (err) => {
    console.error(`error getting background context: ${err}`)
  })
}

// - - - end function defs - - -

panelInit()

browser.runtime.onMessage.addListener((msg, sender, respond) => {
  switch (msg.type) {
    case 'bookmarkUpdate':
      storedNotes = msg.obj.storedNotes
      panelInit(true)
      respond({ type:'success', response:'*thumbs up emoji*' })
      break
    default:
      respond({ type:'error', response:`unknown or missing message type: '${msg.type}'` })
  }
})