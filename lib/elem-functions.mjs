
export async function clickToCall(callElem) {
  const lib = await import('/lib/lib.mjs')
  let watchTarget = lib.selectTargetElement(callElem, callElem.getAttribute('watch') ?? 'parent *')
  if(watchTarget === undefined)
    return void console.error(`No suitable target found to watch in clickToCall`, callElem)
  let clickCallElem, ctrlClickCallElem
  if(callElem.hasAttribute('callwhich')) {
    let whichSelector = callElem.getAttribute('callwhich')
    clickCallElem     = lib.selectTargetElement(callElem, whichSelector)
    if(ctrlClickCallElem === undefined)
      console.warn(`clickToCall could not find given callwhich element (${whichSelector})`, callElem)
  }
  if(callElem.hasAttribute('ctrl-callwhich')) {
    let ctrlWhichSelector = callElem.getAttribute('ctrl-callwhich')
    ctrlClickCallElem     = lib.selectTargetElement(callElem, ctrlWhichSelector)
    if(ctrlClickCallElem === undefined)
      console.warn(`clickToCall could not find given ctrl-callwhich element (${ctrlWhichSelector})`, callElem)
  }
  if(clickCallElem !== undefined || ctrlClickCallElem !== undefined) {
    watchTarget.addEventListener('click', clickEvent => {
      if(clickEvent.ctrlKey && ctrlClickCallElem !== undefined)
        ctrlClickCallElem.callFns()
      else if(clickCallElem !== undefined)
        clickCallElem.callFns()
    })
  } else {
    console.warn(`clickToCall no suitable <call-resource>s found for selectors`, callElem)
  }
}

/**
call-resource-button element
*/
export async function toggleClassname(callElem) {
  const lib = await import('/lib/lib.mjs')
  const target = lib.selectTargetElement(callElem, callElem.getAttribute('which') ?? 'this parent *')
  if(target === undefined)
    return void console.warn('toggleClassname could not find a suitable target')
  // else
  
  const classname = callElem.getAttribute('classname')
  if(classname === undefined)
    return void console.warn('toggleClassname caller element has no classname attribute')
  // else
    
  target.classList.toggle(classname)
}

/**
call-resource-button element
*/
export async function toggleHidden(callElem) {
  const lib = await import('/lib/lib.mjs')
  const target = lib.selectTargetElement(callElem, callElem.getAttribute('which') ?? 'this parent')
  if(target === undefined)
    return void console.warn('toggleClassname could not find a suitable target')
  // else
  
  target.hidden = !target.hidden
}

/**
call-resource-button element
*/
export async function setAttributeValue(callElem) {
  const lib = await import('/lib/lib.mjs')
  const target = lib.selectTargetElement(callElem, callElem.getAttribute('which') ?? 'this parent')
  if(target === undefined)
    return void console.warn('setAttributeValue could not find a suitable target')
  // else
  
  const attribute = callElem.getAttribute('attribute')
  if(attribute === undefined)
    return void console.warn('setAttributeValue not attribute attribute given')
  // else
  
  const value = callElem.getAttribute('value')
  if(value === undefined)
    return void console.warn('setAttributeValue not value attribute given')
  // else
  
  target.setAttribute(attribute, value)
}


/**
Attributes:
  pagelet-src
  mixin-target
  alt-mixin-target
*/
export async function mixinRemotePagelet(callElem) {
  const lib = await import('/lib/lib.mjs')
  
  let pageletSrc = callElem.getAttribute('pagelet-src')
  if(!pageletSrc)
    writeAndThrow(`No pagelet-src attribute for mixinRemotePagelet element`, callElem)
  // else
  
  let mixinTarget = callElem.getAttribute('target') ?? callElem.getAttribute('mixin-target')
  if(!mixinTarget)
    writeAndThrow(`No target attribute for mixinRemotePagelet element`, callElem)
  // else
  
  lib.openPageletAt(callElem, pageletSrc, mixinTarget)
}


