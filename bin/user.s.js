
// const sha256 = await import(ctx.path.resolve('./lib/sha256.mjs')).then(x => x.exp)
const sha256 = ctx.sha256

const path = ctx.path
const fs   = ctx.fs
const fsp  = ctx.fsp

const nullStringHash = sha256('')

const authtokenExpirationTime = 1000*3600*24*7 // 7 days
const rememberMeTimeHeader    =`Max-Age=${authtokenExpirationTime}` // remember for 7 days

if(!ctx.fs.existsSync('./users'))
  ctx.fs.mkdirSync('./users')

const initialUserControlFileContent = (username)=> /*json*/ `[{
  "file": {"tree": {"*all": "black"}},
  "dir": {"tree": {"*all": "black"}},
  "access": {"tree": {"*all": "black"}}
}, {
  "file": {"tree": {"${username}": "super-white"}},
  "dir":    {"tree": {"${username}": "super-white"}},
  "access": {"tree": {"${username}": "super-white"}}
}, {
  "access(mod-only.txt)": {"tree": {"*all": "black"}}
}]`

function setCodeAndMessage(response, code, msg) {
  response.statusCode = code
  response.statusMessage = msg
  return true
}

/**
Returns string validation status
Returns 'valid' if valid, otherwise username - token pair given is invalid
*/
function validateUserWithToken(username, authtoken) {
  // if(!username)
  //   return `No username given`
  // // else 
  
  // if(/[\.\/]/g.test(username)) // contains . or /
  //   return 'Username contains invalid characters'
  // // else
  
  let userDir = `./users/${username}/`
  if(!ctx.fs.existsSync(userDir))
    return false
  // else
  
  const userAuthtoken     = ctx.fs.readFileSync(userDir + '.authtoken.txt').toString()
  const userAuthtokenTime = parseInt(ctx.fs.readFileSync(userDir + '.authtoken-time.txt').toString())
  
  if(userAuthtoken !== authtoken)
    return false
  // else
  
  if(userAuthtokenTime + authtokenExpirationTime < Date.now())
    return false
  // else
  
  return true
}
exports.validateUserWithToken = validateUserWithToken

function handleUserAuthcheck(response, args) {
  if(!args.cookies?.loggedin)
    return true // anonymous user
  // else
  let username  = args.cookies.username
  let authtoken = args.cookies.authtoken
  if(username) { // not anonymous (username === undefined <=> user is anonymous)
    if(!authtoken) {
      setCodeAndMessage(response, 401, 'No authtoken given; try logging in again')
      return false
    }
    // else
    let validationStr = validateUserWithToken(username, authtoken) // 'Valid' | 'Bad authtoken' | ...
    if(!validationStr) {
      setCodeAndMessage(response, 401, `Username - authtoken is invalid, please log in again`)
      return false
    }
    // else
  }
  return true // anonymous or given username matches stored authtoken
}
exports.handleUserAuthcheck = handleUserAuthcheck

/**
A one-time PET (password-equivalent token) is good for use as a password ONCE
*/
async function generateOneTimePet(username) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  const userDir = path.join('./users/', username)
  const petFile = path.join(userDir, '.one-time-pet.json')
  let pet = lib.randomTokenString(64)
  fsp.writeFile(petFile, sha256(pet))
  return pet
}

exports.respondToRequest = async function(request, response, getBody, args) {
  return setCodeAndMessage(response, 400, 'Please use a subfunction instead eg: /login, /register, etc')
}

