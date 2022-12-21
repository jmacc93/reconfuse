
export async function setInitialState(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const displaynameInput = pagelet.querySelector(':scope > * > input.displayname')
  const usernameInput = pagelet.querySelector(':scope > * > input.username')
  const rememberMeBox = pagelet.querySelector(':scope > * > .rememberme > input')
  const loggedInAsUsernameElem = pagelet.querySelector(':scope > .logged-in-as .username')
  const loggedInAsDispnameElem = pagelet.querySelector(':scope > .logged-in-as .displayname')
  
  fetch(`/bin/user.s.js/validate`).then(async response => {
    const statusText = response.statusText
    if(statusText === 'false')
      validationMsgElem.textContent = `Please log in again`
  })
  
  let username = window.localStorage.getItem('username')
  usernameInput.value = username ?? ''
  
  let displayname = window.localStorage.getItem('displayname')
  displaynameInput.value = displayname ?? ''
  
  let rememberMe = (window.localStorage.getItem('rememberme') === 'true')
  rememberMeBox.checked = rememberMe
  
  let loggedIn = /loggedin=true/.test(document.cookie)
  pagelet.dataset.loggedin = loggedIn ? "true" : "false"
  
  loggedInAsUsernameElem.textContent = username
  loggedInAsDispnameElem.textContent = displayname
}

export async function logoutButtonClicked(callElemButton) {
  const pagelet = callElemButton.closest('.pagelet')
  const loggedInAsUsernameElem = pagelet.querySelector(':scope > .logged-in-as .username')
  const loggedInAsDispnameElem = pagelet.querySelector(':scope > .logged-in-as .displayname')
  
  document.cookie = 'authtoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'
  document.cookie = 'loggedin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'
  window.localStorage.removeItem('username')
  window.localStorage.removeItem('rememberme')
  loggedInAsUsernameElem.textContent = ''
  loggedInAsDispnameElem.textContent = ''
  pagelet.setAttribute('data-loggedin', 'false')
}

export async function loginButtonClicked(callElemButton) {
  const lib    = await import('/lib/lib.mjs')
  const sha256 = await import('/lib/sha256.mjs').then(x => x.exp)
  const pagelet = callElemButton.closest('.pagelet')
  const displaynameInput = pagelet.querySelector(':scope > * > input.displayname')
  const usernameInput = pagelet.querySelector(':scope > * > input.username')
  const passwordInput = pagelet.querySelector(':scope > * > input.password')
  const rememberMeBox = pagelet.querySelector(':scope > * > .rememberme > input')
  const loggedInAsUsernameElem = pagelet.querySelector(':scope > .logged-in-as .username')
  const loggedInAsDispnameElem = pagelet.querySelector(':scope > .logged-in-as .displayname')
  const loginButton = pagelet.querySelector(':scope > * > .login')
  const validationMsgElem = pagelet.querySelector(':scope > .initial-validation-msg')
  
  if(callElemButton.classList.contains('deactivated'))
    return void lib.notificationFrom(callElemButton, 'Please wait!', {transient: true})
  
  validationMsgElem.textContent = ''
  
  if(pagelet.dataset.loggedin === 'true')
    return void lib.notificationFrom(callElemButton, 'Already logged in')
  // else
  
  let uriSegs = [
    '/bin/user.s.js/login?username=', encodeURIComponent(usernameInput.value),
    '&password=', encodeURIComponent(sha256(passwordInput.value))
  ]
  if((displaynameInput.value ?? '') !== '')
    uriSegs.push('&displayname=', encodeURIComponent(displaynameInput.value))
  if(rememberMeBox.checked)
    uriSegs.push('&rememberme')
  callElemButton.classList.add('deactivated')
  const pleaseWaitNotification = document.createElement('span')
  pleaseWaitNotification.textContent = 'Please  wait'
  lib.notificationFrom(callElemButton, pleaseWaitNotification)
  let response = await fetch(uriSegs.join(''))
  pleaseWaitNotification.closest('.notification').remove()
  callElemButton.classList.remove('deactivated')
  lib.notificationFrom(loginButton, [
    response.ok ? 'Success: ' : 'Failure: ',
    response.statusText, ' (', String(response.status), ')'
  ].join(''))
  lib.attentionFlashElement(loginButton)
  if(response.ok) {
    window.localStorage.setItem('username',    String(usernameInput.value   ))
    window.localStorage.setItem('rememberme',  String(rememberMeBox.checked ))
    if(displaynameInput.value) {
      window.localStorage.setItem('displayname', String(displaynameInput.value))
      loggedInAsDispnameElem.textContent = displaynameInput.value
      loggedInAsDispnameElem.parentElement.hidden = false
      document.cookie = `displayname=${displaynameInput.value}`
    } else {
      localStorage.removeItem('displayname')
      loggedInAsDispnameElem.parentElement.hidden = true
      document.cookie = `displayname=;max-age=0`
    }
    pagelet.setAttribute('data-loggedin', 'true')
    loggedInAsUsernameElem.textContent = usernameInput.value
    passwordInput.value = ''
  }
}

