

export async function submit(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const nameInput = pagelet.querySelector('input')
  
  const file = pagelet.dataset.file
  if(!file)
    return void lib.notificationFrom(callElem, `Bad file argument given (${file})`, {error: true})
  // else
  
  const response = await fetch(`/bin/file.s.js/rename?file=${file}&name=${nameInput.value}`)
  if(response.ok)
    lib.notificationFrom(callElem, `Success`)
  else
    lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
}
