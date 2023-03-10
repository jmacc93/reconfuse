export async function goClicked(callElemButton) {
  const lib = await import('/lib/lib.mjs')
  
  const pagelet   = lib.getParentMatching(callElemButton, '.pagelet')
  const goButton  = pagelet.querySelector(':scope > .goarea > button')
  const goField   = pagelet.querySelector(':scope > .goarea > input')
  
  if(goField.value.length === 0)
    return void lib.notificationFrom(goField, 'Field is empty', {error: true})
  // else
  let response = await fetch(goField.value)
  if(!response.ok) 
    return void lib.notificationFrom(goButton, ['Server returned: ', response.status, ', ', response.statusText].join(''))
  // else
  let newPageletBody = await response.text()
  let newPagelet = lib.makePageletFromSource(newPageletBody)
  let frame = await lib.controllerFrameAround(newPagelet)
  goButton.parentElement.after(frame)
  return void lib.notificationFrom(goButton, "Opened")
}