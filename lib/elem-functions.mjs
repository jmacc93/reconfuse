
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
  // select template
  if(!callElem.hasAttribute('pagelet-src'))
    writeAndThrow(`No pagelet-src attribute for mixinRemotePagelet element`, callElem)
  // else
  let pageletSrc = callElem.getAttribute('pagelet-src')
  
  // get insertion target
  let [insertionLocation, targetSelector] = lib.splitAtFirst(callElem.getAttribute('mixin-target') ?? 'append this', /\s+/)
  if(targetSelector === undefined || targetSelector == null)
    writeAndThrow(`mixinRemotePagelet mixin-target attribute must be of the form: 'insertion-location target-selector'`, callElem, 'template:', template)
  // else:
  
  // find target from selector
  let target = lib.selectTargetElement(callElem, targetSelector) 
  if(target === undefined || target == null) { /// use alt-mixin-target instead
    [insertionLocation, targetSelector] = lib.splitAtFirst(callElem.getAttribute('alt-mixin-target') ?? 'append this', /\s+/)
    if(targetSelector === undefined || targetSelector == null)
      writeAndThrow(`mixinRemotePagelet alt-mixin-target attribute must be of the form: 'insertion-location target-selector'`, callElem, 'template:', template)
    // else:
    
    target = lib.selectTargetElement(callElem, targetSelector)
    if(target === undefined || target === null)
      writeAndThrow(`mixinRemotePagelet neither primary nor alternate target found`, callElem)
  }
  
  let pageletElem
  if(callElem.hasAttribute('framed'))
    pageletElem = await lib.controllerFrameAround(await lib.getRemotePagelet(pageletSrc))
  else
    pageletElem = await lib.getRemotePagelet(pageletSrc)
  
  // insert
  switch(insertionLocation) {
    case 'append': return void target.append(pageletElem)
    case 'replace': return void target.replaceWith(pageletElem)
    case 'slotted-replace':
      
      // mix old children inserts into slots if they're present
      let oldChildInserts = callElem.querySelectorAll(':scope > *[slot]')
      let defaultSlot     = pageletElem.querySelector('slot:not([name]), slot[name=""]')
      for(const insert of oldChildInserts) {
        let correspondingSlot = pageletElem.querySelector(`slot[name="${insert.getAttribute('slot')}"]`)
        if(correspondingSlot ?? false)
          correspondingSlot.replaceWith(insert)
        else if(defaultSlot ?? false)
          defaultSlot.appendChild(insert)
      }
      
      // add mixin's old children back to payload, if <slot name="child-mixin-target"> exists, then put children there
      let defaultChildSlot = pageletElem.querySelector('slot[name="child-mixin-target"]')
      let defaultChildSlotReplacement = (defaultChildSlot ?? false) ? document.createDocumentFragment() : undefined
      if(defaultChildSlotReplacement ?? false) {
        while(callElem.children.length > 0)
          defaultChildSlotReplacement.appendChild(callElem.lastChild)
        defaultChildSlot.replaceWith(defaultChildSlotReplacement)
      }
      
      return void target.replaceWith(pageletElem)
    default: 
      writeAndThrow(`mixinRemotePagelet invalid insertion location ${insertionLocation}`, callElem)
  }
  
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

/**
<call-resource> function
*/
export async function displayNotifications(callFnElement) {
  const lib = await import('/lib/lib.mjs')
  let listenerTarget = lib.selectTargetElement(callFnElement, callFnElement.getAttribute('watch') ?? 'parent *')
  if(!(listenerTarget ?? false)) // is undefined / null (when given bad data-watch attribute)
    return void console.error(`notification display listener target not found`, callFnElement)
  // else:
  listenerTarget.addEventListener('notification', nevent => {
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
    removeButtonElem.addEventListener('click', () => newElem.remove())
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
    
    callFnElement.appendChild(newElem)
    nevent.stopPropagation()
  })
}

export async function copyToClipboard(callElem) {
  if(!callElem.dataset.payload)
    return lib.writeAndThrow('No data-payload attribute for called element', callElem)
  // else
  navigator.clipboard.writeText(callElem.dataset.payload)
  const lib = await import('/lib/lib.mjs')
  lib.notificationFrom(callElem, `Copied`, {transient: true})
}