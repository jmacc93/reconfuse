
// const placeholderHtml = /*html*/`<span class="light-color">Write here. It gets stored in local storage on your computer</span>`

async function updateLocalStorage(textarea, pagelet) {
  const name        = pagelet.dataset.name
  const trimmedValue = textarea.value.trim()
  const itemName    = `selfpad-${name}`
  localStorage.setItem(itemName, trimmedValue)
}

async function renderTextareaContent(textarea, contentDisplay, pagelet) {
  const lib = await import('/lib/lib.mjs')
  const contentType = pagelet.dataset.contenttype
  const name        = pagelet.dataset.name
  const itemName    = `selfpad-${name}`
  let trimmedValue = textarea.value.trim()
  if(trimmedValue === '') {
    localStorage.removeItem(itemName)
  } else if(contentType) { // content type given
    lib.renderContentTo(contentDisplay, trimmedValue, pagelet.dataset.contenttype)
  } else if(name.indexOf('.') !== -1) { // name has an extension
    let [_, contentType] = lib.splitAtFirst(name, /\./)
    contentType = '.' + contentType // ".escm" instead of "escm"
    lib.renderContentTo(contentDisplay, trimmedValue, contentType)
  } else { // try getting content type from first line
    let contentType = 'text/markdown'
    let [firstLine, _] = lib.splitAtFirst(textarea.value, /\n/)
    if(firstLine?.startsWith('type:'))
      contentType = firstLine.slice(5).trim() // remove 'type:' and whitespace
    lib.renderContentTo(contentDisplay, trimmedValue, contentType)
  }
  updateLocalStorage(textarea, pagelet)
}

export async function installFunctionality(callElem) {
  
  const pagelet        = callElem.parentElement
  const contentDisplay = pagelet.querySelector('.content-display')
  const textarea       = pagelet.querySelector('textarea.input')
  
  const name     = pagelet.dataset.name
  const itemName = `selfpad-${name}`
  
  let fromStorage = localStorage.getItem(itemName)
  if(fromStorage !== null) {
    textarea.value = fromStorage
    if(textarea.value !== '') {
      updateLocalStorage(textarea, pagelet)
      renderTextareaContent(textarea, contentDisplay, pagelet)
    }
  }
  
  let timeoutId = -1
  
  textarea.addEventListener('keydown', keyEvent => {
    if(timeoutId !== -1)
      clearTimeout(timeoutId)
    timeoutId = setTimeout(() => updateLocalStorage(textarea, pagelet), 1000)
    if(keyEvent.ctrlKey && keyEvent.key === 'Enter') {
      updateLocalStorage(textarea, pagelet)
      renderTextareaContent(textarea, contentDisplay, pagelet)
    }
  })
}
  
export async function updateButton(callElem) {
  const pagelet = callElem.closest('.selfpad')
  const textarea = pagelet.querySelector('textarea')
  const contentDisplay = pagelet.querySelector('.content-display')
  
  updateLocalStorage(textarea, pagelet)
  renderTextareaContent(textarea, contentDisplay, pagelet)
}

export async function listPads(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const listElem = pagelet.querySelector(':scope > .list')
  listElem.innerHTML = ''
  let listItemTemplate = document.createElement('template')
  for(let i = 0; i < localStorage.length; i++) {
    const ithKey = localStorage.key(i)
    if(ithKey.startsWith('selfpad-')) {
      const name = ithKey.slice(8) // remove "selfpad-"
      listItemTemplate.innerHTML = /*html*/`<div><a href="/pagelets/selfpad.jhp?name=${name}">${name}</a></div>`
      listElem.appendChild(listItemTemplate.content)
    }
  }
  if(listElem.childElementCount === 0)
    listElem.innerHTML = /*html*/`<span>No selfpads found</span>`
}