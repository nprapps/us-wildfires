# Embedding Fire Forecast
Follow these four steps to build an embeddable iframe of our Fire Forecast maps!

## 1. Zoom To Location
Fire Forecast can zoom to a city if you use the `&city=` and the `&state=` URL parameters. These are fairly forgiving; you can either spell out the state or you can use an abbreviation, like `CA` or `Tex`.

You can test your URL by pasting it into your Web browser's address bar. Try these, for example:
```
http://apps.npr.org/fire-forecast/?city=New York&state=NY
http://apps.npr.org/fire-forecast/?city=Rio%20Grande%20City&state=Texas
```

## 2. Customize Display Text
The pop-up on the map will use the exact text you've typed as the display text. If you use `&city=San Antonio` and `&state=Tex`, you'll see "San Antonio, Tex" as your display type.

## 3. Activate Embedded Mode
Once you have a working URL with a city and state parameter, add  `&embed=true` to the end to get the embed-friendly version of the page. This adds a "full screen" button at the top corner, among other things.

## 4. Construct Your Iframe
You can construct an iframe tag with this fancy URL you've targeted to a city/state and activated embedded mode. Here's the sample code for a story page:

```
<iframe
    width="100%"
    height="600px"
    src="http://apps.npr.org/fire-forecast/?city=Rio%20Grande%20City&state=Texas&embed=true"
    frameborder=None
></iframe>
```

This sample code creates an iframe that will be as wide as the article template will allow, will be 600 pixels tall, and zoom to Rio Grande City, Texas.

## Troubleshooting
* Make sure your iframe has a width and a height. These are both required.
* When you append parameters to a URL, the first parameter uses a ? and the rest use a &, like this:

```
http://url.com/?one=one
http://url.com/?one=one&two=two
http://url.com/?one=one&two=two&three=three
```

* Try doing a Google Search for the city name. Sometimes, the names will surprise you. "Rio Grande" won't work in Texas (points to the river) but "Rio Grande City" does.
* Still stuck? [Email the News Apps team](mailto:nprapps@npr.org).