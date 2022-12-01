

export async function makeDir(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet[data-file]')
  const clientFile = pagelet.dataset.file
  const doneUrl    = (pagelet.dataset.doneurl === 'undefined') ? undefined : pagelet.dataset.doneurl
  const response = await fetch(`/bin/make-directory.s.js?directory=${clientFile}`)
  if(!response.ok)
    return void callElem.dispatchEvent(lib.bubblingEventWith('notification', {message: response.statusText, options: {error: true}}))
  // else
  lib.openPageletAt(callElem, `${doneUrl ?? `/pagelets/represent-directory.jhp?directory=${clientFile}`}`, 'replace-noframe this parent .pagelet')
}

export async function done(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet[data-file]')
  const clientFile = pagelet.dataset.file
  const doneUrl    = (pagelet.dataset.doneurl === 'undefined') ? undefined : pagelet.dataset.doneurl
  const destyle = lib.styleInProgress(pagelet)
  try {
    let repPagelet = await lib.getRemotePagelet(`${doneUrl ?? `/pagelets/represent-directory.jhp?directory=${clientFile}`}`, lib.ERRORONNOTOK)
    pagelet.replaceWith(repPagelet)
  } catch(err) {
    destyle()
    lib.notificationFrom(callElem, `Error: ${err.message}`, {error: true})
  }
}

export async function reload(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  const doneUrl    = (pagelet.dataset.doneurl === 'undefined') ? undefined : pagelet.dataset.doneurl
  lib.openPageletAt(optionCallElem, `${doneUrl ?? `/pagelets/file-editor.jhp?file=${pagelet.dataset.file}`}`, 'replace-noframe this parent .pagelet')
}

export async function makeFile(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  const response = await fetch(`/bin/file.s.js/make?file=${pagelet.dataset.file}`)
  const doneUrl  = (pagelet.dataset.doneurl === 'undefined') ? undefined : pagelet.dataset.doneurl
  if(!response.ok)
    return void lib.notificationFrom(optionCallElem, ['Server returned: ', response.status, ', ', response.statusText].join(''), {error: true})
  else
    lib.openPageletAt(optionCallElem, `${doneUrl ?? `/pagelets/file-editor.jhp?file=${pagelet.dataset.file}`}`, 'replace-noframe this parent .pagelet')
}

export async function uploadFile(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  const doneUrl = (pagelet.dataset.doneurl === 'undefined') ? undefined : pagelet.dataset.doneurl
  let fakeFileInput = document.createElement('input')
  fakeFileInput.setAttribute('type', 'file')
  fakeFileInput.setAttribute('accept', lib.extname(pagelet.dataset.file))
  fakeFileInput.addEventListener('input', async () => {
    let fileObj = fakeFileInput.files.item(0) // File
    if(fileObj.size > 12e6) // too big (size > 12 MB)
      return void lib.notificationFrom(optionCallElem, 'File too large', {error: true})
    let response = await fetch(`/bin/file.s.js/upload?file=${pagelet.dataset.file}`, {method: "POST", body: fileObj})
    if(response.ok)
      lib.openPageletAt(optionCallElem, `${doneUrl ?? `/pagelets/represent-file.jhp?file=${pagelet.dataset.file}`}`, 'replace-noframe this parent .pagelet')
    else
      return void lib.notificationFrom(optionCallElem, ['Server returned: ', response.status, ', ', response.statusText].join(''), {error: true})
  })
  fakeFileInput.click()
}

export async function copyFrom(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const dialog = await import('/pagelets/dialog/dialog.mjs')
  const pagelet = optionCallElem.closest('.pagelet')
  const doneUrl = (pagelet.dataset.doneurl === 'undefined') ? undefined : pagelet.dataset.doneurl

  optionCallElem.parentElement.insertAdjacentElement("afterend", dialog.simpleLineDialog('', async value => {
    response = await fetch(`/bin/file.s.js/copy?to=${pagelet.dataset.file}&from=${value}`)
    if(!response.ok)
      return void lib.notificationFrom(`Server returned: ${response.status}, ${response.statusText}`, {error: true})
    // else
    lib.openPageletAt(optionCallElem, `${doneUrl ?? `/pagelets/file-editor.jhp?file=${pagelet.dataset.file}`}`, 'replace-noframe this parent .pagelet')
    return true
  }))
}
