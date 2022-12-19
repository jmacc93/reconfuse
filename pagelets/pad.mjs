async function renderTextareaContent(textarea, contentDisplay, pagelet) {
  const lib = await import('/lib/lib.mjs')
  let trimmedValue = textarea.value.trim()
  let contentType = 'text/markdown'
  let [firstLine, _] = lib.splitAtFirst(textarea.value, /\n/)
  if(firstLine?.startsWith('type:'))
    contentType = firstLine.slice(5).trim() // remove 'type:' and whitespace
  lib.renderContentTo(contentDisplay, trimmedValue, contentType)
}

export async function installFunctionality(callElem) {
  const pagelet        = callElem.parentElement
  const contentDisplay = pagelet.querySelector('.content-display')
  const textarea       = pagelet.querySelector('textarea.input')
  textarea.addEventListener('keydown', keyEvent => {
    if(keyEvent.ctrlKey && keyEvent.key === 'Enter') {
      renderTextareaContent(textarea, contentDisplay, pagelet)
    }
  })
}
  
export async function updateButton(callElem) {
  const pagelet = callElem.closest('.selfpad')
  const textarea = pagelet.querySelector('textarea')
  const contentDisplay = pagelet.querySelector('.content-display')
  
  renderTextareaContent(textarea, contentDisplay, pagelet)
}
