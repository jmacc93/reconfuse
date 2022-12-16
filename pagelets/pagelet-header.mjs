
//#region fadin observer


const fadeinObserver = new MutationObserver((records) => {
  for(const mutationRecord of records) {
    if(mutationRecord.type === 'childList') {
      for(const child of mutationRecord.addedNodes) {
        if(child instanceof HTMLElement) {
          child.classList.add('just-added')
          setTimeout(() => {
            child.classList.remove('just-added')
          }, 200)
        }
      }
    }
  }
})
fadeinObserver.observe(document.body, {childList: true, subtree: true})


//#endregion

//#region pagelet link behaviors

let moddedLinkSet = new WeakSet

async function addLinkFunctionality(elem) {
  let href = elem.getAttribute('href').trim()
  
  let mixinMatch = href.match(/^(?:https?:\/\/)?mixin(?:-([\S\-]+))?\:/)
  if(mixinMatch) {
    const lib = await import('/lib/lib.mjs')
    let pagelet = await lib.getRemotePagelet(href.slice(mixinMatch[0].length)) // href without '...mixin:'
    let rep = pagelet
    let useFrame = true, frameCollapsed = false
    if(mixinMatch[1] !== undefined) { // -options capture
      let options = mixinMatch[1].split('-')
      for(const option of options) switch(option) {
        case 'noframe':
          useFrame = false
          break
        case 'collapsed':
          frameCollapsed = true
          break
      }
    }
    if(useFrame) {
      rep = await lib.controllerFrameAround(rep)
      if(frameCollapsed)
        rep.setAttribute('data-expanded', 'false')
    }
    setTimeout(async ()=> elem.replaceWith(rep), 200)
    return void 0
  }
  // else
  
  if(href.startsWith('http')) { // don't mod external links or non-pagelet files
    if(!elem.hasAttribute('target'))
      elem.setAttribute('target', '_blank')
    return void 0
  }
  // else

  elem.addEventListener('click', handleLinkClicked)
  moddedLinkSet.add(elem)
}

function addLinkFunctionalityToElementAndChildren(elem) {
  if(elem instanceof HTMLAnchorElement)
    addLinkFunctionality(elem)
  for(const link of elem.querySelectorAll('a')) {
    if(!moddedLinkSet.has(link))
      addLinkFunctionality(link)
  }
}

const linkObserver = new MutationObserver((records) => {
  for(const mutationRecord of records) {
    if(mutationRecord.type === 'childList') {
      for(const child of mutationRecord.addedNodes) {
        if(child instanceof HTMLElement) 
          addLinkFunctionalityToElementAndChildren(child)
      }
    }
  }
})
linkObserver.observe(document.body, {childList: true, subtree: true})
addLinkFunctionalityToElementAndChildren(document.body)

let defaultLinkTargets = {
  ctrlClick:  '_blank',
  altClick:   '_blank',
  shiftClick: '_blank',
  click:      'after this'
}

async function handleLinkClicked(clickEvent) {
  const thisElem = clickEvent.currentTarget
  clickEvent.preventDefault()
  const lib = await import('/lib/lib.mjs')
  let res
  if(clickEvent.ctrlKey)
    res = lib.openPageletAt(thisElem, thisElem.getAttribute('href'), thisElem.getAttribute('ctrltarget')  ?? defaultLinkTargets.ctrlClick)
  else if(clickEvent.altKey)
    res = lib.openPageletAt(thisElem, thisElem.getAttribute('href'), thisElem.getAttribute('alttarget')   ?? defaultLinkTargets.altClick)
  else if(clickEvent.shiftKey)
    res = lib.openPageletAt(thisElem, thisElem.getAttribute('href'), thisElem.getAttribute('shifttarget') ?? defaultLinkTargets.shiftClick)
  else // regular un-modified click
    res = lib.openPageletAt(thisElem, thisElem.getAttribute('href'), thisElem.getAttribute('target')      ?? defaultLinkTargets.click)
  // const link = clickEvent.target
  res.catch(err => {
    lib.notificationFrom(thisElem, `Error: ${err.message}`, {error: true})
  })
}

//#endregion

//#region image expansion behaviors

function decorateImageChildren(elem) {
  if(elem instanceof HTMLImageElement)
    decorateImage(img)
  for(const img of elem.querySelectorAll('img:not(.decorated-img)'))
    decorateImage(img)
}

