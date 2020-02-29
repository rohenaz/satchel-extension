console.log('you\'re in the world of content.js')

var port = chrome.runtime.connect()
// var metas = document.getElementsByTagName('meta')

// chrome.runtime.sendMessage({
// 	method:"getMetas",
// 	metas: [...metas].map(m => {
//       let obj = {}
//       obj[m.getAttribute('name')] = m.getAttribute('content')
//       return obj
//     })
// })

window.addEventListener("message", function(event) {
  // We only accept messages from ourselves
  if (event.source != window)
    return

  if (event.data.type && (event.data.type == "FROM_PAGE")) {
    let action = JSON.parse(event.data.action)
    console.log("Content script received: ", action)
    // port.postMessage(action)

    chrome.runtime.sendMessage({type: "FROM_CONTENT", options: {
      type: 'popup',
      focused: true,
      top: 0,
      left: 0,
      width: 420,
      height: 800,
      url: 'popup/popup.html'
  }})

  }
}, false)