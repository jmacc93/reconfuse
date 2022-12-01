
export async function installFunctionality(callElem) {
  const lib    = await import('/lib/lib.mjs')
  const sha256 = await import('/lib/sha256.mjs').then(x => x.exp)
  
  const pagelet                 = callElem.closest('.pagelet')
  
  const usernameInput           = pagelet.querySelector('input.username')
  const usernameValidMsg        = pagelet.querySelector('.validation-msg.username')
  let   usernameOk              = false
  let   usernameHadInput        = false
  
  let   loggedInAsUsernameElem  = pagelet.querySelector('.logged-in-as > .username')
  let   loggedInAsDispnameElem  = pagelet.querySelector('.logged-in-as > .displayname')
  
  const displaynameInput        = pagelet.querySelector('input.displayname')
  const displaynameValidMsg     = pagelet.querySelector('.validation-msg.displayname')
  let   displaynameOk           = false
  
  const saveDisplaynameButton   = pagelet.querySelector('button.save-displayname')
  
  const passwordInput           = pagelet.querySelector('input.password')
  const passwordValidMsg        = pagelet.querySelector('.validation-msg.password')
  let   passwordOk              = false
  let   passwordHadInput        = false
  
  const logoutButton            = pagelet.querySelector('button.logout')
  const loginButton             = pagelet.querySelector('button.login')
  const registerButton          = pagelet.querySelector('button.register')
  
  const rememberMeBox           = pagelet.querySelector('.rememberme input')
  
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
  
  logoutButton.addEventListener('click', () => {
    document.cookie = 'authtoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'
    document.cookie = 'loggedin=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict'
    window.localStorage.removeItem('username')
    window.localStorage.removeItem('rememberme')
    loggedInAsUsernameElem.textContent = ''
    loggedInAsDispnameElem.textContent = ''
    pagelet.setAttribute('data-loggedin', 'false')
  })
  loginButton.addEventListener('click', async () => {
    let uriSegs = [
      '/bin/user.s.js/login?username=', encodeURIComponent(usernameInput.value),
      '&password=', encodeURIComponent(sha256(passwordInput.value))
    ]
    if((displayname ?? '') !== '')
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
      window.localStorage.setItem('displayname', String(displaynameInput.value))
      window.localStorage.setItem('rememberme',  String(rememberMeBox.checked ))
      pagelet.setAttribute('data-loggedin', 'true')
      loggedInAsUsernameElem.textContent = usernameInput.value
      loggedInAsDispnameElem.textContent = displaynameInput.value
    }
  })
  
  
  registerButton.addEventListener('click', async () => {
    let uriSegs = [
      '/bin/user.s.js/register?username=', encodeURIComponent(usernameInput.value),
      '&password=', encodeURIComponent(sha256(passwordInput.value))
    ]
    if((displayname ?? '') !== '')
      uriSegs.push('&displayname=', encodeURIComponent(displaynameInput.value))
    let response = await fetch(uriSegs.join(''))
    lib.notificationFrom(registerButton, [
      response.ok ? 'Success: ' : 'Failure: ',
      response.statusText, ' (', String(response.status), ')'
    ].join(''))
    lib.attentionFlashElement(registerButton)
  })
  
  saveDisplaynameButton.addEventListener('click', () => {
    localStorage.setItem('displayname', displaynameInput.value)
    lib.attentionFlashElement(saveDisplaynameButton)
    lib.notificationFrom(saveDisplaynameButton, 'Displayname saved')
    loggedInAsDispnameElem.textContent = displaynameInput.value
  })
  
  const checkOnInput = () => {
    // check username
    if(usernameInput.value.length === 0) {
      if(usernameHadInput) {
        usernameOk = false;
        usernameValidMsg.innerText = 'Username is empty'
      }
    } else if(!/^[a-zA-Z_\-0-9]*$/.test(usernameInput.value)) {
      usernameOk = false
      let chars = usernameInput.value.split('').filter(c=> !/[a-zA-Z_\-0-9]+/.test(c))
      usernameValidMsg.innerText = 'Username contains invalid characters: ' + chars.join('')
    } else if(usernameInput.value.length > 16) {
      usernameOk = false
      usernameValidMsg.innerText = 'Username too long'
    } else {
      usernameOk = true
      usernameValidMsg.innerHTML = ''
    }
    
    // check displayname
    if(displaynameInput.value.length > 32) {
      displaynameOk = false
      displaynameValidMsg.innerText = 'Displayname too long'
    } else {
      displaynameOk = true
      displaynameValidMsg.innerHTML = ''
    }
    
    // check password
    if(passwordInput.value.length < 4) {
      if(passwordHadInput) {
        passwordOk = false;
        passwordValidMsg.innerText = 'Password is too short (must be length > 3; highly recommend a random password using all available characters with length > 8)'
      }
    } else {
      passwordOk = true
      passwordValidMsg.innerHTML = ''
    }
    
    
  }
  checkOnInput()
  
  displaynameInput.addEventListener('input', () => { checkOnInput() })
  usernameInput.addEventListener(   'input', () => { usernameHadInput = true; checkOnInput() })
  passwordInput.addEventListener(   'input', () => { passwordHadInput = true; checkOnInput() })
  
  
}