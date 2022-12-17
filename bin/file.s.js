

const fs   = ctx.fs
const fsp  = ctx.fsp
const path = ctx.path

function utcDateStr() {
  return new Date().toUTCString()
}

/**
Takes a non existent directory missingDir, looks up it's path to find its first existent directory parent
*/
function getFirstExistingDirectory(missingDir) {
  const absPath = path.resolve(missingDir)
  const relPath = path.relative('./', absPath)
  const splitPath = relPath.split('/')
  if(splitPath.length === 0)
    return './'
  // else
  let curPath = './'
  let lastPath = './'
  for(const dir of splitPath) {
    lastPath = curPath
    curPath = path.join(curPath, dir)
    if(!fs.existsSync(curPath))
      return lastPath
  }
  // else
  return missingDir
}

/**
This enables the pattern:
if(...)
  return setCodeAndMessage(response, ..., '...')
*/
function setCodeAndMessage(response, code, msg) {
  response.statusCode = code
  response.statusMessage = msg
  return true
}

/**
These are extensions that no users can create
Note: This may be subject to change if user-submitted .html, .jhp, etc files are allowed later
      The autogen extension will always be disallowed. .sh files will probably always be disallowed
Also: A file basename is like aaa.bbb.ccc...zzz where each .xxx after aaa is an extension that may be disallowed
*/
const disallowedExtensions = new Set([
  'autogen', 'html', 'jhp', 'js', 'mjs', 'sh',
  'php', 'svg'
])

/**
Checks extensions and dot-file status only currently
*/
function fileIsOffLimits(filePath) {
  let baseName = ctx.path.basename(filePath) // aaa/bbb/ccc.ext -> ccc.ext
  if(baseName[0] === '.') // no dot files, eg: .asdf.txt
    return true // file is not allowed
  // else
  let extArray = baseName.match(/\.(.+)/)?.[1]?.split('.') ?? [] // "aaa.bbb.ccc" -> ["bbb", "ccc"]
  for(const ext of extArray) { // extArray = ["bbb", "ccc"]
    if(disallowedExtensions.has(ext)) // eg: ext = "bbb"
      return true // file is not allowed
  }
  // else
  return false // file is allowed
}
exports.fileIsOffLimits = fileIsOffLimits

exports.respondToRequest = function(request, response, getBody, args) {
  return setCodeAndMessage(response, 500, `Please use a subfunction instead (${Object.keys(exports.respondToRequest).join(', ')})`)
}

function escapeSpaces(str) {
  return str.replaceAll(/\s/g, str=>`\\${str}`)
}

