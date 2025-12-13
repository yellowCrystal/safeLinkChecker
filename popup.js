document.addEventListener('DOMContentLoaded', function() {
  const enableToggle = document.getElementById('enableToggle');

  chrome.storage.sync.get(['isEnabled'], function(result) {
    enableToggle.checked = result.isEnabled !== false;
  });

  enableToggle.addEventListener('change', function() {
    const isEnabled = enableToggle.checked;
    
    chrome.storage.sync.set({ isEnabled: isEnabled });

    chrome.tabs.query({ url: "*://*.google.com/search*" }, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: isEnabled ? 'enableChecker' : 'disableChecker' 
        });
      });
    });
    chrome.tabs.query({ url: "*://*.google.co.kr/search*" }, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: isEnabled ? 'enableChecker' : 'disableChecker' 
        });
      });
    });
  });
});