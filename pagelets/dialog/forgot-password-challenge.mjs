
export async function getChallenge(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const usernameInput = pagelet.querySelector('input.username')
  const challengeReceivedDiv = pagelet.querySelector('div.challenge-received')
  const challengeElem = challengeReceivedDiv.querySelector('span.challenge')
  
  const response = await fetch(`/bin/user.s.js/getPasswordChallenge?username=${usernameInput.value}`)
  if(response.ok) {
    challengeReceivedDiv.hidden = false
    challengeElem.textContent = await response.text()
    lib.attentionFlashElement(challengeReceivedDiv)
  } else {
    lib.notificationFrom(callElem, `Error: ${response.status}, ${response.statusText}`, {error: true})
  }
}

export async function checkResponse(callElem) {
  const lib = await import('/lib/lib.mjs')
  const sha256 = await import('/lib/sha256.mjs').then(x => x.exp)
  const pagelet = callElem.closest('.pagelet')
  const responseInput = pagelet.querySelector('input.response')
  const usernameInput = pagelet.querySelector('input.username')
  const challengeReceivedDiv = pagelet.querySelector('div.challenge-received')
  const petDisplay = challengeReceivedDiv.querySelector('div.pet-display')
  const statusElem = challengeReceivedDiv.querySelector('div.status')
  
  const username = usernameInput.value
  const response = responseInput.value
  
  statusElem.textContent = 'Please wait 10 seconds'
  const serverResponse = await fetch([
    `/bin/user.s.js/validateChallengeResponse`,
    `?username=`, username,
    `&response=`, sha256(response)
  ].join(''))
  statusElem.textContent = ''
  
  if(serverResponse.ok) {
    petDisplay.hidden = false
    const petInput = petDisplay.querySelector('input')
    petInput.value = await serverResponse.text()
    lib.attentionFlashElement(petDisplay); lib.attentionFlashElement(petInput)
    lib.notificationFrom(callElem, `Success!`)
  } else {
    lib.notificationFrom(callElem, `Error: ${serverResponse.status}, ${serverResponse.statusText}`, {error: true})
  }
}

export async function copyPet(callElem) {
  const lib = await import('/lib/lib.mjs')
  const pagelet = callElem.closest('.pagelet')
  const petInput = pagelet.querySelector('.pet-display input')
  navigator.clipboard.writeText(petInput.value)
  lib.attentionFlashElement(petInput); lib.attentionFlashElement(callElem)
}

