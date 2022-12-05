
// const lib = await import('/lib/lib.mjs')

// /**
// Everything in this file is a <call-resource> function, or a helper function for one
// */
// export function writeAndThrow(...args) {
//   console.error(...args)
//   throw Error(args[0])
// }


// /**
// (originally from elib.mjs)
// Splits at the first occurrence of the splitter regex
// lib.splitAtFirst('asdfg', /d/)
// Returns ['as','fg']
// */
// function lib.splitAtFirst(str, splitter) {
//   let match = splitter.exec(str)
//   if(match === null)
//     return undefined
//   else
//     return [str.substring(0, match.index), str.substring(match.index + match[0].length, str.length)]
// }


// /**
// (originally from elib.mjs)
// */
// function getNextSiblingMatching(startElem, selector) {
//   let elem = startElem
//   while(true) {
//     elem = startElem.nextElementSibling
//     if(!(elem ?? false)) // elem is null; no next sibling
//       return undefined
//     // else:
//     if(elem.matches(selector))
//       return elem
//   }
// }
// /**
// (originally from elib.mjs)
// */
// function getPrevSiblingMatching(startElem, selector) {
//   let elem = startElem
//   while(true) {
//     elem = startElem.previousElementSibling
//     if(!(elem ?? false)) // elem is null; no previous sibling
//       return undefined
//     // else:
//     if(elem.matches(selector))
//       return elem
//   }
// }

// export function copyAttributesInto(elemA, elemB) {
//   for(const attr of elemA.attributes)
//     elemB.setAttribute(attr.name, attr.value)
// }

// /**
// <script> elements created via innerHTML won't execute,
// this is a workaround for script elements
// plmx.lib.replicateAndReplaceScripts(parentElementMadeWithInnerHTML)
// This replaces all child scripts with functionally equivalent scripts
// */
// export function lib.replicateAndReplaceScripts(elem) {
//   for(const childScript of elem.querySelectorAll('script')) {
//     let replica = document.createElement('script')
//     if(childScript.hasAttributes())
//       copyAttributesInto(childScript, replica)
//     replica.textContent = childScript.textContent
//     childScript.replaceWith(replica)
//   }
// }



// /**
// Helper function
// (originally for callib.mjs)
// Select a standard target element around the given element
// DIRECTION SPECIFIER
// parent         *          -- ancestors via .closest
// child          *          -- children via .querySelector
// relative       * >> *     -- searches up for a parent, then searches down for a child
// sibling        *          -- searches parent's depth-1 children
// next           *          -- following siblings via getSiblingMatching
// prev           *          -- preceding siblings via getSiblingMatching
// broadcast      *          -- broadcast channel via new BroadcastChannel
// body           *          -- document.body (then child, or body if no specifier given)
// document       *          -- document (then child, or document if no specifier given)
// global         *          -- a globalThis variable name
// globaltarget   *          -- a globalThis variable name of a EventTarget, makes if it doesn't exist
// this                      -- just returns the element
// */
// export function lib.selectTargetElement(elem, code) {
//   let direction, specifier, noSpecifierGiven
//   if(Array.isArray(code)) 
//     [direction, specifier] = code
//   else if(typeof code === 'string')
//     [direction, specifier] = lib.splitAtFirst(code, /\s+/) ?? [code, ''] // default to ignoring specifier
//   else
//     return void console.error(`bad 'code' paremeter for lib.selectTargetElement`, elem, code, Error(``))
//   if((specifier ?? '') === '') { // no specifier given
//     specifier  = '*'  // default to anything
//     noSpecifierGiven = true
//   }
//   direction = direction.trim()
//   specifier = specifier.trim()
//   switch(direction) {
//     case 'this'     : return elem
//     case 'parent'   : return elem.closest(specifier)
//     case 'prev'     : return getPrevSiblingMatching(elem, specifier)
//     case 'next'     : return getNextSiblingMatching(elem, specifier)
//     case 'child'    : return elem.querySelector(specifier)
//     case 'children' : return elem.querySelectorAll(specifier)
//     case 'sibling'  : return elem.parentElement?.querySelector(`:scope > ${specifier}`)
//     case 'siblings' : return elem.parentElement?.querySelectorAll(`:scope > ${specifier}`)
//     case 'relative':
//       let splitSpecifier = specifier.split('>>').map(x=> x.trim())
//       if(splitSpecifier.length !== 2)
//         return void console.error(`relative lib.selectTargetElement specifer not of the form 'relative * >> *'`, elem, code, Error(``))
//       // else:
//       let parent = elem.closest(splitSpecifier[0])
//       if(!(parent ?? false ))
//         return void console.error(`relative lib.selectTargetElement parent not found`, elem, code, Error(``))
//       // else:
//       return parent.querySelector(splitSpecifier[1])
//     case 'broadcast':
//       if(noSpecifierGiven)
//         return void console.error(`No specifier given for broadcast target in lib.selectTargetElement`, elem, code, Error(``))
//       else
//         return new BroadcastChannel(specifier)
//     case 'document':
//       if(noSpecifierGiven)
//         return document
//       else
//         return document.querySelector(specifier)
//     case 'body':
//       if(noSpecifierGiven)
//         return document.body
//       else
//         return document.body.querySelector(specifier)
//     case 'globaltarget':
//       if(noSpecifierGiven)
//         return void console.error(`No specifier for 'globaltarget' target in lib.selectTargetElement`, elem, code, Error(``))
//       else 
//         return (globalThis[specifier] ??= new EventListener())
//     case 'global':
//       if(noSpecifierGiven)
//         return void console.error(`No specifier for 'global' target in lib.selectTargetElement`, elem, code, Error(``))
//       else 
//         return specifier
//     default:
//       return void console.error(`bad callib.mjs lib.selectTargetElement target selector`, elem, code)
//   }
// }

