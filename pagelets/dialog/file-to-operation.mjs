


export async function submitOperation(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const pathInput = pagelet.querySelector('input')
  
  const file = pagelet.dataset.file
  const operation = pagelet.dataset.operation
  if(!file)
    return void lib.notificationFrom(callElem, `Bad file argument given (${file})`, {error: true})
  // else
  if(!operation)
    return void lib.notificationFrom(callElem, `Bad operation argument given (${operation})`, {error: true})
  // else
  
  const response = await fetch(`/bin/file.s.js/${operation}?from=${file}&to=${pathInput.value}`)
  if(response.ok)
    lib.notificationFrom(callElem, `Success`)
  else
    lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
}
