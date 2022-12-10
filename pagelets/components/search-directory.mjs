
async function makeResultLine(file) {
  const lib = await import('/lib/lib.mjs')
  let ret = document.createElement('template')
  let sanitizedFile = lib.sanitizeHTMLString(file)
  ret.innerHTML = /*html*/`
    <div class="file-search-result">
      <a href="/pagelets/represent-file.jhp?file=${sanitizedFile}">${file}</a>
      <button is="call-resource-button" srcfn="/lib/elem-functions.mjs: copyToClipboard" data-payload="${file}" class="linklike">Copy</button>
    </div>
  `
  return ret.content
}

export async function searchAndPopulate(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const dirInput = pagelet.querySelector(':scope > div > input')
  const subdirsInput = pagelet.querySelector(':scope > div > input.subdirs')
  const queryInput = pagelet.querySelector(':scope > div > input.query')
  const resultListElem = pagelet.querySelector(':scope > div.results')
  
  resultListElem.innerHTML = ''
  const response = await fetch(`/bin/file.s.js/search?directory=${dirInput.value}${subdirsInput.checked ? `&subDirs` : ''}&query=${queryInput.value}`)
  if(response.ok) {
    let resultLines = (await response.text()).split(/\s+/g)
    if(resultLines.length <= 1)
      resultListElem.innerHTML = '<span>Nothing found</span>'
    for(let file of resultLines) {
      if(file === '')
        continue
      // else
      if(!file.startsWith('/'))
        file = '/' + file
      resultListElem.append(await makeResultLine(file))
    }
  } else {
    lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  }
}