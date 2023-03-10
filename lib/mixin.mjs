export function copyAttributesInto(elemA, elemB) {
  for(const attr of elemA.attributes)
    elemB.setAttribute(attr.name, attr.value)
}

/**
<script> elements created via innerHTML won't execute,
this is a workaround for script elements
plmx.replicateAndReplaceScripts(parentElementMadeWithInnerHTML)
This replaces all child scripts with functionally equivalent scripts
*/
export function replicateAndReplaceScripts(elem) {
  for(const childScript of elem.querySelectorAll('script')) {
    let replica = document.createElement('script')
    if(childScript.hasAttributes())
      copyAttributesInto(childScript, replica)
    replica.textContent = childScript.textContent
    childScript.replaceWith(replica)
  }
}

export async function getAndMakeFragmentFromUrl(url) {
  let response = await fetch(url)
  let htmlSource = await response.text()
  
  // sourceElement is a dummy element because we need to parse htmlSource but replace self with fragment
  let sourceElement  = document.createElement('template')
  sourceElement.innerHTML = htmlSource.trim()
  sourceElement = sourceElement.content
  replicateAndReplaceScripts(sourceElement)
      
  // // make replacement fragment and add new html's elements to it:
  // let retReplacementFrag = document.createDocumentFragment()
  // for(const child of sourceElement.childNodes)
  //   retReplacementFrag.appendChild(child)
  
  return sourceElement
}

/**
MixinElements like <html-mixin src="..."> parses whatever the resource at
their src attribute is as html, and replace themselves with that resource
*/
export class MixinElement extends HTMLElement {
  async connectedCallback() {
    setTimeout(async ()=> {
      const lib = await import('/lib/lib.mjs')
      let src = this.getAttribute('src').trim()
      if(src === undefined || src === '')
        return void this.remove() // silently remove self when empty src
        // lib.writeAndThrow(`<html-mixin> bad src attribute given`, this)
      // else:
      
      let retReplacementFrag = await getAndMakeFragmentFromUrl(src)
      
      // mix old children inserts into slots if they're present
      let oldChildInserts = this.querySelectorAll(':scope > *[slot]')
      let defaultSlot     = retReplacementFrag.querySelector('slot:not([name]), slot[name=""]')
      for(const insert of oldChildInserts) {
        let correspondingSlot = retReplacementFrag.querySelector(`slot[name="${insert.getAttribute('slot')}"]`)
        if(correspondingSlot ?? false)
          correspondingSlot.replaceWith(insert)
        else if(defaultSlot ?? false)
          defaultSlot.appendChild(insert)
      }
      
      // add mixin's old children back to fragment, if <... class="... child-mixin-target"> exists, then put children there
      let oldChildrenTarget = retReplacementFrag.lastElementChild ?? retReplacementFrag
      let defaultChildSlot = retReplacementFrag.querySelector('slot[name="child-mixin-target"]')
      let defaultChildSlotReplacement = (defaultChildSlot ?? false) ? document.createDocumentFragment() : undefined
      while(this.children.length > 0) {
        if(defaultChildSlotReplacement ?? false)
          defaultChildSlotReplacement.appendChild(this.firstChild)
        else
          oldChildrenTarget.appendChild(this.firstChild)
      }
      if(defaultChildSlotReplacement ?? false)
        defaultChildSlot.replaceWith(defaultChildSlotReplacement)
      
      // add attributes back to replacement
      let firstElementChild = retReplacementFrag.firstElementChild
      if(firstElementChild) {
        for(const attr of this.attributes) {
          if(attr.name === 'class') {
            for(const classname of this.classList)
              firstElementChild.classList.add(classname)
          } else if(attr.name === 'style') {
            firstElementChild.setAttribute('style', `${firstElementChild.getAttribute('style') ?? ''}; ${attr.value}`)
          } else if(attr.name !== 'src' && attr.name !== 'framed') {
            firstElementChild.setAttribute(attr.name, attr.value)
          }
        }
      }
      
      if(this.hasAttribute('framed'))
        retReplacementFrag = await lib.controllerFrameAround(retReplacementFrag)
        
      let focusTarget = retReplacementFrag.querySelector('*[autofocus]')
      if(!focusTarget && this.hasAttribute('force-focus'))
        focusTarget = retReplacementFrag.querySelector(':is(textarea, input, button, a)')
      if(focusTarget && !this.hasAttribute('no-autofocus'))
        setTimeout(() => focusTarget.focus(), 50)
      
      this.replaceWith(retReplacementFrag)
    })
  }
}