// /**
// A helper function for applying a function to target elements from an attribute
// eg: 
//   <call-resource srcfn="..." which="parent .pagelet">
// Corresponds to:
//   applyFunctionToSelectedTarget(callElem, 'which ?? this', target => {...})
// The targetAttribute parameter can have the form 'attribute-name ?? default-selector'
// Where if the attribute with name 'attribute-name' isn't found in elem, then selector 'default-selector' is used
// Last parameter is options:
//   required = bool: targetAttribute must be given and the default value is never used
//   mustFindTarget = bool: logs an error if no suitable target is found
// */
// function applyFunctionToSelectedTarget(elem, targetAttribute, fn, opts) {
//   let [realTargetAttribute, defaultTargetAttributeValue] = lib.splitAtFirst(targetAttribute, /\?\?/g)
//   realTargetAttribute = realTargetAttribute.trim()
//   defaultTargetAttributeValue = defaultTargetAttributeValue?.trim()
//   let attributeValue
//   if(!elem.hasAttribute(realTargetAttribute)) {
//     if(opts.required ?? false)
//       return console.error(`No target selector attribute ${realTargetAttribute} given`, elem)
//     // else
//     if(!defaultTargetAttributeValue)
//       return console.error(`Target selector attribute not given and no default value given ${realTargetAttribute}`, elem)
//     // else
//     attributeValue = defaultTargetAttributeValue
//   } else {
//     attributeValue = elem.getAttribute(realTargetAttribute)
//   }
//   let target = lib.selectTargetElement(elem, attributeValue)
//   if(!(target ?? false)) {
//     if(opts.mustFindTarget ?? false)
//       console.error(`Target selector found no suitable target ${realTargetAttribute}="${attributeValue}"`, elem)
//     return void 0
//   }
//   // else
//   if(target instanceof NodeList) {
//     for(const child of target)
//       fn(child)
//   } else {
//     fn(target)
//   }
// }

// /**
// Locates the standard pipe target (usually next call-resource) and dispatches a callpipe event
// to that element with the given data
// */
// function handlePiping(pipeSource, data) {
//   let pipeTargetSelector = pipeSource.getAttribute('pipeto')
//   if(pipeTargetSelector?.startsWith('none'))
//     return void 0
//   // else:
//   let target = lib.selectTargetElement(pipeSource, pipeTargetSelector ?? 'this')
//   if(target !== undefined) {
//     let pipeEvent = new CustomEvent('callpipe')
//     pipeEvent.data = data
//     target.dispatchEvent(pipeEvent)
//   }
// }

// function getTargetFromAttribute(elem, attr, def = 'parent *') {
//   let selector = elem.getAttribute(attr) ?? def
//   return lib.selectTargetElement(elem, selector)
// }