exports.respondToRequest.login = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(1000) // wait 1 second
  
  if(!args.username) 
    return setCodeAndMessage(response, 400,  'No username argument given')
  // else
  
  if(!args.password)  
    return setCodeAndMessage(response, 400,  'No password argument given')
  // else
  
  if(/[\/\.]/g.test(args.username))
    return setCodeAndMessage(response, 400, 'Bad username argument given')
  // else
  
  let userDir = `./users/${args.username}/`
  if(!ctx.fs.existsSync(userDir))  
    return setCodeAndMessage(response, 400,  `Bad username - password pair`)
  // else
  
  const salt     = ctx.fs.readFileSync(userDir + '.salt.txt').toString()
  const password = ctx.fs.readFileSync(userDir + '.password.txt').toString()
  const passBypassFile = path.join(userDir, '.change-pass-bypass-old')
  if(sha256(args.password + salt) !== password) {
    // check if given password is a one time PET
    let oneTimePetFile = path.join(userDir, '.one-time-pet.json')
    if(ctx.fs.existsSync(oneTimePetFile)) {
      let pet = ctx.fs.readFileSync(oneTimePetFile).toString()
      if(args.password !== pet)
        return setCodeAndMessage(response, 400,  `Bad username - password pair`)
      // else
      fsp.writeFile(passBypassFile, '')
    } else {
      return setCodeAndMessage(response, 400,  `Bad username - password pair`)
    }
  } else { // correct password given
    if(fs.existsSync(passBypassFile))
      fs.rmSync(passBypassFile)
  }
  
  ctx.fs.writeFileSync(userDir + '.last-interaction-time.txt', String(Date.now()))
  
  let authtoken = lib.randomAuthTokenString(32)
  ctx.fs.writeFileSync(userDir + '.authtoken.txt', authtoken)
  ctx.fs.writeFileSync(userDir + '.authtoken-time.txt', String(Date.now()))
  
  let maxAgeCookieSegment = ('rememberme' in args) ? rememberMeTimeHeader : ''
  response.statusCode = 200
  response.statusMessage = 'Logged in :)'
  response.setHeader('Set-Cookie', [
    `username=${args.username}; http ${maxAgeCookieSegment}; SameSite=Strict; Path=/`,
    `authtoken=${authtoken}; http ${maxAgeCookieSegment}; SameSite=Strict; Path=/`,
    `loggedin=true; http ${maxAgeCookieSegment}; SameSite=Strict; Path=/`
  ])
  // response
  
  return true
}

exports.respondToRequest.validate = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(200) // wait 1/5 second
  
  const username  = args.cookies?.loggedin ? args.cookies.username : undefined
  const authtoken = args.cookies?.loggedin ? args.cookies.authtoken : undefined
  
  response.statusCode = 200
  response.statusMessage = String(validateUserWithToken(username, authtoken))
  
  return true
}

exports.respondToRequest.register = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(2000) // wait 2 seconds
  
  console.log(`[${request.uid}] user.s.js/register requested to register user ${args.username}`)
  
  
  // check username
  if(!args.username)  
    return setCodeAndMessage(response, 400,  'No username given')
  //else
  if(args.username.length === 0) 
    return setCodeAndMessage(response, 400,  'Username is empty')
  // else
  if(!/^[a-zA-Z_\-0-9]+$/.test(args.username)) {
    let chars = args.username.split('').filter(c=> !/[a-zA-Z_\-0-9]/.test(c)) 
    return setCodeAndMessage(response, 400,  'Username contains invalid characters: ' + chars.map(c=> `'${c}'`).join(', '))
  }
  //else
  if(args.username.length > 16)  // xxxyyyzzz_aaabbb
    return setCodeAndMessage(response, 400,  'Username too long')
  // else
  
  // check password
  if(!args.password) 
    return setCodeAndMessage(response, 400,  'No username given')
  // else
  if(args.password === nullStringHash)  
    return setCodeAndMessage(response, 400,  'Null string hash given, dont use that password')
  // else
  
  const userDirname = `./users/${args.username}`
  if(ctx.fs.existsSync(userDirname))
    return setCodeAndMessage(response, 400,  `User with username ${args.username} already exists`)
  // else
  
  let salt = lib.randomTokenString(16)
  
  ctx.fs.mkdirSync(userDirname)
  ctx.fsp.writeFile(userDirname + '/.salt.txt', salt)
  ctx.fsp.writeFile(userDirname + '/.password.txt', sha256(args.password + salt))
  ctx.fsp.writeFile(userDirname + '/.last-interaction-time.txt', String(Date.now()))
  if(args.displayname)
    ctx.fsp.writeFile(userDirname + '/.last-displayname.txt', args.displayname)
  
  ctx.fsp.writeFile(userDirname + '/control.json', initialUserControlFileContent(args.username))
  
  ctx.fsp.appendFile('./logs/registration.autogen.txt', `${Date.now()}: ${args.username}\n`)
  
  response.statusCode = 200
  response.statusMessage = `Success, please log in`
  return true
}