/**
RawMixinElement like <raw-mixin src="..."> parses whatever the resource at
their src attribute is as plaintext, and replace themselves with that text
*/
export class RawMixinElement extends HTMLElement {
  connectedCallback() {
    setTimeout(async ()=> {
      let src = this.getAttribute('src').trim()
      if(src === undefined || src === '')
        return void console.error(`<raw-mixin> bad src attribute given`, this)
      // else:
      
      let response = await fetch(`/get-raw.s.js${src}`)
      if(response.ok) {
        let text = await response.text()
        let replacementNode = document.createTextNode(text)
        this.replaceWith(replacementNode)
      } else if(response.status === 404) {
        let replacementElem = document.createElement('span')
        replacementElem.setAttribute('style', 'color:red');
        replacementElem.textContent = `404`
        this.replaceWith(replacementElem)
      } else {
        console.errror(`RawMixinElement error`, response)
        let replacementElem = document.createElement('span')
        replacementElem.setAttribute('style', 'color:red');
        replacementElem.textContent = `Unknown error: ${response.status}, ${response.statusText}`
        this.replaceWith(replacementElem)
      }
    })
  }
}

export class ExportMixinElement extends HTMLElement {
  connectedCallback() {
    setTimeout(async ()=> {
      const lib = await import('/lib/lib.mjs')
      let srcvar = this.getAttribute('srcvar').trim()
      if(!srcvar || srcvar === '')
        return void console.error(`<export-mixin> bad src attribute given`, this)
      // else:
      let [moduleSrc, varName] = srcvar.split(/\s*\:\s*/g) // "aaa: bbb" -> ["aaa", "bbb"]
      if(!moduleSrc)
        return void console.error(`ExportMixinElement error: no module given in srcvar attribute`, this)
      if(!varName)
        return void console.error(`ExportMixinElement error: no variable given in srcvar attribute`, this)
      // else
      
      let modExports = await import(moduleSrc)
      let varValue   = modExports[varName] // can be: <template> element, regular element, html string, (this HTMLElement)=>DocumentFragment
      if(!varValue)
        return void console.error(`ExportMixinElement error: given variable ${varName} doesn't exist or is undefined in module ${moduleSrc}`, this)
      // else
      
      let replacementFrag
      if(varValue instanceof HTMLTemplateElement) {
        replacementFrag = varValue.content.cloneNode(true)
      } else if(varValue instanceof HTMLElement) {
        replacementFrag = document.createDocumentFragment()
        replacementFrag.appendChild(varValue.cloneNode(true))
      } else if(typeof varValue === 'string') {
        let template = document.createElement('template')
        template.innerHTML = varValue
        replacementFrag = template.content
      } else if(varValue instanceof Function) {
        replacementFrag = varValue(this)
      } else { // catch all
        return console.error(`ExportMixinElement error: unknown module ${moduleSrc} export ${varName} type (${varValue})`, varValue)
      }
      
      // mix old children inserts into slots if they're present
      let oldChildInserts = this.querySelectorAll(':scope > *[slot]')
      let defaultSlot     = replacementFrag.querySelector('slot:not([name]), slot[name=""]')
      for(const insert of oldChildInserts) {
        let correspondingSlot = replacementFrag.querySelector(`slot[name="${insert.getAttribute('slot')}"]`)
        if(correspondingSlot ?? false)
          correspondingSlot.replaceWith(insert)
        else if(defaultSlot ?? false)
          defaultSlot.appendChild(insert)
      }
      
      // add mixin's old children back to fragment, if <... class="... child-mixin-target"> exists, then put children there
      let oldChildrenTarget = replacementFrag.lastElementChild ?? replacementFrag
      let defaultChildSlot = replacementFrag.querySelector('slot[name="child-mixin-target"]')
      let defaultChildSlotReplacement = (defaultChildSlot ?? false) ? document.createDocumentFragment() : undefined
      while(this.children.length > 0) {
        if(defaultChildSlotReplacement ?? false)
          defaultChildSlotReplacement.appendChild(this.firstChild)
        else
          oldChildrenTarget.appendChild(this.firstChild)
      }
      if(defaultChildSlotReplacement ?? false)
        defaultChildSlot.replaceWith(defaultChildSlotReplacement)
      
      // add attributes back to replacement
      for(const attr of this.attributes) {
        if(attr.name !== 'srcvar' && attr.name !== 'framed')
          replacementFrag.firstElementChild?.setAttribute(attr.name, attr.value)
      }
      
      if(this.hasAttribute('framed'))
        replacementFrag = await lib.controllerFrameAround(replacementFrag)
      
      this.replaceWith(replacementFrag)
    })
  }
}

if(customElements.get('html-mixin') === undefined)
  customElements.define('html-mixin', MixinElement)
  
if(customElements.get('raw-mixin') === undefined)
  customElements.define('raw-mixin', RawMixinElement)

if(customElements.get('export-mixin') === undefined)
  customElements.define('export-mixin', ExportMixinElement)