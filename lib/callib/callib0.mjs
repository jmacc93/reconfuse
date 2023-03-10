
/**
This can be used to boostrap slyly importing other modules and calling their functions on elements
*/


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
    this.setupDone = false
  }
  async addedToDocument() {
    if(this.setupDone)
      return void 0
    // else
    this.setupDone = true
    if(this.hasAttribute('once') && (this.called ?? false))
      return void 0 // already called with attribute 'once', don't call again automatically
    // else
    if(!this.hasAttribute('latent')) {
      this.callFn()
      this.called = true
    }
  }
  async callFn(...args) {
    
    // Get attribute which is like "module1: fn1 fn2 fn3 ...; module2: gn1 gn2 ...; ..."
    const srcfnAttributeValue = this.getAttribute('srcfn') // like "A: B C D  ;   E: F   G H; I  : J K L"
    
    // Split attribute by semicolon into array like ["module1: fn1 fn2 fn2 ...", ...]
    let splitSrcfn = srcfnAttributeValue.split(/\s*;\s*/g) // "A; B;C;  D" -> ["A", "B", "C", "D"]
    
    // For each "module: fn1 fn2 fn2" string in array
    for(const srcfn of splitSrcfn) {
      
      // Get module string and space-delimited function list string
      let [modulePath, allfnstrs] = srcfn.split(/\s*:\s*/g) // "A:B" -> ["A", "B"]
      if(allfnstrs === undefined) // only modulePath given, assume function is module's default
        allfnstrs = 'default'
      
      // Get list of functions ["f1", "f2", ...] to call in module
      let fnstrarray = allfnstrs.split(/\s+/).map(x=>x.trim()) // "A B  C" -> ["A", "B", "C"]
    
      // Import module
      let moduleExports
      try {
        moduleExports = await import(modulePath)
      } catch(err) {
        console.error(`Error in <call-resource> when importing module ${modulePath}`, err)
        return void 0
      }
      
      if(typeof moduleExports !== 'object')
        return void console.error(`<call-resource> unable to load module ${modulePath}`)
      // else
      
      // Call each given "f1", "f2", etc in module
      for(const functionName of fnstrarray) {
      
        if(!(functionName in moduleExports))
          return void console.error(`No export ${functionName} from module with source ${modulePath} imported by <call-resource>`, elem, moduleExports)
        // else:
        
        let fn = moduleExports[functionName]
        if(this.getRootNode() === document) { // only call if connected to document
          if(this.hasAttribute('no-call-parents')) { // no-call-parents is primarily to prevent calling inside <html-mixin> before mixin is done
            let noCallParents = this.getAttribute('no-call-parents').split(/\s+/g)
            for(const ncp of noCallParents) {
              if(this.closest(ncp) !== null) // don't call if its in a parent it shouldn't call it
                return void 0
            }
          }
          // else, not inside no-call-parent so call the function:
          fn?.(this, ...args)
        }
      }
    
    } // loop: for(const srcfn of splitSrcfn)
  }
}

if(customElements.get('call-resource') === undefined)
  customElements.define('call-resource', CallResourceElement)

/**
Observe all added CallResourceElements to call their functions when they are added
because connectedCallback is too unpredictable
*/
const mutationObserver = new MutationObserver(recordList => {
  for(const record of recordList) {
    if(record.type === 'childList') {
      for(const addedNode of record.addedNodes) {
        if(addedNode instanceof HTMLElement) {
          if(addedNode instanceof CallResourceElement)
            addedNode.addedToDocument()
          for(const callChild of addedNode.querySelectorAll('call-resource'))
            callChild.addedToDocument()
        }
      }
    }
  }
})
mutationObserver.observe(document, {childList: true, subtree: true})
/**
Also, check nodes added before mutationObserver starts observing
*/
for(const callElem of document.querySelectorAll('call-resource'))
  callElem.addedToDocument()