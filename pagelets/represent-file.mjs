
export async function makeIt(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  let response = await fetch(`/bin/file.s.js/make?file=${pagelet.dataset.file}`, {method: 'PUT'})
  if(response.ok) {
    reload(dropdownCallElem)
  } else {
    lib.notificationFrom(dropdownCallElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  }
}

export async function uploadIt(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  let fakeFileInput = document.createElement('input')
  fakeFileInput.setAttribute('type', 'file')
  fakeFileInput.setAttribute('accept', lib.extname(pagelet.dataset.file))
  fakeFileInput.addEventListener('input', async () => {
    let fileObj = fakeFileInput.files.item(0) // File
    if(fileObj.size > 12e6) // too big (size > 12 MB)
      return void lib.notificationFrom(dropdownCallElem, 'File too large', {error: true})
    // let response = await fetch(`/bin/file.s.js/upload?file=${pagelet.dataset.file}`, {method: "POST", body: fileObj})
    
    const notificationElem = document.createElement('span')
    notificationElem.innerHTML = `Upload progress: <progress></progress>`
    const progressElem = notificationElem.querySelector('progress')

    lib.notificationFrom(dropdownCallElem, notificationElem)

    // await fetch(`/bin/file.s.js/upload?file=${pagelet.dataset.file}`, {method: "POST", body: fileObj})

    let response = await new Promise((res) => {
      let request = new XMLHttpRequest()
      request.upload.addEventListener('progress', progressEvent => {
        if(progressEvent.lengthComputable)
          progressElem.value = progressEvent.loaded / progressEvent.total;
      })
      request.addEventListener('load', loadEvent => res(request))
      request.open('POST', `/bin/file.s.js/upload?file=${pagelet.dataset.file}`, true)
      request.send(fileObj)
    })
    
    notificationElem.innerHTML = 'Upload complete'
    
    if(response.status === 200)
      lib.openPageletAt(dropdownCallElem, `${pagelet.dataset.doneUrl ?? `/pagelets/represent-file.jhp?file=${pagelet.dataset.file}`}`, 'replace-noframe this parent .pagelet')
    else
      notificationElem.innerHTML = `Server returned ${response.status}, ${response.statusText}`
  })
  fakeFileInput.click()
}

export async function reload(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  const destyle = lib.styleInProgress(pagelet)
  try {
    const replacementPagelet = await lib.getRemotePagelet(pagelet.dataset.url, lib.ERRORONNOTOK)
    pagelet.replaceWith(replacementPagelet)
  } catch(err) {
    destyle()
    lib.notificationFrom(dropdownCallElem, `Error: ${err.message}`, {error: true})
  }
}

export async function openDirectory(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  const destyle = lib.styleInProgress(pagelet)
  try {
    const replacementPagelet = await lib.getRemotePagelet(`/pagelets/represent-file.jhp?file=${lib.dirname(pagelet.dataset.file)}`, lib.ERRORONNOTOK)
    pagelet.replaceWith(replacementPagelet)
  } catch(err) {
    destyle()
    lib.notificationFrom(dropdownCallElem, `Error: ${err.message}`, {error: true})
  }
}

export async function enframe(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  let frame = await lib.controllerFrameAround()
  pagelet.replaceWith(frame)
  frame.appendChild(pagelet)
}

export async function copyUrl(dropdownCallElem) {
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  navigator.clipboard.writeText(pagelet.dataset.file)
  const lib = await import('/lib/lib.mjs')
  lib.notificationFrom(dropdownCallElem, `Copied`, {transient: true})
}

export async function initializeContentDisplay(callElem) {
  const lib = await import('/lib/lib.mjs')
  
  const pagelet = callElem.closest('.pagelet')
  const rawDisplay     = pagelet.querySelector(':scope > .raw-display')
  const contentDisplay = pagelet.querySelector(':scope > .content-display')
  const focus = pagelet.dataset.focus
  const file = pagelet.dataset.file
  const tail = parseInt(pagelet.dataset.tail ?? '0')
  
  const contentChannel = new BroadcastChannel(`content-${file}`)
  contentChannel.addEventListener('message', async messageEvent => {
    let contentText = messageEvent.data
    if(tail > 0) { // only keep last N lines
      let contentLines = contentText.split('\n')
      contentLines = contentLines.slice(-tail)
      contentText = contentLines.join('\n')
    }
    rawDisplay.textContent = contentText
    let fileExtension = lib.extname(file)
    if(contentText.length === 0) { // empty content
      let emptyMsgTemplate = document.createElement('template')
      emptyMsgTemplate.innerHTML = /*html*/`<span style="opacity: 50%">...</span>`
      contentDisplay.innerHTML = ''
      contentDisplay.appendChild(emptyMsgTemplate.content)
    } else { // not empty:
      await lib.renderContentTo(contentDisplay, contentText, fileExtension)
      if(focus) {
        let focusElem = contentDisplay.querySelector(`#${focus}`)
        if(focusElem)
          focusElem.classList.add('highlighted')
      }
    }
  })
  
  let contentResponse = await ((tail === 0) ? fetch(`/bin/file.s.js/raw?file=${file}`) : fetch(`/bin/file.s.js/tail?file=${file}&lines=${tail}`))
  if(contentResponse.ok) {
    new BroadcastChannel(`content-${file}`).postMessage(await contentResponse.text())
  } else if(contentResponse.status === 404) {
    let fofElem = document.createElement('span')
    fofElem.setAttribute('style', 'color: red')
    fofElem.textContent = '404'
    rawDisplay.textContent = '404'
    contentDisplay.innerHTML = ''
    contentDisplay.appendChild(fofElem)
  } else {
    rawDisplay.textContent = ['Error during response, ', String(contentResponse.status), ', ', contentResponse.statusText].join('')
    contentDisplay.innerHTML = ''
    contentDisplay.textContent = rawDisplay.textContent
  }
}
