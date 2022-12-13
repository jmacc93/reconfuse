async function fragmentServer(){
//#region imports and global scope

const http          = await import('http')
const path          = await import('path')
const nodeprocess   = await import('process')
const fsp           = await import('fs/promises')
const fs            = await import('fs')
const url           = await import('url')
const assert        = await import('assert')
const util          = await import('node:util')
const vm            = await import('vm')

const _G = {
  http        : http,
  path        : path,
  nodeprocess : nodeprocess,
  fsp         : fsp,
  fs          : fs,
  url         : url,
  assert      : assert,
  util        : util
  // more added below
}

let maxUid = 0
function getUid() {
  return maxUid++
}
_G.getUid = getUid

const placeholderTransforms = {
  dirname: (val) => path.dirname(val),
  basename: (val) => path.basename(val),
  capitalize: (val) => `${val[0].toUpperCase()}${val.slice(1)}`
}
_G.placeholderTransforms = placeholderTransforms
const _insertPlaceholderValuesDefaultRegex = /\-\[(.+?)\]\-/g // -[ asdf ]-
const _insertPlaceholderFileDefaultRegex = /\-:\[(.+?)\]:\-/g // -:[ /pagelets/asdf.html ]:-
function insertPlaceholderValues(str, obj, valueRegex = _insertPlaceholderValuesDefaultRegex, fileRegex = _insertPlaceholderFileDefaultRegex) {
  let gValueRegex = new RegExp(valueRegex, 'g')
  let gFileRegex  = new RegExp(fileRegex, 'g')
  if(obj) {
    return str.replaceAll(gValueRegex, (str, cap) => { // Insert given obj[key] values for each -[key]-
      // apply any functions if captured form is like -[value|f1|f2|...]-
      // ie: -[value|f1|f2]- -> f2(f1(value)) where f1, f2 are found using placeholderTransforms["f1"], etc
      let splitCap = cap.split(/\s*\|\s*/g) // "file| dirname" -> ["file", "dirname"] // first array value is value, rest are functions to be applied
      let transformedCap = splitCap.reduce((prev, current) =>
        (prev === undefined) ? (obj[current] ?? (obj.default ?? '')) // only applies on first value
                             : (placeholderTransforms[current]?.(prev) ?? prev) // apply function if it exists
      , undefined)
      return sanitizeHTMLString(transformedCap)
    }).replaceAll(gFileRegex, (str, cap) => { // Insert file filepath contents for each -:[filepath]:-
      let file = addPathDot(path.relative('./', addPathDot(cap)))
      return insertPlaceholderValues(fs.readFileSync(file).toString(), obj, valueRegex, fileRegex)
    })
  } else { // no object given, just interpolate files
    return str.replaceAll(gFileRegex, (str, cap) => { // Insert file filepath contents for each -:[filepath]:-
      let file = addPathDot(path.relative('./', addPathDot(cap)))
      return insertPlaceholderValues(fs.readFileSync(file).toString(), obj, valueRegex, fileRegex)
    })
  }
}
_G.insertPlaceholderValues = insertPlaceholderValues

//#endregion

//#region helper functions

/**
Splits at the first occurrence of the splitter regex
splitAtFirst('aaBccBdd', /B/)
Returns ['aa','ccBdd']
If no split occurred, then returns null
*/
function splitAtFirst(str, splitterArg) {
  let splitter = splitterArg instanceof RegExp ? splitterArg : typeof splitterArg === 'string' ? RegExp(splitterArg) : undefined
  if(splitter === undefined)
    throw Error(`Invalid splitAtFirst splitter argument ${splitterArg}`)
  // else
  let match = splitter.exec(str)
  if(match === null)
    return undefined
  else if(match.length === 1)
    return [str.substring(0, match.index), str.substring(match.index + match[0].length, str.length)]
  else
    return [str.substring(0, match.index), ...match.slice(1), str.substring(match.index + match[0].length, str.length)]
}
_G.splitAtFirst = splitAtFirst

/**
Adds a dot . to the beginning of a path if it needs it
*/
function addPathDot(path) {
  if(path.startsWith('./'))
    return path
  else if(path.startsWith('/'))
    return '.' + path
  else if(path === '.')
    return './'
  else
    return './' + path
}
_G.addPathDot = addPathDot


/**
*/
function sanitizeHTMLString(str) {
  return str.replaceAll(/(?:[\<\>])|(?:(?<!\\)[\"\'\`])/g, (str) => {
    switch(str) {
      case '"': return '\\"'
      case "'": return "\\'"
      case '`': return '\\`'
      case "<": return '&lt;'
      case ">": return '&gt;'
    }
  })
}
_G.sanitizeHTMLString = sanitizeHTMLString

function escapeAllQuotes(str) {
  return str.replaceAll(/(?<!\\)[\"\'\`]/g, (str) => {
    switch(str) {
      case '"': return '\\"'
      case "'": return "\\'"
      case '`': return '\\`'
    }
  })
}
_G.escapeAllQuotes = escapeAllQuotes

/**
Special characters: &;#
\&\;\# -> &;#
*/
function _unescapeSpecialQueryCharacters(str) {
  return str.replaceAll(/\\([\&\;\#])/g, (str, cap) => cap)
}
function getUrlQueryObject(url) {
  let queryPart = decodeURIComponent(url.match(/(?<=\?)(.*?)(?<!\\)(?=(#|$))/)?.[0])
  if(queryPart === undefined)
    return undefined
  // else
  let array = queryPart.split(';').map(x => x.split(/(?<!\\)=/).map(_unescapeSpecialQueryCharacters))
  //  array: "asdf=zxcv; qwer = dfgh; hjkl" -> [["asdf", "zxcv"], [" qwer ", " dfgh"], [" hjkl"]]
  let retObj = {}
  let topIndex = 0
  for(const member of array) // member = [" qwer ", " dfgh"] or [' hjkl']
    if(member.length === 2)
      retObj[member[0].trim()] = member[1] // retObj["qwer"] = "dfgh"
    else if(member[0].length !== 0) // not [''] (final ; makes an empty string)
      retObj[topIndex++] = member[0].trim() // retObj[i] = "hjkl"
  console.debug(retObj)
  return retObj
}
_G.getUrlQueryObject = getUrlQueryObject

//#endregion

//#region serving files

const extContentMap = {
/* extension    Content-Type                         is binary? */
  '.html':  ['text/html; charset=utf-8'              , false],
  '.js':    ['application/javascript; charset=utf-8' , false],
  '.mjs':   ['application/javascript; charset=utf-8' , false],
  '.md':    ['text/markdown; charset=utf-8'          , false],
  '.txt':   ['text/plain; charset=utf-8'             , false],
  '.css':   ['text/css'                              , false],
  '.json':  ['text/json'                             , false],
  '.webm':  ['video/webm'                            , true ],
  '.gif':   ['image/gif'                             , true ],
  '.png':   ['image/png'                             , true ],
  '.ico':   ['image/x-icon'                          , true ],
  '.jpg':   ['image/jpg'                             , true ],
  '.ttf':   ['font/ttf'                              , true ],
  '.woff':  ['font/woff'                             , true ],
  '.woff2': ['font/woff'                             , true ],
  '.svg':   ['image/svg+xml'                         , true ],
  default:  ['text/plain',                           , false]
}
_G.extContentMap = extContentMap

async function getFile(filepath) {
  let basename = path.basename(filepath)
  if(basename[0] === '.')
    return '' // no reading dot files
  return fsp.readFile(path.resolve(filepath))
}
_G.getFile = getFile

/**
contentsManipulation = Function | {...}
If contentsManipulation is an object then its considered an object for placeholder insertion
*/
async function serveFile(filepath, response, contentsManipulation = undefined) {
  try {
    let basename = path.basename(filepath)
    if(basename[0] === '.') {
      response.statusCode = 401
      response.statusMessage = 'Cannot access dot files'
      return true
    }
    // else
    let fileContents = await getFile(filepath)
    let fileStat     = fs.statSync(filepath)
    const ext = path.extname(filepath)
    let type = extContentMap[ext]
    if(type === undefined)
      type = extContentMap.default
    if(!response.headersSent) { // headers not sent
      let etag         = String(fileStat.mtimeMs)
      response.setHeader('Content-Type', type[0])
      response.setHeader('ETag', etag)
    }
    if(type[1]) { // its binary
      response.write(fileContents)
    } else { // its a string
      let toWrite = fileContents.toString()
      if(contentsManipulation instanceof Function)
        toWrite = contentsManipulation?.(toWrite) ?? toWrite
      else if(typeof contentsManipulation === 'object')
        toWrite = insertPlaceholderValues(toWrite, contentsManipulation)
      else
        toWrite = insertPlaceholderValues(toWrite, undefined)
      response.write(toWrite)
    }
    response.statusCode = 200
    return true
  } catch(err) {
    response.statusCode = 500
    response.body = `Error in serveFile ${err.message}`
    console.error('serveFile error', err)
    return false
  }
}
_G.serveFile = serveFile

//#endregion

//#region initialization related

function* walkFiles(startDir) {
  let alreadyTraversed = {}
  if(!(fs.statSync(startDir, {throwIfNoEntry: false})?.isDirectory() ?? false)) // file isn't a directory, or doesn't exist
    return void 0
  // else:
  let dirStack = [path.resolve(startDir)]
  while(dirStack.length > 0) {
    let currentDir = dirStack.pop()
    alreadyTraversed[currentDir] = true
    for(const filename of fs.readdirSync(currentDir)) {
      let filepath = path.join(currentDir, filename)
      let realFilepath
      try {
        realFilepath = fs.realpathSync(filepath)
      } catch(err) {
        console.error(`Problem getting real path, probably an invalid symlink`, filepath)
        continue
      }
      let stat  = fs.statSync(realFilepath, {throwIfNoEntry: false})
      if(stat?.isDirectory() ?? false) {
        if(!(realFilepath in alreadyTraversed))
          dirStack.push(realFilepath)
      } else { // is regular filename
        yield realFilepath
      }
    }
  }
}


//#endregion

//#region script deferrence

const AsyncFunction = (async ()=>{}).constructor

/**
Script storage
*/
const scriptStorage = {} // empty until scripts add stuff to them
_G.scriptStorage = scriptStorage


const scriptCache = {}
let globalCaching = false // ignore what scripts want, and cache all script's exports

async function _runScriptFunction(scriptPath, scriptFunction) {
  const fileStat = await fsp.stat(scriptPath)
  const rootPath  = path.resolve('./') // ie: working directory, should always contain fragment-server.mjs
  const dirPath   = path.resolve(path.dirname(scriptPath)) // the directory containing the script file
  const script    = {exports: {}, cache: 'exports'} // cache = 'exports' | 'nothing' | 'function'
  await scriptFunction(script.exports, script, dirPath, rootPath, _G)
  // scriptFunction potentially modified the script variable (particularly, script.exports), check if it set script.cache:
  if(script.cache === 'exports' || globalCaching) {
    scriptCache[scriptPath] = {type: 'exports', exports: script.exports, function: scriptFunction, fileTime: fileStat.mtimeMs}
  } else if(script.cache === 'nothing') { // script specifically requested no caching
    if(scriptPath in scriptCache)
      delete scriptCache[scriptPath]
  } else if(script.cache === 'function') { // script specifically requested to be re-ran each time runScript is called on it
    scriptCache[scriptPath] = {type: 'function', exports: script.exports, function: scriptFunction, fileTime: fileStat.mtimeMs}
  }
  return script.exports
}

async function runScript(scriptPath) {
  if(scriptPath in scriptCache) {
    let cacheItem = scriptCache[scriptPath]
    let fileStat = await fsp.stat(scriptPath)
    if(fileStat.mtimeMs === cacheItem.fileTime) { // file hasn't changed
      if(cacheItem.type === 'exports')
        return cacheItem.exports
      else if(cacheItem.type === 'function')
        return _runScriptFunction(scriptPath, cacheItem.function)
    }
  } // else, make script from file:
  return fsp.readFile(scriptPath).then(sourceCode => {
    let internalFunctionName = `Script body: ${scriptPath}`
    let wrappedSource = `return {['${internalFunctionName}']: async function(exports, script, dirPath, rootPath, ctx){\n${sourceCode?.toString()}}}`
    const fn = Function(wrappedSource)()[internalFunctionName]
    return _runScriptFunction(scriptPath, fn)
  })
}
_G.runScript = runScript

async function deferToResource(resourcePath, subpath, request, response, getBody, args) {
  if(fs.existsSync(resourcePath))
    return runScript(resourcePath).then(scriptExports => {
      if('respondToRequest' in scriptExports) {
        if(subpath === '') {
          return scriptExports.respondToRequest(request, response, getBody, args)
        } else if(subpath in scriptExports.respondToRequest) {
          return scriptExports.respondToRequest[subpath](request, response, getBody, args)
        } else {
          console.error(`deferToResource no respondToRequest subfunction ${subpath} from path for script ${resourcePath}`)
          return 
        }
      } else {
        console.error(`deferToResource no respondToRequest in script ${resourcePath}`, subpath)
        return false
      }
    }).catch(err => {
      console.error(`deferToResource error during script deferrence to ${resourcePath}`, subpath, err)
      return false
    })
  else
    throw Error(`The script file at ${resourcePath} does not exist`)
}
_G.deferToResource = deferToResource

//#endregion

//#region JFP (javascript file preprocessing)


const jfpCache = {}

function buildJFP(filepath) {
  let jfpSource = fs.readFileSync(filepath).toString('utf-8')
  jfpSource = /*javascript*/ `const html = (stringList, ...valuesList) => {
    let segs = []
    for(let i = 0; i < valuesList.length; i++) {
      response.write(stringList[i])
      response.write(String(valuesList[i]))
    }
    response.write(stringList[stringList.length-1])
  };\n` + jfpSource
  
  // Use the form `\\ ... \\` to escape everything except {{ ... }} in a `` string
  jfpSource = jfpSource.replaceAll(/`\\\\(.+)\\\\`/g, (str, cap) => {
    return ['`', cap.replaceAll(/[`]/g, '\\$&').replaceAll('${', '\\${').replaceAll(/{{([\s\S]*)}}/g, '$${$1}'), '`'].join('')
  })
  
  fs.writeFileSync('last-jfp-source.js', jfpSource)
  const jfpFunction = AsyncFunction('dirPath', 'rootPath', 'ctx', 'request', 'response', 'args', jfpSource)
  let stat = fs.statSync(filepath)
  jfpCache[filepath] = {fn: jfpFunction, time: stat.mtimeMs}
  return jfpFunction
}

async function serveJFP(filepath, request, response, extraArgs) {
  let basename = path.basename(filepath)
  if(basename[0] === '.') {
    response.statusCode = 401
    response.statusMessage = 'Cannot access dot files'
    response.write('<div>Cannot access dot files</div>')
    return true
  }
  // else
  
  // Get the jfp function from the cache, or make it; serve 404.jhp if file doesn't exist
  let jfpFunction
  if(!fs.existsSync(filepath)) { // file doesn't exist
    if(!response.headersSent) response.statusCode = 404
    if(fs.existsSync('./404.jhp') && filepath !== './404.jhp')
      return serveJFP('./404.jhp', request, response, {originalArgs: extraArgs, requestPath: filepath})
  } else if(filepath in jfpCache) { // file is in cache
    let fileStat  = fs.statSync(filepath)
    let cacheItem = jfpCache[filepath]
    if(fileStat.mtimeMs === cacheItem.time) // cache is up to date
      jfpFunction = cacheItem.fn
    else
      jfpFunction = buildJFP(filepath)
  } else { // file exists and but isnt cached
    jfpFunction = buildJFP(filepath)
  }
  
  // Get the 2nd extension from filepath
  let ext2
  if(filepath.endsWith('jhp')) { // synonymous with .html.jfp
    ext2 = '.html'
  } else {
    let ext2Match = filepath.match(/\.([^\.]+)\.jfp/)
    if(ext2Match[1] !== undefined) {
      ext2 = ext2Match[1]
    } else { // error
      let err = Error(`Unknown 2nd file extension in ${ext2Match[0]} while trying to serve jfp ${filepath}`)
      console.error(err, filepath)
      if(fs.existsSync('./error.jhp') && filepath !== './error.jhp')
        return serveJFP('./error.jhp', request, response, {originalArgs: arguments, requestPath: filepath, error: err})
    }
  }
  
  // Get the content type of the file and set header
  let type = extContentMap[ext2]
  if(type === undefined)
    type = extContentMap.default
  
  if(type[1]) { // its binary
    if(!response.headersSent) {
      response.statusCode = 501
      response.statusMessage = `Server currently cannot handle non-plaintext jfps; 2nd ext given: ${ext2}`
    }
    return false
  } else { // its a string
    if(!response.headersSent) {
      response.statusCode = 200
      response.setHeader('Content-Type', type[0])
    }
    
    // Set up and run the jfp script
    const rootPath = path.resolve('./')
    const dirPath  = path.resolve(path.dirname(filepath))
    try {
      await jfpFunction(dirPath, rootPath, _G, request, response, extraArgs)
      return true
    } catch(err) {
      console.error(`Error during jfp script execution:`, err, filepath)
      if(fs.existsSync('./error.jhp') && filepath !== './error.jhp')
        return serveJFP('./error.jhp', request, response, {originalArgs: arguments, requestPath: filepath, error: err})
    }
  }
  
}
_G.serveJFP = serveJFP
_G.serveJHP = serveJFP

//#endregion

//#region configuration

let config = {}
_G.config = config
if(fs.existsSync('./server-config.json')) {
  try {
    config = JSON.parse(fs.readFileSync('./server-config.json').toString())
  } catch(err) {
    console.error(`Error parsing ./server-config.json file: ${err.message}`)
  }
}

//#endregion

//#region server and response

let server
if(config.protocol) {
  if(config.protocol === 'http') {
    server = http.createServer()
  } else {
    const https = await import('https')
    _G.https = https
    let httpsKeyFile = config['https-key'] ?? '.private/key.pem'
    if(!fs.existsSync(httpsKeyFile))
      throw Error(`No https key file at ${httpsKeyFile}. You can give a different file using "https-key" in server-config.json`)
    let httpsCertFile = config['https-cert'] ?? '.private/cert.pem'
    if(!fs.existsSync(httpsCertFile))
      throw Error(`No https cert file at ${httpsCertFile}. You can give a different file using "https-cert" in server-config.json`)
    let options = {
      key: fs.readFileSync(httpsKeyFile),
      cert: fs.readFileSync(httpsCertFile)
    }
    server = https.createServer(options)
  }
} else {
  server = http.createServer()
}
_G.server = server

function _endResponseCheckServed(didRespond, response) {
  if(!didRespond) { // didn't respond
    if(response.statusCode === 200) { // statusCode not set
      response.statusCode = 500 // unknown error
      response.statusMessage = `Didn't respond; no reason given`
    }
  }
  response.end()
}

let nextRequestId = 0
server.on('request', async (request, response) => {
  
  request.uid  = nextRequestId++
  response.uid = request.uid
  const getBody = async () => new Promise((res) => {
    let readBuffers = []
    request.setEncoding('binary')
    request.on('data', chunk => readBuffers.push(Buffer.from(chunk, 'binary')) )
    request.on('end', async () => res(Buffer.concat(readBuffers)) )
    request.on('error', err => console.error("error", err) )
  })
  
  try {
    let urlObj = new URL(request.url, `http://${request.headers.host}`)
    let args = {}
    let searchSplitUrl = splitAtFirst(request.url, /(?<!\\)\?/) ?? []
    let searchParamArrays = searchSplitUrl[1]?.split(/(?<!\\)&/).map(x=> x.split(/(?<!\\)=/).map(decodeURIComponent)) ?? []
    for(const paramKeyValueArray of searchParamArrays)
      args[paramKeyValueArray[0].trim()] = paramKeyValueArray[1]?.trim() ?? true
    args.cookies = {}
    if(request.headers.cookie) {
      request.headers.cookie.split(/\s*;\s*/g).forEach(x=> {
        let splitCookieElement = x.split(/\s*=\s*/g).map(y=> y.trim())
        args.cookies[splitCookieElement[0]] = splitCookieElement[1]
      })
    }
    
    let relativePath = addPathDot(urlObj.pathname)
    let basename = path.basename(relativePath)
    if(basename !== '.' && basename[0] === '.') {
      response.statusCode = 401
      response.statusMessage = 'Cannot access dot files'
      response.end()
      return void 0
    }
    // else
    
    // defer to fragment by split:
    let splitPath = splitAtFirst(relativePath,/(?<=\.s\.js)(?:\/|$)/g) // "abc/def.s.js/ghi" -> ["abc/def.s.js", "ghi"]
    if(splitPath !== undefined)
      return void _endResponseCheckServed(await deferToResource(splitPath[0], splitPath[1], request, response, getBody, args), response)
    // else, check if its a jfp
    
    if(relativePath.endsWith('.jfp') || relativePath.endsWith('.jhp'))
      return void _endResponseCheckServed(await serveJFP(relativePath, request, response, args), response)
    // else, defer to default fragment:
    
    args.requestPath = relativePath
    return void _endResponseCheckServed(await deferToResource('./default-responder.s.js', '', request, response, getBody, args), response)
  } catch(err) {
    console.error(`Error responding to request`, err)
    return void _endResponseCheckServed(false, response)
  }
})

server.listen(config.port ?? 5500)

server.on('listening', () => {
  console.log('Fragment server started on port', config.port ?? 5500)
})

//#endregion

// Run all subdirectory initialize.s.js script files
for(const file of walkFiles(path.resolve('./'))) {
  if(file.endsWith('initialize.s.js')) {
    runScript(file).then(scriptExports => {
      scriptExports.initialize?.()
    })
  }
}

// nodeprocess.on('SIGUSR2', () => {
//   console.log("Shutting down")
//   this.server.close()
//   nodeprocess.exit(1)
// })

}
fragmentServer()