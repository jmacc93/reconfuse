
const path = ctx.path

let logToConsole = false

function serve404(response, path) {
  if(logToConsole) console.log(`  default-responder.s.js requested file does not exist ${path}`)
  if(logToConsole) console.log(`    serving 404.html page`)
  response.statusCode = 404
  let file404Path = './404.html'
  if(ctx.fs.existsSync(file404Path)) {
    return ctx.serveFile(file404Path, response, {
      uid: ctx.getUid(), pathNotFound: path, 
      filename: path.basename(args.requestPath), fileDir: path.dirname(path)
    })
  } else {
    response.statusCode = 404
    response.write(`<html><body><div style="color: red">404, ${path} not found</div></body></html>`)
    return true
  }
}

exports.respondToRequest = async function(request, response, getBody, args) {
  let reqPath = ctx.addPathDot(path.relative('./', ctx.addPathDot(args.requestPath))).replaceAll('/..','/.')
  if(reqPath.startsWith('..')) {
    response.statusCode = 400
    return true
  }
  // else
  
  const basename = path.basename(args.requestPath)
  const replacementObj = {
    uid: ctx.getUid(),
    file: reqPath.slice(1),
    filename: basename,
    fileDir: '/' + path.relative('./', path.dirname(reqPath))
  }
  for(const key in args) { // add all args to replacements
    if(key !== 'cookies')
      replacementObj['arg-' + key] = args[key]
  }
  
  if(logToConsole) console.log(``)
  if(logToConsole) console.log(`default-responder.s.js requested to serve ${basename}`)
  if(ctx.fs.existsSync(reqPath)) { // file exists
    let stat = ctx.fs.statSync(reqPath)
    
    // check file has been modified, if requested
    let headers = request.headers
    let reqEtag = headers['if-none-match']
    let fileEtag = String(stat.mtimeMs)
    if(fileEtag === reqEtag) { // etags match, don't serve
      if(logToConsole) console.log(`  default-responder.s.js etags match, no serve ${basename}`)
      response.statusCode = 304
      response.setHeader('ETag', fileEtag)
      return true
    }
    // else
    
    if(stat.isDirectory()) { // is a directory, serve dir's index.html
      let indexPath = ctx.path.join(reqPath, 'index.html')
      if(ctx.fs.existsSync(indexPath)) {
        if(logToConsole) console.log(`  default-responder.s.js serving ${indexPath}`)
        return ctx.serveFile(indexPath, response, replacementObj)
      }
      indexPath = ctx.path.join(reqPath, 'index.jhp')
      if(ctx.fs.existsSync(indexPath)) {
        if(logToConsole) console.log(`  default-responder.s.js serving ${indexPath}`)
        return ctx.serveJHP(indexPath, request, response, {...args, originalPath: reqPath})
      }
      // else, dir's index.html doesn't exist
      indexPath = './default-index.html'
      if(ctx.fs.existsSync(indexPath)) {
        if(logToConsole) console.log(`  default-responder.s.js serving ${indexPath}`)
        return ctx.serveFile(indexPath, response, replacementObj)
      }
      // else
      indexPath = './default-index.jhp'
      if(ctx.fs.existsSync(indexPath)) { 
        if(logToConsole) console.log(`  default-responder.s.js serving ${indexPath}`)
        return ctx.serveJHP(indexPath, request, response, {...args, originalPath: reqPath})
      }
      // else 
      return serve404(response, reqPath)
    }
    // else, is file
    
    if(logToConsole) console.log(`  default-responder.s.js serving ${basename}`)
    return ctx.serveFile(reqPath, response, replacementObj)
    
  } else { // file doesn't exist
    serve404(response, reqPath)
  }
  
}