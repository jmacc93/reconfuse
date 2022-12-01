

export async function localStorageCheckboxChange(callElem) {
  const checkbox = callElem.parentElement.querySelector(':scope > input[type="checkbox"]')
  let setting = checkbox.dataset.setting
  if(setting) {
    let initialValue = (localStorage.getItem(`setting-${setting}`) ?? 'false') === 'true'
    checkbox.checked = initialValue 
    checkbox.addEventListener('change', () => {
        localStorage.setItem(`setting-${setting}`, checkbox.checked)
    })
  } else {
    console.warn(`localStorageCheckboxChange settings.jhp setting attribute not set`, callElem)
  }
}

export async function saveSelfpadData(_callElem) {
  let obj = {}
  for(let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if(key.startsWith('selfpad-'))
      obj[key] = window.localStorage.getItem(key)
  }
  let dataBlob = new Blob([JSON.stringify(obj)], {type : 'application/json'})
  let dataUrl = URL.createObjectURL(dataBlob)
  let fakeLink = document.createElement('a')
  fakeLink.href = dataUrl
  fakeLink.setAttribute('download', 'selfpad-data.json')
  document.body.appendChild(fakeLink)
  fakeLink.click()
  URL.revokeObjectURL(dataUrl)
}

export async function loadSelfpadData(_callElem) {
  let selectFile = document.createElement('input')
  selectFile.setAttribute('type', 'file')
  selectFile.setAttribute('accept', '.json')
  
  selectFile.addEventListener('input', async inputEvent => {
    let file = selectFile.files.item(0)
    let fileContent = await file.text()
    
    let fileObj = JSON.parse(fileContent)
    for(const key in fileObj)
      window.localStorage.setItem(key, fileObj[key])
  })
  selectFile.click()
}