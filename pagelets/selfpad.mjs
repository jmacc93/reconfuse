
// const placeholderHtml = /*html*/`<span class="light-color">Write here. It gets stored in local storage on your computer</span>`

async function renderTextareaContent(textarea, contentDisplay, pagelet) {
  const lib = await import('/lib/lib.mjs')
  let trimmedValue = textarea.value.trim()
  if(trimmedValue === '') {
    localStorage.removeItem(pagelet.dataset.name)
  } else {
    if(pagelet.dataset.contenttype) { // content type given
      lib.renderContentTo(contentDisplay, trimmedValue, pagelet.dataset.contenttype)
    } else { // try getting content type from first line
      let contentType = 'text/markdown'
      let [firstLine, _] = lib.splitAtFirst(textarea.value, /\n/)
      if(firstLine?.startsWith('type:'))
        contentType = firstLine.slice(5).trim() // remove 'type:' and whitespace
      lib.renderContentTo(contentDisplay, trimmedValue, contentType)
    }
    localStorage.setItem(pagelet.dataset.name, trimmedValue)
  }
}

export async function installFunctionality(callElem) {
    const lib = await import('/lib/lib.mjs')
    
    const pagelet        = callElem.parentElement
    const contentDisplay = pagelet.querySelector('.content-display')
    const textarea       = pagelet.querySelector('textarea.input')
    
    const padName = pagelet.dataset.name
    
    // const textExpand = lib.makeTextExpander({
    //   ...lib.stdTextExpansions,
    //   ["!PAD"]: {to: ()=>`${pagelet.dataset.name}`, endPosition: -1}
    // })
          
    let fromStorage = localStorage.getItem(padName)
    if(fromStorage !== null) {
      textarea.value = fromStorage
      if(textarea.value !== '')
        renderTextareaContent(textarea, contentDisplay, pagelet)
    }
    
    // textarea.addEventListener('input', inputEvent => {
    //   let oldCaretPos = textarea.selectionStart
    //   let repOffset   = 0;
    //   [textarea.value, repOffset] = textExpand.withOffset(textarea.value)
    //   textarea.selectionStart = oldCaretPos + repOffset
    //   textarea.selectionEnd   = oldCaretPos + repOffset
    // })
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