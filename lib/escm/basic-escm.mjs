
/*
License: MIT
Original author: Joe M
400766f8f9b4b14f38b5a318bf221b6d2d6794e39adda29f6158da0ef807aa0bf7951380636354f43b9a43cb8620b9243216a44ccdd6dca1af576b4c0448049d
*/


/*
Nothing below uses escm.js
*/

/*
These escapes are intended to be used with basic-escm.css file
*/

export const basicEscset = {}

function trimNewlines(str) {
  return str.match(/^(\n*)([\s\S]*?)(\n*)$/)[2] ?? str
}

//#region helper functions
function elementThen(tag, fn = undefined) {
  let ret = document.createElement(tag)
  fn?.(ret)
  return ret
}
function plaintextElement(tag, text) {
  let ret = document.createElement(tag)
  if(!(text ?? false)) // text is null or undefined
    return undefined
  else if(typeof text === 'string')
    ret.innerText = text
  else
    ret.innerText = String(text)
  return ret
}

/**
groupElement('span', [elem1, elem2, ...]) -> <span>elem1 elem2 ...</span>
groupElement(tag, innerElements)
Puts the HTMLElements in the innerElements array into a new element with the given tag
*/
function groupElement(tag, children) {
  let ret = elementThen(tag)
  for(const child of children) {
    if(child ?? false) // child is defined
      ret.appendChild(child)
  }
  return ret
}

/**
errorElement("Wrong arguments")
Standard error element with the given message msg
*/
function errorElement(msg) {
  return elementThen('span', ret => {
    ret.innerText = msg;
    ret.classList.add('bes-error')
  }) 
}

/**
toggleElementClass(elem, 'active')
toggleElementClass(elem, class)
Adds or removes the given class from elem to 'toggle' it
*/
function toggleElementClass(elem, cla) {
  if(elem.classList.contains(cla))
    elem.classList.remove(cla)
  else
    elem.classList.add(cla)
} 

/**
asElement(obj) turns obj into an HTMLElement as best it can
Use this when you don't care what obj is, but you want it to be an HTMLElement
*/
function asElement(obj) {
  if(!(obj ?? false)) { // null or undefined
    return undefined
  } else if(obj instanceof HTMLElement) {
    return obj
  } else if(typeof obj === 'string') {
    return plaintextElement('span', obj)
  } else if(typeof obj === 'object') { // array or {...} object
    if(Array.isArray(obj)) {
      if(obj.length == 1)
        return asElement(obj[0])
      else
        return groupElement('span', obj.map(asElement))
    } else {
      return plaintextElement('span', obj)
    }
  } else { // is some other type
    return plaintextElement('span', obj)
  }
}

/**
asString(obj) turns obj into a string as best it can
*/
function asString(obj) {
  if(!(obj ?? false)) // null or undefined
    return undefined
  else if(obj instanceof HTMLElement) {
    return obj.innerText
  } else if(typeof obj === 'string') {
    return obj
  } else if(Array.isArray(obj)) {
    if(obj.length === 1)
      return asString(obj[0])
    else
      return String(obj.join(', '))
  } else {
    return String(obj)
  }
}

/**
For getting the given object at index from an htmlelement or array, all else is undefined
*/
function getIndex(obj, index) {
  if(typeof obj === 'object') { // object, array, HTMLElement
    if(Array.isArray(obj)) // array
      return obj[index]
    else if(obj instanceof HTMLElement) // element
      return obj.children[index]
    else // generic object
      return undefined
  } else if(index === 0) {
    return obj
  } else {
    return undefined
  }
}

/**
getArgNumber(args, 0, 'string')
getArgNumber(args, 1, 'element')
[firstArg, secondArg] = [getArgNumber(args, 0, 'element'), getArgNumber(args, 1, 'element')]
getArgNumber(arg, 0, 'element') same as: asElement(arg)
*/
function getArgNumber(args, num, type) {
  let ret = getIndex(args, num)
  if(ret === undefined || ret === null)
    return undefined
  switch(type) {
    case 'string':
      return asString(ret)
    case 'number':
      if(typeof ret === 'number')
        return ret
      else
        return undefined
    case 'element':
      return asElement(ret)
    default:
      return ret
  }
}

