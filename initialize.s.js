
if(ctx.scriptStorage['./']) // don't run multiple times
  return void 0
// else

// extContentMap extension specific to reconfuse
ctx.extContentMap['.shtml'] = ['text/shtml; charset=utf-8' , false]
ctx.extContentMap['.escm']  = ['text/escm; charset=utf-8'  , false]

let rootObj = {}
ctx.scriptStorage['./'] = rootObj

ctx.sha256 = await import(ctx.path.resolve('./lib/sha256.mjs')).then(mod=>mod.exp)

let anonIpId  = ctx.fs.existsSync('./state/anonipid.txt') ? parseInt(ctx.fs.readFileSync('./state/anonipid.txt')) : 0
let anonIpMap = {}

rootObj.registerAnonIp = function(ipArg) { // (ipArg: http.IncomingMessage | ip string) => unique integer
  let ip = (ipArg instanceof ctx.http.IncomingMessage) ? ipArg.connection.remoteAddress : ipArg // either message or ip string
  if(ip in anonIpMap) {
    return anonIpMap[ip]
  } else {
    let id = anonIpId++
    ctx.fsp.appendFile('./logs/.anonips.txt', `${ip} ${id}\n`)
    ctx.fsp.writeFile('./state/anonipid.txt', String(id))
    anonIpMap[ip] = id
    return id
  }
}

rootObj.nextAnonIpId = function() {
  return anonIpId
}

// Make some directories

if(!ctx.fs.existsSync('./logs'))
  ctx.fs.mkdirSync('./logs')

if(!ctx.fs.existsSync('./state/'))
  ctx.fs.mkdirSync('./state')
