type APIResponse = {
  src: string
  blurHash: string
  alt: string
  remaining: string
}

const onInputChange = () => {
  const input = document.getElementById("query-input") as HTMLInputElement
  const value = input.value
  const tap = (x:any) => { console.log(x); return x}

  fetch(`.netlify/functions/image?query=${value}&type=regular`)
  .then(tap)
  .then((response:Response) => response.json())
  .then(tap)
  .then((data:APIResponse) => {
    const img = document.getElementById("image") as HTMLImageElement
    img.src = `${data.src}`
    img.alt = data.alt

    const code = document.getElementById("code") as HTMLDivElement
    code.innerHTML = JSON.stringify(data, null, 2)

    const remainingDisplay = document.getElementById("remaining") as HTMLSpanElement
    remainingDisplay.innerHTML = data.remaining

  })


 // Let's turn on the rate-limit notice
 document.querySelector(".rate-limit")?.classList.add("is-on")



}


document.getElementById("search-button")?.addEventListener("click", onInputChange)