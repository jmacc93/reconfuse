
/**
This can be used to boostrap slyly importing other modules and calling their functions on elements
*/


/**
Calls single function in module exports object
*/
function _callFnFromModule(elem, moduleExports, modulePath, fnName, args = []) {
  if(!(fnName in moduleExports))
    return void console.error(`No export ${fnName} from module with source ${modulePath} imported by <call-resource>`, elem, moduleExports)
  // else:
  let fn = moduleExports[fnName]
  if(elem.getRootNode() === document) { // only call if connected to document
    if(elem.hasAttribute('no-call-parents')) {
      let noCallParents = elem.getAttribute('no-call-parents').split(/\s+/g)
      for(const ncp of noCallParents) {
        if(elem.closest(ncp) !== null) // don't call if its in a parent it shouldn't call it
          return void 0
      }
    }
    // else, call:
    fn?.(elem, ...args)
  }
}

/**
Get module exports and calls list of functions in that module
*/
async function _callSourceFunctions(modulePath, fnArray, elem, args) {
  let moduleExports
  try {
    moduleExports = await import(modulePath)
  } catch(err) {
    console.error(`Error in <call-resource> when importing module ${modulePath}`, err)
    return void 0
  }
  if(typeof moduleExports !== 'object')
    return void console.error(`<call-resource> unable to load module ${modulePath}`)
  // else:
  for(const exportName of fnArray)
    _callFnFromModule(elem, moduleExports, modulePath, exportName, args)
  return void 0
}

/**
Calls given module functions from srcfn string
*/
async function _callUsingSrcfnStr(elem, srcfnArg, args) {
  let splitSrcfn = srcfnArg.split(/\s*;\s*/g) // "A; B;C;  D" -> ["A", "B", "C", "D"]
  for(const srcfn of splitSrcfn) {
    let [modulePath, allfnstrs] = srcfn.split(/\s*:\s*/g) // "A:B" -> ["A", "B"]
    if(allfnstrs === undefined) // only modulePath given, assume function is module's default
      allfnstrs = 'default'
    let fnstrarray = allfnstrs.split(/\s+/).map(x=>x.trim())
    return _callSourceFunctions(modulePath, fnstrarray, elem, args)
  }
}

/**
Gets attribute and calls module functions from it
*/
async function _handleSrcfn(elem, attrname, args) {
  return _callUsingSrcfnStr(elem, elem.getAttribute(attrname), args)  
}

/**
Like _handleSrcfn above but checks if has attribute first
*/
async function _callFn(elem, attr, args) {
  if(elem.hasAttribute(attr))
    await _handleSrcfn(elem, attr, args)
  return void 0
}

/**
An example form:
  <!-- loads callib.mjs and sets the element up to display notifications: -->
  <call-resource data-fn="displayNotifications" src="./callib.mjs"></call-resource>
Use attribute no-call-parents
*/
export class CallResourceElement extends HTMLElement {
  constructor() {
    super()
    this.storage = {} // it is legal and standard to store anything anyone wants in this
    this.callBox = [] // other scripts can push functions they want to be called after this one is called into here
  }
  callFnFromModule(moduleExports, modulePath, fnName, args = []) { _callFnFromModule(this, moduleExports, modulePath, fnName, args) }
  async addedToDocument() {
    if(this.hasAttribute('once') && (this.called ?? false))
      return void 0 // already called with attribute 'once', don't call again automatically
    // else
    if(!this.hasAttribute('latent')) {
      this.callFn()
      this.called = true
    }
  }
  async callFn(...args) { 
    await _callFn(this, 'srcfn', args) 
    for(const fn of this.callBox)
      fn()
  }
}

/**
Same as <call-resource> but in button form; calls it's given functions when clicked
*/
export class CallResourceButtonElement extends HTMLButtonElement {
  constructor() {
    super()
    this.addEventListener('click', clickEvent => {
      if(clickEvent.ctrlKey && this.hasAttribute('ctrl-srcfn'))
        _callFn(this, 'ctrl-srcfn')
      else if(clickEvent.altKey && this.hasAttribute('alt-srcfn'))
        _callFn(this, 'alt-srcfn')
      else if(this.hasAttribute('srcfn'))
        _callFn(this, 'srcfn')
    })
    this.storage = {} // it is legal and standard to store anything anyone wants in this
  }
}

export class CallResourceSelectElement extends HTMLSelectElement {
  constructor() {
    super()
    const thisElem = this
    this.addEventListener('input', async inputEvent => {
      thisElem.value = ''
    })
    this.storage = {}
  }
  async addedToDocument() {
    let firstOption = this.querySelector('option')
    firstOption.setAttribute('value', '') // make this the default to switch to on click
    for(const option of this.querySelectorAll('option')) {
      option.addEventListener('click', clickEvent => {
        if(option.hasAttribute('ctrl-srcfn') && clickEvent.ctrlKey)
          _callFn(option, 'ctrl-srcfn', [clickEvent])
        else if(option.hasAttribute('alt-srcfn') && clickEvent.altKey)
          _callFn(option, 'alt-srcfn', [clickEvent])
        else if(option.hasAttribute('shift-srcfn') && clickEvent.shiftKey)
          _callFn(option, 'shift-srcfn', [clickEvent])
        else if(option.hasAttribute('srcfn'))
          _callFn(option, 'srcfn', [clickEvent])
      })
    }
  }
}

/**
The following element is provided for convenience
<no-effect>     use to store information in regular attributes (not dataset attributes)
<data-storage>  equivalent to no-function <call-function> element, stores data for other elements to use
*/
export class NoEffectElement extends HTMLElement { }
export class DataStorageElement extends HTMLElement {  constructor(){ super(); this.storage = {} } }

if(customElements.get('call-resource') === undefined)
  customElements.define('call-resource', CallResourceElement)

if(customElements.get('call-resource-button') === undefined)
  customElements.define('call-resource-button', CallResourceButtonElement, {extends: 'button'})

if(customElements.get('call-selection') === undefined)
  customElements.define('call-selection', CallResourceSelectElement, {extends: 'select'})

if(customElements.get('data-storage') === undefined)
  customElements.define('data-storage', DataStorageElement)

if(customElements.get('no-effect') === undefined)
  customElements.define('no-effect', NoEffectElement)


/**
Observe all added CallResourceElements to call their functions when they are added
because connectedCallback is too unpredictable
*/
const mutationObserver = new MutationObserver(recordList => {
  for(const record of recordList) {
    if(record.type === 'childList') {
      for(const addedNode of record.addedNodes) {
        if(addedNode instanceof HTMLElement) {
          if(addedNode instanceof CallResourceElement || addedNode instanceof CallResourceSelectElement)
            addedNode.addedToDocument()
          for(const callChild of addedNode.querySelectorAll('call-resource, select[is="call-selection"]'))
            callChild.addedToDocument()
        }
        // if(addedNode instanceof CallResourceElement)
        //   addedNode.addedToDocument()
      }
    }
  }
})
mutationObserver.observe(document, {childList: true, subtree: true})
/**
Also, check nodes added before mutationObserver starts observing
*/
for(const callElem of document.querySelectorAll('call-resource, select[is="call-selection"]'))
  callElem.addedToDocument()