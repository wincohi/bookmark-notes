import bookmarks from '../background.js'

var tree = {
  name: 'root',
  children: []
},
makeTree = (item, ind = 0, parent = tree) => {
  if (item.url) {
    let bookmark = {
      name: item.name,
      url: item.url,
      id: item.id,
      type: 'bookmark'
    }
    parent.children.push(bookmark)
  } else {
    ind++
  }
  if (item.children) {
    let folder = {
      name: item.name,
      id: item.id,
      type: 'folder',
      children: []
    }
    parent.children.push(folder)
    for (child of item.children) {
      makeTree(child, ind, parent.children.find((el) => {
        return el.id === item.id
      }))
    }
  }
  ind--
},
indent = (n) => {

}

console.log(makeTree(bookmarks))