const imageObserver = new MutationObserver((records) => {
  for(const mutationRecord of records) {
    if(mutationRecord.type === 'childList') {
      for(const child of mutationRecord.addedNodes) {
        if(child instanceof HTMLElement) 
          decorateImageChildren(child)
      }
    }
  }
})
imageObserver.observe(document.body, {childList: true, subtree: true})
decorateImageChildren(document.body)

function decorateImage(img) {
  let downLocation = [0, 0]
  let downSize
  img.draggable = false; img.style['user-select'] ="none"
  img.style['min-width'] = '16px'
  let dragHandler = (mouseEvent) => {
    if(mouseEvent.buttons !== 0) {
      let offset = mouseEvent.clientX - downLocation[0]
      img.style.width = `${downSize + offset}px`
    }
  }
  img.addEventListener('mousedown',  (mouseEvent) => {
    downLocation = [mouseEvent.clientX, mouseEvent.clientY]
    downSize = parseInt(window.getComputedStyle(img).width.slice(0, -2))
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', dragHandler)
    }, {once: true})
    document.addEventListener('mousemove', dragHandler)
  })
  img.classList.add('decorated-img')
}

//#endregion


//#region automatically decorate textareas

function decorateTextFieldChildren(elem) {
  if(elem.matches('textarea:not(.decorated-textfield)') || elem.matches('input[type="text"]:not(.decorated-textfield)'))
    decorateTextField(img)
  for(const img of elem.querySelectorAll('textarea:not(.decorated-textfield)'))
    decorateTextField(img)
  for(const img of elem.querySelectorAll('input[type="text"]:not(.decorated-textfield)'))
    decorateTextField(img)
}

const textareaObserver = new MutationObserver((records) => {
  for(const mutationRecord of records) {
    if(mutationRecord.type === 'childList') {
      for(const child of mutationRecord.addedNodes) {
        if(child instanceof HTMLElement) 
          decorateTextFieldChildren(child)
      }
    }
  }
})
textareaObserver.observe(document.body, {childList: true, subtree: true})
decorateTextFieldChildren(document.body)

