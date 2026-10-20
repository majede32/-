/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6b96f43c118eba511d2df887ef6a931f"
  }, {
    "url": "pwa-192x192.png",
    "revision": "c55ed8548f87e00a7353bc5c071eabaa"
  }, {
    "url": "index.html",
    "revision": "01e751907054efd10ee0f08ce03ea3c0"
  }, {
    "url": "icon.svg",
    "revision": "6ae11c1adff79c04094349711807b181"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "78950da1aa497f29996422be1800d71e"
  }, {
    "url": "assets/jsx-dev-runtime-D-PzxhQO.js",
    "revision": null
  }, {
    "url": "assets/index-D1sLaNsS.css",
    "revision": null
  }, {
    "url": "assets/index-4B4Zo7lC.js",
    "revision": null
  }, {
    "url": "assets/hero_tunis_rfr_train_mobile-LnR4J0-l.webp",
    "revision": null
  }, {
    "url": "assets/hero_tunis_rfr_train-BNe31fC4.webp",
    "revision": null
  }, {
    "url": "assets/circle-check-BzuzZScG.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-BiYMZAtP.js",
    "revision": null
  }, {
    "url": "assets/StationModal-DlCxmKJK.js",
    "revision": null
  }, {
    "url": "assets/OfficialPostersModal-DESAhtx3.js",
    "revision": null
  }, {
    "url": "assets/NetworkMap---LjtK7W.js",
    "revision": null
  }, {
    "url": "assets/FullTimetable-C3sDKsH6.js",
    "revision": null
  }, {
    "url": "assets/FaresCalculator-BkQQx79-.js",
    "revision": null
  }, {
    "url": "assets/DownloadModal-CmZ6dQdC.js",
    "revision": null
  }, {
    "url": "icon.svg",
    "revision": "6ae11c1adff79c04094349711807b181"
  }, {
    "url": "manifest.webmanifest",
    "revision": "a2a8883d0ac532212fac31b6770ef203"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
