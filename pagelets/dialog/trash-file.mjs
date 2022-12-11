

export async function trashIt(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const pathInput = pagelet.querySelector('input.filepath')
  
  lib.attentionFlashElement(callElem)
  const response = await fetch(`/bin/file.s.js/trash?file=${pathInput.value}`)
  if(response.ok)
    lib.notificationFrom(callElem, 'Success, file trashed')
  else
    lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
}