
// This file is specific to reconfuse

let tablerIconsPngLocation = '/media/icons/tabler-icons-png/'
let tablerIconsFontLocation = '/media/icons/'

let basicEscset = await import('./basic-escm.mjs').then(imps => imps.basicEscset)

export const extendedEscset = {...basicEscset}


function trimNewlines(str) {
  return str.match(/^(\n*)([\s\S]*?)(\n*)$/)[2] ?? str
}

//#region helper functions
function elementThen(tag, fn = undefined) {
  let ret = document.createElement(tag)
  fn?.(ret)
  return ret
}
function plaintextElement(tag, text) {
  let ret = document.createElement(tag)
  if(!(text ?? false)) // text is null or undefined
    return undefined
  else if(typeof text === 'string')
    ret.innerText = text
  else
    ret.innerText = String(text)
  return ret
}

/**
groupElement('span', [elem1, elem2, ...]) -> <span>elem1 elem2 ...</span>
groupElement(tag, innerElements)
Puts the HTMLElements in the innerElements array into a new element with the given tag
*/
function groupElement(tag, children) {
  let ret = elementThen(tag)
  for(const child of children) {
    if(child ?? false) // child is defined
      ret.appendChild(child)
  }
  return ret
}

/**
errorElement("Wrong arguments")
Standard error element with the given message msg
*/
function errorElement(msg) {
  return elementThen('span', ret => {
    ret.innerText = msg;
    ret.classList.add('bes-error')
  }) 
}

/**
toggleElementClass(elem, 'active')
toggleElementClass(elem, class)
Adds or removes the given class from elem to 'toggle' it
*/
function toggleElementClass(elem, cla) {
  if(elem.classList.contains(cla))
    elem.classList.remove(cla)
  else
    elem.classList.add(cla)
} 

/**
asElement(obj) turns obj into an HTMLElement as best it can
Use this when you don't care what obj is, but you want it to be an HTMLElement
*/
function asElement(obj) {
  if(!(obj ?? false)) { // null or undefined
    return undefined
  } else if(obj instanceof HTMLElement) {
    return obj
  } else if(typeof obj === 'string') {
    return plaintextElement('span', obj)
  } else if(typeof obj === 'object') { // array or {...} object
    if(Array.isArray(obj)) {
      if(obj.length == 1)
        return asElement(obj[0])
      else
        return groupElement('span', obj.map(asElement))
    } else {
      return plaintextElement('span', obj)
    }
  } else { // is some other type
    return plaintextElement('span', obj)
  }
}

/**
asString(obj) turns obj into a string as best it can
*/
function asString(obj) {
  if(!(obj ?? false)) // null or undefined
    return undefined
  else if(obj instanceof HTMLElement) {
    return obj.innerText
  } else if(typeof obj === 'string') {
    return obj
  } else if(Array.isArray(obj)) {
    if(obj.length === 1)
      return asString(obj[0])
    else
      return String(obj.join(', '))
  } else {
    return String(obj)
  }
}

/**
For getting the given object at index from an htmlelement or array, all else is undefined
*/
function getIndex(obj, index) {
  if(typeof obj === 'object') { // object, array, HTMLElement
    if(Array.isArray(obj)) // array
      return obj[index]
    else if(obj instanceof HTMLElement) // element
      return obj.children[index]
    else // generic object
      return undefined
  } else if(index === 0) {
    return obj
  } else {
    return undefined
  }
}

/**
getArgNumber(args, 0, 'string')
getArgNumber(args, 1, 'element')
[firstArg, secondArg] = [getArgNumber(args, 0, 'element'), getArgNumber(args, 1, 'element')]
getArgNumber(arg, 0, 'element') same as: asElement(arg)
*/
function getArgNumber(args, num, type) {
  let ret = getIndex(args, num)
  if(ret === undefined || ret === null)
    return undefined
  switch(type) {
    case 'string':
      return asString(ret)
    case 'number':
      if(typeof ret === 'number')
        return ret
      else
        return undefined
    case 'element':
      return asElement(ret)
    default:
      return ret
  }
}

extendedEscset.mixin = {
  evaluate: (arg) => {
    let urlArg = getArgNumber(arg, 0, 'string').trim()
    if(!/^\//.test(urlArg)) // doesn't start with  '/' 
      return errorElement('Argument should be a url which starts with "/"')
    // else
    let ret = document.createElement('html-mixin')
    ret.setAttribute('src', urlArg)
    return ret
  }
}

extendedEscset.frame = {
  evaluate: (arg) => {
    let ret = document.createElement('span')
    setTimeout(async ()=>{
      let lib = await import('/lib/lib.mjs')
      let elem = asElement(arg)
      ret.replaceWith(await lib.controllerFrameAround(elem))
    })
    return ret
  }
}

let tablerIconsInitialized = false
function initializeTablerIcons() {
  if(tablerIconsInitialized) {
    return true
  } else if(!document.head.querySelector('style.tabler-fonts')) {
    let fontLoaderStylesheetBody = /*css*/`
      @font-face {
        font-family: "tabler-icons";
        font-style: normal;
        font-weight: 400;
        src: url("${tablerIconsFontLocation}tabler-icons.woff2") format("woff2"), url("${tablerIconsFontLocation}tabler-icons.woff") format("woff"), url("${tablerIconsFontLocation}tabler-icons.ttf") format("truetype");
      }
    `
    let styleElem = document.createElement('style')
    styleElem.textContent = fontLoaderStylesheetBody
    styleElem.classList.add('tabler-fonts')
    document.head.appendChild(styleElem)
    let linkElem = document.createElement('link')
    linkElem.setAttribute('href', `${tablerIconsFontLocation}tabler-icons.css`)
    linkElem.setAttribute('rel', 'stylesheet')
    document.head.appendChild(linkElem)
    tablerIconsInitialized = true
    return true
  }
}

extendedEscset.ticon = {
  evaluate: (arg) => {
    initializeTablerIcons()
    let iconName = getArgNumber(arg, 0, 'string')
    if(iconName) {
      let ret = document.createElement('span')
      ret.classList.add(`ti-${iconName}`, 'ti')
      return ret
    } else {
      return undefined
    }
  }
}

basicEscset.copyable = {
  evaluate: (args) => {
    const [contentArg, payload] = [getArgNumber(args, 0, 'element'), getArgNumber(args, 1, 'string')]
    if(!(contentArg ?? false))
      return errorElement('\\copyable first element is undefined')
    if(!(payload ?? false))
      return errorElement('\\copyable second argument is undefined')
    return elementThen('button', copyButton => {
      copyButton.appendChild(contentArg)
      copyButton.dataset.payload = payload
      copyButton.classList.add('linklike')
      copyButton.addEventListener('click', async clickEvent => {
        const elemFunctions = await import('/lib/elem-functions.mjs')
        elemFunctions.copyToClipboard(copyButton)
      })
    })
  },
  argDelimiter: /\|/,
  expectedArgCount: 2
}