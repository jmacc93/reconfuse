

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
    let inputValue = openInput.value
    if(inputValue.startsWith('/'))
      inputValue = inputValue.slice(1)
    let filepath = `${clientDir.endsWith('/') ? clientDir : clientDir + '/'}` + inputValue
    if(clickEvent.altKey)
      lib.openPageletAt(asFileButton, '/pagelets/represent-file.jhp?file=' + filepath, 'replace-noframe this parent .pagelet')
    else
      lib.openPageletAt(asFileButton, '/pagelets/represent-file.jhp?file=' + filepath, 'after this parent .open-file')
  })
}

export async function openAsList(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const file   = lib.getParentMatching(dropdownCallElem, '*[data-file]')?.dataset.file
  if(file === undefined)
    return void lib.notificationFrom(dropdownCallElem, 'Error, no data-file attribute given', {error: true})
  // else
  lib.openPageletAt(dropdownCallElem.parentElement, `/pagelets/represent-list.jhp?file=${file}`, 'after this')
}