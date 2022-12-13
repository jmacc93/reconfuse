
export async function checkPrivileges(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const file = pagelet.dataset.file
  let updatePrivilege = await fetch(`/bin/group.s.js/has-privilege?file=${file}&privilege=updateFile,appendFile,file`).then(x=>x.text())
  if(updatePrivilege === 'false')
    pagelet.classList.add('no-submit')
}

export async function taggedAppend(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet[data-file]')
  const textarea = pagelet.querySelector(':scope > textarea')
  let response = await fetch(`/bin/file.s.js/append?file=${pagelet.dataset.file}&tagged`, {method:"POST", body: textarea.value})
  if(response.ok) {
    lib.notificationFrom(callElem, 'Appended', {transient: true})
    textarea.value = ''
    pagelet.classList.remove('unsaved')
    return void 0
  } else {
    return void lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  }
}

export async function append(callElemButton) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElemButton.closest('.pagelet[data-file]')
  const textarea = pagelet.querySelector(':scope > textarea')
  let response = await fetch(`/bin/file.s.js/append?file=${pagelet.dataset.file}`, {method:"POST", body: textarea.value})
  if(response.ok) {
    lib.notificationFrom(callElemButton, 'Appended', {transient: true})
    textarea.value = ''
    pagelet.classList.remove('unsaved')
    return void 0
  } else {
    return void lib.notificationFrom(callElemButton, `Error: ${response.status}, ${response.statusText}`, {error: true})
  }
}

export async function setUnsaved(callElem) {
  const pagelet  = callElem.closest('.pagelet')
  const textarea = pagelet.querySelector(':scope > textarea')
  if(textarea.value.length > 0)
    pagelet.classList.add('unsaved')
  else
    pagelet.classList.remove('unsaved')
}