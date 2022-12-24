
if(ctx.scriptStorage['./']) // don't run multiple times
  return void 0
// else

// extContentMap extension specific to reconfuse
ctx.extContentMap['.shtml'] = ['text/shtml; charset=utf-8' , false]
ctx.extContentMap['.escm']  = ['text/escm; charset=utf-8'  , false]

let rootObj = {}
ctx.scriptStorage['./'] = rootObj

ctx.sha256 = await import(ctx.path.resolve('./lib/sha256.mjs')).then(mod=>mod.exp)

if(!ctx.fs.existsSync('./logs'))
  ctx.fs.mkdirSync('./logs')

let anonIpId = 0
let anonIpMap = {}
let bannedIps
if(ctx.fs.existsSync('./state/')) {
  anonIpId = ctx.fs.existsSync('./state/.anonipid.txt') ? parseInt(ctx.fs.readFileSync('./state/.anonipid.txt')) : 0
  bannedIps = new Set((ctx.fs.existsSync('./state/.banned-ips.txt') ? ctx.fs.readFileSync('./state/.banned-ips.txt') : '').split(/\n+/g).map(x=>x.trim()))
} else {
  ctx.fs.mkdirSync('./state')
  bannedIps = new Set()
}

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

rootObj.isIpBanned = function(ipArg) {
  const ip = (ipArg instanceof ctx.http.IncomingMessage) ? ipArg.connection.remoteAddress : ipArg // either message or ip string
  return bannedIps.has(ip)
}

rootObj.banUsernameIp = async function(username) {
  if(!/\/\./.test(username))
    return void 0
  // else
  const userIpFile = `./users/${username}/.last-ip.txt`
  lastIp = await ctx.fsp.readFile(userIpFile)
  rootObj.banIp(lastIp)
}

rootObj.banIp = async function(ipArg) {
  const ip = (ipArg instanceof ctx.http.IncomingMessage) ? ipArg.connection.remoteAddress : ipArg // either message or ip string
  bannedIps.add(ip)
  ctx.fsp.writeFile('./state/.banned-ips.txt', ip + '\n')
}

let rewriteBannedListIntervalId = -1
rootObj.unbanIp = async function(ipArg) {
  const ip = (ipArg instanceof ctx.http.IncomingMessage) ? ipArg.connection.remoteAddress : ipArg // either message or ip string
  bannedIps.remove(ip)
  // After awhile, if not interupted by unbanIp again, write all the ips into filesystem again
  if(rewriteBannedListIntervalId !== -1)
    clearInterval(rewriteBannedListIntervalId)
  rewriteBannedListIntervalId = setInterval(() => {
    ctx.fs.writeFileSync('./state/.banned-ips.txt', '')
    let fileId = ctx.fsp.open('./state/.banned-ips.txt', 'a')
    for(const bannedIp of bannedIps) {
      ctx.fs.write(fileId, String(bannedIp))
      ctx.fs.write(fileId, '\n')
    }
  }, 1000*60*15) // wait 15 minutes
}

// ------------------

const consoleInputFile  = './groups/mods/console/input.txt'
const consoleOutputFile = './groups/mods/console/output.txt'
const consoleLogFile = './groups/mods/console/log.autogen.txt'

const consoleDir = ctx.path.dirname(consoleInputFile)

if(!ctx.fs.existsSync(consoleDir))
  ctx.fs.mkdirSync(consoleDir, {recursive: true}) 

const initialConsoleControlFileContent = /*json*/ `[{
  "file": {"this": {"*all": "black"}},
  "dir": {"this": {"*all": "black"}}
}, {
  "updateFile(input.txt)": {"this": {"*mods": "white", "*supermods": "white"}}
}]`

ctx.fsp.writeFile(consoleOutputFile, '')
ctx.fsp.writeFile(consoleInputFile, '')
ctx.fsp.writeFile('./groups/mods/console/control.json', initialConsoleControlFileContent)
if(!ctx.fs.existsSync(consoleLogFile))
  ctx.fsp.writeFile(consoleLogFile, '')

ctx.fs.watchFile(consoleInputFile, async () => {
  const contents = await ctx.fsp.readFile(consoleInputFile)
  if(contents.length === 0)
    return void 0
  // else
  const lines = contents.split(/\n+/g)
  const resultSegs = []
  for(const line of lines) {
    const words = line.split(/\s+/g)
    switch(words[0]) {
      case 'ban':
        resultSegs.push('`ban` not implemented yet')
        break
      default:
        resultSegs.push(`unknown word ${words[0]}`)
        break
    }
  }
  const resultString = resultSegs.join('\n')
  ctx.fsp.appendFile(consoleLogFile, `---\n\n${Date.now()}\nInput:\n${contents}\nOutput:\n${resultString}`)
  ctx.fsp.writeFile(consoleOutputFile, resultString)
  ctx.fsp.writeFile(consoleInputFile, '')
})
