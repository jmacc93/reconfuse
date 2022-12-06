export async function installFunctionality(callElem) {
  const pagelet       = callElem.parentElement
  const messageList   = pagelet.querySelector(':scope > .message-list')
  const submitButton  = pagelet.querySelector(':scope > .submission-area > div > button.submit')
  const refreshButton = pagelet.querySelector(':scope > .submission-area > div > button.refresh')
  const filenameArea  = pagelet.querySelector(':scope > .submission-area > div > .filename-input')
  const filenameErr   = pagelet.querySelector(':scope > .submission-area > div > .filename-input-error-msg')
  const preview       = pagelet.querySelector(':scope > .submission-area > .submission-preview')
  const inputArea     = pagelet.querySelector(':scope > .submission-area > .submission-input')
  
  const channel    = pagelet.dataset.channel
  const directory  = pagelet.dataset.directory
  const getListUri = ['/bin/file.s.js/list?directory=', directory, '&pattern=message-', channel, '-\S*'].join('')
  
  // this is massively inefficient because it pulls all files from the directory at once
  // definitely a prime target for optimization after mvp
  const getMessagesFromServer = async () => {
    // get current latest message
    let lastMessage = messageList.lastElementChild
    if(lastMessage && lastMessage.classList.contains('controller-frame'))
      lastMessage = lastMessage.querySelector('.message')
    let maxTime = parseInt(lastMessage?.dataset.mtime ?? '0')
    
    const response = await fetch(getListUri)
    if(!response.ok)
      return void console.error('Error getting file list', response.statusText)
    // else
    const responseText = await response.text()
    const fileList = responseText // "124.567 file1.md\n123.456 file2.md\n..."
      .split(/\n+/) // ["124.567 file1.md", "123.456 file2.md", ...]
      .map(line => {
        let splitLine = line.split(/\s+/) // ["124.567", "file1.md"]
        return [parseInt(splitLine[0]), splitLine[1]] // [124.567, "file1.md"]
      }) // [[124.567, "file1.md"], [123.456, "file2.md"], ...]
      .sort((a,b) => a[0] - b[0]) // [[123.456, "file2.md"], [124.567, "file1.md"], ...]
    for(const lineArray of fileList) {
      if(lineArray[0] > maxTime) {
        let newMsgMixin = document.createElement('html-mixin')
        newMsgMixin.classList.add('message', 'pagelet')
        newMsgMixin.setAttribute('src', ['/pagelets/represent-file.jhp?file=', lineArray[1]].join(''))
        newMsgMixin.setAttribute('framed', 'true')
        newMsgMixin.setAttribute('data-mtime', String(lineArray[0]))
        newMsgMixin.dataset.mtime = String(lineArray[0])
        messageList.appendChild(newMsgMixin)
      }
    }
  }
  getMessagesFromServer()
  
  refreshButton.addEventListener('click', async clickEvent => {
    getMessagesFromServer()
    const lib = await import('/lib/lib.mjs')
    lib.notificationFrom(refreshButton, 'Refreshed', {transient: true})
  })
  
  inputArea.addEventListener('keydown', async downEvent => {
    if(downEvent.ctrlKey && downEvent.key === 'Enter')
      return void submitButton.click()
  })
  
  submitButton.addEventListener('click', async () => {
    const lib = await import('/lib/lib.mjs')
    let newFilename = [directory, 'message-', channel, '-', lib.randomTokenString(6), filenameArea.value].join('')
    let submissionContent = inputArea.value
    let displayname = window.localStorage.getItem('displayname')
    let timeStr     =  (new Date()).toUTCString()
    if(document.cookie.indexOf('loggedin=true') !== -1) {
      let username    = document.cookie.match(/username=([^;]+)/)[1]
      submissionContent = [timeStr, ', ', username, displayname ? [' (as ', displayname, ')'].join('') : '', ':\n', submissionContent].join('')
    } else {
      submissionContent = [timeStr, ', anonymous', displayname ? [' as ', displayname].join('') : '', ':\n', submissionContent].join('')
    }
    const response = await fetch(['/bin/file.s.js/make?file=', newFilename].join(''), {method: "PUT", body: submissionContent})
    if(response.ok) {
      lib.notificationFrom(submitButton, 'Created ' + newFilename, {transient: true})
      getMessagesFromServer()
      inputArea.value = ''
      preview.innerHTML = ''
    } else {
      lib.notificationFrom(submitButton, ['Could not create: ', String(response.status), ", ", response.statusText].join(''), {transient:true})
    }
  })
}

export async function updatePreview(callElemButton) {
  const lib = await import('/lib/lib.mjs')
  
  const pagelet       = callElemButton.closest('.pagelet')
  const filenameArea  = pagelet.querySelector(':scope > .submission-area > div > .filename-input')
  const preview       = pagelet.querySelector(':scope > .submission-area > .submission-preview')
  const inputArea     = pagelet.querySelector(':scope > .submission-area > .submission-input')
  
  let splitFilename = filenameArea.value.split('.')
  let filenameExtension = splitFilename.length > 0 ? '.' + splitFilename[splitFilename.length-1] : '.txt'
  lib.renderContentTo(preview, inputArea.value, filenameExtension)
}