/**
Update the contents of a file, also updates the file's directory's changelog.autogen.txt
Can use argument body or request body (http message body) to update the file
Argument body gets used first if given
*/
// args: {file, body}
exports.respondToRequest["update"] = async function(request, response, getBody, args) {
  console.log(`[${request.uid}]`, `file.s.js/update requested to update file ${args.file}`)

  if(!args.file) 
    return setCodeAndMessage(response, 400, `No file argument given (use ?file=...)`)
  // else
  
  // Is file outside working directory tree?
  args.file = path.relative('./', ctx.addPathDot(args.file))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  const groupLib = await ctx.runScript('./bin/group.s.js')
  const username = args.cookies?.loggedin ? args.cookies?.username : undefined
  
  if(fileIsOffLimits(args.file))
    return setCodeAndMessage(response, 400, `Cannot edit this file`)
  // else
  
  args.file = ctx.addPathDot(args.file)
  let filename = ctx.path.basename(args.file)

  if(!ctx.fs.existsSync(args.file)) 
    return setCodeAndMessage(response, 400, `File ${args.file} doesn't exist`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  let parentDirectory = ctx.path.dirname(args.file)
  let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['updateFile', 'file', `file(${filename})`, `updateFile(${filename})`])
  if(!isAllowed)
    return setCodeAndMessage(response, 401, `${username ? 'User ' + username : 'Anonymous users '} cannot modify the file ${args.file}`)
  // else
  
  // is there mid-air-collision file conflict?
  const stat = ctx.fs.statSync(args.file)
  const currentETag = String(stat.mtimeMs)
  if(request.headers['if-match'] !== currentETag) { // etags dont match, send current content
    response.setHeader('ETag', currentETag)
    response.statusCode = 409
    response.write(await ctx.fsp.readFile(args.file))
    return true
  }
  // else
  
  // Register anonymous user if anonymous
  let anonId
  if(username === undefined)
    anonId = ctx.scriptStorage['./'].registerAnonIp(request.socket.remoteAddress)
  
  // Update the file
  let [_contentType, isBinary] = ctx.extContentMap[ctx.path.extname(args.file)] ?? ctx.extContentMap.default
  let payload = args.body ?? (isBinary ? await getBody() : (await getBody()).toString()) // use args.body if given, else use request body
  await fsp.writeFile(args.file, payload)
  const newStat = ctx.fs.statSync(args.file)
  let newETag = String(newStat.mtimeMs)
  response.setHeader('ETag', newETag)
  console.log(`[${request.uid}]`, `update-file.s.js successfully updated file ${args.file} with ${payload.length} chars`)
  fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
    utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' updated ', ctx.path.basename(args.file), ' with ', payload.length, ' chars\n'
  ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(parentDirectory, 'changelog.autogen.txt')} in file.s.js copy: ${err.message}`))
  
  response.statusCode = 200
  response.statusMessage = `Updated file ${args.file}`
  return true
}

const appendHeaderMakers = {
  // anonId is undefined if should use username, otherwise use anonId
  default: (anonId, username, displayname) => `\n\n${(anonId !== undefined) ? `anonymous(${anonId})` : username} ${displayname ? `(as ${displayname})` : ''} ${(new Date()).toUTCString()}\n`,
  ['.md']: (anonId, username, displayname) => {
    return ['\n\n---\n',
      (anonId !== undefined) ? `anonymous(${anonId}) ` :`[${username}](/users/${username}/) `,
      displayname ? `(as ${displayname}) ` : '',
      (new Date()).toUTCString(), '\n'
    ].join('')
  },
  ['.escm']: (anonId, username, displayname) => {
    return ['\n\n\\separator() ',
      (anonId !== undefined) ? `anonymous(${anonId}) ` :`\\link(/users/${username}/|${username}) `,
      displayname ? `(as ${displayname}) ` : '',
      `\\itime(`, Date.now(), `)\n`
    ].join('')
  },
}

/**
Appends to a file, also updates the file's directory's changelog.autogen.txt
Can use argument body or request body (http message body) to append to the file
Argument body gets used first if given
If argument tagged is given then username and time are also appended along with a newline
*/
// args: {file, body, tagged}
exports.respondToRequest["append"] = async function(request, response, getBody, args) {
  console.log(`[${request.uid}]`, `file.s.js/append requested to update file ${args.file}`)

  if(!args.file) 
    return setCodeAndMessage(response, 400, `No file argument given (use ?file=...)`)
  // else
  
  // Is file outside working directory tree?
  args.file = path.relative('./', ctx.addPathDot(args.file))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  const groupLib = await ctx.runScript('./bin/group.s.js')
  const username = args.cookies?.loggedin ? args.cookies?.username : undefined
  
  if(fileIsOffLimits(args.file))
    return setCodeAndMessage(response, 400, `Cannot edit this file`)
  // else
  
  args.file = ctx.addPathDot(args.file)
  let filename = ctx.path.basename(args.file)

  if(!ctx.fs.existsSync(args.file)) 
    return setCodeAndMessage(response, 400, `File ${args.file} doesn't exist`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  let parentDirectory = ctx.path.dirname(args.file)
  let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, [
    'updateFile', 'file', `file(${filename})`, `updateFile(${filename})`,
    'appendFile', `appendFile(${filename})`
  ])
  if(!isAllowed)
    return setCodeAndMessage(response, 401, `${username ? 'User ' + username : 'Anonymous users '} cannot modify the file ${args.file}`)
  // else
  
  // Register anonymous user if anonymous
  let anonId
  if(!username)
    anonId = ctx.scriptStorage['./'].registerAnonIp(request.socket.remoteAddress)
  
  // Update the file
  let displayname = args.displayname ?? args.cookies?.displayname
  let [_contentType, isBinary] = ctx.extContentMap[ctx.path.extname(args.file)] ?? ctx.extContentMap.default
  let payload = args.body ?? (isBinary ? await getBody() : (await getBody()).toString()) // use args.body if given, else use request body
  if(args.tagged ?? false) { // tagged append
    let extension = ctx.path.extname(args.file)
    let headerMaker = appendHeaderMakers[extension] ?? appendHeaderMakers.default
    await fsp.appendFile(args.file, headerMaker(anonId, username, args.displayname ?? (args.cookies?.loggedin ? args.cookies.displayname : undefined)) + payload)
  } else { // regular append
    await fsp.appendFile(args.file, `\n\n` + payload)
  }
  console.log(`[${request.uid}]`, `update-file.s.js successfully updated file ${args.file} with ${payload.length} chars`)
  fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
    utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' appended ', payload.length, ' chars to ', ctx.path.basename(args.file), '\n'
  ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(parentDirectory, 'changelog.autogen.txt')} in file.s.js copy: ${err.message}`))
  
  response.statusCode = 200
  response.statusMessage = `Updated file ${args.file}`
  return true
}

/**
Make a file with optional initial content
Initial content given by arguments or by http request body
*/
// args: {file, body}
exports.respondToRequest["make"] =  async function(request, response, getBody, args) {
  console.log(`[${request.uid}]`, `file.s.js/make requested to make a new file ${args.file}`)

  if(args.file === undefined)
    return setCodeAndMessage(response, 400, `No file argument given`)
  // else
  
  let isDir = args.file.endsWith('/')
  args.file = path.relative('./', ctx.addPathDot(args.file))
  
  // Is file outside working directory tree?
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  // Is file allowed?
  let groupLib = await ctx.runScript('./bin/group.s.js')
  if(fileIsOffLimits(args.file))
    return setCodeAndMessage(response, 400, `Cannot make this file`)
  // else
  
  args.file = ctx.addPathDot(args.file)
  let filename = ctx.path.basename(args.file)
  
  // Does file already exist?
  if(ctx.fs.existsSync(args.file))
    return setCodeAndMessage(response, 400, `File ${args.file} already exists`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // Register anonymous user if anonymous
  let anonId
  const username = args.cookies?.loggedin ? args.cookies?.username : undefined
  if(username === undefined)
    anonId = ctx.scriptStorage['./'].registerAnonIp(request.socket.remoteAddress)
  
  // is file a directory?
  let parentDirectory = ctx.path.dirname(args.file)
  if(isDir) {
    
    // is user allowed to create directories?
    const firstExisting = getFirstExistingDirectory(parentDirectory)
    let isNewdirAllowed = groupLib.userControlInclusionStatus(username, firstExisting, ['newDir', 'dir'])
    if(!isNewdirAllowed)
      return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot make that directory`)
    // else
    
    // make the directory
    fs.mkdirSync(args.file, {recursive: true})
    ctx.fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
      utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' made the directory ', ctx.path.basename(args.file), '\n'
    ].join(''))
    return true
    
  } else {
    
    // is user allowed to make files here?
    let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['newFile', 'file', `file(${filename})`, `newFile(${filename})`])
    if(isAllowed !== undefined && !isAllowed)
      return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot make that file here`)
    // else
    
    // does parent directory exist?
    if(!fs.existsSync(parentDirectory)) {
      const firstExisting = getFirstExistingDirectory(parentDirectory)
      let isNewdirAllowed = groupLib.userControlInclusionStatus(username, firstExisting, ['newDir', 'dir'])
      if(!isNewdirAllowed)
        return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot make that file's parent directory`)
      // else
      fs.mkdirSync(parentDirectory, {recursive: true})
      ctx.fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
        utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' made the directory ', parentDirectory, ' to create the file', ctx.path.basename(args.file),'\n'
      ].join(''))
    }
    
    // make the file
    let [_contentType, isBinary] = ctx.extContentMap[ctx.path.extname(args.file)] ?? ctx.extContentMap.default
    let content = args.body ?? (isBinary ? (await getBody()) : (await getBody()).toString()) // use args.body first if given, else use request body
    await fsp.writeFile(args.file, content)
    console.log(`[${request.uid}]`, `file.s.js/make successfully made file ${args.file}`)
    ctx.fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
      utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' made ', ctx.path.basename(args.file), ' with ', content.length, ' initial chars\n'
    ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(toParentDirectory, 'changelog.autogen.txt')} in file.s.js make: ${err.message}`))
    
    response.statusCode = 200
    response.statusMessage = `Made file ${args.file}`
    return true
    
  }
}

/**
Essentially the same as "make" above
*/
// args: {file}
exports.respondToRequest['upload'] = async function(request, response, getBody, args) {
  if(!args.file)
    return setCodeAndMessage(response, 400, `No \'file\' argument given`)
  // else
  
  // Is file outside working directory tree?
  args.file = path.relative('./', ctx.addPathDot(args.file))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  args.file = ctx.addPathDot(args.file)
  let filename = ctx.path.basename(args.file)
  
  const alreadyExisted = fs.existsSync(args.file)
  
  let [_contentType, isBinary] = ctx.extContentMap[path.extname(args.file)] ?? ctx.extContentMap.default
  let body = await getBody()
  body = isBinary ? body : body.toString()
  if(body.length > 12e6) // too big (size > 12 MB)
    return setCodeAndMessage(response, 400, 'File too large (size must be less than 12 MB)')
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  const groupLib = await ctx.runScript('./bin/group.s.js')
  let parentDirectory = ctx.path.dirname(args.file)
  const username = args.cookies?.loggedin ? args.cookies?.username : undefined
  let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['newFile', 'file', `file(${filename})`, `newFile(${filename})`])
  if(isAllowed !== undefined && !isAllowed)
    return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot make files here`)
  // else
  
  // Register anonymous user if anonymous
  let anonId
  if(username === undefined)
    anonId = ctx.scriptStorage['./'].registerAnonIp(request.socket.remoteAddress)
  
  // does parent directory exist?
  if(!fs.existsSync(parentDirectory)) {
    const firstExisting = getFirstExistingDirectory(parentDirectory)
    let isNewdirAllowed = groupLib.userControlInclusionStatus(username, firstExisting, ['newDir', 'dir'])
    if(!isNewdirAllowed)
      return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot make that file's parent directory (${parentDirectory})`)
    // else
    fs.mkdirSync(parentDirectory, {recursive: true})
    ctx.fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
      utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' made the directory ', parentDirectory, ' to create the file', ctx.path.basename(args.file),'\n'
    ].join(''))
  }
  
  await fsp.writeFile(args.file, body)
  if(alreadyExisted) {
    fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
      utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' replaced ', ctx.path.basename(args.file), ' with new upload of', body.length, ' chars\n'
    ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(toParentDirectory, 'changelog.autogen.txt')} in file.s.js upload: ${err.message}`))
  } else {
    fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
      utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' uploaded ', ctx.path.basename(args.file), ' with ', body.length, ' initial chars\n'
    ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(toParentDirectory, 'changelog.autogen.txt')} in file.s.js upload: ${err.message}`))
  }
  
  return setCodeAndMessage(response, 200, 'Upload successful')
}