async function decorateTextField(textfield) {
  const lib = await import('/lib/lib.mjs')
  let pagelet = textfield.closest('.pagelet')
  
  textfield.classList.add('decorated-textfield')
  
  // Text substitutions
  if(!textfield.hasAttribute('no-substitutions')) {
    let attrSubList = textfield.dataset.substitute?.split(/\s*\;\s*/g).map(x=> x.split(/\s*\:\s*/g)) ?? [] // "a:b; x:y" -> [["a","b"],["x","y"]]
    const textExpansionSpec = {...lib.stdTextExpansions}
    for(const attrSub of attrSubList)
      if(attrSub.length === 2)
        textExpansionSpec['!' + attrSub[0].toUpperCase()] = {to: ()=>attrSub[1], endPosition: -1}
    if(pagelet) {
      if(pagelet.dataset.file)
        textExpansionSpec['!FILE'] = {to: ()=>pagelet.dataset.file, endPosition: -1}
      if(pagelet.dataset.dir)
        textExpansionSpec['!DIR'] = {to: ()=>pagelet.dataset.dir, endPosition: -1}
      if(pagelet.dataset.url)
        textExpansionSpec['!URL'] = {to: ()=>pagelet.dataset.url, endPosition: -1}
    }
    const textExpand = lib.makeTextExpander(textExpansionSpec)
    textfield.addEventListener('input',  () => {
      let oldCaretPos = textfield.selectionStart
      let repOffset   = 0;
      [textfield.value, repOffset] = textExpand.withOffset(textfield.value)
      textfield.selectionStart = oldCaretPos + repOffset
      textfield.selectionEnd   = oldCaretPos + repOffset
    })
  }
  
  // Grow / shrink on scroll
  if(textfield instanceof HTMLTextAreaElement) {
    textfield.addEventListener('wheel', wheelEvent => {
      if(wheelEvent.shiftKey) {
        let height = parseInt(window.getComputedStyle(textfield).height.slice(0, -2))
        height = Math.max(height + Math.ceil(wheelEvent.deltaY / 4), 92)
        textfield.style.height = `${height}px`
        wheelEvent.stopImmediatePropagation()
        wheelEvent.stopPropagation()
      }
    })
  }
  
  // ctrl-enter, enter, alt-enter, etc functionality
  const ctrlEnterSrcfn  = textfield.getAttribute('ctrl-enter-srcfn')
  const altEnterSrcfn   = textfield.getAttribute('alt-enter-srcfn')
  const shiftEnterSrcfn = textfield.getAttribute('shift-enter-srcfn')
  const enterSrcfn      = textfield.getAttribute('enter-srcfn')
  if(ctrlEnterSrcfn || altEnterSrcfn || shiftEnterSrcfn || enterSrcfn) {
    const lib = await import('/lib/lib.mjs')
    let [ctrlEnterSrc, ctrlEnterFn]   = lib.splitAtFirst(ctrlEnterSrcfn  , /:/)?.map(x=>x?.trim()) ?? [undefined, undefined]
    let [altEnterSrc, altEnterFn]     = lib.splitAtFirst(altEnterSrcfn   , /:/)?.map(x=>x?.trim()) ?? [undefined, undefined]
    let [shiftEnterSrc, shiftEnterFn] = lib.splitAtFirst(shiftEnterSrcfn , /:/)?.map(x=>x?.trim()) ?? [undefined, undefined]
    let [enterSrc, enterFn]           = lib.splitAtFirst(enterSrcfn      , /:/)?.map(x=>x?.trim()) ?? [undefined, undefined]
    textfield.addEventListener('keydown', async downEvent => {
      if(downEvent.key === 'Enter') {
        if(ctrlEnterSrc  && downEvent.ctrlKey)  callFunctionInModule(ctrlEnterSrc  , ctrlEnterFn  , textfield)
        if(altEnterSrc   && downEvent.altKey)   callFunctionInModule(altEnterSrc   , altEnterFn   , textfield)
        if(shiftEnterSrc && downEvent.shiftKey) callFunctionInModule(shiftEnterSrc , shiftEnterFn , textfield)
        if(enterSrc)                            callFunctionInModule(enterSrc      , enterFn      , textfield)
      }
    })
  }
  
  // Override default ctrl-s, history navigation alt-left / alt-right, etc functionality
  textfield.addEventListener('keydown', downEvent => {
    if(downEvent.key === 's' && downEvent.ctrlKey)
      downEvent.preventDefault()
    else if(downEvent.key === 'ArrowRight' && downEvent.altKey)
      downEvent.preventDefault()
    else if(downEvent.key === 'ArrowLeft' && downEvent.altKey)
      downEvent.preventDefault()
  })
  
  // input functionality
  const inputSrcfn  = textfield.getAttribute('input-srcfn')
  if(inputSrcfn) {
    const lib = await import('/lib/lib.mjs')
    let [inputSrc, inputFn] = lib.splitAtFirst(inputSrcfn, /:/)?.map(x=>x?.trim()) ?? [undefined, undefined]
    textfield.addEventListener('input', inputEvent => {
      callFunctionInModule(inputSrc, inputFn, textfield, inputEvent)
    })
  }
  // change functionality
  const changeSrcFn  = textfield.getAttribute('input-srcfn')
  if(changeSrcFn) {
    const lib = await import('/lib/lib.mjs')
    let [changeSrc, changeFn] = lib.splitAtFirst(changeSrcFn, /:/)?.map(x=>x?.trim()) ?? [undefined, undefined]
    textfield.addEventListener('change', changeEvent => {
      callFunctionInModule(changeSrc, changeFn, textfield, changeEvent)
    })
  }
}

async function callFunctionInModule(modName, fnName, ...args) {
  let mod = await import(modName)
  if(!mod)
    throw Error(`No such module ${modName}`)
  // else
  let fn = mod[fnName]
  if(!fn)
    throw Error(`No function ${fnName} in module ${modName}`)
  // else
  fn(...args)
}

//#endregion

class DecoratedTextareaElement extends HTMLTextAreaElement {
  constructor() {
    super()
    this.addEventListener('wheel', wheelEvent => {
      if(wheelEvent.shiftKey) {
        let height = parseInt(window.getComputedStyle(this).height.slice(0, -2))
        height = Math.max(height + Math.ceil(wheelEvent.deltaY / 4), 92)
        this.style.height = `${height}px`
      }
    })
  }
}
if(!customElements.get('decorated-textarea'))
  customElements.define('decorated-textarea', DecoratedTextareaElement, {extends: 'textarea'})


function makeTemplate(source) {
  let template = document.createElement('template')
  template.innerHTML = source
  return template
}

let headerTemplate
setTimeout(async ()=>{
  let response = await fetch('/pagelets/pagelet-header.html')
  if(!response.ok)
    return void console.error(`ERROR: pagelet-header.mjs could not get pagelet-header.html`)
  // else
  headerTemplate = makeTemplate(await response.text())
})