// /**
// For collected data from child elements with given data-item="FOR KEY [PROP]"
// Where FOR is an identifier for the group of elements to collect from,
// KEY is the key to associate with the element's value
// PROP is the property to use to get the value from the element (eg: 'value' from <input type="text">)
// */
// export function collectDataFromChildren(searchFrom, forStr) {
//   let ret = {}
//   for(const dataElem of searchFrom.querySelectorAll(`*[data-item^="${forStr}"]`)) {
//     const [_, key, prop] = dataElem.dataset.item.split(/\s+/)
//     if(key === undefined)
//       return void console.error(`error in disc.mjs collectData; bad data-item attribute`, searchFrom, forStr, key)
//     // else:
//     if(prop !== undefined) { // property to get explicitly given
//       if(!(prop in dataElem))
//         return void console.error(`error in disc.mjs collectData, requested property ${prop} not present in data-item attribute`, dataElem)
//       // else:
//       ret[key] = dataElem[prop]
//     } else {
//       ret[key] = dataElem.checked ?? dataElem.valueAsNumber ?? dataElem.valueAsDate ?? dataElem.value
//     }
//   }
//   return ret
// }

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

// export async function copyTextContentToClipboard(callElem) {
//   const copyTarget = lib.selectTargetElement(callElem, 'which', 'parent *')
//   if(copyTarget !== undefined)
//     navigator.clipboard.writeText(copyTarget.textContent)
//   else
//     console.warn(`copyTextContentToClipboard could not find a suitable target`, callElem)
// }

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

// /**
// Helper; used by some of the following elements
// If sync attribute given: polls the server for the given file
// Otherwise it just gets the file once
// Calls the given callback on the received text
// Sets the 'etag' attribute for the given element
// */
// function _fileTo_Helper(callElem, handleResponseTextCallback) {
//   let sync = callElem.hasAttribute('synced')
//   let file = callElem.getAttribute('file')
//   if(file === undefined)
//     return void console.error(`No file attribute given for _fileTo_Helper <call-resource> element`, callElem, Error(``))
//   // else:
//   const initialPollingDelay = 500
//   let pollingDelay = initialPollingDelay // controls the polling delay
//   const syncFunction = async () => {
//     if(!callElem.isConnected)
//       return void 0 // stop polling because element isn't in the dom anymore
//     // else 
//     let etag = callElem.getAttribute('etag')
//     let response = await fetch(file, (etag !== null || etag !== '') ? { headers: { "If-None-Match": etag } } : {})
//     if(response.status === 200) {
//       callElem.toggleAttribute('not-found', false)
//       let newEtag = response.headers.get('ETag')
//       if(newEtag !== null && newEtag !== '')
//         callElem.setAttribute('etag', newEtag)
//       let responseText = await response.text()
//       handleResponseTextCallback(responseText)
//       handlePiping(callElem, responseText)
//       pollingDelay = initialPollingDelay
//     } else if(response.status === 304) { // 304: file hasn't changed
//       // do nothing
//       callElem.toggleAttribute('not-found', false)
//       pollingDelay += 500
//     } else {
//       callElem.toggleAttribute('not-found', true)
//       pollingDelay += 5000
//     }
//     if(sync)
//       setTimeout(syncFunction, pollingDelay)
//   }
//   syncFunction()
// }

// /**
// Gets raw file contents from server and sets its textContent to that
// Also, if synced attribute given then upon receiving a content event
// it updates the file on the server with the event's content
// */
// export async function fileToTextContent(callElem) {
//   _fileTo_Helper(callElem, text => {
//     callElem.textContent = text
//   })
//   if(callElem.hasAttribute('synced')) {
//     callElem.addEventListener('content', async (contentEvent) => {
//       let notificationEvent = new CustomEvent('notification', {bubbles: true, composed: true})
//       if(callElem.hasAttribute('not-found')) {
//         let file = callElem.getAttribute('file')
//         let opts = {method: "POST", body: contentEvent.content}
//         let res = await fetch(`/create-file.s.js${file}`, opts)
//         if(res.status === 200) {
//           notificationEvent.message = 'File created'
//         } else {
//           notificationEvent.message = `Server returned status ${res.status}: ${res.statusText}`
//         }
//       } else if(contentEvent.content !== callElem.textContent) {
//         let file = callElem.getAttribute('file')
//         let opts = {method: "POST", body: contentEvent.content}
//         if(callElem.hasAttribute('etag')) opts.etag = callElem.getAttribute('etag')
//         let res = await fetch(`/bin/file.s.js/update?file=${file}`, opts)
//         if(res.status === 200) {
//           notificationEvent.message = 'Synced'
//         } else if(res.status === 404) {
//           notificationEvent.message = `File ${file} doesn't exist`
//         } else {
//           notificationEvent.message = `Server returned status ${res.status}: ${res.statusText}`
//         }
//       } else {
//         notificationEvent.message = 'No change'
//       }
//       callElem.dispatchEvent(notificationEvent)
//     })
//   }
// }