/**
Move a file to its parent directory's 'trash' directory
*/
// args: {file}
exports.respondToRequest["trash"] =  async function(request, response, getBody, args) {
  console.log(`[${request.uid}]`, `file.s.js/trash requested to trash a file ${args.file}`)

  if(args.file === undefined)
    return setCodeAndMessage(response, 400, `No file argument given`)
  // else
  
  // Is file outside working directory tree
  args.file = path.relative('./', ctx.addPathDot(args.file))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  let groupLib = await ctx.runScript('./bin/group.s.js')
  if(fileIsOffLimits(args.file))
    return setCodeAndMessage(response, 400, `Cannot trash this file`)
  // else
  
  args.file = ctx.addPathDot(args.file)
  let filename = ctx.path.basename(args.file)

  if(!ctx.fs.existsSync(args.file))
    return setCodeAndMessage(response, 404, `File ${args.file} doesn't exist`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  let parentDirectory = ctx.path.dirname(args.file)
  const username = args.cookies?.loggedin ? args.cookies?.username : undefined
  let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['trashFile', 'file', `file(${filename})`, `trashFile(${filename})`])
  if(isAllowed !== undefined && !isAllowed)
    return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot trash files here`)
  // else
  
  // Get / make trash dir
  let trashDir = path.join(path.dirname(args.file), 'trash')
  if(!fs.existsSync(trashDir))
    fs.mkdirSync(trashDir)
  
  // Register anonymous user if anonymous
  let anonId
  if(username === undefined)
    anonId = ctx.scriptStorage['./'].registerAnonIp(request.socket.remoteAddress)
  
  // Get new file location, make unique filename if there are collisions
  let trashPath = path.join(trashDir, path.basename(args.file))
  if(fs.existsSync(trashPath)) {
    const lib = await ctx.runScript('./lib/lib.s.js')
    let basename = path.basename(args.file)
    let [filename, extensions] = ctx.splitAtFirst(basename, /\./g) ?? [basename, undefined]
    let trashFilename = [filename, '-', lib.randomTokenString(9)].join('')
    if(extensions) // extensions === undefined if args.file has no extensions ie: 'myfile' not 'myfile.txt', or directory
      trashFilename += `.${extensions}`
    trashPath = path.join(trashDir, trashFilename)
  }
  
  // Remove the file
  await fsp.rename(args.file, trashPath)
  
  console.log(`[${request.uid}]`, `file.s.js/trash successfully trashed file ${args.file}`)
  fsp.appendFile(ctx.path.join(parentDirectory, 'changelog.autogen.txt'), [
    utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' trashed ', args.file, ' to ', trashPath, '\n'
  ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(parentDirectory, 'changelog.autogen.txt')} in file.s.js trash: ${err.message}`))
  
  return setCodeAndMessage(response, 200, `Trashed file ${args.file}`)
}

