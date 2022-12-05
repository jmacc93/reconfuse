
function writeAndThrow(...args) {
  console.error(...args)
  throw Error(args[0])
}



export async function loadLibSettingsElements(callElem) {
  if(callElem.dataset.called)
    return void 0
  // else
  const libSettings = await import('/lib/settings.mjs')
  const settingSpecs = libSettings.settings
  const pagelet = callElem.closest('.pagelet')
  for(const key in settingSpecs) {
    const spec = settingSpecs[key]
    const {section, longName, templateName} = spec
    let template = pagelet.querySelector(`template.${templateName}`)
    if(!template)
      writeAndThrow(`lib/setting.mjs setting ${key}: no such template ${template}`)
    // else
    const frag = template.content.cloneNode(true)
    const elem = frag.firstElementChild
    elem.dataset.setting = key
    elem.dataset.section = section
    if(spec.placeholder)
      elem.setAttribute('placeholder', spec.placeholder)
    if(spec.title)
      elem.setAttribute('title', spec.title)
    elem.prepend(longName)
    callElem.appendChild(elem)
  }
  callElem.dataset.called = true
}

export async function localStorageCheckboxChange(callElem) {
  const libSettings = await import('/lib/settings.mjs')
  const checkbox = callElem.parentElement.querySelector(':scope > input[type="checkbox"]')
  let setting = checkbox.dataset.setting ?? checkbox.closest('*[data-setting]').dataset.setting
  let settingKey = `setting-${setting}`
  if(setting) {
    let initialValue = (localStorage.getItem(settingKey) ?? 'false') === 'true'
    checkbox.checked = initialValue 
    checkbox.addEventListener('change', () => {
      localStorage.setItem(settingKey, checkbox.checked)
      let settingChangeEvent = new Event(setting); settingChangeEvent.elem = callElem
      settingChangeEvent.newValue = checkbox.checked
      libSettings.settingChanges.dispatchEvent(settingChangeEvent)
    })
  } else {
    console.warn(`localStorageCheckboxChange settings.jhp setting attribute not set`, callElem)
  }
}

export async function localStorageSiblingTextareaChange(callElem) {
  const libSettings = await import('/lib/settings.mjs')
  const textarea = callElem.parentElement.querySelector(':scope > textarea')
  let setting = textarea.dataset.setting ?? textarea.closest('*[data-setting]').dataset.setting
  let settingKey = `setting-${setting}`
  if(setting) {
    let initialValue = localStorage.getItem(settingKey)
    textarea.value = initialValue 
    textarea.addEventListener('change', () => {
      localStorage.setItem(settingKey, textarea.value)
      let settingChangeEvent = new Event(setting); settingChangeEvent.elem = callElem
      settingChangeEvent.newValue = textarea.value
      libSettings.settingChanges.dispatchEvent(settingChangeEvent)
    })
  } else {
    console.warn(`localStorageSiblingTextareaChange settings.jhp setting attribute not set`, callElem)
  }
}

export async function localStorageIntegerTextChange(callElem) {
  const libSettings = await import('/lib/settings.mjs')
  const input = callElem.parentElement.querySelector(':scope > input[type="text"]')
  let setting = input.dataset.setting ?? input.closest('*[data-setting]').dataset.setting
  let settingKey = `setting-${setting}`
  if(setting) {
    let initialValue = parseInt(localStorage.getItem(settingKey))
    input.value = isNaN(initialValue) ? '' : initialValue
    input.addEventListener('change', () => {
      localStorage.setItem(settingKey, input.value)
      let settingChangeEvent = new Event(setting); settingChangeEvent.elem = callElem
      settingChangeEvent.newValue = parseInt(input.value)
      libSettings.settingChanges.dispatchEvent(settingChangeEvent)
    })
  } else {
    console.warn(`localStorageIntegerTextChange settings.jhp setting attribute not set`, callElem)
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