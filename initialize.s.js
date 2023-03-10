
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
let anonIpReverseMap = {}
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
    anonIpReverseMap[id] = ip
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
    return false
  // else
  const userIpFile = `./users/${username}/.last-ip.txt`
  try {
    lastIp = await ctx.fsp.readFile(userIpFile)
    return rootObj.banIp(lastIp)
  } catch(err) {
    return false
  }
}

rootObj.banIp = async function(ipArg) {
  const ip = (ipArg instanceof ctx.http.IncomingMessage) ? ipArg.connection.remoteAddress : ipArg // either message or ip string
  if(!ip || (typeof ip !== 'string'))
    return false
  // else
  bannedIps.add(ip)
  ctx.fsp.writeFile('./state/.banned-ips.txt', ip + '\n')
  return true
}

let rewriteBannedListIntervalId = -1
rootObj.unbanIp = async function(ipArg) {
  const ip = (ipArg instanceof ctx.http.IncomingMessage) ? ipArg.connection.remoteAddress : ipArg // either message or ip string
  if(typeof ip !== 'string')
    return false
  // else
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
  return true
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
  const contents = (await ctx.fsp.readFile(consoleInputFile)).toString()
  if(contents.length === 0)
    return void 0
  // else
  const lines = contents.split(/\n+/g)
  const resultSegs = []
  try {
    for(const line of lines) {
      if(line.trim().length === 0)
        continue
      // else
      const words = line.split(/\s+/g)
      switch(words[0]) {
        case 'ban-user': {
          const result = rootObj.banUsernameIp(words[1])
          resultSegs.push(`(${line})\nBan on user ${words[1]} ${result ? 'was successful' : 'failed'}`)
          break
        }
        case 'ban-anon': {
          const anonIp = anonIpReverseMap[parseInt(words[1])]
          if(anonIp) {
            let result = rootObj.banIp(anonIp)
            resultSegs.push(`(${line})\nBan on anonymous user with id ${words[1]} ${result ? 'was successful' : 'failed'}`)
          } else {
            resultSegs.push(`(${line})\nNo such anonymous user with id ${anonIp}`)
          }
          break
        }
        case 'unban-ip':
          rootObj.unbanIp(words[1])
          resultSegs.push(`(${line})\nIp ${words[1]} unbanned`)
          break
        case 'echo':
          resultSegs.push(words.slice(1).join(' '))
          break
        default:
          resultSegs.push(`(${line})\nunknown word ${words[0]}`)
          break
      }
    }
  } catch(genericError) {
    resultSegs.push(`\nError: ${genericError.message}`)
  }
  const resultString = resultSegs.join('\n')
  ctx.fsp.appendFile(consoleLogFile, `---\n\n${Date.now()}\nInput:\n${contents}\nOutput:\n${resultString}`)
  ctx.fsp.writeFile(consoleOutputFile, resultString)
  ctx.fsp.writeFile(consoleInputFile, '')
})
