
export async function makeIt(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  let response = await fetch(`/bin/file.s.js/make?file=${pagelet.dataset.file}`, {method: 'PUT'})
  if(response.ok) {
    reload(optionCallElem)
  } else {
    lib.notificationFrom(optionCallElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  }
}

export async function uploadIt(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  let fakeFileInput = document.createElement('input')
  fakeFileInput.setAttribute('type', 'file')
  fakeFileInput.setAttribute('accept', lib.extname(pagelet.dataset.file))
  fakeFileInput.addEventListener('input', async () => {
    let fileObj = fakeFileInput.files.item(0) // File
    if(fileObj.size > 12e6) // too big (size > 12 MB)
      return void lib.notificationFrom(optionCallElem, 'File too large', {error: true})
    let response = await fetch(`/bin/file.s.js/upload?file=${pagelet.dataset.file}`, {method: "POST", body: fileObj})
    if(response.ok)
      lib.openPageletAt(optionCallElem, `${pagelet.dataset.doneUrl ?? `/pagelets/represent-file.jhp?file=${pagelet.dataset.file}`}`, 'replace-noframe this parent .pagelet')
    else
      lib.notificationFrom(optionCallElem, ['Server returned: ', response.status, ', ', response.statusText].join(''), {error: true})
  })
  fakeFileInput.click()
}

export async function reload(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  const destyle = lib.styleInProgress(pagelet)
  try {
    const replacementPagelet = await lib.getRemotePagelet(pagelet.dataset.url, lib.ERRORONNOTOK)
    pagelet.replaceWith(replacementPagelet)
  } catch(err) {
    destyle()
    lib.notificationFrom(optionCallElem, `Error: ${err.message}`, {error: true})
  }
}

export async function openSimpleEditDialog(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  lib.openPageletAt(optionCallElem, `/pagelets/dialog/edit-file.html?file=${pagelet.dataset.file}`, 'after this parent select')
}

export async function openSimpleAppendDialog(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  lib.openPageletAt(optionCallElem, `/pagelets/dialog/append-to-file.jhp?file=${pagelet.dataset.file}`, 'after this parent select')
}

export async function openEditor(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  let donePart = '&doneUrl=' + encodeURIComponent(`/pagelets/file-editor.jhp?file=${pagelet.dataset.file}`)
  const destyle = lib.styleInProgress(pagelet)
  try {
    const replacementPagelet = await lib.getRemotePagelet(`/pagelets/file-editor.jhp?file=${pagelet.dataset.file}${donePart}`, lib.ERRORONNOTOK)
    pagelet.replaceWith(replacementPagelet)
  } catch(err) {
    destyle()
    lib.notificationFrom(optionCallElem, `Error: ${err.message}`, {error: true})
  }
}

export async function openDirectory(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  const destyle = lib.styleInProgress(pagelet)
  try {
    const replacementPagelet = await lib.getRemotePagelet(`/pagelets/represent-file.jhp?file=${lib.dirname(pagelet.dataset.file)}`, lib.ERRORONNOTOK)
    pagelet.replaceWith(replacementPagelet)
  } catch(err) {
    destyle()
    lib.notificationFrom(optionCallElem, `Error: ${err.message}`, {error: true})
  }
}

export async function enframe(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  let frame = await lib.controllerFrameAround()
  pagelet.replaceWith(frame)
  frame.appendChild(pagelet)
}

export async function copyUrl(optionCallElem) {
  const pagelet = optionCallElem.closest('.pagelet')
  navigator.clipboard.writeText(pagelet.dataset.file)
  const lib = await import('/lib/lib.mjs')
  lib.notificationFrom(optionCallElem, `Copied`, {transient: true})
}

export async function initializeContentDisplay(callElem) {
  const lib = await import('/lib/lib.mjs')
  
  const pagelet = callElem.closest('.pagelet')
  const contentDisplay = pagelet.querySelector(':scope > .content-display')
  const focus = pagelet.dataset.focus
  
  // let contentResponse = await fetch('${args.raw === 'true' ? '/bin/file.s.js/raw?file=' : ''}${clientFile}')
  let contentResponse = await fetch(`/bin/file.s.js/raw?file=${pagelet.dataset.file}`)
  if(contentResponse.ok) {
    let contentText = await contentResponse.text()
    if(contentText.length === 0) { // empty content
      let emptyMsgTemplate = document.createElement('template')
      emptyMsgTemplate.innerHTML = /*html*/`<span style="opacity: 50%">...</span>`
      contentDisplay.appendChild(emptyMsgTemplate.content)
    } else { // not empty:
      await lib.renderContentTo(contentDisplay, contentText, contentResponse.headers.get('content-type') ?? 'text/plain')
      if(focus) {
        let focusElem = contentDisplay.querySelector(`#${focus}`)
        if(focusElem)
          focusElem.classList.add('highlighted')
      }
    }
  } else if(contentResponse.status === 404) {
    let newLink = document.createElement('a')
    newLink.href = `/pagelets/file-editor.jhp?file=${pagelet.dataset.file}`
    newLink.setAttribute('target', "replace-noframe this parent .pagelet")
    newLink.setAttribute('style', 'color: red')
    newLink.textContent = '404'
    contentDisplay.innerHTML = ''
    contentDisplay.appendChild(newLink)
  } else {
    contentDisplay.innerHTML = ''
    contentDisplay.textContent = ['Error during response, ', String(contentResponse.status), ', ', contentResponse.statusText].join('')
  }
}