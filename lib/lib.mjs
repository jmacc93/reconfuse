
export function sanitizeHTMLString(str) {
  return str.replaceAll(/(?:[\<\>])|(?:(?<!\\)[\"\'\`])/g, (str) => {
    switch(str) {
      case '"': return '\\"'
      case "'": return "\\'"
      case '`': return '\\`'
      case "<": return '&lt;'
      case ">": return '&gt;'
    }
  })
}

export function applyOnNewChildren(elem, fn, deep = false) {
  const observer = new MutationObserver((recordList, observer) => {
    for(const record of recordList) if(record.type === 'childList') for(const node of record.addedNodes)
      fn(node, observer)
  })
  observer.observe(elem, {childList: true, subtree: deep})
}

export function onAttributeChange(elem, fn) {
  let mutationObserver = new MutationObserver((mutations, observer) => {
    for(const mutation of mutations) {
      if(mutation.type === 'attributes')
        fn(mutation.attributeName, mutation.oldValue, observer)
    }
  })
  mutationObserver.observe(elem, {attributes: true})
}

/**
(originally from elib.mjs)
This uses promises and setTimeout to wait for a condition to be satisfied
Doing it this way allows you to use it with await, so you can wait without making a new block
if(x === undefined)
  await asyncWaitUntil(()=> x !== undefined)
*/
async function asyncWaitUntil(conditionFn) {
  return new Promise(res => {
    let step = 0
    let timeoutId
    let wait = () => {
      if(conditionFn()) {
        clearTimeout(timeoutId)
        res()
      } else {
        timeoutId = setTimeout(wait, 2*(step++))
      }
    }
    wait()
  })
}

export let debugSimulateLatency = false
export async function dbgWait() {
  if(debugSimulateLatency) { 
    if(randomIntegerOn(0,1) === 0)
      return void 0
    else 
      return new Promise((res) => setTimeout(res, randomIntegerOn(1000, 2000)))
  }
}

export function writeAndThrow(...args) {
  console.error(...args)
  throw Error(String(args[0]))
}

export function elementThen(tag, fn) {
  const ret = document.createElement(tag)
  fn?.(ret)
  return ret
}

export function htmlToElement(markupStr) {
  let retTemplate = document.createElement('template')
  retTemplate.innerHTML = markupStr
  if(retTemplate.content.childElementCount === 1)
    return retTemplate.content.firstElementChild
  else
    return retTemplate.content
}


export function dirname(filestr) {
  if(filestr === '.' || filestr === './')
    return '.'
  // else
  let dirmatch = filestr.match(/^\s*(.+?)\/[^\/]+\/?\s*$/) // "aaa/bbb/ccc.txt" -> ["aaa/bbb/ccc.txt", "aaa/bbb"]
  if(dirmatch?.[1]) // "aaa/bbb"
    return dirmatch[1]
  // else
  return undefined
}

export function extname(filestr) {
  let extmatch = filestr.match(/\.[^\.\/]+$/) // "aaa/bbb/ccc.txt" -> [".txt"]
  if(extmatch?.[0]) // ".txt"
    return extmatch?.[0]
  // else
  return undefined
}

/**
plaintextElement(tag, str)
Is equivalent to:
elementThen(tag, elem => elem.innerText = str)
eg:
plaintextElement('span', "Some span")
*/
export function plaintextElement(tag, str) {
  return elementThen(tag, elem => elem.innerText = str)
}

export function eventWith(type, obj = undefined) {
  const ret = new CustomEvent(type)
  if(obj !== undefined) for(const key in obj)
    ret[key] = obj[key]
  return ret
}

export function bubblingEventWith(type, obj = undefined) {
  const ret = new CustomEvent(type, {bubbles: true, composed: true})
  if(obj !== undefined) for(const key in obj)
    ret[key] = obj[key]
  return ret
}

export function notificationFrom(elem, message, opts = {}) {
  let messageSource = elem
  let dropdownParent = elem.closest('.dropdown-root')
  while(dropdownParent) { // is in dropdown, jump to dropdown origin
    messageSource = document.body.querySelector(`#${dropdownParent.dataset.dropdownid}`) // default to elem if cant find origin
    if(!messageSource) {
      messageSource = elem
      break
    }
    dropdownParent = messageSource.closest('.dropdown-root')
  }
  messageSource.dispatchEvent(bubblingEventWith('notification', {message: message, options: opts}))
}

/**
(originally from elib.mjs)
Suitable for appendChild-ing to document.head
*/
function scriptElement(scriptUrl) {
  return elementThen('script', scriptElement => {
    scriptElement.src  = scriptUrl
    scriptElement.type = 'text/javascript'
  })
}

/**
(originally from elib.mjs)
Suitable for appendChild-ing to document.head
*/
function styleElement(styleUrl) {
  return elementThen('link', scriptElement => {
    scriptElement.href = styleUrl
    scriptElement.rel  = 'stylesheet'
  })
}

/**
(originally from elib.mjs)
Splits at the first occurrence of the splitter regex
splitAtFirst('asdfg', /d/)
Returns ['as','fg']
*/
export function splitAtFirst(str, splitter) {
  let match = splitter.exec(str)
  if(match === null)
    return [str, undefined]
  else
    return [str.substring(0, match.index), str.substring(match.index + match[0].length, str.length)]
}


export function randomIntegerOn(start, end) {
  if(end < start)
    return randomIntegerOn(start, end)
  else if(end === start)
    return start
  else
    return Math.floor(Math.random()*(end+1-start)) + start
}

export function singleRandomChoice(choices) {
  return choices[randomIntegerOn(0, choices.length - 1)]
}
export function randomChoice(choices, n) {
  if(n === undefined) { // no count n given
    return singleRandomChoice(choices)
  } else { // count n is given
    let ret = []
    for(let i = 0; i < n; i++)
      ret.push(singleRandomChoice(choices))
    return ret
  }
}

const randomTokenStringChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export function randomTokenString(n) {
  return randomChoice(randomTokenStringChars, n).join('')
}


export function attentionFlashElement(elem, style = 'outline') {
  let flashClass = 'attention-flashing-' + style
  elem.classList.add(flashClass)
  setTimeout(()=>{
    elem.classList.remove(flashClass)
  }, 500 /*0.5 second*/)
}

/**
This establishes a standard way of styling elements that are changing somehow
Current general.css style values are: 'dim', 'outline'
Returns a function to immediately reverse the styling (instead of waiting)
*/
export function styleInProgress(elem, style = 'dim', timeoutDelay = 1000*5) {
  const progressClass = `in-progress-${style}`
  elem.classList.add(progressClass)
  let timeoutId = setTimeout(() => {
    elem.classList.remove(progressClass)
  }, timeoutDelay)
  return () => { // prematurely reverse styling
    clearTimeout(timeoutId)
    elem.classList.remove(progressClass)
  }
}

export function getParentMatching(elem, selector) {
  const closestParent = elem.closest(selector)
  const targetParentRedirector = elem.closest('*[target-parent]')
  if(closestParent && (!targetParentRedirector || closestParent.contains(targetParentRedirector))) {
    return closestParent
  } else if(targetParentRedirector) {
    let targetParent = selectTargetElement(targetParentRedirector, targetParentRedirector.getAttribute('target-parent'))
    return getParentMatching(targetParent, selector)
  }
}

/**
Looks at each of startElem's parents, and those parents' immediate children
*/
export function getFirstInTreeMatching(elem, selector, fullSearch = false) {
  let lastParent = undefined
  let parent = elem
  while(true) {
    lastParent = parent
    let parentSelector = parent.getAttribute('target-parent')
    if(parentSelector)
      parent = selectTargetElement(parentSelector)
    else
      parent = parent.parentElement
    if(!parent) {
      parent = lastParent.getRootNode().host
      if(!parent)
        return undefined
    }
    // else
    if(parent.matches(selector))
      return parent
    // else
    let child = parent.querySelector(fullSearch ? selector : `:scope > ${selector}`)
    if(child !== null)
      return child
    // else, continue
  }
}

/**
(originally from elib.mjs)
*/
export function getNextSiblingMatching(startElem, selector) {
  let elem = startElem
  while(true) {
    elem = startElem.nextElementSibling
    if(!elem) // elem is null; no next sibling
      return undefined
    // else:
    if(elem.matches(selector))
      return elem
  }
}
/**
(originally from elib.mjs)
*/
export function getPrevSiblingMatching(startElem, selector) {
  let elem = startElem
  while(true) {
    elem = startElem.previousElementSibling
    if(elem === null) // elem is null; no previous sibling
      return undefined
    // else:
    if(elem.matches(selector))
      return elem
  }
}

/**
(originally for callib.mjs)
Syntax is:
               : initial [dirspeclist]
   initial     : document | body | this
   dirspeclist : dirspec [>> dirspeclist]
   dirspec     : direction [specifier]
   direction   : document | body | this
And specifier is a query selector string
eg:
this parent                       : goes to the given element's parent
this parent .pagelet              : the first pagelet parent of the given element
body child .pagelet >> first      : the first child of the first found pagelet in the body of the page
this parent >> child :scope > div : the first div sibling of the given element
*/
export function selectTargetElement(elem, code) {
  let currentElem = elem
  let [initial, specifierCode] = splitAtFirst(code, /\s+/) ?? [undefined, undefined]
  switch(initial) {
    case 'document' : currentElem = document      ; break
    case 'body'     : currentElem = document.body ; break
    case 'this'     : currentElem = elem          ; break
    default         : writeAndThrow(`selectTargetElement invalid initial element`, ...arguments) ; break
  }
  if(specifierCode === undefined || specifierCode === null)
    return currentElem
  // else
  let splitCode = specifierCode.split('>>')
  for(let codelet of splitCode) {
    codelet = codelet.trim()
    if(!(currentElem instanceof Node)) // null, etc
      return undefined
    // else
    let direction, specifier
    [direction, specifier] = splitAtFirst(codelet, /\s+/) ?? [codelet, ''] // default to ignoring specifier
    let noSpecifierGiven
    if((specifier ?? '') === '') { // no specifier given
      specifier  = '*'  // default to anything
      noSpecifierGiven = true
    }
    direction = direction.trim()
    specifier = specifier.trim()
    if(noSpecifierGiven) {
      switch(direction) {
        case 'parent'   : currentElem = currentElem.parentElement           ; break
        case 'prev'     : currentElem = currentElem.previousElementSibling  ; break
        case 'next'     : currentElem = currentElem.nextElementSibling      ; break
        case 'first'    : currentElem = currentElem.firstElementChild       ; break
        case 'last'     : currentElem = currentElem.lastElementChild        ; break
        default         : writeAndThrow(`selectTargetElement bad target selector direction`, ...arguments, direction, specifier); break
      }
    } else {
      switch(direction) {
        case 'parent'   : currentElem = getParentMatching(currentElem, specifier)                              ; break
        case 'jump'     : currentElem = document.body.querySelector(`#${currentElem.getAttribute(specifier)}`) ; break // get attribute value and jump to id with that value
        case 'prev'     : currentElem = getPrevSiblingMatching(currentElem, specifier)                         ; break
        case 'next'     : currentElem = getNextSiblingMatching(currentElem, specifier)                         ; break
        case 'tree'     : currentElem = getFirstInTreeMatching(currentElem, specifier)                         ; break // step up and search down 1 child
        case 'fulltree' : currentElem = getFirstInTreeMatching(currentElem, specifier, true)                   ; break // step up and search down all the way
        case 'child'    : currentElem = currentElem.querySelector(specifier)                                   ; break
        case 'sibling'  : currentElem = getSiblingMatching(currentElem, specifier)                             ; break
        case 'siblings' : currentElem = currentElem.parentElement?.querySelectorAll(`:scope > ${specifier}`)   ; break
        default         : writeAndThrow(`selectTargetElement bad target selector direction`, ...arguments, direction, specifier); break
      }
    }
  }
  return currentElem
}

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


export function makePageletFromSource(src) {
  let pageletFrag = document.createElement('template')
  pageletFrag.innerHTML = src
  pageletFrag = pageletFrag.content
  replicateAndReplaceScripts(pageletFrag)
  
  return pageletFrag
}

/**
Attributes:
 pagelet-src
*/
export async function getRemotePagelet(src, errorMode = ERRORONNOTOK) {
  // get pagelet body from remote source and make the pagelet
  let response = await fetch(src)
  if(!response.ok) {
    if(errorMode === ERRORONNOTOK)
      writeAndThrow(`Response returned: ${response.status}, ${response.statusText}`, src, response)
    else if(errorMode === ALLOWNOTOK)
      return void console.warn(`Response returned: ${response.status}, ${response.statusText}`, src, response)
  }
  // else
  let pageletBody = await response.text().then(x => x.trim())
  let pageletFrag = makePageletFromSource(pageletBody)
  let focusTarget = pageletFrag.querySelector('*[autofocus]')
  if(focusTarget)
    setTimeout(() => focusTarget.focus(), 50)
  return pageletFrag
}
export const ERRORONNOTOK = 1
export const ALLOWNOTOK   = ERRORONNOTOK + 1

export async function addElementAt(selectOriginElem, direction, selector, toAdd) {
  let targetElem = selectTargetElement(selectOriginElem, selector)
  if(!targetElem)
    throw writeAndThrow(`insertElementAt: no suitable target element found ${direction} ${selector}`, toAdd, direction, selector)
  // else
  switch(direction) {
    case 'append':  targetElem.appendChild(toAdd); break
    case 'prepend': targetElem.appendChild(toAdd); break
    case 'after':   targetElem.after(toAdd); break
    case 'before':  targetElem.before(toAdd); break
    case 'replace': 
      styleInProgress(targetElem)
      targetElem.replaceWith(toAdd)
      break
    default: writeAndThrow(`insertElementAt unknown direction ${direction}`)
  }
}

export async function openPageletAt(elem, url, compoundSelector) {
  let [method, targetSelector] = splitAtFirst(compoundSelector, /\s+/) ?? [undefined, undefined]
  if(method.startsWith('_')) {
    let fakeLink = document.createElement('a')
    fakeLink.target = '_blank'
    fakeLink.href = url
    fakeLink.click()
    return void 0
  }
  // else
  if(targetSelector === undefined)
    writeAndThrow('No target selector given for target attribute', this)
  // else
  if(!url) writeAndThrow(`openPageletAt no href attribute given`, elem)
  // else
  let newElem
  let splitMethod = method.split('-') // after-nocontroller -> [after, nocontroller]
  if(splitMethod.length > 1) {
    if(splitMethod[1] === 'iframe') {
      newElem = document.createElement('iframe')
      newElem.src = href
    } else if(splitMethod[1] === 'noframe') {
      newElem = htmlToElement(/*html*/`<span class="early-element in-progress-outline"></span>`)
      getRemotePagelet(url).then(pagelet => newElem.replaceWith(pagelet))
    } else {
      writeAndThrow(`openPageletAt unknown submethod ${splitMethod[1]} in ${method}`, ...arguments)
    }
  } else {
    newElem = await controllerFrameAround(htmlToElement(/*html*/`<div class="early-element in-progress-outline-empty"></div>`))
    getRemotePagelet(url).then(pagelet => newElem.querySelector(':scope > .child-container > .early-element').replaceWith(pagelet))
  }
  addElementAt(elem, splitMethod[0], targetSelector, newElem)
}

let controllerFrameSource
export async function getControllerFrameSource() {
  if(!controllerFrameSource)
    controllerFrameSource = await fetch('/pagelets/controller-frame.html').then(response => response.text())
  return controllerFrameSource
}

export async function controllerFrameAround(...elements) {
  let ret = makePageletFromSource(await getControllerFrameSource()).firstElementChild
  let childTarget = ret.querySelector('slot[name="child-mixin-target"]')
  let targetReplacement = document.createDocumentFragment()
  for(const elem of elements) if(elem)
    targetReplacement.appendChild(elem)
  childTarget.replaceWith(targetReplacement)
  return ret
}

/**
{a:1, b:"asdf"} -> `a=1;b="asdf"`
Doesn't include & at start of query part
Doesn't got deeply into object's values, only a shallow translation
ie {a:{b:1}} -> `a=[object Object]`
*/
export function objectToQueryString(obj) {
  let segs = []
  for(const key in obj)
    segs.push(_escapeSpecialQueryChars(String(key)), '=', _escapeSpecialQueryChars(String(obj[key])), ';')
  return segs.join('')
}
function _escapeSpecialQueryChars(value) {
  return value.replaceAll('[\&\;\#]', (str) => `\\`+str)
}

//#region markup

let markdownInitialized = false
let markdownLoading     = false
let showdownConverter
async function initMarkdown() {
  if(markdownLoading) // already loading
    return asyncWaitUntil(()=> markdownInitialized) // wait for original initMarkdown caller to say its all clear
  markdownLoading = true
  // else:
  // showdown
  if(!('showdown' in globalThis)) {
    let scriptElem = scriptElement('https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js')
    scriptElem.addEventListener('error', errorEvent => writeAndThrow(`Showdown load error ${errorEvent.message}`, errorEvent, scriptElem))
    document.head.appendChild(scriptElem)
  }
  // katex, plugin and katex proper
  if(!('showdownKatex' in globalThis)) {
    let scriptElem = scriptElement('https://cdn.jsdelivr.net/npm/showdown-katex@0.8.0/dist/showdown-katex.min.js')
    scriptElem.addEventListener('error', errorEvent => writeAndThrow(`Showdown Katex extension load error ${errorEvent.message}`, errorEvent, scriptElem))
    document.head.appendChild(scriptElem)
  }
  if(!('katex' in globalThis)) {
    let scriptElem = scriptElement('https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js')
    scriptElem.addEventListener('error', errorEvent => writeAndThrow(`Katex load error ${errorEvent.message}`, errorEvent, scriptElem))
    document.head.appendChild(scriptElem)
    document.head.appendChild(styleElement('https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css'))
  }
  // initialize showdown and katex extension
  await asyncWaitUntil(()=> 'showdown' in globalThis && 'showdownKatex' in globalThis) // wait for libraries
  showdownConverter =  new showdown.Converter({
    simpleLineBreaks: true,
    emoji: true,
    simplifiedAutoLink: true,
    extensions: [
      showdownKatex({
        delimiters: [
          {left: "$$", right:"$$", display: false},
          {left: '$[', right:']$', display: true}
        ]
      })
    ]
  })
  showdownConverter.setFlavor('github')
  markdownInitialized = true
  markdownLoading     = false
}

/**
(originally from elib.mjs)
*/
export async function renderMarkdown(text) {
  let escapedText = text.replaceAll(/[<>]/g, str => str === '<' ? '&lt;' : '&gt;')
  try {
    if(!markdownInitialized) 
      await initMarkdown()
    return showdownConverter?.makeHtml(escapedText) ?? `<span>${text}</span>`
  } catch(err) {
    return `<pre style="white-space: pre-wrap">${escapedText}</pre>`
  }
}

let highlightingInitialized = false
let highlightingLoading     = false
async function initCodeHighlighting() {
  if(highlightingLoading) // already loading
    return asyncWaitUntil(()=> highlightingInitialized) // wait for original inithighlighting caller to say its all clear
  highlightingLoading = true
  // else:
  // showdown
  if(!('hljs' in globalThis)) {
    document.head.appendChild(scriptElement('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.6.0/build/highlight.min.js'))
    document.head.appendChild(styleElement('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.6.0/build/styles/default.min.css'))
  }
  // initialize showdown and katex extension
  await asyncWaitUntil(()=> 'hljs' in globalThis) // wait for library
  hljs.configure({
    ignoreUnescapedHTML: true
  })
  highlightingInitialized = true
  highlightingLoading     = false
}

/**
(originally from elib.mjs)
*/
export async function renderHighlighting(text, language) {
  if(!highlightingInitialized) 
    await initCodeHighlighting()
  return elementThen('pre', pre => {
    pre.appendChild(elementThen('code', code => {
      let {value} = hljs.highlight(text, {language: language, ignoreIllegals: true})
      code.innerHTML = value
    }))
  })
}

let escmInitialized = false
let escSet, escm
export async function initEscm() {
  if(!escmInitialized) {
    if(!document.head.querySelector('link[href*="basic-escm.css]'))
      document.head.appendChild(styleElement('/lib/escm/basic-escm.css'))
    let {basicEscset}    = await import('/lib/escm/basic-escm.mjs')
    let {extendedEscset} = await import('/lib/escm/extended-escm.mjs')
    escSet          = {...basicEscset, ...extendedEscset}
    escm            = await import('/lib/escm/escm.mjs')
    escmInitialized = true
  }
}

export async function renderEscapeMarkup(text) {
  if(!escmInitialized)
    await initEscm()
  let ret = escm.parsePreprocessEval(text, escSet)
  ret.classList.add('escm-root')
  return ret
}

const allowedShtmlTags = new Set([
  'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7',
  'br', 'details', 'summary'
])
export async function renderShtml(sourceStr) {
  let template = document.createElement('template')
  template.innerHTML = sourceStr.replaceAll(/\<(\/?)([a-z\-]+)\>/g, (str, ender, tag) => {
    if(allowedShtmlTags.has(tag))
      return str
    else
      return `&lt;${ender ?? ''}${tag}&gt;`
  })
  return template.content
}

export async function renderContentTo(elem, content, contentType) {
  let contentTypeSplit = contentType.split(';')
  let newChild
  switch(contentTypeSplit[0]) {
    default: // console.error(`lib.mjs renderContentTo: unknown extension given ${ext}`, ...arguments)
    case 'text/plain': case '.txt':
      elem.innerHTML = content.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')
      elem.dataset.contenttype = 'text/plain'
      break
    case 'text/markdown': case '.md':
      elem.innerHTML = await renderMarkdown(content)
      elem.dataset.contenttype = 'text/markdown'
      break
    case 'application/javascript':
    case 'text/javascript': case '.js': case '.mjs': 
      newChild = await renderHighlighting(content, 'javascript')
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/javascript'
      break
    case 'text/css': case '.css': 
      newChild = await renderHighlighting(content, 'css')
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/css'
      break
    case 'text/json': case '.json': 
      newChild = await renderHighlighting(content, 'json')
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/json'
      break
    case 'text/html': case '.html': 
      newChild = await renderHighlighting(content, 'html')
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/html'
      break
    case 'text/shtml': case '.shtml': 
      newChild = await renderShtml(content)
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/shtml'
      break
    case 'text/escm': case '.escm': 
      newChild = await renderEscapeMarkup(content)
      elem.innerHTML = ''
      elem.appendChild(newChild)
      elem.dataset.contenttype = 'text/escm'
      break
  }
}

export const defaultStdTextExpansions = {
  ["!RINST"]:      {to: ()=> `/pagelets/represent-file.jhp?file=/instances/${randomTokenString(6)}/`, endPosition: -1},
  ["!RTOP"]:       {to: ()=> `/pagelets/represent-file.jhp?file=/instances/${randomTokenString(6)}/${randomTokenString(6)}.escm`, endPosition: -1},
  ["!RDTOP"]:      {to: ()=> `/pagelets/represent-file.jhp?file=!DIR/${randomTokenString(6)}.escm`, endPosition: -1},
  ["!INST"]:       {to: ()=> `/pagelets/represent-file.jhp?file=/instances/`          , endPosition: -1},
  ["!USER"]:       {to: ()=> `/pagelets/represent-file.jhp?file=/users/`              , endPosition: -1},
  ["!GROUP"]:      {to: ()=> `/pagelets/represent-file.jhp?file=/groups/`             , endPosition: -1},
  ["!REP"]:        {to: ()=> "/pagelets/represent-file.jhp?file="                     , endPosition: -1},
  ["!DREP"]:       {to: ()=> "/pagelets/represent-directory.jhp?directory="           , endPosition: -1},
  ["!SELF"]:       {to: ()=> `/pagelets/selfpad.jhp?name=`                            , endPosition: -1},
  ["!MLREP"]:      {to: ()=> "/pagelets/represent-message-list.jhp?directory="        , endPosition: -1},
  ["!RAND"]:       {to: ()=> randomTokenString(6)                                     , endPosition: -1},
  
  // Markdown
  ["!MRINST"]:    {to: ()=> `[](/pagelets/represent-file.jhp?file=/instances/${randomTokenString(6)})` , endPosition: -2},
  ["!MRTOP"]:     {to: ()=> `[](/pagelets/represent-file.jhp?file=/instances/${randomTokenString(6)}/${randomTokenString(6)}.escm)` , endPosition: -2},
  ["!MRDTOP"]:    {to: ()=> `[](/pagelets/represent-file.jhp?file=!DIR/${randomTokenString(6)}.escm)`, endPosition: -2},
  ["!MINST"]:     {to: ()=> `[](/pagelets/represent-file.jhp?file=/instances/)`     , endPosition: -2},
  ["!MLINK"]:     {to: ()=> "[]()"                                                  , endPosition: -2},
  ["!MIMG"]:      {to: ()=> "![]()"                                                 , endPosition: -2},
  ["!MREP"]:      {to: ()=> "[](/pagelets/represent-file.jhp?file=)"                , endPosition: -2},
  ["!MREPIMG"]:   {to: ()=> "![](/pagelets/represent-file.jhp?file=)"               , endPosition: -2},
  
  // Escm
  ["!ERINST"]:   {to: ()=> `\\link(/pagelets/represent-file.jhp?file=/instances/${randomTokenString(6)})` , endPosition: -2},
  ["!ERTOP"]:    {to: ()=> `\\link(/pagelets/represent-file.jhp?file=/instances/${randomTokenString(6)}/${randomTokenString(6)}.escm)` , endPosition: -2},
  ["!ERDTOP"]:   {to: ()=> `\\link(/pagelets/represent-file.jhp?file=!DIR/${randomTokenString(6)}.escm)`, endPosition: -2},
  ["!EINST"]:    {to: ()=> "\\link(/pagelets/represent-file.jhp?file=/instances/)" , endPosition: -2},
  ["!ELINK"]:    {to: ()=> "\\link()"                                              , endPosition: -2},
  ["!EIMG"]:     {to: ()=> "\\img()"                                               , endPosition: -2},
  ["!EREP"]:     {to: ()=> "\\link(/pagelets/represent-file.jhp?file=)"            , endPosition: -2},
  ["!EMIXIN"]:   {to: ()=> "\\mixin(/pagelets/represent-file.jhp?file=)"           , endPosition: -2},
  
  ["!TIME"]:     {to: ()=> (new Date).toUTCString()                                , endPosition: -1},
  ["!TAG"]:      {to: ()=> {
    let username    = window.localStorage.getItem('username')
    let displayname = window.localStorage.getItem('displayname')
    let time = (new Date).toUTCString()
    let retSegs = [username ?? 'anonymous']
    if(displayname)
      retSegs.push(`(as ${displayname})`)
    retSegs.push(time)
    return retSegs.join(' ')
  } , endPosition: -1}
}
export let stdTextExpansions = defaultStdTextExpansions

export function makeTextExpander(replacementsObj) {
  let keyRegex = RegExp(Object.keys(replacementsObj).map(x=>['(?:',x,')'].join('')).join('|'), 'g')
  let ret = (text) => { return ret.withOffset(text)[0] }
  ret.withOffset = (text) => {
    let offset = 0
    return [text.replaceAll(keyRegex, str => {
      let rep = replacementsObj[str]
      let to  = rep.to()
      offset = to.length - str.length + rep.endPosition + 1
      return to
    }), offset]
  }
  return ret
}

export let stdTextExpand = makeTextExpander(stdTextExpansions)
async function makeStdTextExpand() {
  const libSettings = await import('/lib/settings.mjs')
  const customSubSetting = libSettings.getSetting('custom-substitutions')
  if(!customSubSetting) // not defined yet
    return void 0
  // else
  const valueObject = {}
  let lineNum = 0
  let errorMessages = []
  for(const line of customSubSetting.split(/\s*\n\s*/g)) { // split by newlines potentially with whitespaces
    lineNum++
    const splitLine = splitAtFirst(line, /\s*\:\s*/g) // split by first colon potentially with whitespaces
    if(!splitLine[1])
      errorMessages.push(`Custom substitution error on line ${lineNum} (${line})`)
    if(errorMessages.length === 0)
      valueObject[splitLine[0]] = {to: ()=>splitLine[1], endPosition: -1}
  }
  if(errorMessages.length !== 0)
    throw Error(errorMessages.join('\n'))
  // else
  stdTextExpansions = {
    ...defaultStdTextExpansions,
    ...valueObject
  }
  stdTextExpand = makeTextExpander(stdTextExpansions)
}
import(`/lib/settings.mjs`).then(libSettings => {
  libSettings.settingChanges.addEventListener(`custom-substitutions`, settingChangeEvent => {
    makeStdTextExpand().catch(err => notificationFrom(settingChangeEvent.elem, err.message, {error: true}))
  })
})
makeStdTextExpand()

//#endregion markup
