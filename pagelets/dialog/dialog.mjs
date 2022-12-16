
function makeTemplate(source) {
  let template = document.createElement('template')
  template.innerHTML = source
  return template
}

const simpleEditDialogTemplate = makeTemplate(/*html*/`
  <div class="pagelet edit">
    <textarea class="vertical-resizable width100p" style="height: 16em"></textarea>
    <button class="linklike">Done</button>
    <button class="s-menu linklike" is="call-resource-button" srcfn="/lib/elem-functions.mjs: makeDropdown">S
      <template><div class="dropdown" remove-on-click>
        <button is="call-resource-button" class="linklike" srcfn="/lib/elem-functions.mjs: removeElement" which="this parent .pagelet.edit">Cancel</button>
      </div></template>
    </button>
  </div>
`)

export function simpleEditDialog(initialValue, doneFn, extraFns) {
  let dialog   = simpleEditDialogTemplate.content.cloneNode(true).firstElementChild
  let button   = dialog.querySelector('button')
  let textarea = dialog.querySelector('textarea')
  if(initialValue)
    textarea.value = initialValue
  button.addEventListener('click', async ()=> {
    let doneFnRet = await doneFn(textarea.value)
    if(doneFnRet ?? false)
      dialog.remove()
  })
  if(extraFns?.input)
    textarea.addEventListener('input', ()=> extraFns.input(textarea.value))
  if(extraFns?.inputDelayed) {
    let timeoutId
    textarea.addEventListener('input', ()=> {
      if(timeoutId) clearTimeout
      timeoutId = setTimeout(() => extraFns.inputDelayed(textarea.value), extraFns.delay ?? 1000)
    })
  }
  if(extraFns?.change)
    textarea.addEventListener('change', ()=> extraFns.change(textarea.value))
  return dialog
}


const simpleLineDialogTemplate = makeTemplate(/*html*/`
  <div class="pagelet edit">
    <input type="text"/>
    <button class="linklike">Done</button>
    <button class="s-menu linklike" is="call-resource-button" srcfn="/lib/elem-functions.mjs: makeDropdown">S
      <template><div class="dropdown" remove-on-click>
        <button is="call-resource-button" class="linklike" srcfn="/lib/elem-functions.mjs: removeElement" which="this parent .pagelet.edit">Cancel</button>
      </div></template>
    </button>
  </div>
`)


export function simpleLineDialog(initialValue, doneFn, extraFns) {
  let dialog     = simpleLineDialogTemplate.content.cloneNode(true).firstElementChild
  let button     = dialog.querySelector('button')
  let inputField = dialog.querySelector('textarea')
  if(initialValue)
    inputField.value = initialValue
  button.addEventListener('click', async ()=> {
    let doneFnRet = await doneFn(inputField.value)
    if(doneFnRet ?? false)
      dialog.remove()
  })
  if(extraFns?.input)
    inputField.addEventListener('input', ()=> extraFns.input(inputField.value))
  if(extraFns?.inputDelayed) {
    let timeoutId
    inputField.addEventListener('input', ()=> {
      if(timeoutId) clearTimeout
      timeoutId = setTimeout(() => extraFns.inputDelayed(inputField.value), extraFns.delay ?? 1000)
    })
  }
  if(extraFns?.change)
    inputField.addEventListener('change', ()=> extraFns.change(inputField.value))
  return dialog
}


const dropDownTemplate = makeTemplate(/*html*/`
  <link href="/lib/general.css" rel="stylesheet"/>
  <link href="/pagelets/dialog/dropdown.css" rel="stylesheet"/>
  <span class="ddb-grandparent">
    <span class="ddb-parent" style="min-width: 8em">
      <slot name="body"></slot>
    </span>
  </span>
  <slot name="show"></slot>
`)

