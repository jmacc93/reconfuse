
let mathjsLoaded = false
async function initMathjs() {
  if(mathjsLoaded)
    return true
  // else
  return new Promise(res => {
    let scriptElem = document.createElement('script')
    scriptElem.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.4.0/math.js')
    scriptElem.addEventListener('load', () => {
      res(true)
    })
    document.head.appendChild(scriptElem)
  })
}

export async function installAutoCalcFunctionality(callElem) {
  const pagelet = callElem.closest('.pagelet')
  const input  = pagelet.querySelector('.input')
  const output = pagelet.querySelector('.output')
  await initMathjs()
  const preciseMath = math.create({
    number: "BigNumber"
  })
  const render = () => {
    try {
      output.textContent = preciseMath.evaluate(input.textContent)?.toString()
        .replaceAll(/([0-9])\1{3,}/g, (_str, cap)=>cap[0].repeat(3)) // 0.33333333333333    -> 0.333
        .replaceAll(/(\.[0-9]{4})[0-9]+/g, (_str, cap)=>cap) ?? ''   // 0.12345678912345... -> 0.1234
      output.classList.remove('error')
    } catch(err) {
      output.textContent = `Error: ${err.message}`
      output.classList.add('error')
    }
    if(input.textContent === '')
      input.textContent = ' '
  }
  render()
  input.addEventListener('input', render)
}