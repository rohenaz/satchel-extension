var url = null
var stickers = new Map()
let c = "https://wallet.appsatchel.com/"

const init = (request = {}, txhash = null) => {
  var o = document.getElementById("popup-iframe")
  if (request && request.metas) {
    var txMetas = request.metas.filter((m => { return m.hasOwnProperty('bitcoin-tx') }))
    txhash = txMetas.length > 0 && txMetas[0].hasOwnProperty('bitcoin-tx') ? txMetas[0]['bitcoin-tx'] : null
  }

  if (txhash) {
    o.setAttribute("src", c + 'tx/' + txhash)
    o.classList.remove("hidden")
  } else {
    console.log('setting url...')
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
      console.log('make sure its cool', url, tabs[0].url)
      //if (!url || url !== tabs[0].url) {
        url = tabs[0].url
        console.log('!@!!!!!!', c, url)
        o.setAttribute("src", c + 'url/' + encodeURIComponent(url))
      //} else {
        //console.log('problem land', tabs)
      //}
      o.classList.remove("hidden")
    })
  }
}

// const getMetas = function () {
//   document.body, document.getElementById("popup")
//   chrome.tabs.executeScript(null, {
//     file: "content/content.js"
//   }, function() {
//     // If you try it into an extensions page or the webstore/NTP you'll get an error
//     if (chrome.runtime.lastError) {
//       console.error('There was an error : \n' + chrome.runtime.lastError.message)
//       init()
//     }
//   })
// }

// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//   console.log('tabs updated. get metas')
//   getMetas()
// })

// chrome.runtime.onMessage.addListener(function(request, sender) {
// 	if (request.method === "get_metas") {
//     init(request)
// 	}
// })

window.onload = () => {
  // Get stickers from headers via background page
  chrome.runtime.sendMessage({text: "popup opened"}, (stickersPairs) => {
    stickers = new Map(stickersPairs)

    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {

      console.log('these are tabs', tabs)
      if (!url || url !== tabs[0].url) {
        url = tabs[0].url
        
        console.log('stickers', stickers, stickers.has(url), url, c)
        init(null, stickers.get(url))
        // if (!stickers.has(url)) {
        //   getMetas()
        // } else {
        //   init(null, stickers.get(url))
        // }
      }
    })

  })
}