const defaultOptions = {
  startCollapsed:1,
  displayInlineNotes:0,
  compactMode:0,
  launchWithDoubleClick:0
}
var currentOptions = defaultOptions,
importOptions = {},
optionsElements = {
  startCollapsed:document.querySelector('#start-collapsed'),
  displayInlineNotes:document.querySelector('#inline-notes'),
  compactMode:document.querySelector('#compact-mode'),
  launchWithDoubleClick:document.querySelector('#double-click-open'),
  import:{
    notes:document.querySelector('#import-notes'),
    replaceCurrentNotes:document.querySelector('#replace-current'),
    favicons:document.querySelector('#import-favicons'),
    clickHandler:document.querySelector('#import-file-select'),
    element:document.querySelector('#import-element')
  }
}

browser.storage.local.get().then((res) => {
  if (res.options) {
    currentOptions = res.options
  }
}, (err) => {
  console.error(`error reading local storage: ${err}`)
})
optionsElements.import.clickHandler.addEventListener('click', (ev) => {
  optionsElements.import.element.click()
})