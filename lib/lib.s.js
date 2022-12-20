

/**
The usual check for if a requested file has changed given an etag in the request
Returns true if response should be ended (the file hasn't changed and it handled setting the headers),
        false if you should continue with the response
*/
function handleEtagHeaders(request, response, absoluteRequestPath) {
  let headers = request.headers
  let reqEtag = headers['if-none-match']
  if(reqEtag !== undefined) {
    let fileEtag
    if(ctx.fs.existsSync(absoluteRequestPath)) {
      let stat = ctx.fs.statSync(absoluteRequestPath)
      fileEtag = String(stat.mtimeMs) // file's etag is its modification time in milliseconds (mtimeMs)
    } else { // file doesn't exist
      fileEtag = 'non-existent'
    }
    if(fileEtag === reqEtag) { // file hasn't been modified / created
      response.statusCode = 304 // client's cache will serve the previously-served representation
      response.setHeader('ETag', fileEtag)
      return true
    }
  }
  return false
}
exports.handleEtagHeaders = handleEtagHeaders

async function asyncSleepFor(msecs = 0) {
  return new Promise(res => {
    setTimeout(() => res(), msecs)
  })
}
exports.asyncSleepFor = asyncSleepFor

function randomIntegerOn(start, end) {
  if(end < start)
    return randomIntegerOn(start, end)
  else if(end === start)
    return start
  else
    return Math.floor(Math.random()*(end+1-start)) + start
}
exports.randomIntegerOn = randomIntegerOn

function singleRandomChoice(choices) {
  return choices[randomIntegerOn(0, choices.length - 1)]
}
function randomChoice(choices, n) {
  if(n === undefined) { // no count n given
    return singleRandomChoice(choices)
  } else { // count n is given
    let ret = []
    for(let i = 0; i < n; i++)
      ret.push(singleRandomChoice(choices))
    return ret
  }
}
exports.randomChoice = randomChoice

const randomTokenStringChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
function randomTokenString(n) {
  return randomChoice(randomTokenStringChars, n).join('')
}
exports.randomTokenString = randomTokenString

const randomAuthTokenStringChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&\'()*+-./:<=>?@[]^_`{|}~'.split('')
function randomAuthTokenString(n) {
  return randomChoice(randomAuthTokenStringChars, n).join('')
}
exports.randomAuthTokenString = randomAuthTokenString

const randomFilenameStringChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-'.split('')
const randomFilenameStringCharsLen    = randomFilenameStringChars.length
const randomFilenameStringCharsLogLen = Math.log10(randomFilenameStringCharsLen)
function randomFilenameString(log10PossibleCombosCount) {
  let baseNlen = Math.ceil(log10PossibleCombosCount / randomFilenameStringCharsLogLen)
  randomChoice(randomFilenameStringChars, baseNlen)
}
exports.randomFilenameString = randomFilenameString

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#examples
// Via answer from https://stackoverflow.com/questions/11616630/how-can-i-print-a-circular-structure-in-a-json-like-format
const _getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};
function safelyStringifyJSON(obj) {
  return JSON.stringify(obj, _getCircularReplacer());
}
exports.safelyStringifyJSON = safelyStringifyJSON

function objToHtmlString(obj, seenArg) {
  let seen = seenArg ?? new WeakSet()
  let segs = []
  if(typeof obj === 'object') {
    if(obj !== null && obj !== undefined)
      seen.add(obj)
    segs.push('<details style="margin-left:1em"><summary>[Object]</summary>')
    for(const key in obj) {
      let value = obj[key]
      if(typeof value === 'object' && seen.has(value))
        continue
      // else
      segs.push(objToHtmlString(key, seen), ': ', objToHtmlString(obj[key], seen), '<br>')
    }
    segs.push('</details>')
  } else {
    segs.push(String(obj).replaceAll('<','&lt;').replaceAll('>','&gt;'))
  }
  return segs.join('')
}
exports.objToHtmlString = objToHtmlString

async function respondToRequest(request, response, getBody, args) {
  response.statusCode = 400
  response.statusMessage = 'No requests to this file, please'
  return true
}
exports.respondToRequest = respondToRequest


// This is a limited-size cache
class Cache {
  constructor(generator, etagger, opts) {
    this.map         = new Map()
    this.generator   = generator // (key: string) => Anything
    this.etagger     = etagger   // (key: string) => string
    this.optimalSize = opts?.optimalSize ?? 128 // -1 == infinite
    this.delStep     = 0 
    this.maxDelStep  = opts?.maxDelStep ?? 128
  }
  invalidate(keyString) {
    delete this.map.delete(keyString)
  }
  get(keyString) {
    if(this.optimalSize !== -1 && this.map.size > this.optimalSize && this.delStep > this.maxDelStep) {
      // Reduce scores and remove low scoring items until map is optimal size
      for(const [key, value] of this.map) {
        value.score = Math.max(0, value.score - this.maxDelStep)
        if(this.map.size > this.optimalSize && value.score <= 0)
          this.map.delete(key)
      }
      this.delStep = 0
    }
    this.delStep++
    // now, try getting current data
    let data = this.map.get(keyString)
    let newEtag = this.etagger(keyString)
    if((data?.etag ?? '') === newEtag) {
      data.score++
      return data.value
    }
    // else, make and add the new data
    let newValue = this.generator(keyString)
    let newData  = {value: newValue, etag: newEtag, score: 1} // note: score represents a soft ordering which elements should be deleted first
    this.map.set(keyString, newData)
    return newValue
  }
  has(keyString) { // returns etag
    let data = this.map.get(keyString)
    let newEtag = this.etagger(keyString)
    if((data?.etag ?? '') === newEtag)
      return data?.etag
  }
}

exports.Cache = Cache