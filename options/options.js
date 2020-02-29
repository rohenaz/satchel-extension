// Saves options to chrome.storage
function saveOptions() {
  var endpoint = document.getElementById('endpoint').value.replace(/\/$/, '')
  var performBadgeUpdates = document.getElementById('performBadgeUpdates').checked
  chrome.storage.sync.set({
    endpoint: endpoint,
    performBadgeUpdates: performBadgeUpdates
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status')
    status.textContent = 'Options saved.'
    setTimeout(function() {
      status.textContent = ''
    }, 2750)
  })
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions () {
  // Use default value
  chrome.storage.sync.get({
    endpoint: 'https://b.map.sv',
    performBadgeUpdates: true
  }, function(items) {
    document.getElementById('endpoint').value = items.endpoint
    document.getElementById('performBadgeUpdates').checked = items.performBadgeUpdates
  })
}
document.addEventListener('DOMContentLoaded', restoreOptions)
document.getElementById('save').addEventListener('click', saveOptions)