// export async function fileToElementProperty(callElem) {
//   if(!callElem.hasAttribute('which'))
//     return void console.error(`fileToElementProperty element has no which attribute`, callElem)
//   // else
  
//   let property = callElem.getAttribute('property')
//   if(!(property ?? false) || property === '') // undefined or empty
//     return console.error(`fileToElementProperty bad property attribute`, callElem)
//   //else
  
//   _fileTo_Helper(callElem, text => {
//     applyFunctionToSelectedTarget(callElem, 'which ?? child *', (target) => {
//       target[property] = text
//     }, {required: true, mustFindTarget:true})
//   })
// }

// export async function mixinTemplate(callElem) {
//   // select template
//   let template = lib.selectTargetElement(callElem, callElem.getAttribute('which-template') ?? 'child template') 
//   if(template === undefined || template == null)
//     return void console.error(`mixinTemplate no suitable template found`, callElem)
//   // else
  
//   // check template is a <template>
//   else if(!(template instanceof HTMLTemplateElement))
//     return void console.error(`mixinTemplate template selector points to an element not a template`, template, callElem)
//   // else
  
//   // get payload and select insertion point
//   let templatePayload = template.content.cloneNode(true)
//   let [insertionLocation, targetSelector] = lib.splitAtFirst(callElem.getAttribute('mixin-target') ?? 'append this', /\s+/)
//   if(targetSelector === undefined || targetSelector == null)
//     return void console.error(`mixinTemplate mixin-target attribute must be of the form: 'insertion-location target-selector'`, callElem, 'template:', template)
//   // else:
  
//   let target = lib.selectTargetElement(callElem, targetSelector) 
//   if(target === undefined || target == null) { /// use alt-mixin-target instead
//     [insertionLocation, targetSelector] = lib.splitAtFirst(callElem.getAttribute('alt-mixin-target') ?? 'append this', /\s+/)
//     if(targetSelector === undefined || targetSelector == null)
//       return void console.error(`mixinTemplate alt-mixin-target attribute must be of the form: 'insertion-location target-selector'`, callElem, 'template:', template)
//     // else:
    
//     target = lib.selectTargetElement(callElem, targetSelector)
//     if(target === undefined || target === null)
//       return void console.error(`mixinTemplate neither primary nor alternate target found`, callElem)
//   }
  
//   // insert
//   switch(insertionLocation) {
//     case 'append':  return void target.append(templatePayload)
//     case 'replace': return void target.replaceWith(templatePayload)
//     case 'after':   return void target.insertAdjacentElement("afterend", pageletElem)
//     case 'slotted-replace':
      
//       // mix old children inserts into slots if they're present
//       let oldChildInserts = callElem.querySelectorAll(':scope > *[slot]')
//       let defaultSlot     = templatePayload.querySelector('slot:not([name]), slot[name=""]')
//       for(const insert of oldChildInserts) {
//         let correspondingSlot = templatePayload.querySelector(`slot[name="${insert.getAttribute('slot')}"]`)
//         if(correspondingSlot ?? false)
//           correspondingSlot.replaceWith(insert)
//         else if(defaultSlot ?? false)
//           defaultSlot.appendChild(insert)
//       }
      
//       // add mixin's old children back to payload, if <... class="... child-mixin-target"> exists, then put children there
//       let defaultChildSlot = templatePayload.querySelector('*[class~="child-mixin-target"]')
//       let defaultChildSlotReplacement = (defaultChildSlot ?? false) ? document.createDocumentFragment() : undefined
//       if(defaultChildSlotReplacement ?? false) {
//         while(callElem.children.length > 0)
//           defaultChildSlotReplacement.appendChild(callElem.lastChild)
//         defaultChildSlot.replaceWith(defaultChildSlotReplacement)
//       }
      
