# Image API

Image API is an endpoint for returning a single image URL and metadata given a keyword and other parameters using the Unsplash API. A working example here <https://festive-heisenberg-a17d11.netlify.app/>

A call to `/api/image?query=lime&size=regular` will return a json-formatted response object like this:

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

Which links to this image:

![lime fruits](https://images.unsplash.com/photo-1578855691621-8a08ea00d1fb?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjE3NTI1NX0)

## Installation

This project is designed to be used directly in your current project, so copy all files, merging and adjusting as necessary. Or, you can run a local version:

* `git clone https://github.com/rendall/image-api`
* `cd image-api`
* `npm install`
* `npm start`
* Visit <http://localhost:9000/.netlify/functions/image?term=lime&type=regular>

## Unsplash

[Unsplash](https://unsplash.com/) is an image-as-a-service provider

### API key

To use Unsplash with this project, you will need an API key, which you can get by signing up here: <https://unsplash.com/oauth/applications>

Note that the Unsplash Terms of Service requires you to keep this key confidential. This project will keep your key confidential by using [dotenv](https://github.com/motdotla/dotenv)

* Copy the [.env.example](.env.example) file and rename it to `.env` (remove the `.example` part)
* Go to <https://unsplash.com/oauth/applications>
  * Click "New Application",
  * fill out the forms,
  * read and accept the agreements, and then
  * find the *Keys* section on your app's page, and
  * copy the *Access Key*. It will look something like this `Zqgh-FOwN42Aq_Y2RN_tx]KtHAx7Ct`
* Paste the access key into `.env`, replacing the `your-unsplash-api-key-here` with your API key, so it should look something like this:

`UNSPLASH_API=Zqgh-FOwN42Aq_Y2RN_tx]KtHAx7Ct`

## Netlify / AWS Lambda

The endpoint is served from a [lambda function](https://aws.amazon.com/lambda/) but can be modified to be served from anywhere

### Netlify

[Netlify](https://netlify.com) is free-tier serverless hosting service. To serve this project from Netlify:

* Fork this repo
* Sign up for a free account at Netlify
* [Create a new site](https://app.netlify.com/start)
* Choose *Github*
* Authorize the [Netlify App](https://github.com/apps/netlify/installations/new)
* Choose the Github repo that holds this project
* Click *Show advanced* and then *New variable*
* Under *VARIABLE_NAME* put `UNSPLASH_API`
* Under its corresponding value put your Unsplash API Key
* Click *Deploy Site*
* After a few moments your site will be deployed and you will receive a link

### Query parameters

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
    * `src`, `blur_hash`, `alt`, and `credit` will *not* be included in the results
    * `size` and `fields` parameters will be *ignored*
    * The response object will include `total` and `total_pages` fields
    * Results will be contained in an array in the response object, in the field `results`
    * response example: `{"total":1269,"total_pages":635,"results":[...]}`
    * q.v. <https://unsplash.com/documentation#response-16>
* Note that these query parameters are *not* supported: `order_by`, `collections` `content_filter` `color` `orientation`
  * I'm happy to consider adding those. [Please create an issue](https://github.com/rendall/image-api/issues/new) and ask
  * Also happy to consider a pull request
  