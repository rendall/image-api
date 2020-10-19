# Image API

Image API is backend endpoint for returning a single image URL and metadata given a keyword and other optional parameters using the Unsplash API. A working example here <https://festive-heisenberg-a17d11.netlify.app/>

A call to `/api/image?query=lime` returns a json-formatted response object like this:

```json
{
  "alt": "lime fruits",
  "blur_hash": "L3E;9J?q?EIsBX9OMzov#DxZI;_G",
  "blur_hash_width": 1080,
  "blur_hash_height": 1440,
  "remaining": "48",
  "credit": {
    "name": "Victor Figueroa",
    "portfolio_url": "https://creativeservices.io"
  },
  "src": "https://images.unsplash.com/photo-1578855691621-8a08ea00d1fb?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjE3NTI1NX0"
}
```

Which represents this image:

![lime fruits](https://images.unsplash.com/photo-1578855691621-8a08ea00d1fb?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=500&fit=max&ixid=eyJhcHBfaWQiOjE3NTI1NX0)

Photographer: [Victor Fiqueroa](https://creativeservices.io)

## Query parameters

Here are the available [query string](https://en.wikipedia.org/wiki/Query_string) parameters:

* `size`: valid values are `thumb` `small` `regular` `full` and `raw` (default) q.v. <https://unsplash.com/documentation#example-image-use>
* `fields`: a comma separated list of fields to be returned along with the response object, e.g. `fields=color,description,tags`.
  * Valid values are: `id`, `created_at`, `updated_at`, `promoted_at`, `width`, `height`, `color`, `blur_hash`, `description`, `alt_description`, `urls`, `links`, `categories`, `likes`, `liked_by_user`, `current_user_collections`, `sponsorship`, `user`, `tags`
  * More info: <https://unsplash.com/documentation#response-16>
* `page`: return other results than the first page of `per_page` number of results
* `per_page`: valid value is an integer between `1` and `30` e.g: `image?query=lime&per_page=30`
  * Use to return more than 1 result
  * NOTE: if `per_page` is defined and greater than `1`, then the *response object changes signficantly*:
    * The [`unsplash` response](https://unsplash.com/documentation#response-16) is returned directly without modification
    * `src`, `blur_hash`, `alt`, and `credit` are *not* be included in the results
    * `size` and `fields` parameters are *ignored*
    * The response object includes `total` and `total_pages` fields
    * Results are contained in an array in the response object, in the field `results`
    * response example: `{"total":1269,"total_pages":635,"results":[...]}`
    * q.v. <https://unsplash.com/documentation#response-16>
* Note that these query parameters are *not* supported: `order_by`, `collections` `content_filter` `color` `orientation`
  * I'm happy to consider adding those. [Please create an issue](https://github.com/rendall/image-api/issues/new) and ask
  * Also happy to consider a pull request

## Unsplash

[Unsplash](https://unsplash.com/) is an image-as-a-service provider. The project is a backend wrapper for the [Unsplash API](https://unsplash.com/documentation)

### API access key

Using *Unsplash* with this project requires an API access key, which can be acquired for free by following these instructions <https://unsplash.com/documentation#creating-a-developer-account>

Note that the Unsplash Terms of Service requires the access key to be kept confidential. This project uses [dotenv](https://github.com/motdotla/dotenv) for the access key:

* Copy the [.env.example](.env.example) file and rename it to `.env` (remove the `.example` part)
* Go to <https://unsplash.com/oauth/applications>
  * Click "New Application"
  * fill out the forms
  * read and accept the agreements
  * find the *Keys* section
  * copy the *Access Key* which looks something like this `Zqgh-FOwN42Aq_Y2RN_tx]KtHAx7Ct`
* Paste the access key into `.env`, replacing the `your-unsplash-api-key-here` with the copied API access key, so it should look something like this:

`UNSPLASH_API=Zqgh-FOwN42Aq_Y2RN_tx]KtHAx7Ct`

## blurha.sh

Unsplash returns a [blurhash](https://blurha.sh) string which can be decoded into a blurred representation of the image while it loads

The `blur_hash` of image above is `L3E;9J?q?EIsBX9OMzov#DxZI;_G`, for instance, which decodes to this:

<img alt="blurred lime fruits" width="250" src="./docs/blurred_lime.png">

For more information about how this is implemented in this project [q.v. commented source code](https://github.com/rendall/image-api/blob/3c9da2922e261502783f811116f514cf5705e13c/src/public/index.ts#L83) or feel free to ask me any questions

## Installation

* Copy all files, merging and adjusting as necessary.

Or, to run a local version:

* `git clone https://github.com/rendall/image-api`
* `cd image-api`
* `npm install`
* Follow the instructions under [API Access Key](#api-access-key)
* `npm start`
* Visit <http://localhost:9000/.netlify/functions/image?term=lime&type=regular>

### Netlify / AWS Lambda

The endpoint is served from a [lambda function](https://aws.amazon.com/lambda/) but can be modified to be served from anywhere

### Netlify

[Netlify](https://netlify.com) is free-tier serverless hosting service. To serve this project from Netlify:

* [Fork](https://guides.github.com/activities/forking/) this repo
* [Sign up](https://app.netlify.com/signup) for a free account at Netlify
* [Create a new site](https://app.netlify.com/start)
* Press the *Github* button under *Continuous Deployment*
* Authorize the [Netlify App](https://github.com/apps/netlify/installations/new)
* Under *Continuous Deployment: GitHub App* select the fork of this project
* Click *Show advanced* and then *New variable*
* Under *VARIABLE_NAME* enter `UNSPLASH_API`
* Under its corresponding value enter the Unsplash API access key
* Click *Deploy Site*
* After a few moments the site is deployed

## Frontend

[./src/public/](./src/public/) holds a minimal frontend client with a simple UI as a demo for the backend. To run it locally, open two terminals and run these commands simultaneously, one in each terminal:

* `npm run start`
* `npx http-server --proxy http://localhost:9000`

Then visit <http://localhost:8080>

## Project structure

All `.ts` source code is in [./src](./src) and the frontend is expected to be served from [./public](./public)

The build process creates two directories: a `/src-functions` directory, which is a secondary step before the lambda-functions are compiled and moved to `/functions`

### Build

The project is written with TypeScript. To compile the source code into javascript: `npx tsc`

This will also copy the directory structure under [./src](/src) into [./](./), e.g. `.ts` files in [./src/public](/src/public) will be compiled into `.js` files and moved into [./public](/public). Same for [./public/src-functions](./public/src-functions)

To compile the `.js` files [./src-functions](./src-functions) into lambda functions (for Netlify) type `npx netlify-lambda build src-functions` which will move the compiled files into [./functions](./functions)

Note that the command `npm build` will do both of those commands and once, and is the command that Netifly uses in its deployment build step

### Source code

The API `/image` endpoint source code is [./src/src-functions/image.ts](./src/src-functions/image.ts)

The frontend javascript sourcecode is in [./src/public/](./src/public/)

* [./src/public/blurhash.ts](./src/public/blurhash.ts) is a decode script derived from the blurhash repo that can be used without a bundler
* [./src/public/index.ts](./src/public/index.ts) drives the frontend UI

## Issues and Contributing

Discussion and issues are welcome!