/**
Moves a file to a new location
Note: File permissions are checked in the source directory (lists 'file' or 'moveFile')
      As well as the target directory (lists 'file' or 'newFile')
*/
// args: {from, to}
exports.respondToRequest['move'] = async function(request, response, getBody, args) {
  if(!args.from)
    return setCodeAndMessage(response, 400, `No \'from\' argument given`)
  // else
  args.from = ctx.addPathDot(args.from)
  
  if(!args.to)
    return setCodeAndMessage(response, 400, 'No \'to\' argument given')
  // else
  args.to = ctx.addPathDot(args.to)
  
  args.from = path.relative('./', ctx.addPathDot(args.from))
  args.to   = path.relative('./', ctx.addPathDot(args.to))
  if(args.from.startsWith('..') || args.to.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File arguments cant start at directories higher than working directory')
  // else
  
  let tobasename   = ctx.path.basename(args.to)
  let frombasename = ctx.path.basename(args.from)
  
  if(!fs.existsSync(args.from))
    return setCodeAndMessage(response, 404, `No such from file ${args.from}`)
  // else
  if(fileIsOffLimits(args.from))
    return setCodeAndMessage(response, 400, `Cannot move this file`)
  // else
  
  if(fileIsOffLimits(args.to))
    return setCodeAndMessage(response, 400, `Argument 'to' is an off limits filename`)
  // else
  if(fs.existsSync(args.to))
    return setCodeAndMessage(response, 409, `from at 'to' location ${args.to} already exists`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  const groupLib = await ctx.runScript('./bin/group.s.js')
  let fromParentDirectory = ctx.path.dirname(args.from)
  let toParentDirectory   = ctx.path.dirname(args.to)
  const username = args.cookies?.loggedin ? args.cookies?.username : undefined
  let isFromAllowed = groupLib.userControlInclusionStatus(username, fromParentDirectory, ['moveFile', 'file', `file(${frombasename})`, `moveFile(${frombasename})`])
  let isToAllowed   = groupLib.userControlInclusionStatus(username, toParentDirectory,   ['newFile', 'file', `file(${tobasename})`, `newFile(${tobasename})`])
  if(isFromAllowed !== undefined && !isFromAllowed)
    return setCodeAndMessage(response, 400, `${!username ? 'Anonymous users' : `User ` + username} cannot move files from here`)
  if(isToAllowed !== undefined && !isToAllowed)
    return setCodeAndMessage(response, 400, `${!username ? 'Anonymous users' : `User ` + username} cannot moves files to here`)
  // else
  
  // Register anonymous user if anonymous
  let anonId
  if(username === undefined)
    anonId = ctx.scriptStorage['./'].registerAnonIp(request.socket.remoteAddress)
  
  // Move the file (rename is equivalent to move in node api)
  await fsp.rename(args.from, args.to)
  fsp.appendFile(ctx.path.join(ctx.path.dirname(args.to), 'changelog.autogen.txt'), [
    utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' moved ', args.from, ' to ', args.to, '\n'
  ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(ctx.path.dirname(args.to), 'changelog.autogen.txt')} in file.s.js move: ${err.message}`))
  
  return setCodeAndMessage(response, 200, `Moved ${args.from} to ${args.to}`)
}

/**
Same as move but only the same directory
Changes the file argument file's name the name argument
*/
// args: {file, name}
exports.respondToRequest["rename"] =  async function(request, response, getBody, args) {
  console.log(`[${request.uid}]`, `file.s.js/rename requested to rename a file ${args.file}`)

  if(args.file === undefined)
    return setCodeAndMessage(response, 400, `No file argument given`)
  // else
  
  // Is file outside working directory tree
  args.file = path.relative('./', ctx.addPathDot(args.file))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  if(args.name === undefined)
    return setCodeAndMessage(response, 400, `No name given`)
  // else
  
  if(/\//.test(args.name) || fileIsOffLimits(args.name)) // no dot files, etc and no / slashes in new name
    return setCodeAndMessage(response, 400, `Forbidden name (name cannot start with a dot, be autogen, have slashes, etc)`)
  // else
  
  let groupLib = await ctx.runScript('./bin/group.s.js')
  const username = args.cookies?.loggedin ? args.cookies?.username : undefined
  if(fileIsOffLimits(args.file))
    return setCodeAndMessage(response, 400, `Cannot rename this file`)
  // else
  
  args.file = ctx.addPathDot(args.file)
  let filename = ctx.path.basename(args.file)
  
  // does file exist?
  if(!ctx.fs.existsSync(args.file))
    return setCodeAndMessage(response, 400, `File ${args.file} doesn't exist`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  let parentDirectory = ctx.path.dirname(args.file)
  let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['renameFile', 'file', `file(${filename})`, `renameFile(${filename})`])
  if(isAllowed !== undefined && !isAllowed)
    return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot make files here`)
  // else
  
  // Register anonymous user if anonymous
  let anonId
  if(username === undefined)
    anonId = ctx.scriptStorage['./'].registerAnonIp(request.socket.remoteAddress)
  
  // Rename the file
  await ctx.fsp.rename(args.file, `${parentDirectory}/${args.name}`)
  console.log(`[${request.uid}]`, `file.s.js/rename successfully renamed file ${args.file}`)
  ctx.fsp.appendFile(ctx.path.join(ctx.path.dirname(args.file), 'changelog.autogen.txt'), [
    utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' renamed ', ctx.path.basename(args.file), ' to ', args.name, '\n'
  ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(ctx.path.dirname(args.file), 'changelog.autogen.txt')} in file.s.js rename: ${err.message}`))
  
  response.statusCode = 200
  response.statusMessage = `Renamed file ${args.file}`
  return true
}

