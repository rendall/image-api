type APIResponse = {
  src: string
  blurHash: string
  alt: string
}

const onInputChange = () => {
  const input = document.getElementById("query-input") as HTMLInputElement
  const value = input.value
  const tap = (x:any) => { console.log(x); return x}

  fetch(`.netlify/functions/image?query=${value}`)
  .then(tap)
  .then((response:Response) => response.json())
  .then(tap)
  .then((data:APIResponse) => {
    const img = document.getElementById("image") as HTMLImageElement
    img.src = `${data.src}&w=500&h=500`
    img.alt = data.alt

    const code = document.getElementById("code") as HTMLDivElement
    code.innerHTML = JSON.stringify(data, null, 2)

  })






}


document.getElementById("search-button")?.addEventListener("click", onInputChange)