exports.respondToRequest.changePassword = async function(request, response, getBody, args) {
  // is username given?
  const username = args.cookies.username
  if(!username)
    return setCodeAndMessage(response, 400, 'Please log in')
  // else
  
  if(/[\/\.]/g.test(username))
    return setCodeAndMessage(response, 400, 'Forbidden username given')
  // else
  
  // is user actually who they say they are?
  if(!handleUserAuthcheck(response, args))
    return true
  // else
  
  if(!args.newPassword)
    return setCodeAndMessage(response, 400, 'No newPassword argument given')
  // else
  
  // is oldPassword given?
  let userDir = path.join('./users', username)
  if(!args.oldPassword) {
    // is old password needed? eg: used a pet, old password not needed
    let passBypassFile = path.join(userDir, '.change-pass-bypass-old')
    if(!fs.existsSync(passBypassFile))
      return setCodeAndMessage(response, 400, 'No oldPassword argument given')
    // else
  } else { // old password was given
    // is oldPassword correct?
    const storedSalt = ctx.fs.readFileSync(path.join(userDir, '.salt.txt')).toString()
    const storedPassword = ctx.fs.readFileSync(path.join(userDir, '.password.txt')).toString()
    if(sha256(args.oldPassword + storedSalt) !== storedPassword)
      return setCodeAndMessage(response, 400, `Incorrect oldPassword`)
    // else
  }
  
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(500) // wait 1/2 s
  
  let salt = lib.randomTokenString(16)
  
  ctx.fsp.writeFile(`./users/${username}/.salt.txt`, salt)
  ctx.fsp.writeFile(`./users/${username}/.password.txt`, sha256(args.newPassword + salt))
  ctx.fsp.writeFile(`./users/${username}/.last-interaction-time.txt`, String(Date.now()))
  
  response.statusCode = 200
  response.statusMessage = `Success`
  return true
}

exports.respondToRequest.newPasswordChallenge = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(500) // wait 1/2 second
  
  // is username given?
  const username = args.cookies?.loggedin ? args.cookies.username : undefined
  if(!username)
    return setCodeAndMessage(response, 400, 'Please log in')
  // else
  
  // is user actually who they say they are?
  if(!handleUserAuthcheck(response, args))
    return true
  // else
  
  // is challenge arg given?
  if(!args.challenge)
    return setCodeAndMessage(response, 400, 'No challenge argument given')
  // else
  
  // is response arg given?
  if(!args.response)
    return setCodeAndMessage(response, 400, 'No response argument given')
  // else
  
  // write the file
  const userDir = path.join('./users/', username)
  const challengeFile = path.join(userDir, '.challenge.json')
  fsp.writeFile(challengeFile, JSON.stringify({challenge: args.challenge, response: args.response}))
  response.statusCode = 200
  return true
}

exports.respondToRequest.getPasswordChallenge = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(500) // wait 1/2 second
  
  // is username given?
  const username = args.username
  if(!username)
    return setCodeAndMessage(response, 400, 'No username argument given')
  // else
  
  if(/[\/\.]/g.test(username))
    return setCode(response, 400, `Bad username argument given`)
  // else
  
  // read and send the challenge
  const userDir = path.join('./users/', username)
  const challengeFile = path.join(userDir, '.challenge.json')
  if(fs.existsSync(challengeFile)) {
    const challengeResponseObj = JSON.parse(fs.readFileSync(challengeFile).toString())
    response.statusCode = 200
    response.write(challengeResponseObj.challenge)
  } else {
    return setCodeAndMessage(response, 404, 'No challenge associated with this username')
  }
}

exports.respondToRequest.validateChallengeResponse = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(10000) // wait 10 seconds
  
  // is username given?
  const username = args.username
  if(!username)
    return setCodeAndMessage(response, 400, 'No username argument given')
  // else
  
  if(/[\/\.]/g.test(username))
    return setCodeAndMessage(response, 400, `Bad username argument given`)
  // else
  
  // is response given?
  if(!args.response)
    return setCodeAndMessage(response, 400, 'No response argument given')
  // else
  
  // read and send the challenge
  const userDir = path.join('./users/', username)
  const challengeFile = path.join(userDir, '.challenge.json')
  if(fs.existsSync(challengeFile)) {
    const challengeResponseObj = JSON.parse(fs.readFileSync(challengeFile).toString())
    if(challengeResponseObj.response === args.response) {
      const oneTimePet = await generateOneTimePet(args.username)
      response.statusCode = 200
      response.write(oneTimePet)
    } else {
      return setCodeAndMessage(response, 400, `Bad response or no challenge associated with this username`)
    }
  } else {
    return setCodeAndMessage(response, 400, 'Bad response or no challenge associated with this username')
  }
}