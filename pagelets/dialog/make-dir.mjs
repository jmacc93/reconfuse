

export async function makeIt(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const pathInput = pagelet.querySelector('input.filepath')
  const afterUrl = pagelet.dataset.afterurl
  if(!afterUrl)
    afterUrl = `/pagelets/represent-file.jhp?file=${pathInput.value}`
  
  lib.attentionFlashElement(callElem)
  const response = await fetch(`/bin/file.s.js/make?file=${pathInput.value}`)
  if(response.ok) {
    lib.notificationFrom(callElem, 'Success, directory created')
    lib.openPageletAt(callElem, afterUrl, 'replace-noframe this parent .pagelet')
  } else {
    lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  }
}