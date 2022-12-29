export async function populatePageNameInputWithDatalist(dropdownCallElem) {
  const lib = await import('/lib/lib.mjs')
  const dropdown = dropdownCallElem.closest('.dropdown')
  const input    = dropdown.querySelector('input')
  
  
  const storedPageNames = []
  for(let i = 0; i < localStorage.length; i++) {
    if(localStorage.key(i).startsWith('savedpage-'))
      storedPageNames.push(localStorage.key(i).slice(10))
  }
  
  const datalist = document.createElement('datalist')
  dropdown.appendChild(datalist)
  
  const listId = lib.randomTokenString(16)
  input.setAttribute('list', listId)
  datalist.id = listId
  
  for(const storedName of storedPageNames) {
    const option = document.createElement('option')
    option.value = storedName
    datalist.appendChild(option)
  }
  
  // input.addEventListener('input', inputEvent => {
  //   const optionMatch = datalist.querySelector(`option[value^="${input.value}"]`)
  //   if(optionMatch)
  //     // ...
  // })
  // add change event listener to switch load button styling on / off based on whether typed value is in datalist
}

export async function savePageToName(dropdownCallElem) {

  const lib = await import('/lib/lib.mjs')
  const dropdown   = dropdownCallElem.closest('.dropdown')
  const inputField = dropdown.querySelector('input')
  const datalist   = dropdown.querySelector('datalist')
  
  if(inputField.value === '')
    lib.notificationFrom(dropdownCallElem, 'No name given to save page as')
  // else
  
  dropdown.closest('.dropdown-root').remove()
  
  const pageHTML = document.children[0].outerHTML
  localStorage.setItem(`savedpage-${inputField.value}`, pageHTML)
  
  const option = document.createElement('option')
  option.value = inputField.value
  datalist.appendChild(option)
}

export async function loadPageFromName(dropdownCallElem) {

  const lib = await import('/lib/lib.mjs')
  const dropdown   = dropdownCallElem.closest('.dropdown')
  const inputField = dropdown.querySelector('input')
  
  if(inputField.value === '')
    lib.notificationFrom(dropdownCallElem, 'No name given to load page from')
  // else
  
  window.open(`/pagelets/open-saved-page.html?name=${inputField.value}`, '_blank')
}

export async function replaceThisPageWithSaved(storedPageName) {
  const lib = await import('/lib/lib.mjs')
  
  const pageHtml = localStorage.getItem(`savedpage-${storedPageName}`)
  
  const pageTemplate = document.createElement('template')
  pageTemplate.innerHTML = pageHtml
  const bodyNodes = pageTemplate.content.querySelectorAll(':scope > *:not(link, script)')
  
  document.querySelector('script#page-opener-script').remove()
  
  while(pageTemplate.content.firstChild) {
    const node = pageTemplate.content.firstChild
    if(node?.matches?.('*:is(link, script)'))
      document.head.appendChild(node)
    else
      document.body.appendChild(node)
  }
  lib.replicateAndReplaceScripts(document.head)
  lib.replicateAndReplaceScripts(document.body)
  
  for(const node of bodyNodes)
    document.body.appendChild(node)
}