export async function installCheckOnInputFunctionality(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const displaynameInput = pagelet.querySelector(':scope > * > input.displayname')
  const usernameInput = pagelet.querySelector(':scope > * > input.username')
  const passwordInput = pagelet.querySelector(':scope > * > input.password')
  const displaynameValidMsg = pagelet.querySelector(':scope > * > .msg.displayname')
  const usernameValidMsg = pagelet.querySelector(':scope > * > .msg.username')
  const passwordValidMsg = pagelet.querySelector(':scope > * > .msg.password')
  
  let usernameHadInput = false
  let passwordHadInput = false
  
  let timeoutId = -1
  
  displaynameInput.addEventListener('input', () => { if(timeoutId) clearTimeout(timeoutId); timeoutId = setTimeout(()=> {
    if(displaynameInput.value.length > 32) {
      displaynameValidMsg.innerText = 'Displayname too long'
    } else {
      displaynameValidMsg.innerHTML = ''
    }
  }, 500) })
  usernameInput.addEventListener(   'input', () => { usernameHadInput = true; if(timeoutId) clearTimeout(timeoutId); timeoutId = setTimeout(()=> {
    if(usernameInput.value.length === 0) {
      if(usernameHadInput) {
        usernameValidMsg.innerText = 'Username is empty'
      }
    } else if(!/^[a-zA-Z_\-0-9]*$/.test(usernameInput.value)) {
      let chars = usernameInput.value.split('').filter(c=> !/[a-zA-Z_\-0-9]+/.test(c))
      usernameValidMsg.innerText = 'Username contains invalid characters: ' + chars.join('')
    } else if(usernameInput.value.length > 16) {
      usernameValidMsg.innerText = 'Username too long'
    } else {
      usernameValidMsg.innerHTML = ''
    }
  }, 500) })
  passwordInput.addEventListener(   'input', () => { passwordHadInput = true; if(timeoutId) clearTimeout(timeoutId); timeoutId = setTimeout(()=> {
    if(passwordInput.value.length < 4) {
      if(passwordHadInput) {
        passwordValidMsg.innerText = 'Password is too short (must be length > 3; highly recommend a random password using all available characters with length > 8)'
      }
    } else {
      passwordValidMsg.innerHTML = ''
    }
  }, 500) })
}

export async function registerButtonClicked(callElemButton) {
  const lib    = await import('/lib/lib.mjs')
  const sha256 = await import('/lib/sha256.mjs').then(x => x.exp)
  const pagelet = callElemButton.closest('.pagelet')
  const displaynameInput = pagelet.querySelector(':scope > * > input.displayname')
  const usernameInput = pagelet.querySelector(':scope > * > input.username')
  const passwordInput = pagelet.querySelector(':scope > * > input.password')
  
  if(callElemButton.classList.contains('deactivated'))
    return void lib.notificationFrom(callElemButton, 'Please wait!')
  // else
  
  let uriSegs = [
    '/bin/user.s.js/register?username=', encodeURIComponent(usernameInput.value),
    '&password=', encodeURIComponent(sha256(passwordInput.value))
  ]
  if((displaynameInput.value ?? '') !== '')
    uriSegs.push('&displayname=', encodeURIComponent(displaynameInput.value))
  callElemButton.classList.add('deactivated')
  const pleaseWaitNotification = document.createElement('span')
  pleaseWaitNotification.textContent = 'Please  wait'
  lib.notificationFrom(callElemButton, pleaseWaitNotification)
  let response = await fetch(uriSegs.join(''))
  pleaseWaitNotification.closest('.notification').remove()
  callElemButton.classList.remove('deactivated')
  lib.notificationFrom(callElemButton, [
    response.ok ? 'Success: ' : 'Failure: ',
    response.statusText, ' (', String(response.status), ')'
  ].join(''))
  lib.attentionFlashElement(callElemButton)
}