export async function removeElement(callElem) {
  const lib = await import('/lib/lib.mjs')
  if(!callElem.hasAttribute('which'))
    return void console.error(`removeElement element has no which attribute`, callElem)
  // else
  let target = lib.selectTargetElement(callElem, callElem.getAttribute('which'))
  if(!(target ?? false))
    return void console.error(`removeElement no target for removal found`, target)
  // else
  target.remove()
}

export async function removeMatching(callElem) {
  const lib = await import('/lib/lib.mjs')
  const fromTargetSelector = callElem.getAttribute('from')
  if(!fromTargetSelector)
    return void console.error(`removeMatching element has no from attribute`, callElem)
  // else
  const query = callElem.getAttribute('query')
  if(!query)
    return void console.error(`removeMatching element has no query attribute`, callElem)
  // else
  const fromTarget = lib.selectTargetElement(callElem, fromTargetSelector)
  for(const toRemove of fromTarget.querySelectorAll(query))
    toRemove.remove()
}

export async function testGenerateNotifications(callElem) {
  const lib = await import('/lib/lib.mjs')
  lib.notificationFrom(callElem, `Test notification ${(new Date).toUTCString()}`)
}

/**
<call-resource> function
*/
export async function displayNotifications(callElem) {
  const lib = await import('/lib/lib.mjs')
  let listenerTarget = lib.selectTargetElement(callElem, callElem.getAttribute('watch') ?? 'parent *')
  if(!(listenerTarget ?? false)) // is undefined / null (when given bad data-watch attribute)
    return void console.error(`notification display listener target not found`, callElem)
  // else:
  const removeAllButton = document.createElement('button')
  removeAllButton.classList.add('linklike')
  removeAllButton.style.display = 'none'
  removeAllButton.textContent = 'X-all'
  removeAllButton.addEventListener('click', clickEvent => {
    for(const toRemove of callElem.querySelectorAll(':scope > .notification'))
      toRemove.remove()
    removeAllButton.style.display = 'none'
  })
  callElem.appendChild(removeAllButton)
  listenerTarget.addEventListener('notification', nevent => {
    removeAllButton.style.display = 'block'
    let newElem = document.createElement('div')
    newElem.classList.add('notification')
    
    let timeoutId
    const toggleSticky = (status) => {
      let isNowSticky = status ?? !newElem.classList.contains('sticky')
      newElem.classList.toggle('sticky', isNowSticky)
      stickyButtonElem.classList.toggle('active-glow', isNowSticky)
      if(isNowSticky) {
        clearTimeout(timeoutId)
      } else {
        timeoutId = setTimeout(()=> {
          if(!newElem.classList.contains('sticky') && newElem.isConnected)
            newElem.remove()
        }, 3000)
      }
    }
    
    // remove button
    let removeButtonElem = document.createElement('button')
    removeButtonElem.textContent = 'X'
    removeButtonElem.classList.add('linklike')
    removeButtonElem.addEventListener('click', () => {
      newElem.remove()
      if(!callElem.querySelector(':scope > .notification'))
        removeAllButton.style.display = 'none'
    })
    newElem.appendChild(removeButtonElem)
    
    // sticky button
    let stickyButtonElem = document.createElement('button')
    stickyButtonElem.textContent = 'S'
    stickyButtonElem.classList.add('linklike')
    stickyButtonElem.addEventListener('click', () => toggleSticky() )
    newElem.appendChild(stickyButtonElem)
    
    // message
    let messageElem 
    if(nevent.message instanceof HTMLElement)
      messageElem = nevent.message
    else if(typeof nevent.message === 'string')
      messageElem = lib.plaintextElement('span', nevent.message)
    newElem.appendChild(messageElem)
    
    if(nevent.options?.error ?? false)
      newElem.classList.add('error')
    toggleSticky(!(nevent.options?.transient ?? false)) // defaults to sticky (aka: not transient)
    
    callElem.appendChild(newElem)
    nevent.stopPropagation()
  })
}

