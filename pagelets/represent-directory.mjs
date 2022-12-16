

export async function addOpenButtonFunctionality(callElem) {
  const pagelet      = callElem.closest('.pagelet')
  const openInput    = pagelet.querySelector(':scope > .open-file > input')
  const openButton   = pagelet.querySelector(':scope > .open-file > button.open')
  const asFileButton = pagelet.querySelector(':scope > .open-file > button.as-file')
  const clientDir    = pagelet.dataset.file
  
  openInput.addEventListener('keydown', async downEvent => {
    if(downEvent.key === 'Enter') {
      if(downEvent.altKey)
        asFileButton.click()
      else
        openButton.click()
    }
  })
  
  openButton.addEventListener('click', async clickEvent => {
    const lib = await import('/lib/lib.mjs')
    let filepath = openInput.value
    if(clickEvent.altKey)
      lib.openPageletAt(openButton, filepath, 'replace-noframe this parent .pagelet')
    else
      lib.openPageletAt(openButton, filepath, 'after this parent .open-file')
  })
  
  asFileButton.addEventListener('click', async clickEvent => {
    const lib = await import('/lib/lib.mjs')
    let filepath = `${clientDir.endsWith('/') ? clientDir : clientDir + '/'}` + openInput.value
    if(clickEvent.altKey)
      lib.openPageletAt(asFileButton, '/pagelets/represent-file.jhp?file=' + filepath, 'replace-noframe this parent .pagelet')
    else
      lib.openPageletAt(asFileButton, '/pagelets/represent-file.jhp?file=' + filepath, 'after this parent .open-file')
  })
}


export async function openSimpleEditDialog(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const dialog = await import('/pagelets/dialog/dialog.mjs')
  const file   = lib.getParentMatching(dropdownCallElem, '*[data-file]')?.dataset.file
  if(file === undefined)
    return void lib.notificationFrom(dropdownCallElem, 'Error, no data-file attribute given', {error: true})
  // else
  const initialValue = await fetch(`/bin/file.s.js/raw?file=${file}`).then(response=> response.text())
  const editor = await dialog.simpleEditDialog(initialValue, async (value) => {
    let response = await fetch(`/bin/file.s.js/update?file=${file}`, {method: "PUT", body: value})
    if(response.ok) {
      lib.notificationFrom(editor, `Success, updated file`, {transient: true})
      return true
    } else {
      lib.notificationFrom(editor, `Error: ${response.status}, ${response.statusText}`, {error:true})
    }
  })
  dropdownCallElem.parentElement.insertAdjacentElement('afterend', editor)
}

export async function openSimpleAppendDialog(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const dialog = await import('/pagelets/dialog/dialog.mjs')
  const file   = lib.getParentMatching(dropdownCallElem, '*[data-file]')?.dataset.file
  if(file === undefined)
    return void lib.notificationFrom(dropdownCallElem, 'Error, no data-file attribute given', {error: true})
  // else
  const editor = await dialog.simpleEditDialog('', async (value) => {
    let response = await fetch(`/bin/file.s.js/append?file=${file}`, {method: "PUT", body: value})
    if(response.ok) {
      lib.notificationFrom(editor, `Success, appended to file`, {transient: true})
      return true
    } else {
      lib.notificationFrom(editor, `Error: ${response.status}, ${response.statusText}`, {error:true})
    }
  })
  dropdownCallElem.parentElement.insertAdjacentElement('afterend', editor)
}

export async function openAsList(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const file   = lib.getParentMatching(dropdownCallElem, '*[data-file]')?.dataset.file
  if(file === undefined)
    return void lib.notificationFrom(dropdownCallElem, 'Error, no data-file attribute given', {error: true})
  // else
  lib.openPageletAt(dropdownCallElem.parentElement, `/pagelets/represent-list.jhp?file=${file}`, 'after this')
}