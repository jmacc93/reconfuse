
/**
This enables the pattern:
if(...)
  return setCodeAndMessage(response, ..., '...')
*/
function setCodeAndMessage(response, code, msg) {
  console.log('  group.s.js', msg)
  response.statusCode = code
  response.statusMessage = msg
  return true
}


if(!ctx.fs.existsSync('./groups'))
  ctx.fs.mkdirSync('./groups')

let currentTime = 0
let beginTime = 0
let invocations = 0
function startTime() {
  beginTime = Date.now()
  invocations++
}
function stopAndPrintTime() {
  currentTime += Date.now() - beginTime
  console.log('current timing:', currentTime/invocations, Date.now() - beginTime)
}

exports.respondToRequest = async function(request, response, getBody, args) {
  return setCodeAndMessage(response, 500, `Please use a subfunction instead`)
}

/**
Yields all control objects in all control.json files starting from directory up to server working directory in order
Control objects look like {"file": ..., "newDir": ..., ...}
*/
function* getAllControlObjDirs(directory) {
  let currentDir = directory
  while(true) {
    let controlJsonFile = ctx.path.join(currentDir, './control.json')
    if(ctx.fs.existsSync(controlJsonFile)) {
      let fileContent     = ctx.fs.readFileSync(controlJsonFile).toString()
      try {
        let controlObjArray = JSON.parse(fileContent).reverse()
        for(const controlObj of controlObjArray)
          yield [controlObj, currentDir]
      } catch(err) {} // skip bad control object files
    }
    if(currentDir === '.')
      break
    else
      currentDir = ctx.path.dirname(currentDir)
  }
}
exports.getAllControlObjDirs = getAllControlObjDirs

function _removeGroupnameAsterisk(group) {
  return (group[0] === '*') ? group.slice(1) : group
}

/**
Checks if given username is in the given group's members.txt file
username: username string eg: "jmacc93"
groupArg: groupname string eg: "*admin" or "admin"
*/
function userInGroup(username, groupArg) {
  if(/[\.\/]/g.test(username) || /[\.\/]/g.test(groupArg)) // contains . or /
    return false
  // else
  let group = _removeGroupnameAsterisk(groupArg)
  if(group === 'all') // note: username can be undefined here (ie: no username given; is anonymous)
    return true
  // else
  if(!username) { // username is undefined ie: anonymous user
    if(group === 'anonymous')
      return true
    else
      return false
  }
  // else
  if(!ctx.fs.existsSync(`./users/` + username)) // user doesn't exist
    return false
  // else
  let groupDir = './groups/' + group
  if(!ctx.fs.existsSync(groupDir)) // group doesn't exist
    return false
  // else
  let membersFile = groupDir + '/members.txt'
  if(!ctx.fs.existsSync(membersFile)) // members.txt not existing is assumed group doesn't exist
    return false
  // else
  let members = new Set(ctx.fs.readFileSync(membersFile).toString().split(/\s+/))
  return members.has(username)
}
exports.userInGroup = userInGroup

/**
Checks if given username has privileges specified by given names array in startDirectory
username: string eg: jmacc93
startDirectory: directory string eg: ./aaa/bbb/ccc/
names: array of privilege strings eg: ['newFile', 'file', 'file(control.json)']
*/
function userControlInclusionStatus(username, startDirectory, names) {
  if(typeof names === 'string')
    return userControlInclusionStatus(username, startDirectory, [names])
  // else, names should be an array
  
  /**
  Only yields white/black/super-* lists the given username appears in (also if username is in the list's group)
  */
  function* allListsUserAppearsIn(username, startDirectory, names) {
    for(const [controlObj, controlDir] of getAllControlObjDirs(startDirectory)) { // N controlObj for each directory (from control.json files) going toward root
      for(const name of names) {
        if(!(name in controlObj)) // name = "modifyFile" | "deleteFile" | "deleteDir" | "newFile" | "newDir" | "accessFile" | "accessDir" | etc
          continue
        // else
        const dirControl = controlObj[name]
        // dirControl = { ["tree"] | ["subdir"] | ["this"]: {groupNameString: "white" | "black" | "super-white" | "super-black", ...}, ...}
        for(const key of ['subdir', 'this', 'tree']) {
          // 'subdir' only applies in child directories (ie: we're in a parent directory's control.json)
          // 'this' only applies in the original directory (ie: we're not in a parent directory)
          let inParentDir = (controlDir.length < startDirectory.length) // lol
          if((key === 'subdir' && !inParentDir) || (key === 'this' && inParentDir))
            continue
          for(const group in dirControl[key]) { // dirControl[key] = {group1: "white" | "black" | ..., group2: "white" | ..., ...}
            // note: group can also be a username (groupnames start with *, usernames don't). think of it like: usernames are groups of size 1
            if(group.startsWith('*')) { // group is an actual groupname
              if(userInGroup(username, group))
                yield dirControl[key][group] // yields "white" | "black" | "super-white" | "super-black"
            } else { // group is actually a username (group of size 1)
              if(username === group)
                yield dirControl[key][group]
            }
          }
        } // key of ["this", ...]
      } // name of names
    }
  }
  
  // if(!allControlObjKeys.has(name))
  //   throw Error(`name ${name} is an unknown control object key`)
  // // else
  
  if(username && !ctx.fs.existsSync(`./users/` + username)) // username isn't null but user doesn't exist
    return false
  // else
  
  let firstListSeen      = undefined
  let lastSuperListSeen  = undefined
  // The *first* 'white' or 'black' list seen is used unless a super-list has been seen, then
  // the *last* super list seen is used (ie: regular: from below; super: from above)
  for(const list of allListsUserAppearsIn(username, startDirectory, names)) {
    if(list.startsWith('super'))
      lastSuperListSeen = list
    else if(firstListSeen === undefined)
      firstListSeen = list
  }
  if(lastSuperListSeen !== undefined) // last super list seen
    return lastSuperListSeen === 'super-white'
  else // first list seen, default to blacklist if no lists seen
    return (firstListSeen ?? 'black') === 'white'
}
exports.userControlInclusionStatus = userControlInclusionStatus

