
/**
This provides functions for adding and removing a logged-in user's name to plaintext name lists (eg: members.txt files and vote files)
*/

/**
This enables the pattern
if(...)
  return setCodeAndMessage(response, ..., '...')
*/
function setCodeAndMessage(response, code, msg) {
  console.log('  list.s.js ', msg)
  response.statusCode = code
  response.statusMessage = msg
  return true
}

/**
Imported from file.s.js
Subject to proprietary changes
*/
const disallowedExtensions = new Set(
  'autogen', 'html', 'jhp', 'js', 'mjs', 'sh',
  'php',
)

/**
Imported from file.s.js
  > Checks extensions and dot-file status only currently
Subject to proprietary changes
*/
function fileIsOffLimits(filePath) {
  let baseName = ctx.path.basename(filePath)
  if(baseName[0] === '.') // no dot files eg: .asdf.txt
    return true
  // else
  let extArray = baseName.match(/\.(.+)/)?.[1]?.split('.') ?? [] // "aaa.bbb.ccc" -> ["bbb", "ccc"]
  for(const ext of extArray) {
    if(disallowedExtensions.has(ext))
      return true
  }
  // else
  return false
}

const path = ctx.path

exports.respondToRequest = async function(request, response, getBody, args) {
  return setCodeAndMessage(response, 500, `Please use a subfunction instead (${Object.keys(exports.respondToRequest).join(', ')})`)
}

/**
Adds a logged in user (from cookies.username) to the given username list file
The primary value to doing this as opposed to just updating the file with file.s.js/update
is that the changelog.autogen.txt file in the same directory shows a registered user added their name to the list
file: file string ending in .txt, eg: './aaa/bbb/ccc.txt'
*/
// args: {file} and cookies.username (required)
exports.respondToRequest.add = async function(request, response, getBody, args) {
  if(!args.file) 
    return setCodeAndMessage(response, 400, `No file argument given (use ?file=...)`)
  // else
  
  args.file = path.relative('./', ctx.addPathDot(args.file))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  if(fileIsOffLimits(args.file))
    return setCodeAndMessage(response, 400, `Cannot edit this file`)
  // else
  
  if(!args.file.endsWith('.txt'))
    return setCodeAndMessage(response, 400, `List files must be .txt files`)
  // else
  
  args.file = ctx.addPathDot(args.file)
  let filename = ctx.path.basename(args.file)

  if(!ctx.fs.existsSync(args.file)) 
    return setCodeAndMessage(response, 400, `File ${args.file} doesn't exist`)
  // else
  
  // is user logged in
  let username = args.cookies.username
  if(!username || !args.cookies.authtoken)
    return setCodeAndMessage(response, 400, `Can only add name to list if logged in`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  let parentDirectory = ctx.path.dirname(args.file)
  const groupLib = await ctx.runScript('./bin/group.s.js')
  let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, [
    'updateFile', 'file', `file(${filename})`, `updateFile(${filename})`, 'vote', `vote(${filename})`, 'listAdd', `listAdd(${filename})`
  ])
  if(!isAllowed)
    return setCodeAndMessage(response, 401, `${username} cannot modify the file ${args.file}`)
  // else
  
  // Update the file
  let fileContent = ctx.fs.readFileSync(args.file).toString().trim()
  let nameSet = new Set(fileContent.split(/[\s\n]+/g)) // split by whitespace and newline // nameSet == Set("jmacc93", "cooldude123", ...)
  if(!nameSet.has(username)) {
    nameSet.add(username) // nameSet == Set("newguy900", "jmacc93", "cooldude123", ...)
    let nameArray = []
    let linestep = 1
    for(const name of nameSet) {
      nameArray.push(name)
      if(linestep++ % 10 === 0) // every line has fewer than 10 names
        nameArray.push('\n')
    } // nameArray == ["newguy900", "jmacc93", "cooldude123", ...7 more ..., "\n", ... 10 items ..., "\n", ...]
    ctx.fsp.writeFile(args.file, nameArray.join(' ')) // "newguy900 jmacc93 cooldude123 ... \n ..."
    ctx.fsp.appendFile(
      ctx.path.join(ctx.path.dirname(args.file), 'changelog.autogen.txt'),
      `${Date.now()} ${username} added their name to ${ctx.path.basename(args.file)}\n`
    )
    
    response.statusCode = 200
    response.statusMessage = `Added name to file ${args.file}`
    return true
  } else {
    response.statusCode = 200
    response.statusMessage = `No change`
    return true
  }
}

