
export async function installGoFieldFunctionality(callElem) {
  const lib = await import('/lib/lib.mjs')
  
  const pagelet   = scriptElem.parentElement
  const goButton  = pagelet.querySelector(':scope > .goarea > button')
  const goField   = pagelet.querySelector(':scope > .goarea > input')
  
  goField.addEventListener('keydown', downEvent => {
    if(downEvent.ctrlKey && downEvent.key === 'Enter') {
      goButton.click()
      goField.value = ''
    }
  })
  goField.addEventListener('change', () => {
    if(!goField.value.startsWith('/'))
      goField.value = '/' + goField.value
  })
  goButton.addEventListener('click', async () => {
    if(goField.value.length === 0)
      return void lib.notificationFrom(goField, 'Field is empty', {error: true})
    // else
    let response = await fetch(goField.value)
    if(!response.ok) 
      return void lib.notificationFrom(goButton, ['Server returned: ', response.status, ', ', response.statusText].join(''))
    // else
    let pageletBody = await response.text()
    let pagelet = lib.makePageletFromSource(pageletBody)
    let frame = await lib.controllerFrameAround(pagelet)
    goButton.parentElement.after(frame)
    return void lib.notificationFrom(goButton, "Opened")
  })
}