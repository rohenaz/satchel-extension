let url = null
let bitsocket = null
let txStickers = new Map()
const sock = {
  'v': 3,
  'q': {
    'find': {
      'MAP.url': { '$ne': 'null' }
    }
  }
}

// Credit David Walsh (https://davidwalsh.name/javascript-debounce-function)

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate  = false) {
  var timeout

  return function executedFunction() {
    var context = this
    var args = arguments
    var later = function() {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}

// Update Badge Debounced
const updateBadgeSafe = debounce(function(tab) {
  chrome.storage.sync.get(['performBadgeUpdates'], function(result) {
    if (result.performBadgeUpdates) {
      updateBadge(tab)
    }
  })
}, 1000)

// Listen
const listen = (query) => {
  var b64 = btoa(JSON.stringify(query))
  if (bitsocket) {
    bitsocket.close()
  }

  chrome.storage.sync.get(['endpoint'], function(result) {
    bitsocket = new EventSource(result.endpoint + '/s/' + b64)
    bitsocket.onmessage = (e) => {
      let o = JSON.parse(e.data)
      if (o.type === 't') {
        chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
          if (tabs && tabs.length && tabs[0].url === o.data[0].MAP.hasOwnProperty('url')) {
            url = tabs[0].url
            // updating badge from socket
            updateBadgeSafe(tabs[0])
          }
        })
      }
    }
  
    bitsocket.onopen = (e) => {
      console.info('open', e)
    }
  
    bitsocket.onerror = (e) => {
      console.error('socket err', e)
    }
  })
}

const q = {
  "v": 3,
  "q": {
    "find": {            
      "MAP.app": "metalens",
      "MAP.type": {"$in": ["comment","post"]},
      "MAP.url": { "$exists": true }
    },
    "limit": 100
  }
}

const badgeQuery = (tab, txhash = null) => {

  // Default to the tab url
  q.q.find['MAP.url'] = tab.url


  console.log('txhash?', txhash)
  if (txhash) {
    q.q.find['MAP.type'] = {$in: ['comment', 'reply']}
    q.q.find['MAP.tx'] = txhash
  }

  console.log('updating badge', q)
  var query_b64 = btoa(JSON.stringify(q))
  chrome.storage.sync.get(['endpoint'], function(result) {
    var query_url = result.endpoint + '/q/'+query_b64
    // Check for comments on this page
    fetch(query_url, {
      headers: {
        key: "1P6o45vqLdo6X8HRCZk8XuDsniURmXqiXo"
      }
    }).then(function(res) {
      return res.json()
    }).then(function(res) {
      var bkg = chrome.extension.getBackgroundPage()

      if (!res.c && !res.u) { return }
      bkg.console.log("response", res)
      res = (res.u || []).concat(res.c)
      if (res && res.length > 0) {
        chrome.browserAction.setBadgeText({text: String(res.length), tabId: tab.tabId})
        chrome.browserAction.setBadgeBackgroundColor({color: "red", tabId: tab.tabId})
      } else {
        chrome.browserAction.setBadgeText({text: "", tabId: tab.tabId})
      }
    })
  })
}
const updateBadge = (tab) => {
  // check for txhash from header stickers
  let txhash = txStickers.has(tab.url) ? txStickers.get(tab.url) : null
  if (txhash) {
    console.log('has header hash', txhash)
    badgeQuery(tab, txhash)
  } else {
    // Check for tx meta tags
    chrome.tabs.sendMessage(tab.id, {cmd: "getMetas"}, function(msg) {
      if (msg && msg.metas) {
        var txMetas = msg.metas.filter((m => { return m.hasOwnProperty('bitcoin-tx') }))
        txhash = txMetas.length > 0 && txMetas[0].hasOwnProperty('bitcoin-tx') ? txMetas[0]['bitcoin-tx'] : null
      }
      badgeQuery(tab, txhash)
    })
  }
}

listen(sock)

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if ((!url || url !== tab.url) && tab && tab.active) {
    url = tab.url
    updateBadgeSafe(tab)
  }
})

chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    if (tabs && tabs[0] && tabs[0].active && (!url || url !== tabs[0].url)) {
      url = tabs[0].url
      updateBadgeSafe(tabs[0])
    }
  })
})

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
      chrome.storage.sync.set({
        endpoint: 'https://b.map.sv',
        performBadgeUpdates: true
      })
  }else if(details.reason == "update"){
      var thisVersion = chrome.runtime.getManifest().version
      console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!")
  }
})

chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
  console.log('message', message)
  if (message.type == "FROM_CONTENT") {
    console.log('background: message from content script!')
    chrome.windows.create(message.options)
    popup.cancel()  
    sendResponse()
  }

  if (message.text == "popup opened") {
      console.log ("Popup says it was opened. I have stickers for it?", txStickers)
      // Run your script from here
      
      // chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {
      //   if (tabs && tabs.length) {
      //     url = tabs[0].url

      sendResponse([...txStickers])
      //     // updating badge from socket
      //     console.log('activetab popup opened', url)
      //     updateBadgeSafe(tabs[0])
      //   }
      // })
  }
})

chrome.webRequest.onHeadersReceived.addListener((details) => {
  // console.log("Headers received", details)
  let headers = details.responseHeaders
  let  blockingResponse = {}

  for( var i = 0, l = headers.length; i < l; ++i ) {
    if( headers[i].name === 'bitcoin-tx' ) {
      txStickers.set(details.url, headers[i].value)
      break
    }
    // If you want to modify other headers, this is the place to
    // do it. Either remove the 'break;' statement and add in more
    // conditionals or use a 'switch' statement on 'headers[i].name'
  }

  blockingResponse.responseHeaders = headers
  return blockingResponse
},
{urls: [ "<all_urls>" ]},['responseHeaders','blocking'])