/**
Checks if the given username is in the given group
*/
// args: {username, group} and cookies.username
exports.respondToRequest['in-group'] = async function(request, response, getBody, args) {
  let username = args.username ?? args.cookies.username
  if(!username) 
    return setCodeAndMessage(response, 400, `No username argument given (use ?argname=... or log in)`)
  // else
  
  if(!args.group) 
    return setCodeAndMessage(response, 400, `No group argument given (use ?group=...)`)
  // else
  
  let inGroup = userInGroup(username, args.group)
  response.statusCode = 200
  response.write(inGroup ? 'true' : 'false')
  return true
}

/**
Checks if the given username has read privileges for the given file or directory
username: username string eg: "jmacc93"
file: file string eg: './aaa/bbb/ccc.txt'
directory: directory string eg: './aaa/bbb/'
*/
// args: {username, file, directory} and cookies.username
exports.respondToRequest['has-access'] = async function(request, response, getBody, args) {
  let username = args.username ?? args.cookies.username
  if(!username) 
    return setCodeAndMessage(response, 400, `No username argument given (use ?username=...)`)
  
  if(args.file) {
    response.statusCode = 200
    let allowedAccess = userControlInclusionStatus(args.username, ctx.path.dirname(args.file), ['accessFile', 'access', `access(${ctx.path.basename(args.file)})`])
    response.write(allowedAccess ? 'true' : 'false')
    return true
  } else if(args.directory) {
    response.statusCode = 200
    let allowedAccess = userControlInclusionStatus(args.username, args.directory, ['accessDirectory', 'access', `access(${ctx.path.basename(args.directory)})`])
    response.write(allowedAccess ? 'true' : 'false')
    return true
  } else {
    return setCodeAndMessage(response, 400, 'No file or directory argument given (use ?directory=... or  ?file=...)')
  }
}

/**
This is the data used to make the rest of the exports.respondToRequest['...'] functions
functionName is the respondToRequest subfunction name
controlName is the control.json file privilege name
primaryArg is either 'file' or 'directory' and is the argument given to check the given privileges of
*/
const respondToRequestNameMap = [
  {functionName: 'can-make-file'       , controlName: 'newFile'   , primaryArg: 'file'},
  {functionName: 'can-delete-file'     , controlName: 'deleteFile', primaryArg: 'file'},
  {functionName: 'can-delete-file'     , controlName: 'modifyFile', primaryArg: 'file'},
  {functionName: 'can-make-directory'  , controlName: 'newDir'    , primaryArg: 'directory'},
  {functionName: 'can-delete-directory', controlName: 'deleteDir' , primaryArg: 'directory'},
]

/**
Here we make the exports.respondToRequest['...'] functions specified above
*/
for(const names of respondToRequestNameMap) {
  exports.respondToRequest[names.functionName] = async function(request, response, getBody, args) {
    let username = args.username ?? args.cookies.username
    if(!username) 
      return setCodeAndMessage(response, 400, `No username argument given (use ?username=...)`)
    // else
    if(!args[names.primaryArg]) 
      return setCodeAndMessage(response, 400, `No ${names.primaryArg} argument given (use ?${names.primaryArg}=...)`)
    // else
    
    response.statusCode = 200
    let isAllowed = userControlInclusionStatus(args.username, args[names.primaryArg], names.controlName)
    response.write(isAllowed ? 'true' : 'false')
    return true
  }
}

/**
Checks the given privilege from control.json files
username: username string, eg: "jmacc93"
file, directory: string, these are interchangeable; eg: "./aaa/bbb/ccc.txt"
controlName: privilege string, eg: "newFile", "accessDir", etc
Writes either 'true' or 'false' to body to indicate having the privilege or not having it respectively
*/
// args: {username, file, directory, controlName} and cookies.username
exports.respondToRequest['has-privilege'] = async function(request, response, getBody, args) {
  let username = args.username ?? args.cookies.username
  if(!username) 
    return setCodeAndMessage(response, 400, `No username argument given (use ?username=...)`)
  // else
  
  if(!args.controlName)
    return setCodeAndMessage(response, 400, `No controlName argument given (user ?controlName=...)`)
  //
  
  if(!args.file && !args.directory)
    return setCodeAndMessage(response, 400, `No file or directory argument given`)
  //
  
  response.statusCode = 200
  let isAllowed = userControlInclusionStatus(username, args.file ?? args.directory, args.controlName)
  response.write(isAllowed ? 'true' : 'false')
  return true
}