function copyClassesInto(elemA, elemB) {
  if(!(elemA ?? false)) return void 0
  if(!(elemB ?? false)) return void 0
  if(typeof elemA === 'object' && 'classList' in elemA && typeof elemB === 'object' && 'classList' in elemB)
    for(const cla of elemA.classList)
      elemB.classList.add(cla)
}

/**
randomIntegerOn(-5, 5) // -2 or 3 or 5 or ...
randomIntegerOn(start, end)
Gives a random integer on the interval [start, end] (note: end points inclusive)
*/
function randomIntegerOn(start, end) {
  if (end < start)
    return randomIntegerOn(start, end);
  else if (end === start)
    return start;
  else
    return Math.floor(Math.random() * (end + 1 - start)) + start;
}


//#endregion

/**
From escm.mjs for reference:
type EscsetElement = {
  preprocess?: (subtree: PTE) => PTE,                // transforms subtree to subtree, optional
  evaluate:    (body: any)    => any | Promise<any>, // result of child evaluation to the intended output
  check?:      (body: string) => boolean,            // is given body free of errors?
  stopsParser?: boolean                              // for escapes like \comment and \code which don't eval their bodies, defaults to false
}
type Escset {
  [key: string]: EscsetElement
}
esc.preprocess:
  Probably doesn't need to be used by most escapes
esc.evaluate:
  The first argument x in some esc.evaluate(x) might be anything, so do type coercion liberally
esc.stopsParser:
  When a command has esc.stopsParser === true, esc.evaluate will always receive the result of
  escset.outsideDefault.evaluate, or a plaintextElement by default
*/

/**
\nocom just stops the parse tree from descending, that's ALL it does
This prevents anything inside a \nocom from being evaluated
*/
basicEscset.nocom = {
  evaluate: (arg) => arg,
  stopsParser: true
}

/**
This command doesn't produce any displayed content, but still might have a noticeable in the dom tree
*/
basicEscset.comment = {
  evaluate: (_arg) => undefined,
  stopsParser: true
}

//#region Text styles: bold, italic, highlight, etc

/**
These all get turned into elements which are equivalent except for their class
*/
const stylerClassEscapes = [
  'bold',
  'italic',
  'highlight',
  'indent',
  'small',
  'tiny',
  'big',
  'huge',
  'centered',
  'pre',
  'icode',
  'strobe',
  'lowvis',
  'strikeout',
  'underline',
  'rainbow',
  'pulse',
  'mirror',
  'reverse',
  'blurry',
  'bubble',
  'powerful',
  'radioactive',
  'quote',
  'error'
]
for(const stylerClass of stylerClassEscapes) {
  basicEscset[stylerClass] = {
    evaluate: (arg) => {
      let ret = asElement(typeof arg === 'string' ? trimNewlines(arg) : arg)
      if(!(ret ?? false))
        return undefined
      ret.classList.add('bes-styler', stylerClass)
      return ret
    }
  }
}

basicEscset.icode.stopsParser = true

//#endregion


//#region Wrapper styles

/**
These are all just like the style classes above, but they take any HTMLElement arguments as parents
*/
const wrapperStyleEscapes = [
  'hypothesis',
  'spoiler',
  'blockquote',
  'header1',
  'header2',
  'header3',
  'header4'
]
for(const wrapperClass of wrapperStyleEscapes) {
  basicEscset[wrapperClass] = {
    evaluate: (arg) => {
      let ret = asElement(arg)
      if(!(ret ?? false))
        return undefined
      ret.classList.add('bes-styler', wrapperClass)
      return ret
    }
  }
}

basicEscset.icode.stopsParser = true

//#endregion

//#region character-level manipulating escapes

basicEscset.sarcasm = {
  evaluate: (arg) => {
    let stringArg  = getArgNumber(arg, 0, 'string')
    if(!(stringArg ?? false))
      return undefined
    let elementArg = getArgNumber(arg, 0, 'element')
    return elementThen('span', ret => {
      if(elementArg !== undefined)
        copyClassesInto(elementArg, ret)
      ret.classList.add('bes-styler', 'sarcasm')
      let chars = stringArg.split('')
      for(let i = chars.length - 1; i > 0; i--)
        chars[i] = (i % 2 == 0) ? chars[i].toUpperCase() : chars[i].toLowerCase()
      ret.innerText = chars.join('')
    })
  }
}

