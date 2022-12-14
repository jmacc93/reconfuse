


export async function newFrameAfter(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const frame = optionCallElem.closest('.controller-frame')
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

export async function installDragHandleFunctionality(callElem) {
  const frame = callElem.closest('.controller-frame')
  const dragHandle     = frame.querySelector(':scope > .infobar > span.drag-handle')
  
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
    bottomFrame.id = 'controller-frame-drop-target' // ERROR: Uncaught TypeError: bottomFrame is null; go to user.jhp from index.jhp, make new frame via S menu
    overEvent.stopPropagation()
    overEvent.stopImmediatePropagation()
    overEvent.preventDefault()
  })
}