export async function saveDisplaynameClicked(callElemButton) {
  const lib    = await import('/lib/lib.mjs')
  const pagelet = callElemButton.closest('.pagelet')
  const displaynameInput = pagelet.querySelector(':scope > * > input.displayname')
  const loggedInAsDispnameElem = pagelet.querySelector(':scope > .logged-in-as .displayname')
  
  if(displaynameInput.value) {
    localStorage.setItem('displayname', displaynameInput.value)
    lib.attentionFlashElement(callElemButton)
    lib.notificationFrom(callElemButton, 'Displayname saved')
    loggedInAsDispnameElem.textContent = displaynameInput.value
    loggedInAsDispnameElem.parentElement.hidden = false
    document.cookie = `displayname=${displaynameInput.value}`
  } else {
    localStorage.removeItem('displayname')
    loggedInAsDispnameElem.parentElement.hidden = true
    document.cookie = `displayname=;max-age=0`
  }
}

export async function setPasswordButtonClicked(callElem) {
  const lib = await import('/lib/lib.mjs')
  const sha256 = await import('/lib/sha256.mjs').then(x => x.exp)
  const pagelet = callElem.closest('.pagelet')
  const newPasswordInput = pagelet.querySelector(':scope > * > .change-password > input.new')
  const oldPasswordInput = pagelet.querySelector(':scope > * > .change-password > input.old')
  
  if(callElem.classList.contains('deactivated'))
    return void lib.notificationFrom(callElem, 'Please wait!')
  // else
  
  let urlSegs = [
    `/bin/user.s.js/changePassword`,
    `?newPassword=`, encodeURIComponent(sha256(newPasswordInput.value))
  ]
  if(oldPasswordInput.value)
    urlSegs.push(`&oldPassword=`, encodeURIComponent(sha256(oldPasswordInput.value)))
  callElem.classList.add('deactivated')
  const pleaseWaitNotification = document.createElement('span')
  pleaseWaitNotification.textContent = 'Please  wait'
  lib.notificationFrom(callElem, pleaseWaitNotification)
  let response = await fetch(urlSegs.join(''))
  pleaseWaitNotification.closest('.notification').remove()
  callElem.classList.remove('deactivated')
  lib.notificationFrom(callElem, [
    response.ok ? 'Success: ' : 'Failure: ',
    response.statusText, ' (', String(response.status), ')'
  ].join(''))
  lib.attentionFlashElement(callElem)
}

export async function submitNewChallenge(callElem) {
  const lib = await import('/lib/lib.mjs')
  const sha256 = await import('/lib/sha256.mjs').then(x => x.exp)
  const pagelet = callElem.closest('.pagelet')
  const challengeInput = pagelet.querySelector(':scope .challenge-response input.challenge')
  const responseInput  = pagelet.querySelector(':scope .challenge-response input.response')
  
  if(callElem.classList.contains('deactivated'))
    return void lib.notificationFrom(callElem, 'Please wait!')
  // else
  
  callElem.classList.add('deactivated')
  const response = await fetch([
    `/bin/user.s.js/newPasswordChallenge`,
      `?challenge=`, encodeURIComponent(challengeInput.value),
      `&response=`, encodeURIComponent(sha256(responseInput.value))
  ].join(''))
  callElem.classList.remove('deactivated')
  
  if(response.ok) {
    lib.notificationFrom(callElem, `Success: challenge created`)
    lib.attentionFlashElement(callElem)
    challengeInput.value = ''
    responseInput.value  = ''
  } else {
    lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  }
}

export async function openModInfoFile(callElem) {
  const lib = await import('/lib/lib.mjs')
  const username = document.cookie.match(/username=(\w+);/)[1]
  if(!username)
    return void lib.notificationFrom(callElem, `Error: not logged in (how?)`, {error: true})
  // else
  lib.openPageletAt(callElem, `/pagelets/represent-file.jhp?file=/users/${username}/mod-only.txt`, `after this`)
}