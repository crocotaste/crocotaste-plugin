// Served as /__crocotaste/reload.js into every page the preview serves.
(function () {
  function connect() {
    var source = new EventSource("/__crocotaste/events");
    source.onmessage = function (event) {
      if (event.data === "reload") location.reload();
    };
    // The browser retries a dropped stream by itself, but gives up for good
    // after a failed response, as when the preview restarts; keep trying.
    source.onerror = function () {
      if (source.readyState === EventSource.CLOSED) {
        setTimeout(connect, 1000);
      }
    };
  }
  connect();
})();
