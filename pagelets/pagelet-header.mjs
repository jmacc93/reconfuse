
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

// // old
// export async function getRemotePagelet(src) {
//   // get pagelet body from remote source and make the pagelet
//   const lib = await import('/lib/lib.mjs')
//   let response = await fetch(src)
//   let pageletBody = await response.text()
//   if(pageletBody.length > 0) {
//     return lib.makePageletFromSource(pageletBody)
//     // let pageletElem = document.createElement('template')
//     // pageletElem.innerHTML = pageletBody.trim()
//     // pageletElem = pageletElem.content
//     // lib.replicateAndReplaceScripts(pageletElem)
//     // return pageletElem
//   } else {
//     return undefined
//   }
// }

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

async function decorateTextField(textarea) {
  const lib = await import('/lib/lib.mjs')
  let pagelet = textarea.closest('.pagelet')
  // Text substitutions
  if(!textarea.hasAttribute('no-substitutions')) {
    let attrSubList = textarea.dataset.subtitute?.split(/\s*\;\s*/g).map(x=> x.split(/\s*\:\s*/g)) ?? [] // "a:b; x:y" -> [["a","b"],["x","y"]]
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
    textarea.addEventListener('input',  () => {
      let oldCaretPos = textarea.selectionStart
      let repOffset   = 0;
      [textarea.value, repOffset] = textExpand.withOffset(textarea.value)
      textarea.selectionStart = oldCaretPos + repOffset
      textarea.selectionEnd   = oldCaretPos + repOffset
    })
  }
  // Grow / shrink on scroll
  textarea.addEventListener('wheel', wheelEvent => {
    if(wheelEvent.shiftKey) {
      let height = parseInt(window.getComputedStyle(textarea).height.slice(0, -2))
      height = Math.max(height + Math.ceil(wheelEvent.deltaY / 4), 92)
      textarea.style.height = `${height}px`
    }
  })
  textarea.classList.add('decorated-textfield')
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

