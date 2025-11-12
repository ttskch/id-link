let lastRightClickedElement = null;

let currentHoveredElement = null;

// Update context menu state continuously as mouse moves
document.addEventListener('mouseover', (event) => {
  if (currentHoveredElement === event.target) return;

  currentHoveredElement = event.target;

  // Check hierarchy for valid attributes
  const result = findElementWithFragment(event.target);
  const hasValidAttribute = result !== null;

  // Send message to background script to update menu state
  chrome.runtime.sendMessage({
    action: 'updateContextMenu',
    enabled: hasValidAttribute
  }).catch((error) => {
    console.error('Error sending menu update message:', error);
  });
});

// Update context menu state on mousedown (right-click) as backup
document.addEventListener('mousedown', (event) => {
  // Only handle right-click
  if (event.button !== 2) return;

  lastRightClickedElement = event.target;

  // Check hierarchy for valid attributes and update menu state immediately
  const result = findElementWithFragment(event.target);
  const hasValidAttribute = result !== null;

  // Send message to background script to update menu state
  chrome.runtime.sendMessage({
    action: 'updateContextMenu',
    enabled: hasValidAttribute
  }).catch((error) => {
    console.error('Error sending menu update message:', error);
  });
});

// Keep contextmenu listener for fallback
document.addEventListener('contextmenu', (event) => {
  // Store the element and force update menu state
  lastRightClickedElement = event.target;

  const result = findElementWithFragment(event.target);
  const hasValidAttribute = result !== null;

  chrome.runtime.sendMessage({
    action: 'updateContextMenu',
    enabled: hasValidAttribute
  }).catch((error) => {
    console.error('Error sending menu update message:', error);
  });
});

function copyToClipboard(text) {
  // First try the modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback to the older method
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);

      try {
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          resolve();
        } else {
          reject(new Error('Copy command failed'));
        }
      } catch (err) {
        document.body.removeChild(textArea);
        reject(err);
      }
    });
  }
}

function findElementWithFragment(startElement) {
  let currentElement = startElement;

  // Traverse up the DOM tree until we reach the document body or find a valid attribute
  while (currentElement && currentElement !== document.body && currentElement.tagName !== 'HTML') {
    if (currentElement.id) {
      return { element: currentElement, fragment: '#' + currentElement.id };
    }

    if (currentElement.tagName === 'A' && currentElement.name) {
      return { element: currentElement, fragment: '#' + currentElement.name };
    }

    currentElement = currentElement.parentElement;
  }
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'copyElementLink') {
    if (!lastRightClickedElement) {
      sendResponse({success: false, message: 'No element selected'});
      return;
    }

    const result = findElementWithFragment(lastRightClickedElement);

    if (!result) {
      // No alert needed since menu should be disabled
      sendResponse({success: false, message: 'No valid attribute in hierarchy'});
      return;
    }

    const url = window.location.origin + window.location.pathname + window.location.search + result.fragment;

    // Try modern clipboard API first, fallback to older method
    copyToClipboard(url).then(() => {
      sendResponse({success: true, url: url, element: result.element.tagName});
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      alert('URLのコピーに失敗しました: ' + err.message);
      sendResponse({success: false, error: err.message});
    });

    return true; // Keep the message channel open for async response
  }
});