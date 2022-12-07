
export async function showPreview(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet  = callElem.closest('.pagelet')
  const textarea = pagelet.querySelector('textarea')
  const display  = pagelet.querySelector('.preview-display')
  const file     = pagelet.dataset.file
  const ext      = lib.extname(file)
  lib.renderContentTo(display, textarea.value, ext)
}

export async function submit(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const file = pagelet.dataset.file
  if(!file)
    return void console.error(`No data-file attribute given on edit-file pagelet`)
  // else
  const textarea = pagelet.querySelector(':scope > textarea')
  let response = await fetch(`/bin/file.s.js/update?file=${file}`, {method: "POST", body: textarea.value})
  if(!response.ok)
    return void lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  // else
  pagelet.classList.remove('unsaved')
  const initialElem = pagelet.querySelector(':scope > .initial-value')
  initialElem.textContent = textarea.value
  lib.notificationFrom(callElem, `Success`, {transient: true})
}

export async function installCtrlEnterFunctionality(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const textarea = pagelet.querySelector(':scope > textarea')
  textarea.addEventListener('keydown', downEvent => {
    if(downEvent.ctrlKey && downEvent.key === 'Enter')
      submit(callElem)
  })
}

export async function setUnsavedClassOnEdit(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const textarea = pagelet.querySelector(':scope > textarea')
  const initialElem = pagelet.querySelector(':scope > .initial-value')
  textarea.addEventListener('input', () => {
    if(textarea.value === initialElem.textContent)
      pagelet.classList.remove('unsaved')
    else
      pagelet.classList.add('unsaved')
  })
}

export async function setInitialValue(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const textarea = pagelet.querySelector(':scope > textarea')
  const initialElem = pagelet.querySelector(':scope > .initial-value')
  const file = pagelet.dataset.file
  let response = await fetch(`/bin/file.s.js/raw?file=${file}`)
  if(!response.ok)
    return void lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  // else
  const initialValue = await response.text()
  initialElem.textContent = initialValue
  textarea.value = initialValue
}