/**
Removes a logged in user's (from cookies.username) name from the given username list file
The primary value to doing this as opposed to just updating the file with file.s.js/update
is that the changelog.autogen.txt file in the same directory shows a registered user removed their name from the list
file: file string ending in .txt, eg: './aaa/bbb/ccc.txt'
*/
// args: {file} and cookies.username (required)
exports.respondToRequest.remove = async function(request, response, getBody, args) {
  if(!args.file) 
    return setCodeAndMessage(response, 400, `No file argument given (use ?file=...)`)
  // else
  
  args.file = path.relative('./', ctx.addPathDot(args.file))
  if(args.file.startsWith('..'))
    return setCodeAndMessage(response, 400, 'File argument cant start at directories higher than working directory')
  // else
  
  if(fileIsOffLimits(args.file))
    return setCodeAndMessage(response, 400, `Cannot edit this file`)
  // else
  
  if(!args.file.endsWith('.txt'))
    return setCodeAndMessage(response, 400, `List files must be .txt files`)
  // else
  
  args.file = ctx.addPathDot(args.file)
  let filename = ctx.path.basename(args.file)

  if(!ctx.fs.existsSync(args.file)) 
    return setCodeAndMessage(response, 400, `File ${args.file} doesn't exist`)
  // else
  
  // is user logged in
  let username = args.cookies.username
  if(!username || !args.cookies.authtoken)
    return setCodeAndMessage(response, 400, `Can only vote if logged in`)
  // else
  
  // is user actually who they say they are?
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    return true
  // else
  
  // is user allowed to do this here?
  let parentDirectory = ctx.path.dirname(args.file)
  const groupLib = await ctx.runScript('./bin/group.s.js')
  let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, [
    'updateFile', 'file', `file(${filename})`, `updateFile(${filename})`, 'vote', `vote(${filename})`, 'listRemove', `listRemove(${filename})`
  ])
  if(!isAllowed)
    return setCodeAndMessage(response, 401, `${username} cannot modify the file ${args.file}`)
  // else
  
  // Update the file
  let fileContent = ctx.fs.readFileSync(args.file).toString().trim()
  let nameSet = new Set(fileContent.split(/[\s\n]+/g)) // split by whitespace and newline // nameSet == Set("newguy900", "jmacc93", "cooldude123", ...)
  if(nameSet.has(username)) {
    nameSet.delete(username) // nameSet == Set(jmacc93", "cooldude123", ...)
    let nameArray = []
    let linestep = 1
    for(const name of nameSet) {
      nameArray.push(name)
      if(linestep++ % 10 === 0) // any line has fewer than 10 names
        nameArray.push('\n')
    } // nameArray == ["jmacc93", "cooldude123", ...8 more ..., "\n", ... 10 items ..., "\n", ...]
    ctx.fsp.writeFile(args.file, nameArray.join(' ')) // "jmacc93 cooldude123 ... \n ..."
    ctx.fsp.appendFile(
      ctx.path.join(ctx.path.dirname(args.file), 'changelog.autogen.txt'),
      `${Date.now()} ${username} removed their name from ${ctx.path.basename(args.file)}\n`
    )
    response.statusCode = 200
    response.statusMessage = `Removed name from file ${args.file}`
    return true
  } else {
    response.statusCode = 200
    response.statusMessage = `No change`
    return true
  }
}

