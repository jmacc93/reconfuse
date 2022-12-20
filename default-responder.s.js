/**
This enables the pattern:
if(...)
  return setCodeAndMessage(response, ..., '...')
From file.s.js
*/
function setCodeAndMessage(response, code, msg) {
  response.statusCode = code
  response.statusMessage = msg
  return true
}

exports.respondToRequest = async function(request, response, getBody, args) {
  if(!args.requestPath)
    return setCodeAndMessage(reponse, 400, `No requestPath argument given`)
  // else
  
  // Is file outside working directory tree?
  args.requestPath = ctx.addPathDot(ctx.path.relative('./', ctx.addPathDot(args.requestPath)))
  let filename = ctx.path.basename(args.requestPath)
  if(args.requestPath.startsWith('..'))
    return setCodeAndMessage(response, 400, 'requestPath argument cant start at directories higher than working directory')
  // else
  
  // Requested directory?
  ifblock: if(args.requestPath.endsWith('/')) {
    for(const indexFile of ['index.escm', 'index.md', 'index.html']) {
      const indexPath = ctx.path.join(args.requestPath, indexFile)
      if(ctx.fs.existsSync(indexPath)) {
        args.requestPath = indexPath
        filename = indexFile
        break ifblock
      }
    }
    // else
    const indexPath = ctx.path.join(args.requestPath, 'index.jhp')
    if(ctx.fs.existsSync(indexPath))
      return ctx.serveJHP(indexPath, request, response, {cookies: args.cookies, file: args.requestPath})
    // else
    return ctx.serveJHP('./represent-directory.jhp', request, response, {cookies: args.cookies, directory: args.requestPath})
  }
  // else
  
  // is user actually who they say they are?
  let username = args.cookies?.loggedin ? args.cookies.username : undefined
  let userLib = await ctx.runScript('./bin/user.s.js')
  if(!userLib.handleUserAuthcheck(response, args))
    username = undefined // default to going anonymous
  // else
  
  // is user allowed to do this here?
  const parentDirectory = ctx.path.dirname(args.requestPath)
  const groupLib = await ctx.runScript('./bin/group.s.js')
  const isAllowed = groupLib.userControlInclusionStatus(username, parentDirectory, ['accessFile', `access`, `accessFile(${filename})`, `access(${filename})`])
  if(!isAllowed)
    return setCodeAndMessage(response, 401, `Cannot access the file ${args.requestPath}`)
  // else
  
  const replacementObj = {
    uid: ctx.getUid(),
    file: args.requestPath.slice(1),
    filename: filename,
    fileDir: '/' + ctx.path.relative('./', ctx.path.dirname(args.requestPath))
  }
  for(const key in args) { // add all args to replacements
    if(key !== 'cookies')
      replacementObj['arg-' + key] = args[key]
  }
  
  // does file exist?
  if(!(ctx.fs.existsSync(args.requestPath))) { // doesn't exist, serve 404
    response.statusCode = 404
    response.statusMessage = `File ${args.requestPath} doesn't exist`
    return true
    // return ctx.serveJHP('./404.jhp', request, response, {cookies: args.cookies, file: args.requestPath})
  }
  // else
  
  // check file has been modified, if requested
  const headers = request.headers
  const reqEtag = headers['if-none-match']
  const stat    = await ctx.fsp.stat(args.requestPath)
  const fileEtag = String(stat.mtimeMs)
  if(fileEtag === reqEtag) { // etags match, don't serve
    response.statusCode = 304
    response.setHeader('ETag', fileEtag)
    return true
  }
  
  // File exists, all clear, serve it up:
  if(response.statusCode === 401) // possibly set by handleUserAuthcheck
    response.statusMessage = 'File served; please log in again'
  else
    response.statusMessage = 'File served'
  response.statusCode = 200
  return ctx.serveFile(args.requestPath, response, replacementObj)
}