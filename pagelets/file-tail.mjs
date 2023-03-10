export async function initializeContentDisplay(callElem) {
  const lib = await import('/lib/lib.mjs')
  
  const pagelet = callElem.closest('.pagelet')
  const contentDisplay = pagelet.querySelector(':scope > .content-display')
  
  // Also listen for content broadcasts
  const contentChannel = new BroadcastChannel(`content-${pagelet.dataset.file}`)
  contentChannel.addEventListener('message', async messageEvent => {
    let contentText = messageEvent.data
    let lineArray = contentText.split('\n')
    let tailArray = lineArray.slice(lineArray.length - pagelet.dataset.lines)
    contentText = tailArray.join('\n')
    let fileExtension = lib.extname(pagelet.dataset.file)
    if(contentText.length === 0) { // empty content
      let emptyMsgTemplate = document.createElement('template')
      emptyMsgTemplate.innerHTML = /*html*/`<span style="opacity: 50%">...</span>`
      contentDisplay.innerHTML = ''
      contentDisplay.appendChild(emptyMsgTemplate.content)
    } else { // not empty:
      await lib.renderContentTo(contentDisplay, contentText, fileExtension)
    }
  })
  
  let contentResponse = await fetch(`/bin/file.s.js/tail?file=${pagelet.dataset.file}&lines=${pagelet.dataset.lines}`)
  if(contentResponse.ok) {
    let contentText = await contentResponse.text()
    let fileExtension = lib.extname(pagelet.dataset.file)
    if(contentText.length === 0) { // empty content
      let emptyMsgTemplate = document.createElement('template')
      emptyMsgTemplate.innerHTML = /*html*/`<span style="opacity: 50%">...</span>`
      contentDisplay.innerHTML = ''
      contentDisplay.appendChild(emptyMsgTemplate.content)
    } else { // not empty:
      await lib.renderContentTo(contentDisplay, contentText, fileExtension)
    }
  } else if(contentResponse.status === 404) {
    let fofElem = document.createElement('span')
    fofElem.setAttribute('style', 'color: red')
    fofElem.textContent = '404'
    contentDisplay.innerHTML = ''
    contentDisplay.appendChild(fofElem)
  } else {
    contentDisplay.innerHTML = ''
    contentDisplay.textContent = ['Error during response, ', String(contentResponse.status), ', ', contentResponse.statusText].join('')
  }
}