export async function copyToClipboard(callElem) {
  if(!callElem.dataset.payload)
    return lib.writeAndThrow('No data-payload attribute for called element', callElem)
  // else
  navigator.clipboard.writeText(callElem.dataset.payload)
  const lib = await import('/lib/lib.mjs')
  lib.attentionFlashElement(callElem)
  lib.notificationFrom(callElem, `Copied`, {transient: true})
}

export async function makeIntoDragHandle(callElem) {
  const lib = await import('/lib/lib.mjs')
  
  let draggableElem = lib.selectTargetElement(callElem, callElem.getAttribute('draggable-target'))
  if(!(draggableElem ?? false))
    return void console.error(`makeIntoDragHandle no target for removal found`, callElem)
  // else
  
  let hoveredDropzone
  let documentMoveHandler, documentUpHandler, clearListeners, destyleAll
  
  destyleAll = () => {
    for(const dropHovered of document.querySelectorAll('.drop-hovered')) {
      dropHovered.classList.remove('drop-hovered')
      dropHovered.classList.remove('top-hovered')
      dropHovered.classList.remove('bottom-hovered')
    }
  }
  
  clearListeners = () => {
    destyleAll()
    draggableElem.classList.remove('being-dragged')
    document.body.classList.remove('dragging-element')
    document.removeEventListener('mousemove', documentMoveHandler)
    document.removeEventListener('mouseup', documentUpHandler)
  }
  
  documentMoveHandler = moveEvent => {
    if(moveEvent.buttons !== 1) // primary button was released and not detected the usual way, remove listeners
      return void clearListeners()
    // else
    destyleAll()
    hoveredDropzone = moveEvent.target?.closest('*[droptarget-srcfn]')
    if(hoveredDropzone) {
      hoveredDropzone.classList.add('drop-hovered')
      const dropzoneRect = hoveredDropzone.getBoundingClientRect()
      const center = (dropzoneRect.bottom + dropzoneRect.top)/2
      if(moveEvent.clientY < center)
        hoveredDropzone.classList.add('top-hovered')
      else
        hoveredDropzone.classList.add('bottom-hovered')
    }
  }
  
  documentUpHandler = async () => {
    if(hoveredDropzone) {
      let splitSrcfns = hoveredDropzone.getAttribute('droptarget-srcfn')?.split(/\s+;\s+/g)
      for(const srcfn of splitSrcfns) {
        let [src, fnlist] = lib.splitAtFirst(srcfn, /:/g) ?? [undefined, undefined]
        if(!src)
          lib.writeAndThrow(`Bad droptarget-srcfn given ${srcfn}`, callElem, hoveredDropzone, draggableElem)
        // else
        let exports = await import(src)
        for(let fn of fnlist.split(/\s+,\s+/g)) {
          fn = fn.trim()
          if(!(fn in exports))
            lib.writeAndThrow(`No function ${fn} in module ${src}`, callElem, hoveredDropzone, draggableElem)
          // else
          await exports[fn](hoveredDropzone, draggableElem)
        }
      }
    }
    clearListeners()
  }
  
  callElem.addEventListener('mousedown', downEvent => {
    draggableElem.classList.add('being-dragged')
    document.body.classList.add('dragging-element')
    document.addEventListener('mousemove', documentMoveHandler)
    document.addEventListener('mouseup', documentUpHandler, {once: true})
  })
}

export async function insertDroppedElement(callElem, draggable) {
  if(callElem.classList.contains('top-hovered'))
    callElem.insertAdjacentElement('beforebegin', draggable)
  else if(callElem.classList.contains('bottom-hovered'))
    callElem.insertAdjacentElement('afterend', draggable)
}

export async function appendDroppedElement(callElem, draggable) {
  callElem.appendChild(draggable)
}