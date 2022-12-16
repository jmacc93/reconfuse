

export async function refresh(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  const url     = pagelet.dataset.url
  const destyle = lib.styleInProgress(pagelet)
  try {
    let newPagelet = await lib.getRemotePagelet(url)
    pagelet.replaceWith(newPagelet)
  } catch(err) {
    destyle()
    lib.notificationFrom(dropdownCallElem, `Error, ${err.message}`, {error: true})
  }
}

export async function listIn(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  const file    = pagelet.dataset.file
  let response = await fetch(`/bin/list.s.js/add?file=${file}`, {method: "PUT"}) // username through cookies
  if(response.ok) {
    lib.notificationFrom(dropdownCallElem, `Added name`)
    refresh(dropdownCallElem)
  } else {
    lib.notificationFrom(dropdownCallElem, `Error: ${response.status}, ${response.statusText}`)
  }
}

export async function listOut(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = lib.getParentMatching(dropdownCallElem, '.pagelet')
  const file    = pagelet.dataset.file
  let response = await fetch(`/bin/list.s.js/remove?file=${file}`, {method: "PUT"}) // username through cookies
  if(response.ok) {
    lib.notificationFrom(dropdownCallElem, `Removed name`)
    refresh(dropdownCallElem)
  } else {
    lib.notificationFrom(dropdownCallElem, `Error: ${response.status}, ${response.statusText}`)
  }
}