basicEscset.scramble = {
  evaluate: (arg) => {
    let stringArg  = getArgNumber(arg, 0, 'string')
    if(!(stringArg ?? false))
      return undefined
    let elementArg = getArgNumber(arg, 0, 'element')
    return elementThen('span', ret => {
      if(elementArg !== undefined)
        copyClassesInto(elementArg, ret)
      ret.classList.add('bes-styler', 'scramble')
      let chars = stringArg.split('')
      for(let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      ret.innerText = chars.join('')
    })
  }
}

basicEscset.wavy = {
  evaluate: (arg) => {
    let stringArg  = getArgNumber(arg, 0, 'string')
    if(!(stringArg ?? false))
      return undefined
    let elementArg = getArgNumber(arg, 0, 'element')
    return elementThen('span', ret => {
      if(elementArg !== undefined)
        copyClassesInto(elementArg, ret)
      ret.classList.add('bes-styler', 'wavy')
      let i = 0
      let offset = Math.random()*8
      stringArg.split('').map(c => ret.appendChild(elementThen(`i`, charelem => {
        let n = Math.round(5*Math.sin((2/8)*Math.PI*(offset + i++)))
        charelem.classList.add(`n${n}`)
        charelem.innerText = c
      })))
    })
  }
}

basicEscset.chaotic = {
  evaluate: (arg) => {
    // note: chaotic.evaluate should be considered destructive and to replace e
    let stringArg  = getArgNumber(arg, 0, 'string')
    if(!(stringArg ?? false))
      return undefined
    let elementArg = getArgNumber(arg, 0, 'element')
    return elementThen('span', ret => {
      if(elementArg !== undefined)
        copyClassesInto(elementArg, ret)
      ret.classList.add('bes-styler', 'chaotic')
      const mag = 2;
      stringArg.split('').map(c => ret.appendChild(elementThen(`i`, charelem => {
        charelem.style.top  = `${randomIntegerOn(-mag, mag)}px`
        charelem.style.left = `${randomIntegerOn(-mag, mag)}px`
        charelem.innerText = c
      })))
    })
  }
}

//#endregion

basicEscset.separator = {
  evaluate: (arg) => {
    // note: \separate(...) doesn't preserve its arguments
    return elementThen('div', e => e.classList.add('bes-styler', 'separator'))
  }
}

/**
\colored(color | content)
Styles the content argument with the color argument
*/
basicEscset.colored = {
  evaluate: (args) => {
    // arg is probably span with at least 2 children: span for color, and span for content
    let [colorstr, ret] = [getArgNumber(args, 0, 'string'), getArgNumber(args, 1, 'element')]
    if(!(colorstr ?? false )) // null or undefined
      return errorElement(`\\colored first argument is undefined`)
    if(!(ret ?? false )) // null or undefined
      return errorElement(`\\colored second argument is undefined`)
    ret.classList.add('bes-styler', 'colored')
    ret.style += `; color: ${colorstr}`
    return ret
  },
  argDelimiter: /\|/,
  expectedArgCount: 2
}

basicEscset.link = {
  evaluate: (arg, argCount) => {
    let linkurl, content
    if(argCount == 2) {
      linkurl = getArgNumber(arg, 0, 'string')
      content = getArgNumber(arg, 1, 'element')
    } else {
      linkurl = getArgNumber(arg, 0, 'string')
      content = linkurl
    }
    if(linkurl === undefined || linkurl.length === 0)
      return errorElement(`\\link(${linkurl}|...) bad url given`)
    if(content === undefined)
      return errorElement(`\\link(${linkurl}|undefined) bad second argument of link command`)
    return elementThen('a', linkelem => {
      if(linkurl.startsWith('/') || linkurl[0].startsWith('.') || linkurl.startsWith('http'))
        linkelem.href = linkurl
      else // absolute url w/o http://
        linkelem.href = `http://${linkurl}`
      if(typeof content === 'string')
        linkelem.innerText = content
      else
        linkelem.appendChild(content)
    })
  },
  argDelimiter: /\|/,
  expectedArgCount: 2
}

basicEscset.img = {
  evaluate: (arg) => {
    let url = asString(arg)
    return elementThen('img', img => {
      img.classList.add('bes-styler', 'img')
      img.src = url
    })
  }
}
basicEscset.charimg = {
  evaluate: (arg) => {
    let url = asString(arg)
    return elementThen('img', img => {
      img.classList.add('bes-styler', 'charimg')
      img.src = url
    })
  }
}

//#region containers and element hosts (scrollbox, list, etc)

basicEscset.scrollbox = {
  evaluate: (arg) => elementThen(`div`, scrollbox => {
    scrollbox.classList.add('bes-styler', 'scrollbox')
    let child = asElement(arg)
    if(child ?? false )
      scrollbox.appendChild(child)
  })
}

const EXPANDABLE  = 1
const COLLAPSIBLE = 2
function expandableElement(arg, which = EXPANDABLE) {
  return elementThen(`span`, e => {
    e.classList.add('bes-styler', 'expandable')
    if(which === 2)
      e.classList.add('expanded')
    // left bracket
    e.appendChild(elementThen('span', leftbracket => {
      leftbracket.innerText = '['
      leftbracket.classList.add('bracket', 'clickable')
      leftbracket.addEventListener('click', clickevent => {
        toggleElementClass(clickevent.target.parentElement, 'expanded')
      })
    }))
    // contents:
    let contentElement = asElement(arg)
    if(!(contentElement ?? false))
      contentElement = plaintextElement('span', ' ')
    contentElement.classList.add('content')
    e.appendChild(contentElement)
    // right bracket
    e.appendChild(elementThen('span', rightbracket => {
      rightbracket.innerText = ']'
      rightbracket.classList.add('bracket', 'clickable')
      rightbracket.addEventListener('click', clickevent => {
        toggleElementClass(clickevent.target.parentElement, 'expanded')
      })
    }))
  })
}
basicEscset.expandableElement = expandableElement // using basicEscset as a container for an exported function right here, not just as a escset
basicEscset.expandable = {
  evaluate: (arg) => {
    return expandableElement(arg, EXPANDABLE)
  }
}
basicEscset.collapsible = {
  evaluate: (arg) => {
    return expandableElement(arg, COLLAPSIBLE)
  }
}

basicEscset.tooltip = {
  evaluate: (args) => {
    const [contentArg, messageArg] = [getArgNumber(args, 0, 'element'), getArgNumber(args, 1, 'element')]
    if(!(contentArg ?? false))
      return errorElement('\\tooltip first element is undefined')
    if(!(messageArg ?? false))
      return errorElement('\\tooltip second element is undefined')
    return elementThen('span', tooltip => {
      tooltip.classList.add('bes-styler', 'tooltip')
      // message
      tooltip.appendChild(elementThen('div', messagediv => {
        messagediv.classList.add('tooltip-message')
        messagediv.appendChild(messageArg)
      }))
      tooltip.addEventListener('mouseover', overevent => {
        const tooltip = overevent.currentTarget
        const messagediv = tooltip.querySelector('.tooltip-message')
        const messageContent = messagediv.firstChild
        const tooltipBbox = tooltip.getBoundingClientRect()
        const messageBbox = messageContent.getBoundingClientRect()
        const visViewport = window.visualViewport
        if(tooltipBbox.left + messageBbox.width > visViewport.width) // off right side of screen, offset back
          messagediv.style.left = `${visViewport.offsetLeft + visViewport.width - messageBbox.width}px`
        else
          messagediv.style.left = ''
      })
      // content
      contentArg.classList.add('tooltip-content')
      tooltip.appendChild(contentArg)
    })
  },
  argDelimiter: /\|/,
  expectedArgCount: 2
}

basicEscset.expoverlay = {
  evaluate: (arg) => {
    let messageElem = asElement(arg)
    if(!(messageElem ?? false))
      return errorElement('\\expoverlay no message element given')
    return elementThen('span', expoverlay => {
      expoverlay.classList.add('bes-styler', 'expoverlay')
      // button
      expoverlay.appendChild(elementThen('span', button => {
        button.classList.add('expoverlay-button')
        button.addEventListener('click', clickevent => {
          const button = clickevent.currentTarget
          const expoverlay = button.parentElement
          toggleElementClass(expoverlay, 'expanded')
          if(!expoverlay.classList.contains('expanded')) // is now off
            for(const child of expoverlay.querySelectorAll('.bes-styler.expoverlay.expanded'))
              child.classList.remove('expanded')
          const messagediv = expoverlay.querySelector('.expoverlay-message')
          const messageContent = messagediv.firstChild
          const expoverlayBbox = expoverlay.getBoundingClientRect()
          const messageBbox = messageContent.getBoundingClientRect()
          const visViewport = window.visualViewport
          if(expoverlayBbox.left + messageBbox.width > visViewport.width) // off right side of screen, offset back
            messagediv.style.left = `${visViewport.offsetLeft + visViewport.width - messageBbox.width}px`
          else
            messagediv.style.left = ''
        })
      }))
      // message
      expoverlay.appendChild(elementThen('div', messagediv => {
        messagediv.classList.add('expoverlay-message')
        messagediv.appendChild(messageElem)
      }))
    })
  }
}

let itemnum = 0
basicEscset.item = {
  evaluate: (arg) => {
    let elem = asElement(arg)
    if(!(elem ?? false)) // null or undefined
      return undefined
    elem.classList.add('bes-styler', 'item')
    elem.dataset.itemid = itemnum++
    return elem
  },
  argDelimiter: /\|/
}

function tabsActivateTabWithId(tabs, id) {
  for(const activeitem of tabs.querySelectorAll(`.active-tab`))
    activeitem.classList.remove('active-tab')
  tabs.querySelector(`.tab[data-itemid="${id}"]`)?.classList.add('active-tab')
}
basicEscset.tabs = {
  evaluate: (arg) => {
    let items = asElement(arg).querySelectorAll('.item')
    return elementThen('span', tabs => {
      tabs.classList.add('bes-styler', 'tabs')
      tabs.appendChild(elementThen('div', bar => {
        bar.classList.add('tabs-bar')
        for(const item of items) {
          bar.appendChild(elementThen('span', tabbutton => {
            tabbutton.classList.add('tab-button')
            tabbutton.dataset.id = item.dataset.itemid
            let elem = getArgNumber(item, 0, 'element')
            if(!(elem ?? false))
              tabbutton.appendChild(errorElement(`Tab item arg 0 is undefined`))
            else
              tabbutton.appendChild(elem)
            tabbutton.addEventListener('click', clickevent => {
              const tabbutton = clickevent.currentTarget
              const tabs = tabbutton.parentElement.parentElement
              tabsActivateTabWithId(tabs, tabbutton.dataset.id)
              tabbutton.classList.add('active-tab')
            })
          }))
        }
        bar.querySelector('.tab-button')?.classList.add('active-tab')
      }))
      for(const item of items){
        const tab = getArgNumber(item, 0, 'element')
        if(tab ?? false) {
          tab.classList.add('tab')
          tab.dataset.itemid = item.dataset.itemid
          tabs.appendChild(tab)
        } else {
          tabs.appendChild(errorElement(`Tab item arg 0 is undefined`))  
        }
      }
      tabs.querySelector('.tab')?.classList.add('active-tab')
    })
  }
}

basicEscset.list = {
  evaluate: arg => {
    const children = asElement(arg)?.querySelectorAll(':scope > :is(.item, .list)')
    if(!(children ?? false)) // null or undefined
      return undefined
    return elementThen('ul', ul => {
      ul.classList.add('bes-styler', 'list')
      for(const child of children) {
        if(child.classList.contains('list')) {
          ul.appendChild(child)
        } else { // .item
          ul.appendChild(elementThen('li', li => {
            li.appendChild(child)
          }))
        }
      }
    })
  }
}

//#endregion

//#region external (math, code highlighting)

/**
Katex for latex rendering
Lazy loads by default
*/
let katexLoaded = ('katex' in globalThis)
let katexLoading = false
function renderToWhenKatexLoaded(code, elem, displaymode = false) {
  let loadingScript = document.head.querySelector('script[src*="katex"]')
  loadingScript.addEventListener('load', loadevent => {
    katexLoading = false
    katexLoaded  = true
    renderMathToElement(code, elem, displaymode)
  }, {once:true})
}
function renderMathToElement(code, elem, displaymode = false) {
  if(katexLoaded) {
    katex.render(code, elem, {throwOnError: false, displayMode: displaymode})
  } else if(katexLoading) {
    renderToWhenKatexLoaded(code, elem, displaymode)
  } else { // try loading
    katexLoading = true
    document.head.appendChild(elementThen('script', script => {
      script.setAttribute('src', 'https://cdn.jsdelivr.net/npm/katex@0.16.2/dist/katex.min.js')
      script.setAttribute('type', 'text/javascript')
      script.addEventListener('load', loadevent => {
        katexLoading = false
        katexLoaded = true
      })
    }))
    // <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.2/dist/katex.min.css" integrity="sha384-bYdxxUwYipFNohQlHt0bjN/LCpueqWz13HufFEV1SUatKs1cm4L6fFgCi1jT643X" crossorigin="anonymous">
    renderToWhenKatexLoaded(code, elem, displaymode)
    document.head.appendChild(elementThen('link', link => {
      link.setAttribute('rel', 'stylesheet')
      link.setAttribute('href', 'https://cdn.jsdelivr.net/npm/katex@0.16.2/dist/katex.min.css')
    }))
  }
}
basicEscset.math = {
  evaluate: (arg) => {
    let code = asString(arg)
    let ret = elementThen('span', math => {math.classList.add('bes-styler', 'math')})
    renderMathToElement(code, ret)
    return ret
  },
  stopsParser: true
}
let displayMathRefIndex = 0
basicEscset.displaymath = {
  evaluate: (arg) => {
    let code = asString(arg)
    let ret = elementThen('span', math => {math.classList.add('bes-styler', 'displaymath')})
    ret.dataset.mathrefindex = displayMathRefIndex++
    renderMathToElement(code, ret, true)
    return ret
  },
  stopsParser: true
}

/**
Highlight.js
Lazy loads by default
*/
let hljsLoaded = ('hljs' in globalThis)
let hljsLoading = false
function highlightCodeWhenLoaded(source, language, elem) {
  let loadingScript = document.head.querySelector('script[src*="highlight"]')
  loadingScript.addEventListener('load', loadevent => {
    hljsLoading = false
    hljsLoaded  = true
    highlightCodeElement(source, language, elem)
  }, {once:true})
}
function highlightCodeElement(source, language, elem) {
  if(hljsLoaded) {
    let {value} = hljs.highlight(source, {language: language, ignoreIllegals: true})
    let newElem = elementThen('pre', pre => {
      pre.classList.add('bes-styler', 'code')
      pre.appendChild(elementThen('code', code => code.innerHTML = value))
    })
    elem.replaceWith(newElem)
  } else if(hljsLoading) {
    highlightCodeWhenLoaded(source, language, elem)
  } else { // try loading
    hljsLoading = true
    document.head.appendChild(elementThen('script', script => {
      script.setAttribute('src', 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.6.0/build/highlight.min.js')
      script.setAttribute('type', 'text/javascript')
      script.addEventListener('load', loadevent => {
        hljsLoading = false
        hljsLoaded = true
        hljs.configure({
          ignoreUnescapedHTML: true
        })
      })
    }))
    highlightCodeWhenLoaded(source, language, elem)
    document.head.appendChild(elementThen('link', link => {
      link.setAttribute('rel', 'stylesheet')
      link.setAttribute('href', 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.6.0/build/styles/default.min.css')
    }))
  }
}
basicEscset.code = {
  evaluate: (arg, argCount) => {
    let language, source
    if(argCount == 2) {
      language = getArgNumber(arg, 0, 'string')?.trim() ?? 'plaintext'
      source   = getArgNumber(arg, 1, 'string')?.trim() ?? ''
    } else if(argCount == 1) {
      language = 'plaintext'
      source   = getArgNumber(arg, 0, 'string')?.trim() ?? ''
    }
    let ret = elementThen('pre', pre => pre.appendChild(elementThen('code', code => {
      code.classList.add(`language-${language}`)
      code.innerText = source
    })))
    highlightCodeElement(source, language, ret)
    return ret
  },
  stopsParser: true,
  argDelimiter: /(?<=^\w+)\|/,
  expectedArgCount: 2
}

//#endregion


// basicEscset.default = {
//   evaluate: arg => {
//     return arg
//   }
// }