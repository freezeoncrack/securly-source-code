const audio = new Audio("https://deviceconsole.securly.com/sound/chat.wav");
chrome.runtime.onMessage.addListener(msg => {
  if (msg["action"] === "playSound") {
    audio.play();
  }
});

setInterval(async () => {
  (await navigator.serviceWorker.ready).active.postMessage('keepAlive');
}, 20000);