class DropDownElement extends HTMLElement {
  constructor() {
    super()
    let elem = this
    elem.attachShadow({mode: "open"})
    elem.shadowRoot.appendChild(dropDownTemplate.content.cloneNode(true))
    let showButton = elem.querySelector('button[slot="show"]')
    let ddbGrandparent = elem.shadowRoot.querySelector('span.ddb-grandparent')
    let ddbParent = elem.shadowRoot.querySelector('span.ddb-parent')
    let shown = false
    ddbGrandparent.setAttribute('shown', 'false')
    let show, hide
    show = () => {
      if(shown)
        return void hide()
      // else
      shown = true
      ddbGrandparent.setAttribute('shown', 'true')
      if(!elem.hasAttribute('sticky')) { // sticky = only hide when click on show button
        setTimeout(()=> document.addEventListener('click', docClickEvent => {
          if(docClickEvent.target !== showButton)
            hide()
        }, {once: true}))
      }
      let rect = ddbParent.getBoundingClientRect()
      let left = parseInt(window.getComputedStyle(ddbParent).left.slice(0, -2))
      let rightOffset = window.visualViewport.width - rect.right
      ddbParent.style.left = `${Math.min(left + rightOffset, 0)}`
    }
    hide = () => {
      shown = false
      ddbGrandparent.setAttribute('shown', 'false')
    }
    for(const hideButton of elem.querySelectorAll('*[slot="body"] button.hide-dropdown')) {
      if(hideButton.closest('drop-down') === elem)
      hideButton.addEventListener('click', hide)
    }
    showButton?.addEventListener('click', show)
  }
}

if(customElements.get('drop-down') === undefined)
  customElements.define('drop-down', DropDownElement)

const floatingTemplate = makeTemplate(/*html*/`
  <div class="floating-dialog" style="position: absolute; margin: 0">
    <div class="inner" style="position: relative; background: white; border: 1px solid gray; padding: 3px; border-radius: 3px">
      <div><button is="call-resource-button" class="linklike" srcfn="/pagelets/dialog/dialog.mjs: removeFloating">X</button></div>
      <!-- Pagelets go here -->
    </div>
  </div>
`)

const floatingMap = new WeakMap()

// <call-resource> function
export async function floatingMixin(callElem) {
  let existingFloating = floatingMap.get(callElem)
  if(existingFloating) {
    if(existingFloating.isConnected)
      existingFloating.remove()
    floatingMap.delete(callElem)
    return void 0
  }
  // else
  const lib = await import('/lib/lib.mjs')
  const url = callElem.getAttribute('url')
  if(!url)
    return void console.warn('No url attribute given to floatingMixin element', callElem)
  // else
  const pagelet = await lib.getRemotePagelet(url)
  const floating = floatingTemplate.content.cloneNode(true).firstElementChild
  floating.querySelector('.inner').appendChild(pagelet)
  document.body.appendChild(floating)
  const rect = callElem.getBoundingClientRect()
  const viewport = window.visualViewport
  floating.style.top  = `${viewport.offsetTop + rect.bottom}px`
  // floating.style.left = `${viewport.offsetLeft + rect.left - Math.max((rect.left + rect.width) - (viewport.offsetLeft + viewport.width), 0)}px`
  floating.style.left = `${viewport.offsetLeft + rect.left}px`
  floatingMap.set(callElem, floating)
  if(!callElem.hasAttribute('sticky')) {
    document.addEventListener('click', clickEvent => {
      if(callElem.contains(clickEvent.target) || clickEvent === callElem)
        return void 0
      // else
      if(floating.isConnected)
        floating.remove()
      if(floatingMap.has(callElem))
        floatingMap.delete(callElem)
      }, {once: true})
  }
}

export async function removeFloating(callElem) {
  const floating = callElem.closest('.floating-dialog')
  if(floating)
    floating.remove()
}


export async function appendFileSubmit(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const file = pagelet.dataset.file
  const tagged = (pagelet.dataset.tagged ?? '') === 'true'
  if(!file)
    return void lib.notificationFrom(callElem, `No data-file attribute given on edit-file pagelet`, {error: true})
  // else
  const textarea = pagelet.querySelector(':scope > textarea')
  let response = await fetch(`/bin/file.s.js/append?file=${file}${tagged? '&tagged' : ''}`, {method: "POST", body: textarea.value})
  if(!response.ok)
    return void lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  // else
  lib.notificationFrom(callElem, `Success`, {transient: true})
  textarea.value = ''
}

export async function appendFileInstallCtrlEnterFunctionality(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const textarea = pagelet.querySelector(':scope > textarea')
  textarea.addEventListener('keydown', downEvent => {
    if(downEvent.ctrlKey && downEvent.key === 'Enter')
      appendFileSubmit(callElem)
  })
}
