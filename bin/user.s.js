
// const sha256 = await import(ctx.path.resolve('./lib/sha256.mjs')).then(x => x.exp)
const sha256 = ctx.sha256

const nullStringHash = sha256('')

const authtokenExpirationTime = 1000*3600*24*7 // 7 days
const rememberMeTimeHeader    =`Max-Age=${authtokenExpirationTime}` // remember for 7 days

if(!ctx.fs.existsSync('./users'))
  ctx.fs.mkdirSync('./users')

const initialUserControlFileContent = (username)=> /*json*/ `[{
  "file": {"tree": {"*all": "black"}}
}, {
  "modifyFile": {"tree": {"${username}": "white"}},
  "newFile":    {"tree": {"${username}": "white"}},
  "trashFile":  {"tree": {"${username}": "white"}},
  "renameFile": {"tree": {"${username}": "white"}},
  "newDir":     {"tree": {"${username}": "white"}},
  "modifyFile": {"tree": {"${username}": "white"}}
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
  if(!username)
    return `No username given`
  // else 
  
  if(/[\.\/]/g.test(username)) // contains . or /
    return 'Username contains invalid characters'
  // else
  
  let userDir = `./users/${username}/`
  if(!ctx.fs.existsSync(userDir))
    return `User ${username} doesn't exist`
  // else
  
  const userAuthtoken     = ctx.fs.readFileSync(userDir + '.authtoken.txt').toString()
  const userAuthtokenTime = parseInt(ctx.fs.readFileSync(userDir + '.authtoken-time.txt').toString())
  
  if(userAuthtoken !== authtoken)
    return `Bad authtoken`
  // else
  
  if(userAuthtokenTime + authtokenExpirationTime < Date.now())
    return `Authtoken is expired`
  // else
  
  return 'Valid'
}
exports.validateUserWithToken = validateUserWithToken

function handleUserAuthcheck(response, args) {
  if(!args.cookies.loggedin)
    return true // anonymous user
  // else
  let username  = args.username ?? args.cookies?.username
  let authtoken = args.authtoken ?? args.cookies?.authtoken
  if(username) { // not anonymous (username === undefined <=> user is anonymous)
    if(!authtoken) {
      setCodeAndMessage(response, 401, 'No authtoken given; try logging in again')
      return false
    }
    // else
    let validationStr = validateUserWithToken(username, authtoken) // 'Valid' | 'Bad authtoken' | ...
    if(validationStr !== 'Valid') {
      setCodeAndMessage(response, 401, validationStr)
      return false
    }
    // else
  }
  return true // anonymous or given username matches stored authtoken
}
exports.handleUserAuthcheck = handleUserAuthcheck

exports.respondToRequest = async function(request, response, getBody, args) {
  return setCodeAndMessage(response, 400, 'Please use a subfunction instead eg: /login, /register, etc')
}

exports.respondToRequest.login = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(1000) // wait 1 second
  
  console.log(``)
  console.log(`user.s.js/login requested to log in user ${args.username}`)
  
  if(!args.username) 
    return setCodeAndMessage(response, 400,  'No username argument given')
  // else
  
  if(!args.password)  
    return setCodeAndMessage(response, 400,  'No password argument given')
  // else
  
  let userDir = `./users/${args.username}/`
  if(!ctx.fs.existsSync(userDir))  
    return setCodeAndMessage(response, 400,  `User ${args.username} doesn't exist`)
  // else
  
  let salt     = ctx.fs.readFileSync(userDir + '.salt.txt').toString()
  let password = ctx.fs.readFileSync(userDir + '.password.txt').toString()
  if(sha256(args.password + salt) !== password)  
    return setCodeAndMessage(response, 400,  `Incorrect password`)
  // else
  
  ctx.fs.writeFileSync(userDir + '.last-interaction-time.txt', String(Date.now()))
  
  let authtoken = lib.randomTokenString(6)
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

exports.respondToRequest.register = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(2000) // wait 2 seconds
  
  console.log(``)
  console.log(`user.s.js/register requested to register user ${args.username}`)
  
  
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
  
  // is user actually who they say they are?
  if(!handleUserAuthcheck(response, args))
    return true
  // else
  
  // is oldPassword given?
  if(!args.oldPassword)
    return setCodeAndMessage(response, 400, 'No oldPassword argument given')
  // else
  
  // is oldPassword correct?
  const storedSalt = ctx.fs.readFileSync(`./users/${username}/.salt.txt`).toString()
  const storedPassword = ctx.fs.readFileSync(`./users/${username}/.password.txt`).toString()
  if(sha256(args.oldPassword + storedSalt) !== storedPassword)
    return setCodeAndMessage(response, 400, `Incorrect oldPassword`)
  // else
  
  if(!args.newPassword)
    return setCodeAndMessage(response, 400, 'No newPassword argument given')
  // else
  
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(20) // wait 20 ms
  
  let salt = lib.randomTokenString(16)
  
  ctx.fsp.writeFile(`./users/${username}/.salt.txt`, salt)
  ctx.fsp.writeFile(`./users/${username}/.password.txt`, sha256(args.newPassword + salt))
  ctx.fsp.writeFile(`./users/${username}/.last-interaction-time.txt`, String(Date.now()))
  
  response.statusCode = 200
  response.statusMessage = `Success`
  return true
}