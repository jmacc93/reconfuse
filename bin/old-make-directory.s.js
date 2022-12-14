
// function setCodeAndMessage(response, code, msg) {
//   console.log(`  make-directory.s.js`, msg)
//   response.statusCode = code
//   response.statusMessage = msg
//   return true
// }

// function isDirectoryNameAllowed(directoryName) {
//   if(directoryName[0] === '.')
//     return false
//   else
//     return true
// }

// // args: {directory}
// exports.respondToRequest = async function(request, response, getBody, args) {
  
//   if(!args.directory) 
//     return setCodeAndMessage(response, 400, `No directory argument given`)
//   // else
  
//   const groupLib = await ctx.runScript('./bin/group.s.js')
//   if(!isDirectoryNameAllowed(ctx.path.basename(args.directory))) {
//     if(!groupLib.userInGroup(args.username ?? args.cookies.username, 'admin')) // user isn't an admin
//       return setCodeAndMessage(response, 400, `Cannot create a directory with the basename ${ctx.path.basename(args.directory)}`)
//     // else
//   }
  
//   args.directory = ctx.addPathDot(args.directory)
//   console.log(``)
//   console.log(`make-directory.s.js requested to make a new directory ${args.directory}`)
  
//   if(args.directory.startsWith('..'))
//     return setCodeAndMessage(response, 400, `Trying to create a directory outside the server root directory`)
//   // else
  
//   if(/[\s\.\,\[\]\(\)\<\>]/.test(ctx.path.basename(args.directory)))
//     return setCodeAndMessage(response, 400, `Given directoryName argument ${args.directoryName} has forbidden characters`)
//   // else
  
//   // does parent directory exists?
//   let parentDirectory = ctx.path.dirname(args.directory)
//   if(!ctx.fs.existsSync(parentDirectory)) 
//     return setCodeAndMessage(response, 400, `Parent directory ${parentDirectory} doesn't exist`)
//   // else
  
//   // is user actually who they say they are?
//   let userLib = await ctx.runScript('./bin/user.s.js')
//   if(!userLib.handleUserAuthcheck(response, args))
//     return true
//   // else
  
//   // is user allowed to do this?
//   let username = args.username ?? args.cookies?.username
//   let isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['newDir', `newDir(${ctx.path.basename(args.directory)})`, 'dir'])
//   if(isAllowed !== undefined && !isAllowed)
//     return setCodeAndMessage(response, 401, `${!username ? 'anonymous users' : 'User ' + username} cannot make directories here`)
//   // else
  
//   // does directory already exists?
//   if(ctx.fs.existsSync(args.directory))
//     return setCodeAndMessage(response, 409, `Given directory argument ${args.directory} already exists`)
//   // else
  
//   // make the directory
//   ctx.fsp.mkdir(args.directory)
//   console.log(`  make-directory.s.js successfully made directory ${args.directory}`)
  
//   ctx.fsp.appendFile(ctx.path.join(ctx.path.dirname(parentDirectory), 'changelog.autogen.txt'), [
//     utcDateStr(), ' ', username, ' made new directory ', ctx.path.basename(args.directory), '\n'
//   ].join(''))
  
//   response.statusCode = 200
//   response.statusMessage = `Made directory ${args.directory}`
//   return true
// }