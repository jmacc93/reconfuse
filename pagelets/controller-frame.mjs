


export async function newFrameAfter(optionCallElem) {
  const lib = await import('/lib/lib.mjs')
  const frame = optionCallElem.closest('.controller-frame')
  frame.insertAdjacentElement('beforebegin', await lib.controllerFrameAround(await lib.getRemotePagelet('/pagelets/open-dialog.html')))
}

export async function installTitleMirrorFunctionality(callElem) {
  const lib   = await import('/lib/lib.mjs')
  const frame = callElem.closest('.controller-frame')
  const titleMirror    = frame.querySelector(':scope > .infobar > .child-title-mirror')
  lib.applyOnNewChildren(frame, () => {
    let firstTitle = frame.querySelector('title')
    titleMirror.textContent = firstTitle.textContent
  })
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

export async function toggleResizable(callElem) {
  const lib = await import('/lib/lib.mjs')
  const settings = await import('/lib/settings.mjs')
  const frame = callElem.closest('.controller-frame')
  const childContainer = frame.querySelector(':scope > .child-container')
  childContainer.classList.toggle('vertical-resizable')
  if(!childContainer.matches('.vertical-resizable')) {
    childContainer.style.height = 'fit-content'
  } else {
    let height = parseInt(window.getComputedStyle(childContainer).height.slice(0, -2))
    let maxInitialHeight = settings.getSetting('controller-frame-resize-max-initial-height') ?? 16*16
    if(height > maxInitialHeight)
      childContainer.style.height = `${maxInitialHeight}px`
  }
}