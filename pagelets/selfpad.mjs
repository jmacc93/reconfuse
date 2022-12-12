
// const placeholderHtml = /*html*/`<span class="light-color">Write here. It gets stored in local storage on your computer</span>`

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
  localStorage.setItem(itemName, trimmedValue)
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
    if(textarea.value !== '')
      renderTextareaContent(textarea, contentDisplay, pagelet)
  }
  
  textarea.addEventListener('keydown', keyEvent => {
    if(keyEvent.ctrlKey && keyEvent.key === 'Enter')
      renderTextareaContent(textarea, contentDisplay, pagelet)
  })
}
  
export async function updateButton(callElem) {
  const pagelet = callElem.closest('.selfpad')
  const textarea = pagelet.querySelector('textarea')
  const contentDisplay = pagelet.querySelector('.content-display')
  
  renderTextareaContent(textarea, contentDisplay, pagelet)
}