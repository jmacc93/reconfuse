// Old File Reaper
// Deletes files depending on certain conditions

console.log('ofr started')

const fs = ctx.fs
const path = ctx.path

function* iterateAllOfrControlObjs(startDir) {
  if(!startDir.startsWith('.'))
    return void console.warn('ofr-control.json search start directory didnt start with a dot . (ie: its not relative current working directory)')
  // else
  let currentDir = startDir
  while(true) {
    let ofrControlJsonFile = ctx.path.join(currentDir, './ofr-control.json')
    if(ctx.fs.existsSync(ofrControlJsonFile)) {
      try {
        let fileContent = ctx.fs.readFileSync(ofrControlJsonFile).toString()
        yield JSON.parse(fileContent)
      } catch(err) {}
    }
    if(currentDir === '.')
      break
    else
      currentDir = ctx.path.dirname(currentDir)
  }
}

function getFirstOfrControlObj(startDir) {
  let controlIterator = iterateAllOfrControlObjs(startDir)
  return controlIterator.next().value
}
exports.getFirstOfrControlObj = getFirstOfrControlObj

function dirActivationStatus(startDir) {
  let firstOfrControlObj = getFirstOfrControlObj(startDir)
  return (firstOfrControlObj?.status ?? 'off') === 'on' // default to off
}
exports.dirActivationStatus = dirActivationStatus

function timeStringToMs(timeStr) { // timeStr = "2 weeks"
  let splitTimeStr = timeStr.split(/\s+/g) // ["2", "weeks"]
  let magnitude = parseInt(splitTimeStr[0]) // 2
  switch(splitTimeStr[1] ?? 'ms') { // "weeks"
    // if timeStr = "2", splitTimeStr == ["2"], splitTimeStr[1] ?? 'ms' == 'ms'
    case 'milliseconds': case 'ms': case 'msec':
      return magnitude
    case 'seconds': case 'second': case 'sec': case 'secs': case 's':
      return magnitude * 1000
    case 'minutes': case 'minute': case 'mins': case 'min': case 'm':
      return magnitude * 1000 * 60
    case 'hours': case 'hour': case 'hrs': case 'hr':
      return magnitude * 1000 * 60 * 60
    case 'days': case 'day': case 'd':
      return magnitude * 1000 * 60 * 60 * 24
    case 'weeks': case 'week': case 'wk': case 'wks':
      return magnitude * 1000 * 60 * 60 * 24 * 7
    case 'months': case 'month': case 'mo':
      return magnitude * 1000 * 60 * 60 * 24 * (365.25 / 12)
    case 'years': case 'year': case 'yr': case 'yrs':
      return magnitude * 1000 * 60 * 60 * 24 * 365.25
    default:
      return magnitude
  }
}
exports.timeStringToMs = timeStringToMs

const defaultMaxAge = timeStringToMs('2 weeks')

function getDirMaxAge(dir) {
  for(const controlObj of iterateAllOfrControlObjs(dir)) {
    if('maxAge' in controlObj)
      return timeStringToMs(controlObj.maxAge)
  }
  return defaultMaxAge
}

function isRemoveableName(filename) {
  if(filename.startsWith('.') || filename.indexOf('.autogen') !== -1)
    return false
  // else
  switch(filename) {
    case 'control.json':
    case 'ofr-control.json':
      return false
    default:
      return true
  }
}

function step(data) {
  if(!data.initialized || data.done) { // first run or restarting
    // console.log('ofr initialization step')
    data.initialized = true
    data.done = false
    data.alreadyTraversed = new Set()
    data.dirStack = ['./']
    data.fileList = []
    return void 0
  } else if(data.fileList.length === 0) { // pump fileList up for next step
    data.currentDir = data.dirStack.pop()
    if(data.currentDir.startsWith('./..')) // don't collect dirs outside cwd symlinked in
      return void 0
    // else
    data.activated = dirActivationStatus(data.currentDir)
    data.maxAge    = getDirMaxAge(data.currentDir)
    data.alreadyTraversed.add(data.currentDir)
    data.fileList = fs.readdirSync(data.currentDir)
    return void 0
  } else { // handle some files in fileList, rest on subsequent steps
    let step = 0
    while(step++ < 1000 && data.fileList.length > 0) {
      // 10 files each 200 ms = 20 ms / file
      let filename = data.fileList.pop()
      let filepath = path.join(data.currentDir, filename)
      let realFilepath
      try { // follow symlinks so we don't use the wrong .ofr-on files for linked directories 
        realFilepath = ctx.addPathDot(path.relative('./', fs.realpathSync(filepath)))
      } catch(err) { continue } // silently ignore bad symlinks
      let stat
      try {
        stat = fs.statSync(realFilepath, {throwIfNoEntry: false})
      } catch(err) { continue } // file probably already deleted
      if(data.activated && isRemoveableName(filename)) { // is regular filename and ofr can remove files
        if(Date.now() > stat.birthtimeMs + data.maxAge) {
          if(stat.isDirectory) {
            console.log('ofr removing directory', filepath)
            ctx.fsp.appendFile('./logs/ofr.autogen.txt', `${new Date().toUTCString()} ofr removed directory ${filepath}\n`)
            ctx.fsp.rm(filepath, {recursive: true}) // note: we explicitly use the maybe-linked file path here
          } else {
            console.log('ofr removing file', filepath)
            ctx.fsp.appendFile('./logs/ofr.autogen.txt', `${new Date().toUTCString()} ofr removed file ${filepath}\n`)
            ctx.fsp.rm(filepath) // note: we explicitly use the maybe-linked file path here
          }
        }
      }
      if(stat.isDirectory() && !data.alreadyTraversed.has(realFilepath)) { // is living non-traversed directory
        data.dirStack.push(realFilepath)
      }
    }
    if(data.fileList.length === 0 && data.dirStack.length === 0)
      data.done = true
    return void 0
  }
}
exports.step = step