//       return void target.replaceWith(templatePayload)
//     default: 
//       return void console.error(`mixinTemplate invalid insertion location ${insertionLocation}`, callElem, 'template:', template)
//   }
  
// }

// export async function getRemotePagelet(src) {
//   // get pagelet body from remote source and make the pagelet
//   let response = await fetch(src)
//   if(!response.ok)
//     return writeAndThrow(`mixinRemotePagelet server returned status ${response.status}: ${response.statusText}`)
//   // else
//   let pageletBody = await response.text()
//   let pageletElem = document.createElement('template')
//   pageletElem.innerHTML = pageletBody.trim()
//   pageletElem = pageletElem.content
//   lib.replicateAndReplaceScripts(pageletElem)
//   return pageletElem
// }

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

// /**
// Attributes:
//   pagelet-src
//   mixin-target
//   alt-mixin-target
// */
// export async function mixinRemotePageletFramed(callElem) {
//   const lib = await import('/lib/lib.mjs')
//   // select template
//   if(!callElem.hasAttribute('pagelet-src'))
//     writeAndThrow(`No pagelet-src attribute for mixinRemotePagelet element`, callElem)
//   // else
//   let pageletSrc = callElem.getAttribute('pagelet-src')
  
//   // get insertion target
//   let [insertionLocation, targetSelector] = lib.splitAtFirst(callElem.getAttribute('mixin-target') ?? 'append this', /\s+/)
//   if(targetSelector === undefined || targetSelector == null)
//     writeAndThrow(`mixinRemotePagelet mixin-target attribute must be of the form: 'insertion-location target-selector'`, callElem, 'template:', template)
//   // else:
  
//   // find target from selector
//   let target = lib.selectTargetElement(callElem, targetSelector) 
//   if(target === undefined || target == null) { /// use alt-mixin-target instead
//     [insertionLocation, targetSelector] = lib.splitAtFirst(callElem.getAttribute('alt-mixin-target') ?? 'append this', /\s+/)
//     if(targetSelector === undefined || targetSelector == null)
//       writeAndThrow(`mixinRemotePagelet alt-mixin-target attribute must be of the form: 'insertion-location target-selector'`, callElem, 'template:', template)
//     // else:
    
//     target = lib.selectTargetElement(callElem, targetSelector)
//     if(target === undefined || target === null)
//       writeAndThrow(`mixinRemotePagelet neither primary nor alternate target found`, callElem)
//   }
  
//   let pageletElem = await lib.controllerFrameAround(await lib.getRemotePagelet(pageletSrc))
  
//   // insert
//   switch(insertionLocation) {
//     case 'append': return void target.append(pageletElem)
//     case 'replace': return void target.replaceWith(pageletElem)
//     case 'after': return void target.insertAdjacentElement("afterend", pageletElem)
//     case 'slotted-replace':
      
//       // mix old children inserts into slots if they're present
//       let oldChildInserts = callElem.querySelectorAll(':scope > *[slot]')
//       let defaultSlot     = pageletElem.querySelector('slot:not([name]), slot[name=""]')
//       for(const insert of oldChildInserts) {
//         let correspondingSlot = pageletElem.querySelector(`slot[name="${insert.getAttribute('slot')}"]`)
//         if(correspondingSlot ?? false)
//           correspondingSlot.replaceWith(insert)
//         else if(defaultSlot ?? false)
//           defaultSlot.appendChild(insert)
//       }
      
//       // add mixin's old children back to payload, if <slot name="child-mixin-target"> exists, then put children there
//       let defaultChildSlot = pageletElem.querySelector('slot[name="child-mixin-target"]')
//       let defaultChildSlotReplacement = (defaultChildSlot ?? false) ? document.createDocumentFragment() : undefined
//       if(defaultChildSlotReplacement ?? false) {
//         while(callElem.children.length > 0)
//           defaultChildSlotReplacement.appendChild(callElem.lastChild)
//         defaultChildSlot.replaceWith(defaultChildSlotReplacement)
//       }
      
