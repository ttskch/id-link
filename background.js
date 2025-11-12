chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'copy-element-link',
    title: 'この要素へのリンクをコピー',
    contexts: ['all'],
    enabled: false  // Start disabled
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'copy-element-link') {
    chrome.tabs.sendMessage(tab.id, { action: 'copyElementLink' })
      .catch((error) => {
        console.error('Error sending message to content script:', error);
      });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateContextMenu') {
    chrome.contextMenus.update('copy-element-link', {
      enabled: request.enabled
    }).catch((error) => {
      console.error('Error updating context menu:', error);
    });
  }
});