


export async function newFrameAfter(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const frame = lib.getParentMatching(dropdownCallElem, '.controller-frame')
  frame.insertAdjacentElement('beforebegin', await lib.controllerFrameAround(await lib.getRemotePagelet('/pagelets/open-dialog.html')))
}

export async function installTitleMirrorFunctionality(callElem) {
  const lib   = await import('/lib/lib.mjs')
  const frame = callElem.closest('.controller-frame')
  const titleMirror = frame.querySelector(':scope > .infobar > .child-title-mirror')
  const childContainer = frame.querySelector(':scope > .child-container')
  lib.applyOnNewChildren(childContainer, () => {
    let firstTitle = childContainer.querySelector('title')
    if(firstTitle)
      titleMirror.textContent = firstTitle.textContent
  }, true) // true = deep
  titleMirror.textContent = frame.querySelector('title')?.textContent
}

export async function installDragHandleFunctionality(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const frame = lib.getParentMatching(dropdownCallElem, '.controller-frame')
  const dragHandle = frame.querySelector(':scope > .infobar > span.drag-handle')
  
  dragHandle.addEventListener('dragstart', startEvent => {
    frame.id = 'dragged-controller-frame'
    startEvent.stopPropagation()
  })
  dragHandle.addEventListener('dragend', endEvent => {
    let dropTarget = document.getElementById('controller-frame-drop-target')
    if(dropTarget !== null) {
      dropTarget.id = ''; frame.id = '' // workaround for inpredictable ondrop behavior
      const boundingRect = dropTarget.getBoundingClientRect()
      const center = (boundingRect.bottom + boundingRect.top)/2
      if(endEvent.clientY < center)
        dropTarget.insertAdjacentElement('beforebegin', frame)
      else
        dropTarget.insertAdjacentElement('afterend', frame)
    }
    endEvent.stopPropagation()
    endEvent.stopImmediatePropagation()
    endEvent.preventDefault()
  })
  frame.addEventListener('dragenter', enterEvent => {
    enterEvent.preventDefault()
  })
  frame.addEventListener('dragover', overEvent => {
    let previousTarget = document.getElementById('controller-frame-drop-target')
    if(previousTarget)
      previousTarget.id = ''
    let overElem    = document.elementFromPoint(overEvent.clientX, overEvent.clientY)
    let bottomFrame = overElem.closest('.controller-frame')
    if(!bottomFrame)
      bottomFrame = frame
    bottomFrame.id = 'controller-frame-drop-target'
    overEvent.stopPropagation()
    overEvent.stopImmediatePropagation()
    overEvent.preventDefault()
  })
}

export async function installKeepScrolledToBottomFunctionality(callElem) {
  const container = callElem.closest('.controller-frame').querySelector('.child-container')
  const observer = new MutationObserver(() => {
    if(container.classList.contains('scrolled-to-bottom'))
      container.scrollTop = container.scrollHeight - container.clientHeight
  })
  observer.observe(container, {subtree: true, childList: true, attributes: true})
}

function resizeContainerHandler(wheelEvent) {
  const containerElem = wheelEvent.currentTarget
  if(wheelEvent.shiftKey) {
    let height = parseInt(window.getComputedStyle(containerElem).height.slice(0, -2))
    height = Math.max(height + Math.ceil(wheelEvent.deltaY / 4), 92)
    containerElem.style.height = `${height}px`
    wheelEvent.stopImmediatePropagation()
    wheelEvent.stopPropagation()
  }
}

function scrollHandler(scrollEvent) {
  const container = scrollEvent.target
  if(container.scrollTop > container.scrollHeight - container.clientHeight - 10)
    container.classList.add('scrolled-to-bottom')
  else
    container.classList.remove('scrolled-to-bottom')
}

export async function toggleResizable(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const frame = lib.getParentMatching(dropdownCallElem, '.controller-frame')
  const childContainer = frame.querySelector('.child-container')
  frame.classList.toggle('resizable')
  if(frame.classList.contains('resizable')) { // was not resizable; just turned resizable
    if(!childContainer.style.height)
      childContainer.style.height = `8em`
    childContainer.addEventListener('wheel', resizeContainerHandler)
    childContainer.addEventListener('scroll', scrollHandler)
  } else {
    childContainer.removeEventListener('wheel', resizeContainerHandler)
    childContainer.removeEventListener('scroll', scrollHandler)
  }
}