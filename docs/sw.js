/* ===========================================================
 * docsify sw.js
 * ===========================================================
 * Copyright 2016 @huxpro
 * Licensed under Apache 2.0
 * Register service worker.
 * ========================================================== */

const RUNTIME = "docsify";
const HOSTNAME_WHITELIST = [
  self.location.hostname,
  "fonts.gstatic.com",
  "fonts.googleapis.com",
  "cdn.jsdelivr.net",
];

const getFixedUrl = (req) => {
  var now = Date.now();
  var url = new URL(req.url);

  url.protocol = self.location.protocol;
  if (url.hostname === self.location.hostname) {
    url.search += (url.search ? "&" : "?") + "cache-bust=" + now;
  }

  return url.href;
};

/**
 *  @Lifecycle Activate
 *  New one activated when old isnt being used.
 *
 *  waitUntil(): activating ====> activated
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 *  @Functional Fetch
 *  All network requests are being intercepted here.
 *
 *  void respondWith(Promise<Response> r)
 */
self.addEventListener("fetch", (event) => {
  if (HOSTNAME_WHITELIST.indexOf(new URL(event.request.url).hostname) > -1) {
    const cached = caches.match(event.request);
    const fixedUrl = getFixedUrl(event.request);
    const fetched = fetch(fixedUrl, { cache: "no-store" });
    const fetchedCopy = fetched.then((resp) => resp.clone());
    event.respondWith(
      Promise.race([fetched.catch((_) => cached), cached])
        .then((resp) => resp || fetched)
        .catch((_) => {
          /* eat any errors */
        })
    );
    event.waitUntil(
      Promise.all([fetchedCopy, caches.open(RUNTIME)])
        .then(
          ([response, cache]) =>
            response.ok && cache.put(event.request, response)
        )
        .catch((_) => {
          /* eat any errors */
        })
    );
  }
});
