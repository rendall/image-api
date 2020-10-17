import Unsplash, { toJson } from 'unsplash-js';
import fetch from "node-fetch"
import dotenv from "dotenv";
import fs from "fs"
import type { Context, APIGatewayEvent } from "aws-lambda"
import type { UnsplashError, UnsplashSuccess, UnsplashTag, UnsplashResult } from "./unsplash-types";

// When the cache should be overwritten, in MS:
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000

dotenv.config() // This incorporates your Unsplash API access key from the .env file

// Node does not natively support "fetch", which is used in
// the Unsplash driver, and so requires a polyfill. 
// Typescript is grumpy about using `global`
// at all, therefore this weird construction:
const globalAny: any = global
globalAny.fetch = fetch


/** Endpoint handler receives the request and returns the response */
export const handler = async (event: APIGatewayEvent, context: Context) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: `Method "${event.httpMethod}" not allowed` }
  const extractParam = (param: string) => event.queryStringParameters && event.queryStringParameters[param]
  const searchTerm = extractParam("term")
  const pageQuery = extractParam("page")
  const pageNum: number = pageQuery && Number.parseInt(pageQuery) ? Number.parseInt(pageQuery) : 1
  type TypeQuery = "raw" | "small" | "thumb" | "regular" | "full"
  const typeQuery: TypeQuery = extractParam("type") as TypeQuery || "raw"
  if (!searchTerm || searchTerm.length === 0) return {
    statusCode: 400,
    body: `Missing "term" parameter as a GET query string or POST body, e.g. "term=lime"`
  }
  const cleanString = (str: string) => str.trim().toLowerCase().replace(/\W /, "")
  const term = cleanString(searchTerm)
  try {
    const data = await apiImageSearch(term, { pageNum })
    const isError = (r: UnsplashError | UnsplashSuccess): r is UnsplashError => r.hasOwnProperty("errors")
    const statusCode = isError(data) ? 500 : 200
    // Return a result with one of these tags, in order
    const errorBody = (d: UnsplashError) => JSON.stringify(d)
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
    const body = isError(data) ? errorBody(data) : successBody(data)
    return { statusCode, body }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ errors: [error] }) }
  }
}

/** Receive search term and parameters, return response or cached response */
const apiImageSearch = async (searchTerm: string, options = { pageNum: 1 }): Promise<UnsplashError | UnsplashSuccess> => {
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
    const unsplash = new Unsplash({ accessKey: process.env.UNSPLASH_API });
    const response: UnsplashError | UnsplashSuccess = await unsplash.search.photos(searchTerm, pageNum, 99, { orderBy: "relevant" }).then(toJson)
    const isError = (r: UnsplashError | UnsplashSuccess): r is UnsplashError => r.hasOwnProperty("errors")
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
    return { errors: [error] }
  }
}