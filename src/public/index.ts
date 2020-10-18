import { decode } from "./blurhash.js";

type APIResponse = {
  alt: string
  blur_hash: string
  blur_hash_width: number
  blur_hash_height: number
  remaining: string
  credit: {
    name: string
    portfolio_url: string
  },
  src: string
  width?: number
  height?: number
}

const onInputChange = () => {
  const input = document.getElementById("query-input") as HTMLInputElement
  const value = input.value
  const tap = (x: any) => { console.log(x); return x }

  const img = document.getElementById("image") as HTMLImageElement
  img.src = ""
  img.setAttribute("style", `background-image: url();`)

  const renderBlurHash = (hash: string, width: number, height: number) => {

    const scale = 4

    // const bw = 100
    // const bh = Math.floor(bw * (height / width))
    const bw = Math.floor(width / scale)
    const bh = Math.floor(height / scale)
    const pixels = decode(hash, bw, bh);

    const canvas = document.createElement("canvas")//document.querySelector(".output-canvas") as HTMLCanvasElement
    canvas.width = bw
    canvas.height = bh

    const ctx = canvas.getContext("2d");
    const imageData = ctx!.createImageData(bw, bh);

    imageData.data.set(pixels);
    ctx!.putImageData(imageData, 0, 0);

    return canvas.toDataURL()
  }

  fetch(`.netlify/functions/image?query=${value}&size=regular&fields=width,height`)
    .then(tap)
    .then((response: Response) => response.json())
    .then(tap)
    .then((data: APIResponse) => {
      const dataURL = renderBlurHash(data.blur_hash, data.blur_hash_width, data.blur_hash_height)

      const img = document.getElementById("image") as HTMLImageElement
      // img.src = `${data.src}`
      img.alt = data.alt
      // img.width = data.blur_hash_width
      // img.height = data.blur_hash_height
      img.setAttribute("style", `background-image: url(${dataURL});`)
      img.src = data.src
      img.width = data.blur_hash_width
      img.height = data.blur_hash_height

      const code = document.getElementById("code") as HTMLDivElement
      code.innerHTML = JSON.stringify(data, null, 2)

      const remainingDisplay = document.getElementById("remaining") as HTMLSpanElement
      remainingDisplay.innerHTML = data.remaining
      document.querySelector(".rate-limit")?.classList.add("is-on")

      const creditLink = document.getElementById("credit-link") as HTMLAnchorElement
      creditLink.innerText = data.credit.name
      creditLink.href = data.credit.portfolio_url

      const creditLinkContainer = document.querySelector(".credit-link-container")
      creditLinkContainer!.classList.add("is-on")


    })
}

document.getElementById("search-button")?.addEventListener("click", onInputChange)