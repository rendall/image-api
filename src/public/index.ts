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
  links?: {
    self: string
    html: string
    download: string
    download_location: string
  }
}

/** takes a blurhash and full dimensions of a picture, returns a dataURL */
const blurhashToDataURL = (blurhash: string, width: number, height: number) => {

  const scale = 4
  const bw = Math.floor(width / scale)
  const bh = Math.floor(height / scale)
  const pixels = decode(blurhash, bw, bh);

  const canvas = document.createElement("canvas")
  canvas.width = bw
  canvas.height = bh

  const ctx = canvas.getContext("2d");
  const imageData = ctx!.createImageData(bw, bh);

  imageData.data.set(pixels);
  ctx!.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL()

  return dataUrl
}

const uiReset = () => {
  const img = document.getElementById("image") as HTMLImageElement
  if (img) img.remove()
  const code = document.getElementById("code") as HTMLDivElement
  code.innerHTML = ""
  document.querySelector(".rate-limit")?.classList.remove("is-on")
  const creditLinkContainer = document.querySelector(".credit-link-container")
  creditLinkContainer!.classList.remove("is-on")

  const dlButton = document.querySelector(".download-button") as HTMLButtonElement
  if (dlButton) dlButton.remove()
}

const onInputChange = () => {
  const input = document.getElementById("query-input") as HTMLInputElement
  const value = input.value
  const tap = (x: any) => { console.info(x); return x }

  uiReset()

  const progress = document.createElement("progress") as HTMLProgressElement
  document.getElementById("code")?.appendChild(progress)

  fetch(`.netlify/functions/image?query=${value}&size=regular&fields=description`)
    .then(tap)
    .then((response: Response) => {
      if (response.status !== 200) {
        response.text().then(text => {
          const errMsg = `${response.status}: ${response.statusText} ${text}`
          const code = document.getElementById("code") as HTMLDivElement
          code.innerHTML = errMsg
          throw new Error(errMsg)
        })
      }
      else return response.json()
    })
    .then(tap)
    .then((data: APIResponse) => {
      if (!data) return
      const dataURL = blurhashToDataURL(data.blur_hash, data.blur_hash_width, data.blur_hash_height)
      const img = document.createElement("img") as HTMLImageElement

      document.getElementById("image-container")?.appendChild(img)

      img.setAttribute("id", "image")
      const currStyle = `background-image: url(${dataURL}); max-width: ${data.blur_hash_width}px;`
      img.setAttribute("style", currStyle)



      // Introducing a slight delay to show off the blur_hash
      // This was hard to get right
      setTimeout(() => img.src = data.src, 500)

      // Blur-hash wants to work with pixel values
      // but it's not such good practice in CSS

      // setting both width and height directly on the image results in distortions
      // if the image dimensions are adjusted by CSS

      // but not setting width and height results in a tiny 0 x 0 image
      // and therefore blur_hash is just a bittle smudge on the screen

      // so it's necessary to set height and width directly
      // but also to do some calculations

      // first, force the image to its maximum possible dimensions
      img.setAttribute("style", `${currStyle} width: 100%; height: 100vh;`);

      // get its current (maximum) height and width
      const { width, height } = img

      // Keeping aspect ratio, adjustedHeight would be the height at maximum width
      const adjustedHeight = Math.floor(img.width * (data.blur_hash_height / data.blur_hash_width))

      // Likewise, adjustedWidth is the proportional width at maximum height
      const adjustedWidth = Math.floor(img.height * (data.blur_hash_width / data.blur_hash_height))

      // Which to use? adustedHeight or adjustedWidth?
      // if adustedHeight is greater than allowed height, then we have to adjust the width
      if (adjustedHeight > height) {
        img.width = adjustedWidth
        img.height = height
        img.setAttribute("style", `${currStyle} height: ${height}px;`);
      }
      else {
        img.height = adjustedHeight
        img.width = width
        img.setAttribute("style", `${currStyle} width: ${width}px;`);
      }

      // Finally, remove the height and width attributes at load, and let CSS take care
      // of all adjustments, which *should* have exact same dimensions so there is no jump
      img.addEventListener("load", () => {
        img.removeAttribute("height");
        img.removeAttribute("width")
        img.alt = data.alt
      })


      // There is a weird jump if this info is showing before the image
      // gets its correct height, so hide it at the beginning
      // and show it now at the end
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

      // This is left for a future download button for qualifying as 
      // in "production" https://unsplash.com/documentation#registering-your-application
      // but is currently *unfinished* as it needs a backend endpoint
      // if (data.links) {
      //   const dlButton = document.createElement("button")
      //   dlButton.classList.add("download-button")
      //   dlButton.innerText = "Download photo"
      //   dlButton.addEventListener("click", onDownloadClick(data.links!))
      //   creditLinkContainer?.appendChild(dlButton)
      // }
    })
    .catch((error:Error) => {
      console.error({ error })
      const code = document.getElementById("code") as HTMLDivElement
      code.innerHTML = `${error.name}: ${error.message} ${error.stack}`
      
    })
}

const onDownloadClick = (links: { download: string, download_location: string }) => () => {
  // TODO: This will need a backend endpoint
  console.warn("Download button is not implemented")
}

document.getElementById("search-button")?.addEventListener("click", onInputChange)