//       return void target.replaceWith(pageletElem)
//     default: 
//       writeAndThrow(`mixinRemotePagelet invalid insertion location ${insertionLocation}`, callElem)
//   }
// }

// export async function controllerFrameAround(...elements) {
//   // let ret = document.createElement('div')
//   // let controlbar = document.createElement('div') // 
//   //   controlbar.classList.add('control-bar')
//   //   // remove button:
//   //   let removeButton = document.createElement('button') //
//   //     removeButton.innerText = 'X'
//   //     removeButton.addEventListener('click', clickEvent => {
//   //       const removeTarget = clickEvent.target.parentElement.parentElement
//   //       removeTarget.remove()      
//   //     })
//   //     controlbar.appendChild(removeButton)
//   //   //
//   //   ret.appendChild(controlbar)
//   // //
//   // ret.classList.add('controller-frame')
//   // let container = document.createElement('div') //
//   //   container.classList.add('container')
//   //   for(const elem of elements)
//   //     container.appendChild(elem)
//   //   ret.appendChild(container)
//   // //
//   // return ret
//   let ret = await getRemotePagelet('/pagelets/controller-frame.html').then(elem => elem.firstElementChild)
//   for(const elem of elements)
//     ret.appendChild(elem)
//   return ret
// }

// export async function testConsolePrint(callElem) {
//   console.log(callElem)
// }


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

// export async function setTextContentToAttributeValue(callElem) {
//   let whichTarget = lib.selectTargetElement(callElem, callElem.getAttribute('which') ?? 'this')
//   if(!(whichTarget ?? false)) {
//     callElem.textContent = callElem.getAttribute('not-found-default') ?? ''
//     return void 0
//   }
//   // else
//   if(!callElem.hasAttribute('value-attribute'))
//     return void console.error(`setTextContentToAttributeValue value-attribute attribute is required`, callElem)
//   // else
//   let targetAttributeValue = whichTarget.getAttribute(callElem.getAttribute('value-attribute')) ?? callElem.getAttribute('not-found-default') ?? ''
//   callElem.textContent = targetAttributeValue
// }


// /**
// <call-resource latent> function
// expected to be called by another element
// */
// export async function findElement(callFnElement) {
//   const lib = await import('/lib/lib.mjs')
//   let selector = callFnElement.getAttribute('selector')
//   let target   = lib.selectTargetElement(callFnElement, selector)
//   return target
// }

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

// /**
// This class is so we can emit events when data storage objects' values are set
// Then anyone using event listeners to watch the store can respond to the updated values
// */
// class DataStorageItem {
//   #data = {}
//   constructor(elem) {
//     this.#data   = {}
//     this.element = elem
//   }
//   makeEvent(key, newValue) {
//     this.element.dispatchEvent(eventThen('storage-updated', updateEvent => {
//       updateEvent.key      = key
//       updateEvent.oldValue = this.#data[key]
//       updateEvent.newValue = newValue
//     }))
//   }
//   reveal() { return this.#data }
//   get(key) { return this.#data[key] }
//   has(key) { return key in this.#data }
//   remove(key) { 
//     this.makeEvent(key, undefined)
//     delete this.#data[key]
//     return undefined
//   }
//   set(key, value) {
//     this.makeEvent(key, value)
//     this.#data[key] = value
//     return value
//   }
// }

// /**
// <call-resource> function (for use with callib0.mjs)
// Adds the parent of the <call-fn> calling this to the elib.dataStorage defined above
// Important: only works if the parent has class "data-storage"!
// */
// export function addDataStorage(callFnElement) {
//   const parent =  callFnElement.parentElement
//   if(debugFlash) attentionFlashElement(parent)
//   if(!parent.classList.contains('data-storage'))
//     return void console.error(`Trying to add data storage to an element without class "data-storage"`, callFnElement, 'adding to', parent)
//   // else:
//   dataStorage.set(parent, new DataStorageItem(parent))
// }

// /**
// <call-resource> function (for use with callib0.mjs)
// Associates the data-key="..." attribute with the given data-value="..." string value
// in the nearest parent .data-storage element
// */
// export async function storeData(callFnElement) {
//   if(!('key' in callFnElement.dataset))
//     return void console.error(`<call-fn> storeData element has no data-key attribute`)
//   // else:
//   if(!('value' in callFnElement.dataset))
//     return void console.error(`<call-fn> storeData element has no data-value attribute`)
//   // else:
//   const storeElement = callFnElement.closest('.data-storage')
//   if(debugFlash) attentionFlashElement(storeElement)
//   if(storeElement === undefined)
//     return void console.error(`No parent .data-storage element to associate data to`, callFnElement)
//   // else:
//   const store = await dataStorage.get(storeElement)
//   store.set(callFnElement.dataset.key, callFnElement.dataset.value)
//   return void 0
// }

