import * as http from "https"
import dotenv from "dotenv";
import type { Context, APIGatewayEvent } from "aws-lambda"
import type { ClientRequest, IncomingMessage } from 'http';
import type { UnsplashSuccess, UnsplashResult, UnsplashSuccessField } from "./unsplash-types";

type StatusError = { statusCode: number, body: string }

const TIMEOUT_MS = 5000
const TIMEOUT_ERROR_STATUS_CODE = 504 // As a const, to clarify meaning of '504'

const API_HOST = "api.unsplash.com"
const API_PATH = "/search/photos"

dotenv.config() // This incorporates your Unsplash API access key from the .env file

/** Endpoint handler receives the request and returns the response */
export const handler = async (event: APIGatewayEvent, context: Context) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: `Method "${event.httpMethod}" not allowed` }
  const extractParam = (param: string) => event.queryStringParameters && event.queryStringParameters[param]
  if (!event.queryStringParameters || !extractParam("query") || extractParam("query")!.length === 0) return {
    statusCode: 400,
    body: `Missing "query" parameter as a GET query string, e.g. "image?query=lime"`
  }
  const { query, page = "1", per_page = "1", size = "raw", fields = "" } = event.queryStringParameters // ? event.queryStringParameters : { page: 1, per_page: 10, size: "raw", fields: [] }

  type SizeQuery = "raw" | "small" | "thumb" | "regular" | "full"
  const isSize = (x:string): x is SizeQuery => x === "raw" || x === "small" || x === "thumb" || x === "regular" || x === "full"
  const sizeQuery: SizeQuery = isSize(size) ? size : "raw"

  // The query can request fields from the unsplash success response, or use "all" to get them all
  const validFields = ["id", "created_at", "updated_at", "promoted_at", "width", "height", "color", "blur_hash", "description", "alt_description", "urls", "links", "categories", "likes", "liked_by_user", "current_user_collections", "sponsorship", "user", "tags"]
  const isField = (x:string): x is UnsplashSuccessField => validFields.some(f => x === f)
  //@ts-expect-error
  const fieldsQuery:UnsplashSuccessField[] = fields === "all"? validFields : fields.split(",").map( f => f.trim()).filter( f => isField(f))

  const pageQuery = Number.isNaN(parseInt(page))? 1 : parseInt(page)
  const perPageQuery = Number.isNaN(parseInt(per_page))? 1 : parseInt(per_page)

  // const cleanString = (str: string) => str.trim().toLowerCase().replace(/\W /, "")
  // const query = cleanString(searchQuery)
  try {
    const data: StatusError | UnsplashSuccess = await unsplashPhotoSearch(query, pageQuery, perPageQuery)
    const isError = (r: StatusError | UnsplashSuccess): r is StatusError => r.hasOwnProperty("statusCode") && ( r as StatusError ).statusCode >= 400
    const statusCode = isError(data) ? 500 : 200
    /** In this function, filter, and modify to return the result that works best in your project */
    const successBody = (d: UnsplashSuccess) => {
      // Currently, it just randomly picks one of the 10 results returned from unsplash
      // but it's possible to do some more filtering here, by tag title perhaps
      const pickRandomResult = (r: UnsplashResult[]) => r[Math.floor(Math.random() * r.length)]
      const result = pickRandomResult(d.results)
      // Here you could return a srcset rather than a single src
      const src: string = result.urls[sizeQuery]
      const alt: string = result.alt_description
      const remaining: number = d.remaining

      const fieldObj = fieldsQuery.reduce( (acc,f) => Object.assign(acc, {[f]: result[f] }), {});
      // learn more about blur hashes at https://blurha.sh
      const blur_hash: string = result.blur_hash
      const blur_hash_width = sizeQuery === "thumb"? 200 : sizeQuery === "small"? 400 : sizeQuery === "regular"? 1080 : result.width
      const blur_hash_height = Math.round(blur_hash_width * (result.height / result.width))
      const name = result.user.name
      const portfolio_url = result.user.portfolio_url? result.user.portfolio_url : result.user.links.html
      const credit = { name, portfolio_url }
      const resultsObj = perPageQuery > 1 ? d : { src, blur_hash, blur_hash_width, blur_hash_height, alt, credit, ...fieldObj }
      return JSON.stringify({ ...resultsObj, remaining })
    }
    if (isError(data)) { console.error("error", data); return data } 
    else if (data.results.length === 0) return { statusCode:404, body: `No results for '${query}'`}
    else return { statusCode, body: successBody(data) }
  } catch (error) {
    return { statusCode: 500, body: `Handler response error: ${error.name}: ${error.message}` }
  }
}

