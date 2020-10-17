# Image API

Image API is an endpoint for returning image URLs and metadata given a keyword and other parameters using the Unsplash API.

You would use it like any api. A call to `/api/image?term=lime&type=regular` might return a json object like this:

```json
{
"alt":"sliced lemon on white surface",
"blurHash":"LiOgThWYa%ayoIofayay%Qj[W9fR",
"src":"https://images.unsplash.com/photo-1583774491800-ae752bae4abb?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjE3NDcwN30"
}
```

Which links to this image:

![sliced lemon on white surface](https://images.unsplash.com/photo-1583774491800-ae752bae4abb?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjE3NDcwN30)

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
  * copy the *Access Key*. It will look something like this `Zqgh}FOwN42Aq[Y2RN_;x]KtHAx7Ct`
* Paste the access key into `.env`, replacing the `your-unsplash-api-key-here` with your API key, so it should look something like this:

`UNSPLASH_API=Zqgh}FOwN42Aq[Y2RN_;x]KtHAx7Ct`

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