// /**
// <call-resource> function (for use with callib0.mjs)
// Watches target HTMLElement and syncs their value property (or checked property in the case of checkboxes)
// with the closest .data-storage element above using data-key="..." attribute as the storage key
// Use the data-which="..." property to specify which element to get properties from
//   This defaults to data-which="next", possible values are: "parent", "next"
// */
// export async function syncInputWithDataStorage(callFnElement) {
//   let which = callFnElement.dataset.which
//   if(which === null || which === '')
//     return void console.error('elib.syncInputWithDataStorage called with no data-which attribute', callFnElement)
//   let targetElement = _selectTargetElement(callFnElement, which)
//   const dataStorageElem = targetElement.closest('.data-storage')
//   if(!(dataStorageElem ?? false)) // no .data-storage parent element
//     return void console.error(`elib.syncWithDataStorage no .data-storage parent element`, callFnElement, targetElement)
//   // else:
//   const key = callFnElement.dataset.key
//   if(!(key ?? false)) // no data-key attribute for <call-fn>
//     return void console.error(`elib.syncWithDataStorage no data-key attribute for <call-fn>`, callFnElement, targetElement)
//   // else, update this value when store updated:
//   let targetProp = 'value'
//   if(targetElement instanceof HTMLInputElement) {
//     if(targetElement.getAttribute('type') === 'checkbox')
//       targetProp = 'checked'
//   }
//   dataStorageElem.addEventListener('storage-updated', updateEvent => {
//     if(updateEvent.key === key)
//       targetElement[targetProp] = updateEvent.newValue
//   })
//   // set initial value:
//   let storageObj = await dataStorage.getWhenDefined(dataStorageElem)
//   if(targetElement[targetProp] !== storageObj.get(key)) {
//     if(!targetElement[targetProp] && storageObj.get(key)) // targetElement.targetProp is falsy and storageObj isn't, store got inited first
//       targetElement[targetProp] = storageObj.get(key)
//     else // target got inited first
//       storageObj.set(key, targetElement[targetProp])
//     if(debugFlash) attentionFlashElement(targetElement)
//     if(debugFlash) attentionFlashElement(dataStorageElem)
//   }
//   // update store on input:
//   targetElement.addEventListener('input', _inputEvent => {
//     if(targetElement[targetProp] !== storageObj.get(key)) {
//       if(debugFlash) attentionFlashElement(targetElement)
//       if(debugFlash) attentionFlashElement(dataStorageElem)
//       storageObj.set(key, targetElement[targetProp])
//     }
//   })
//   if(debugFlash) attentionFlashElement(targetElement)
//   if(debugFlash) attentionFlashElement(dataStorageElem)
// }


// /**
// <call-resource> function (for use with callib0.mjs)
// Sets the target element's innerText based on the given key from the nearest enclosing .data-storage element
// The key is given using attribute data-key
// Select the target element using data-which = "next" | "parent"
// */
// export async function setInnerTextFromDataStorage(callFnElement) {
//   let which = callFnElement.dataset.which
//   if(which === null || which === '')
//     return void console.error('elib.setInnerTextFromDataStorage called with no data-which attribute', callFnElement)
//   let targetElement = _selectTargetElement(callFnElement, which)
//   const dataStorageElem = targetElement.closest('.data-storage')
//   if(!(dataStorageElem ?? false)) // no .data-storage parent element
//     return void console.error(`elib.setInnerTextFromDataStorage no .data-storage parent element`, callFnElement, targetElement)
//   // else:
//   const key = callFnElement.dataset.key
//   if(!(key ?? false)) // no data-key attribute for <call-fn>
//     return void console.error(`elib.setInnerTextFromDataStorage no data-key attribute for <call-fn>`, callFnElement, targetElement)
//   // else, set innerText:
//   let storageObj = await dataStorage.getWhenDefined(dataStorageElem)
//   targetElement.innerText = storageObj.get(key)
//   dataStorageElem.addEventListener('storage-updated', (updateEvent) => {
//     if(updateEvent.key === key)
//       targetElement.innerText = updateEvent.newValue
//   })
// }

