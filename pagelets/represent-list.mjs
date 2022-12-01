

export async function refresh(callOptionElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callOptionElem.closest('.pagelet')
  const url     = pagelet.dataset.url
  const destyle = lib.styleInProgress(pagelet)
  try {
    let newPagelet = await lib.getRemotePagelet(url)
    pagelet.replaceWith(newPagelet)
  } catch(err) {
    destyle()
    lib.notificationFrom(callOptionElem, `Error, ${err.message}`, {error: true})
  }
}

export async function listIn(callOptionElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callOptionElem.closest('.pagelet')
  const file    = pagelet.dataset.file
  let response = await fetch(`/bin/list.s.js/add?file=${file}`, {method: "PUT"}) // username through cookies
  if(response.ok) {
    lib.notificationFrom(callOptionElem, `Added name`)
    refresh(callOptionElem)
  } else {
    lib.notificationFrom(callOptionElem, `Error: ${response.status}, ${response.statusText}`)
  }
}

export async function listOut(callOptionElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callOptionElem.closest('.pagelet')
  const file    = pagelet.dataset.file
  let response = await fetch(`/bin/list.s.js/remove?file=${file}`, {method: "PUT"}) // username through cookies
  if(response.ok) {
    lib.notificationFrom(callOptionElem, `Removed name`)
    refresh(callOptionElem)
  } else {
    lib.notificationFrom(callOptionElem, `Error: ${response.status}, ${response.statusText}`)
  }
}