// untested, probably doesn't work correctly
// args: {from, to}
exports.respondToRequest["copy"] =  async function(request, response, getBody, args) {
  if(args.from === undefined)
    return setCodeAndMessage(response, 400, `No from argument given`)
  // else
  
  if(args.to === undefined)
    return setCodeAndMessage(response, 400, `No to argument given`)
  // else
  
  args.from = ctx.addPathDot(path.relative('./', ctx.addPathDot(args.from)))
  args.to   = ctx.addPathDot(path.relative('./', ctx.addPathDot(args.to)))
  if(args.from.startsWith('..') || args.to.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File arguments cant start at directories higher than working directory')
  // else
  
  const groupLib = await ctx.runScript('./bin/group.s.js')
  const username = args.cookies?.loggedin ? args.cookies?.username : undefined
  
  if(fileIsOffLimits(args.to))
    return setCodeAndMessage(response, 400, `Cannot copy file to this location with this file extension`)
  // else
  if(fileIsOffLimits(args.from))
    return setCodeAndMessage(response, 400, `Cannot copy file from this location with this file extension`)
  // else
  
  let tobasename   = ctx.path.basename(args.to)
  let frombasename = ctx.path.basename(args.from)
  
  if(!ctx.fs.existsSync(args.from))
    return setCodeAndMessage(response, 400, `Source file ${args.from} doesn't exist`)
  // else
  if(ctx.fs.existsSync(args.to))
    return setCodeAndMessage(response, 400, `Target file ${args.to} already exists`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  let toParentDirectory = ctx.path.dirname(args.to)
  let isAllowed = groupLib.userControlInclusionStatus(username, toParentDirectory, ['newFile', 'file', `file(${tobasename})`, `newFile(${tobasename})`])
  if(!isAllowed)
    return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot make files here`)
  // else
  let isFromAllowed = groupLib.userControlInclusionStatus(username, toParentDirectory, ['copyFile', 'file', `file(${frombasename})`, `copyFile(${frombasename})`])
  if(!isFromAllowed)
    return setCodeAndMessage(response, 401, `${!username ? 'Anonymous users' : `User ` + username} cannot copy this file`)
  // else
  
  // Register anonymous user if anonymous
  let anonId
  if(username === undefined)
    anonId = ctx.scriptStorage['./'].registerAnonIp(request.socket.remoteAddress)
  
  // Make the file
  await ctx.fsp.copyFile(args.from, args.to)
  console.log(`[${request.uid}]`, `file.s.js/copy successfully copied file ${args.from} to ${args.to}`)
  ctx.fsp.appendFile(ctx.path.join(toParentDirectory, 'changelog.autogen.txt'), [
    utcDateStr(), ' ', username ?? `anonymous(${anonId})`, ' copied ', args.from, ' to ', args.to, '\n'
  ].join('')).catch(err=> console.error(`Error writing to ${ctx.path.join(toParentDirectory, 'changelog.autogen.txt')} in file.s.js copy: ${err.message}`))
  
  response.statusCode = 200
  response.statusMessage = `Copied file ${args.from} to ${args.to}`
  return true
}

/**
List all files in given directory, OR
List files in given directory matching given optional pattern
With optional afterTime mtimeMs argument to list only files after the given time
Pattern can be a RegExp if called form another script or a properly escaped regexp string
*/
// args: {directory, pattern, afterTime}
exports.respondToRequest['list'] = async function(request, response, getBody, args) {
  // console.log(`[${request.uid}]`, `file.s.js/list requested to list files in ${args.directory ?? ''}`)
  
  if(!args.directory)
    return setCodeAndMessage(response, 400, `No directory argument given`)
  // else
  
  args.directory = ctx.addPathDot(path.relative('./', ctx.addPathDot(args.directory)))
  if(args.directory.startsWith('..'))
    return setCodeAndMessage(response, 400, 'Directory argument cant start at directories higher than working directory')
  // else
  
  const patternRegex = args.pattern ? RegExp(args.pattern) : undefined
  
  // Is directory inside a dot directory?
  if(/\/\.[^\/]/.test(args.directory)) // eg: ./asdf/.zxcv/qwer/ because contains /.z
    return setCodeAndMessage(response, 400, `Cannot access dot file directory`)
  // else
  
  if(!ctx.fs.existsSync(args.directory))
    return setCodeAndMessage(response, 400, `Given directory doesn't exist`)
  // else
  
  // Is it actually a directory?
  let dirStat = ctx.fs.statSync(args.directory)
  if(!dirStat.isDirectory())
    return setCodeAndMessage(response, 400, `Given directory argument isn't a directory`)
  // else
  
  // Set, check ETag header
  let etag = String(dirStat.mtimeMs)
  response.setHeader('ETag', etag)
  if((request.headers['if-none-match'] ?? '') === etag) {
    response.statusCode = 304 // no change
    return true
  }
  // else
  
  // List the directory's files
  response.statusCode = 200
  let allFiles = ctx.fs.readdirSync(args.directory) // iterator
  let afterTime = parseInt(args.afterTime ?? '0') // node fs.Stats.mtimeMs
  for(const fileBasename of allFiles) {
    let file     = ctx.path.join(args.directory, fileBasename)
    let fileStat = ctx.fs.statSync(file)
    if(fileStat.mtimeMs > afterTime && !fileBasename.startsWith('.') && (patternRegex?.test(fileBasename) ?? true)) { // not dot file and matches pattern (if given)
      response.write(String(fileStat.mtimeMs))
      response.write(' ')
      response.write(escapeSpaces(file)) // 'asdf zxcv.txt' -> 'asdf\\ zxcv.txt'
      response.write('\n') // line: "123456789 somefilename.txt\n"
    }
  }
  
  return true
}


function countMatches(str, regex) {
  let count = 0
  for(const _ of str.matchAll(regex))
    count++
  return count
}

function* walkFiles(startDir, maxDepth = -1) {
  let alreadyTraversed = {}
  let baseDepth = countMatches(startDir, /\//g) // count slashes in startDir
  if(!(fs.statSync(startDir, {throwIfNoEntry: false})?.isDirectory() ?? false)) // file isn't a directory, or doesn't exist
    return void 0
  // else:
  let dirStack = [startDir]
  while(dirStack.length > 0) {
    let currentDir = dirStack.pop()
    let currentDepth = countMatches(currentDir, /\//g) - baseDepth + 1
    alreadyTraversed[currentDir] = true
    for(const filename of fs.readdirSync(currentDir)) {
      let filepath = path.join(currentDir, filename)
      let realFilepath
      try {
        realFilepath = ctx.path.relative('./', fs.realpathSync(filepath))
      } catch(err) { continue }
      let stat  = fs.statSync(realFilepath, {throwIfNoEntry: false})
      
      yield realFilepath
      if(maxDepth >= 0 && currentDepth > maxDepth)
        continue
      // else
      if(stat?.isDirectory() ?? false) {
        if(!(realFilepath in alreadyTraversed))
          dirStack.push(realFilepath)
      }
    }
  }
}

exports.respondToRequest['search'] = async function(request, response, getBody, args) {
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(200) // wait 200 ms
  
  if(!args.directory)
    return setCodeAndMessage(response, 400, `No directory argument given`)
  // else
  
  args.directory = ctx.addPathDot(path.relative('./', ctx.addPathDot(args.directory)))
  if(args.directory.startsWith('..'))
    return setCodeAndMessage(response, 400, 'Directory argument cant start at directories higher than working directory')
  // else
  
  if(!args.query)
    return setCodeAndMessage(response, 400, `No query argument given`)
  // else
  
  // Is directory inside a dot directory?
  if(/\/\.[^\/]/.test(args.directory)) // eg: ./asdf/.zxcv/qwer/ because contains /.z
    return setCodeAndMessage(response, 400, `Cannot access dot file directory`)
  // else
  
  if(!ctx.fs.existsSync(args.directory))
    return setCodeAndMessage(response, 400, `Given directory doesn't exist`)
  // else
  
  // Is it actually a directory?
  let dirStat = ctx.fs.statSync(args.directory)
  if(!dirStat.isDirectory())
    return setCodeAndMessage(response, 400, `Given directory argument isn't a directory`)
  // else
  
  let maxDepth = args.subDirs ? (args.maxDepth ?? -1) : 0
  let maxResultsCount = args.maxResults ? Math.max(parseInt(args.maxResults), 16) : 16
  let resultNumber = 0
  for(const file of walkFiles(args.directory, maxDepth)) { // file is regular file or directory
    let basename     = ctx.path.basename(file)
    if(basename.indexOf(args.query) !== -1) {
      if(resultNumber++ > maxResultsCount) // only return N results
        break
      // else
      response.write(file)
      response.write('\n')
    }
  }
  return true
}

/**
Gets exactly the contents of the given file without any parsing or anything
*/
// args: {file}
exports.respondToRequest['raw'] = async function(request, response, getBody, args) {
  // console.log(`[${request.uid}]`, `file.s.js/raw requested to serve a ${args.file} raw`)
  
  if(!args.file)
    return setCodeAndMessage(response, 400, `No file argument given`)
  // else
  
  // Is file outside working directory tree
  args.file = ctx.addPathDot(path.relative('./', ctx.addPathDot(args.file)))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  let basename = path.basename(args.file)
  if(basename.startsWith('.'))
    return setCodeAndMessage(response, 400, `Cannot access dot files`)
  // else
  
  if(!ctx.fs.existsSync(args.file))
    return setCodeAndMessage(response, 404, `File doesn't exist`)
  // else
  
  let stat = ctx.fs.statSync(args.file)
  if(!stat.isFile())
    return setCodeAndMessage(response, 400, `Given file is a directory`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  let username = args.cookies?.loggedin ? args.cookies.username : undefined
  if(!userLib.handleUserAuthcheck(response, args))
    username = undefined
  // else
  
  // is user allowed to do this here?
  const parentDirectory = ctx.path.dirname(args.file)
  const groupLib = await ctx.runScript('./bin/group.s.js')
  const isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['accessFile', `access`, `accessFile(${basename})`, `access(${basename})`])
  if(!isAllowed)
    return setCodeAndMessage(response, 401, `${username ? 'User ' + username : 'Anonymous users '} cannot access the file ${args.file}`)
  // else
  
  // Set / check ETag header
  let etag = String(stat.mtimeMs)
  response.setHeader('ETag', etag)
  if((request.headers['if-none-match'] ?? '') === etag) {
    response.statusCode = 304 // no change
    return true
  }
  // else
  
  // serve the file
  if(response.statusCode === 401) // possibly set by handleUserAuthcheck
    response.statusMessage = 'File served; please log in again'
  else
    response.statusMessage = 'File served'
  response.statusCode = 200
  await ctx.serveFile(args.file, response)
  
  
  return setCodeAndMessage(response, 200, `Served ${args.file}`)
}

exports.respondToRequest['tail'] = async function(request, response, getBody, args) {
  // console.log(`[${request.uid}]`, `file.s.js/raw requested to serve a ${args.file} raw`)
  const lib = await ctx.runScript('./lib/lib.s.js')
  await lib.asyncSleepFor(200) // wait for 1/5 second
  
  if(!args.file)
    return setCodeAndMessage(response, 400, `No file argument given`)
  // else
  
  if(!args.lines)
    return setCodeAndMessage(response, 400, `No lines argument given`)
  // else
  const lineCount = parseInt(args.lines)
  if(isNaN(lineCount))
    return setCodeAndMessage(response, 400, `Lines argument is not a number: ${lineCount}`)
  // else
  if(lineCount <= 0)
    return setCodeAndMessage(response, 400, `Lines argument must be greater than 0: ${lineCount}`)
  // else
    
  
  // Is file outside working directory tree
  args.file = ctx.addPathDot(path.relative('./', ctx.addPathDot(args.file)))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  let basename = path.basename(args.file)
  if(basename.startsWith('.'))
    return setCodeAndMessage(response, 400, `Cannot access dot files`)
  // else
  
  if(!ctx.fs.existsSync(args.file))
    return setCodeAndMessage(response, 404, `File doesn't exist`)
  // else
  
  let stat = ctx.fs.statSync(args.file)
  if(!stat.isFile())
    return setCodeAndMessage(response, 400, `Given file is a directory`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  let username = args.cookies?.loggedin ? args.cookies.username : undefined
  if(!userLib.handleUserAuthcheck(response, args))
    username = undefined
  // else
  
  // is user allowed to do this here?
  const parentDirectory = ctx.path.dirname(args.file)
  const groupLib = await ctx.runScript('./bin/group.s.js')
  const isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['accessFile', `access`, `accessFile(${basename})`, `access(${basename})`])
  if(!isAllowed)
    return setCodeAndMessage(response, 401, `${username ? 'User ' + username : 'Anonymous users '} cannot access the file ${args.file}`)
  // else
  
  // Set / check ETag header
  let etag = String(stat.mtimeMs)
  response.setHeader('ETag', etag)
  if((request.headers['if-none-match'] ?? '') === etag) {
    response.statusCode = 304 // no change
    return true
  }
  // else
  
  // serve the file (definitely needs optimization)
  let fileContents = await ctx.fsp.readFile(args.file)
  let lineArray = fileContents.toString().split('\n')
  let tailArray = lineArray.slice(lineArray.length - lineCount)
  
  response.statusCode = 200
  response.statusText = `Served tail of ${args.file}`
  response.write(tailArray.join('\n'))
  
  return true
}