
export async function installInputFunctionality(callElem) {
  const lib = await import('/lib/lib.mjs')
  const dialog = callElem.closest('.dialog')
  const input  = dialog.querySelector('input') 
  const openButton  = dialog.querySelector('button')
  
  input.addEventListener('input', inputEvent => {
    let oldCaretPos = input.selectionStart
    let repOffset   = 0;
    [input.value, repOffset] = lib.stdTextExpand.withOffset(input.value)
    input.selectionStart = oldCaretPos + repOffset
    input.selectionEnd   = oldCaretPos + repOffset
  })
  input.addEventListener('keydown', downEvent => {
    if(downEvent.ctrlKey && downEvent.key === 'Enter')
      openButton.click()
  })
}

export async function open(callElem) {
  const lib = await import('/lib/lib.mjs')
  const dialog = callElem.closest('.dialog')
  const input  = dialog.querySelector('input')
  
  const destyle = lib.styleInProgress(dialog)
  try {
    let replacement = await lib.getRemotePagelet(input.value)
    dialog.replaceWith(replacement)
  } catch(err) {
    destyle()
    console.error(err)
    lib.notificationFrom(callElem, `Error: ${err.message}`)
  }
}

export async function openAsDirectoryRepresentation(callElem) {
  const lib = await import('/lib/lib.mjs')
  const dialog = callElem.closest('.dialog')
  const input  = dialog.querySelector('input')
  
  const destyle = lib.styleInProgress(dialog)
  try {
    let replacement = await lib.getRemotePagelet(`/pagelets/represent-directory.jhp?directory=${input.value}`)
    dialog.replaceWith(replacement)
  } catch(err) {
    destyle()
    console.error(err)
    lib.notificationFrom(callElem, `Error: ${err.message}`)
  }
}

export async function openAsFileRepresentation(callElem) {
  const lib = await import('/lib/lib.mjs')
  const dialog = callElem.closest('.dialog')
  const input  = dialog.querySelector('input')
  
  const destyle = lib.styleInProgress(dialog)
  try {
    let replacement = await lib.getRemotePagelet(`/pagelets/represent-file.jhp?file=${input.value}`)
    dialog.replaceWith(replacement)
  } catch(err) {
    destyle()
    console.error(err)
    lib.notificationFrom(callElem, `Error: ${err.message}`)
  }
}

export async function openAsListRepresentation(callElem) {
  const lib = await import('/lib/lib.mjs')
  const dialog = callElem.closest('.dialog')
  const input  = dialog.querySelector('input')
  
  const destyle = lib.styleInProgress(dialog)
  try {
    let replacement = await lib.getRemotePagelet(`/pagelets/represent-list.jhp?file=${input.value}`)
    dialog.replaceWith(replacement)
  } catch(err) {
    destyle()
    console.error(err)
    lib.notificationFrom(callElem, `Error: ${err.message}`)
  }
}


