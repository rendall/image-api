import * as http from "https"
import dotenv from "dotenv";
import fs from "fs"
import type { Context, APIGatewayEvent } from "aws-lambda"
import type { ClientRequest, IncomingMessage } from 'http';
import type { UnsplashSuccess, UnsplashResult } from "./unsplash-types";

type StatusError = { statusCode: number, statusMessage: string }

const TIMEOUT_MS = 5000
const TIMEOUT_ERROR_STATUS_CODE = 504 // As a const, to clarify meaning of '504'

const API_HOST = "api.unsplash.com"
const API_PATH = "/search/photos"

// The time the cache should be overwritten after creation, in MS
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000

dotenv.config() // This incorporates your Unsplash API access key from the .env file

/** Endpoint handler receives the request and returns the response */
export const handler = async (event: APIGatewayEvent, context: Context) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: `Method "${event.httpMethod}" not allowed` }
  const extractParam = (param: string) => event.queryStringParameters && event.queryStringParameters[param]
  const searchQuery = extractParam("query")
  const pageQuery = extractParam("page")
  const pageNum: number = pageQuery && Number.parseInt(pageQuery) ? Number.parseInt(pageQuery) : 1
  type TypeQuery = "raw" | "small" | "thumb" | "regular" | "full"
  const typeQuery: TypeQuery = extractParam("type") as TypeQuery || "raw"
  if (!searchQuery || searchQuery.length === 0) return {
    statusCode: 400,
    body: `Missing "query" parameter as a GET query string, e.g. "image?query=lime"`
  }
  const cleanString = (str: string) => str.trim().toLowerCase().replace(/\W /, "")
  const query = cleanString(searchQuery)
  try {
    const data = await apiImageSearch(query, { pageNum })
    const isError = (r: StatusError | UnsplashSuccess): r is StatusError => r.hasOwnProperty("statusMessage")
    const statusCode = isError(data) ? 500 : 200
    // Return a result with one of these tags, in order
    /** In this function, filter, modify and return the result that works best in your project */
    const successBody = (d: UnsplashSuccess) => {
      // Currently, it just randomly picks one of the 20 results returned from unsplash
      const pickRandomResult = (r: UnsplashResult[]) => r[Math.floor(Math.random() * r.length)]
      const result = pickRandomResult(d.results)
      // Here you could return a srcset rather than a single src
      const src: string = result.urls[typeQuery]
      const alt: string = result.alt_description
      // learn more about blur hashes at https://blurha.sh
      const blurHash: string = result.blur_hash
      return JSON.stringify({ src, blurHash, alt })
    }
    return isError(data) ? data : { statusCode, body: successBody(data) }
  } catch (error) {
    return { statusCode: 500, statusMessage: `${error.name}: ${error.message}` }
  }
}

/** Receive search term and parameters, return response or cached response */
const apiImageSearch = async (searchTerm: string, options = { pageNum: 1 }): Promise<StatusError | UnsplashSuccess> => {
  const term = searchTerm.replace(/\W/g, "-")
  const { pageNum } = options
  const dir = `./cache/`
  const fileCount = pageNum === 1 ? "" : `${pageNum}.`

  // image-api caches the responses as json files on the server
  // and will serve those instead
  const filename = `${dir}unsplash-${term}.${fileCount}json`

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  } catch (error) {
    console.error(`Unable to make directory ${dir}`, error)
  }
  try {

    // returns true if the file is older than CACHE_EXPIRATION_TIME time
    const isExpired = (filename: string, stats?: fs.Stats): boolean => stats === undefined ? isExpired(filename, fs.statSync(filename)) : new Date().valueOf() - stats.birthtimeMs > CACHE_EXPIRATION_TIME

    // return the contents of `./cache/filename` if it exists and is not expired
    if (fs.existsSync(filename) && !isExpired(filename)) {
      const file = fs.readFileSync(filename, { encoding: 'utf8', flag: 'r' })
      const result = JSON.parse(file) as UnsplashSuccess
      return result
    }
  } catch (error) {
    console.error("Non-fatal file write error (reply not cached):", { error })
  }

  try {
    if (process.env.UNSPLASH_API === undefined || process.env.UNSPLASH_API === "your-unsplash-api-key-here") {
      throw new Error("Unsplash access key is undefined. Consult the README file for more information")
    }

    const response: StatusError | UnsplashSuccess = await unsplashPhotoSearch(term)

    const isError = (r: StatusError | UnsplashSuccess): r is StatusError => r.hasOwnProperty("errors")
    if (!isError(response)) {
      try {
        const ws = fs.createWriteStream(filename)
        ws.write(JSON.stringify(response))
        ws.end()
      } catch (error) {
        console.error(`Could not write file '${filename}'`)
      }
    }
    return response

  } catch (error) {
    return { statusCode: 500, statusMessage: `${error.name}: ${error.message}` }
  }
}

/* This is a low-level call to the API without editorial */
const unsplashPhotoSearch = (query: string) => new Promise<UnsplashSuccess | StatusError>((resolve, reject) => {
  const hostname = `${API_HOST}`
  const path = `${API_PATH}?query=${query}`
  const headers = {
    'Authorization': `Client-ID ${process.env.UNSPLASH_API}`,
    'Accept-Version': 'v1'
  }
  const requestOptions: http.RequestOptions = { hostname, path, headers }

  const onResponse = (res: IncomingMessage) => {
    const { statusCode, statusMessage } = res
    console.info(`Received response ${statusMessage}`)
    console.info("headers", res.headers)
    if (!statusCode || statusCode !== 200) reject({ statusCode, statusMessage })

    res.on("error", (error) => {
      res.resume()
      reject({ statusCode:500, statusMessage:`${error.name}: ${error.message}` })
    })

    let dump = ""
    res.on("data", data => (dump += data))
    res.on("end", () => {
      console.info(`dump end`)
      try {
        const json = JSON.parse(dump)
        resolve(json)
      } catch (error) {
        reject({ statusCode: 500, statusMessage: `${error.name}: ${error.message}` })
      }
    })
  }

  const request: ClientRequest = http.get(requestOptions, onResponse)
  console.info(`Sent request`)
  const onTimeout = () => request.abort()
  const onRequestError = (error: Error) => {
    switch (error.message) {
      case "socket hang up":
        if (request.aborted) {
          reject({ statusCode: TIMEOUT_ERROR_STATUS_CODE, statusMessage: "Unsplash API timeout" })
          break
        }
      default:
        console.error(error)
        reject({ statusCode: 500, statusMessage: `${error.name}: ${error.message}` })
        break
    }
  }

  request.addListener("error", onRequestError)
  request.setTimeout(TIMEOUT_MS, onTimeout)

}).catch((error: Error) => ({ statusCode: 500, statusMessage: `${error.name}: ${error.message}` }))