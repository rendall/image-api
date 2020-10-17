import * as http from "https"
import dotenv from "dotenv";
import type { Context, APIGatewayEvent } from "aws-lambda"
import type { ClientRequest, IncomingMessage } from 'http';
import type { UnsplashSuccess, UnsplashResult } from "./unsplash-types";

type StatusError = { statusCode: number, statusMessage: string }

const TIMEOUT_MS = 5000
const TIMEOUT_ERROR_STATUS_CODE = 504 // As a const, to clarify meaning of '504'

const API_HOST = "api.unsplash.com"
const API_PATH = "/search/photos"

dotenv.config() // This incorporates your Unsplash API access key from the .env file

/** Endpoint handler receives the request and returns the response */
export const handler = async (event: APIGatewayEvent, context: Context) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: `Method "${event.httpMethod}" not allowed` }
  const extractParam = (param: string) => event.queryStringParameters && event.queryStringParameters[param]
  const searchQuery = extractParam("query")
  type TypeQuery = "raw" | "small" | "thumb" | "regular" | "full"
  const typeQuery: TypeQuery = extractParam("type") as TypeQuery || "raw"

  if (!searchQuery || searchQuery.length === 0) return {
    statusCode: 400,
    body: `Missing "query" parameter as a GET query string, e.g. "image?query=lime"`
  }

  const cleanString = (str: string) => str.trim().toLowerCase().replace(/\W /, "")
  const query = cleanString(searchQuery)
  try {
    const data: StatusError | UnsplashSuccess = await unsplashPhotoSearch(query)
    const isError = (r: StatusError | UnsplashSuccess): r is StatusError => r.hasOwnProperty("statusMessage")
    const statusCode = isError(data) ? 500 : 200
    /** In this function, filter, and modify to return the result that works best in your project */
    const successBody = (d: UnsplashSuccess) => {
      // Currently, it just randomly picks one of the 10 results returned from unsplash
      // but it's possible to do some more filtering here, by tag title perhaps
      const pickRandomResult = (r: UnsplashResult[]) => r[Math.floor(Math.random() * r.length)]
      const result = pickRandomResult(d.results)
      // Here you could return a srcset rather than a single src
      const src: string = result.urls[typeQuery]
      const alt: string = result.alt_description
      const remaining:number = d.remaining
      // learn more about blur hashes at https://blurha.sh
      const blur_hash: string = result.blur_hash
      const {name, portfolio_url} = result.user
      const credit = { name, portfolio_url }
      return JSON.stringify({ src, blur_hash, alt, remaining, credit })
    }
    return isError(data) ? data : { statusCode, body: successBody(data) }
  } catch (error) {
    return { statusCode: 500, statusMessage: `${error.name}: ${error.message}` }
  }
}

/* This is a low-level call to the API without editorial */
const unsplashPhotoSearch = (query: string) => new Promise<UnsplashSuccess | StatusError>((resolve, reject) => {

  if (process.env.UNSPLASH_API === undefined || process.env.UNSPLASH_API === "your-unsplash-api-key-here") { throw new Error("Unsplash access key is undefined. Consult the README file for more information") }

  const hostname = `${API_HOST}`
  const path = `${API_PATH}?query=${query}`
  const headers = {
    'Authorization': `Client-ID ${process.env.UNSPLASH_API}`,
    'Accept-Version': 'v1'
  }
  const requestOptions: http.RequestOptions = { hostname, path, headers }

  const onResponse = (res: IncomingMessage) => {
    const { statusCode, statusMessage } = res
    if (!statusCode || statusCode !== 200) reject({ statusCode, statusMessage })

    res.on("error", (error) => {
      res.resume()
      reject({ statusCode: 500, statusMessage: `${error.name}: ${error.message}` })
    })

    let dump = ""
    res.on("data", data => (dump += data))
    res.on("end", () => {
      try {
        const dumpJson = JSON.parse(dump)
        // This adds the remaining requests available. For more information on these headers: https://unsplash.com/documentation#rate-limiting
        const json = {...dumpJson, remaining:res.headers['x-ratelimit-remaining']}
        resolve(json)
      } catch (error) {
        reject({ statusCode: 500, statusMessage: `${error.name}: ${error.message}` })
      }
    })
  }

  const request: ClientRequest = http.get(requestOptions, onResponse)
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