// /**
// <call-resource> function (for use with callib0.mjs)
// Unhides the target element if the nearest enclosing .data-storage element has the given key
// The key is given using attribute data-key
// Select the target element using data-which = "next" | "parent"
// */
// export async function unhideIfKeyInDataStorage(callFnElement) {
//   let which = callFnElement.dataset.which
//   if(which === null || which === '')
//     return void console.error('elib.unhideIfKeyInDataStorage called with no data-which attribute', callFnElement)
//   let targetElement = _selectTargetElement(callFnElement, which)
//   const dataStorageElem = targetElement.closest('.data-storage')
//   if(!(dataStorageElem ?? false)) // no .data-storage parent element
//     return void console.error(`elib.unhideIfKeyInDataStorage no .data-storage parent element`, callFnElement, targetElement)
//   // else:
//   const key = callFnElement.dataset.key
//   if(!(key ?? false)) // no data-key attribute for <call-fn>
//     return void console.error(`elib.unhideIfKeyInDataStorage no data-key attribute for <call-fn>`, callFnElement, targetElement)
//   // else, set innerText:
//   let storageObj = await dataStorage.getWhenDefined(dataStorageElem)
//   if(storageObj.has(key))
//     targetElement.hidden = false
//   dataStorageElem.addEventListener('storage-updated', (updateEvent) => {
//     if(updateEvent.key === key && updateEvent.newValue !== undefined)
//       targetElement.hidden = false
//   })
// }


// /**
// <call-resource> function (for use with callib0.mjs)
// Unhides the target element if the nearest enclosing .data-storage element has the given key
// The key is given using attribute data-key
// Select the target element using data-which = "next" | "parent"
// */
// export async function actionOnDataStorageValue(callFnElement) {
//   let which = callFnElement.dataset.which
//   if(which === null || which === '')
//     return void console.error('elib.actionOnDataStorageValue called with no data-which attribute', callFnElement)
//   let targetElement = _selectTargetElement(callFnElement, which)
//   const dataStorageElem = targetElement.closest('.data-storage')
//   if(!(dataStorageElem ?? false)) return void console.error(`no .data-storage parent element`, callFnElement, targetElement)
//   const key    = callFnElement.dataset.key;    if(key    === undefined) return void console.error(`No data-key attribute for <call-fn>`,  callFnElement)
//   const when   = callFnElement.dataset.when;   if(when   === undefined) return void console.error(`No data-when attribute for element`,   callFnElement)
//   const action = callFnElement.dataset.action; if(action === undefined) return void console.error(`No data-action attribute for element`, callFnElement)
//   if(!(when in _dsvConditions)) return void console.error(`Unrecognized data-when attribute ${when} for element`, callFnElement)
//   if(!(action in _dsvActions))  return void console.error(`Unrecognized data-action attribute ${action} for element`, callFnElement)
//   const whenFunction   = _dsvConditions[when]
//   const actionFunction = _dsvActions[action]
//   let storageObj = await dataStorage.getWhenDefined(dataStorageElem)
//   actionFunction(targetElement, whenFunction(storageObj.get(key)))
//   dataStorageElem.addEventListener('storage-updated', (updateEvent) => {
//     if(updateEvent.key === key)
//       actionFunction(targetElement, whenFunction(updateEvent.newValue))
//   })
// }
// const _dsvActions = {
//   unhide: (elem, cond) => { elem.hidden = !cond },
//   hide: (elem, cond) => { elem.hidden = cond }
// }
// const _dsvConditions = {
//   nonempty: value => (value !== undefined && value !== null && (value.length ?? 1) > 0),
//   truthy: value => !(!value), // double negation to cast to boolean (first ! casts to false equivalent, second casts to true equivalent)
//   falsy: value => !value,
//   exists: value => (value !== undefined && value !== null)
// }

export async function copyToClipboard(callElem) {
  if(!callElem.dataset.payload)
    return lib.writeAndThrow('No data-payload attribute for called element', callElem)
  // else
  navigator.clipboard.writeText(callElem.dataset.payload)
}