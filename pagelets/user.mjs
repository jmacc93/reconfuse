
export async function setInitialState(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const displaynameInput = pagelet.querySelector(':scope > * > input.displayname')
  const usernameInput = pagelet.querySelector(':scope > * > input.username')
  const rememberMeBox = pagelet.querySelector(':scope > * > .rememberme > input')
  const loggedInAsUsernameElem = pagelet.querySelector(':scope > .logged-in-as .username')
  const loggedInAsDispnameElem = pagelet.querySelector(':scope > .logged-in-as .displayname')
  
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
  let response = await fetch(uriSegs.join(''))
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
  
  const checkOnInput = () => {
    // check username
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
    
    // check displayname
    if(displaynameInput.value.length > 32) {
      displaynameValidMsg.innerText = 'Displayname too long'
    } else {
      displaynameValidMsg.innerHTML = ''
    }
    
    // check password
    if(passwordInput.value.length < 4) {
      if(passwordHadInput) {
        passwordValidMsg.innerText = 'Password is too short (must be length > 3; highly recommend a random password using all available characters with length > 8)'
      }
    } else {
      passwordValidMsg.innerHTML = ''
    }
    
    
  }
  checkOnInput()
  
  displaynameInput.addEventListener('input', () => { checkOnInput() })
  usernameInput.addEventListener(   'input', () => { usernameHadInput = true; checkOnInput() })
  passwordInput.addEventListener(   'input', () => { passwordHadInput = true; checkOnInput() })
}

export async function registerButtonClicked(callElemButton) {
  const lib    = await import('/lib/lib.mjs')
  const sha256 = await import('/lib/sha256.mjs').then(x => x.exp)
  const pagelet = callElemButton.closest('.pagelet')
  const displaynameInput = pagelet.querySelector(':scope > * > input.displayname')
  const usernameInput = pagelet.querySelector(':scope > * > input.username')
  const passwordInput = pagelet.querySelector(':scope > * > input.password')
  
  let uriSegs = [
    '/bin/user.s.js/register?username=', encodeURIComponent(usernameInput.value),
    '&password=', encodeURIComponent(sha256(passwordInput.value))
  ]
  if((displaynameInput.value ?? '') !== '')
    uriSegs.push('&displayname=', encodeURIComponent(displaynameInput.value))
  let response = await fetch(uriSegs.join(''))
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
  let response = await fetch(
    `/bin/user.s.js/changePassword?oldPassword=${encodeURIComponent(sha256(oldPasswordInput.value))
    }&newPassword=${encodeURIComponent(sha256(newPasswordInput.value))}`
  )
  lib.notificationFrom(callElem, [
    response.ok ? 'Success: ' : 'Failure: ',
    response.statusText, ' (', String(response.status), ')'
  ].join(''))
  lib.attentionFlashElement(callElem)
}
}