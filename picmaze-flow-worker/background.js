// Flow Automation Service Worker (Chrome DevTools Protocol v1.6.0 - Native Hardware Enter)
// PicMaze Hardware Event Service Worker (Chrome DevTools Protocol - 100% isTrusted)
chrome.runtime.onInstalled.addListener(() => {
  console.log("⚡ PicMaze Flow Hardware Automation Engine Installed");
});

// Listen for hardware dispatch requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DISPATCH_HARDWARE_SUBMIT') {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tabId found' });
      return true;
    }

    executeHardwareSequence(tabId, request.prompt)
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error('Hardware sequence error:', err);
        sendResponse({ success: false, error: err.toString() });
      });

    return true; // Keep message channel open for async response
  }
});

async function executeHardwareSequence(tabId, promptText) {
  const target = { tabId };

  try {
    // 1. Attach native Chromium debugger
    try {
      await chrome.debugger.attach(target, '1.3');
    } catch (e) {
      // If already attached, ignore
    }

    // 2. Select All and Delete existing text at OS level
    await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      commands: ['selectAll', 'delete']
    });

    await new Promise(r => setTimeout(r, 100));

    // 3. Type text as Native OS Hardware Input (Updates internal React/Lit state 100%)
    if (promptText) {
      await chrome.debugger.sendCommand(target, 'Input.insertText', {
        text: promptText
      });
    }

    // Small pause to let Google Flow's reactive store enable the submission state
    await new Promise(r => setTimeout(r, 350));

    // 4. Dispatch Genuine Hardware 'Enter' Key (isTrusted = true)
    await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      macCharCode: 13,
      unmodifiedText: '\r',
      text: '\r',
      key: 'Enter',
      code: 'Enter'
    });

    await chrome.debugger.sendCommand(target, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
      macCharCode: 13,
      unmodifiedText: '\r',
      text: '\r',
      key: 'Enter',
      code: 'Enter'
    });

    // Small wait then detach cleanly
    await new Promise(r => setTimeout(r, 200));
    try {
      await chrome.debugger.detach(target);
    } catch (e) {}

  } catch (err) {
    try {
      await chrome.debugger.detach(target);
    } catch (e) {}
    throw err;
  }
}

