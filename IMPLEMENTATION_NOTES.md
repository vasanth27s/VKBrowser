# Implementation notes

## The central requirement

"Any URL should open the full website."

The only dependable implementation in a browser-only React app is to let the browser navigate to the URL. This project does that with:

```js
window.location.href = normalizedUrl;
```

It intentionally does not use:

```html
<iframe src="..."></iframe>
```

for arbitrary sites.

## Search redirect fix

Search engines frequently use URLs such as:

```text
https://duckduckgo.com/l/?uddg=https%3A%2F%2Fgithub.com
```

The frontend and backend both understand `uddg`, `url`, `u`, `target`, `dest`, and `destination` query parameters and decode the actual URL before opening it.

## What the backend does

- CORS
- Search proxy
- Search-result HTML parsing
- Redirect URL resolution
- Health endpoint

## What the browser cannot do

A web page cannot silently take over the browser's network stack or create a general-purpose Chromium tab engine. It also cannot force another origin to allow iframe embedding.

For a true Chrome/Brave clone with permanent custom chrome around arbitrary sites, a browser engine such as Chromium/WebContents/WebView is required.
