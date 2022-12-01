
const thisPath = ctx.path.join(dirPath, './initialize.s.js')
ctx.scriptStorage[thisPath] ??= {}
const data = ctx.scriptStorage[thisPath] // data persists over script recompiles

data.iterators ??= {}

if(data.timeoutId) { // previously compiled, clear that interval
  clearTimeout(data.timeoutId)
  delete data.timeoutId
}

async function stepFunction() {
  for(const filename of ctx.fs.readdirSync('./bots')) if(filename.endsWith('.s.js') && filename !== 'initialize.s.js') {
    let fullPath = ctx.path.join(dirPath, filename)
    ctx.scriptStorage[fullPath] ??= {}
    const botData = ctx.scriptStorage[fullPath]
    
    let botExports = await ctx.runScript(fullPath)
    try {
      botExports.step?.(botData)
    } catch(err) {
      console.error('Error during bot step', err)
    }
  }
  data.timeoutId = setTimeout(stepFunction, 200)
}
stepFunction()