/* This is a low-level call to the API without editorial */
const unsplashPhotoSearch = (queryParam: string, page:number, per_page:number) => new Promise<UnsplashSuccess | StatusError>((resolve, reject) => {
  const query = encodeURI(queryParam)

  if (process.env.UNSPLASH_API === undefined || process.env.UNSPLASH_API === "your-unsplash-api-key-here") { throw new Error("Unsplash access key is undefined. Consult the README file for more information") }

  const pageQuery = (x:number) => x > 1? `&page=${x}` : ""
  const pageNumQuery = (x:number) => x > 1? `&per_page=${x}` : ""

  const hostname = `${API_HOST}`
  const path = `${API_PATH}?query=${query}${pageQuery(page)}${pageNumQuery(per_page)}`
  const headers = {
    'Authorization': `Client-ID ${process.env.UNSPLASH_API}`,
    'Accept-Version': 'v1'
  }
  const requestOptions: http.RequestOptions = { hostname, path, headers }

  const onResponse = (res: IncomingMessage) => {
    // IncomingMessage supplies 'StatusMessage' but outgoing server response wants 'body'
    const { statusCode, statusMessage } = res
    if (!statusCode || statusCode !== 200) reject({ statusCode, body:statusMessage })

    res.on("error", (error) => {
      res.resume()
      reject({ statusCode: 500, body: `Response error event: ${error.name}: ${error.message} ${error.stack}` })
    })

    let dump = ""
    res.on("data", data => (dump += data))
    res.on("end", () => {
      try {
        const dumpJson = JSON.parse(dump)
        // This adds the remaining requests available. For more information on these headers: https://unsplash.com/documentation#rate-limiting
        const json = { ...dumpJson, remaining: res.headers['x-ratelimit-remaining'] }
        resolve(json)
      } catch (error) {
        reject({ statusCode: 500, body: `Incoming Message JSON encoding error: ${error.name}: ${error.message}` })
      }
    })
  }

  const request: ClientRequest = http.get(requestOptions, onResponse)
  const onTimeout = () => request.abort()
  const onRequestError = (error: Error) => {
    switch (error.message) {
      case "socket hang up":
        if (request.aborted) {
          reject({ statusCode: TIMEOUT_ERROR_STATUS_CODE, body: "Unsplash API timeout" })
          break
        }
      default:
        console.error(error)
        reject({ statusCode: 500, body: `Request error: ${error.name}: ${error.message} ${error.stack}` })
        break
    }
  }

  request.addListener("error", onRequestError)
  request.setTimeout(TIMEOUT_MS, onTimeout)

}).catch((error: Error) => ({ statusCode: 500, body: `General error: ${error.name}: ${error.message} ${error.stack}` }))

/*
<img
  srcset="https://assets.imgix.net/examples/bluehat.jpg?w=400&dpr=1 1x,
          https://assets.imgix.net/examples/bluehat.jpg?w=400&fit=max&q=40&dpr=2 2x,
          https://assets.imgix.net/examples/bluehat.jpg?w=400&fit=max&q=20&dpr=3 3x"
  src="https://assets.imgix.net/examples/bluehat.jpg?w=400"
>
// https://docs.imgix.com/tutorials/responsive-images-srcset-imgix
*/