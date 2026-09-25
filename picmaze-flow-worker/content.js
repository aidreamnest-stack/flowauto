// PicMaze Batch Automation Engine for Google Flow (flow.google.com) - v1.6.0
(function() {
  if (window.__PICMAZE_WORKER_ACTIVE__) return;
  window.__PICMAZE_WORKER_ACTIVE__ = true;

  let isRunning = false;
  let currentIteration = 0;
  let maxIterations = 10;
  let baseInterval = 15;
  let activePrompts = [];
  let soundEnabled = true;
  let loopTimeout = null;

  console.log("⚡ Flow Automation Active (Multi-Prompt Round-Robin Engine v1.6.0)");

  // High-fidelity melodic completion chime via Web Audio API (zero external files required)
  function playCompletionChime() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Ascending 3-tone chime: D5 (587Hz) -> G5 (784Hz) -> B5 (988Hz)
      const notes = [
        { freq: 587.33, time: 0.0, dur: 0.12 },
        { freq: 783.99, time: 0.10, dur: 0.14 },
        { freq: 987.77, time: 0.22, dur: 0.40 }
      ];

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.exponentialRampToValueAtTime(0.3, now + n.time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur + 0.05);
      });
    } catch (e) {
      console.warn("Chime audio error:", e);
    }
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_WORKER') {
      if (Array.isArray(request.prompts) && request.prompts.length > 0) {
        activePrompts = request.prompts.map(p => p.trim()).filter(p => p.length > 0);
      } else if (request.prompt) {
        activePrompts = [request.prompt.trim()];
      }

      if (activePrompts.length === 0) {
        activePrompts = [""];
      }

      maxIterations = request.limit || 10;
      baseInterval = request.interval || 15;
      soundEnabled = typeof request.sound === 'boolean' ? request.sound : true;
      isRunning = true;
      currentIteration = 0;
      updatePageBadge(`Started (${activePrompts.length} Prompts)`, 0, maxIterations, true);
      runIteration();
      sendResponse({ status: 'STARTED' });
    } else if (request.action === 'STOP_WORKER') {
      stopWorker('Stopped');
      sendResponse({ status: 'STOPPED' });
    }
  });

  function stopWorker(reason = 'Completed') {
    isRunning = false;
    if (loopTimeout) clearTimeout(loopTimeout);
    chrome.storage.local.set({ pm_running: false });

    if (reason.includes('Finished') || reason.includes('Completed')) {
      playCompletionChime();
    }

    try {
      chrome.runtime.sendMessage({ action: 'WORKER_COMPLETED', reason });
    } catch(e) {}
    updatePageBadge(reason, currentIteration, maxIterations, false);
  }

  // Precision Finder for Google Flow's Bottom Prompt Box
  function getBottomPromptBox() {
    const screenBottomThreshold = window.innerHeight * 0.55;

    const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"], div[role="textbox"]'));
    const bottomCandidates = candidates.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.top > screenBottomThreshold && rect.width > 120 && rect.height > 15;
    });

    for (const el of bottomCandidates) {
      const ph = (el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || el.getAttribute('aria-label') || '').toLowerCase();
      if (ph.includes('create') || ph.includes('what do you') || ph.includes('prompt') || el.tagName.toLowerCase() === 'textarea' || el.isContentEditable) {
        return el;
      }
    }

    if (bottomCandidates.length > 0) {
      return bottomCandidates[0];
    }

    const centerX = window.innerWidth / 2;
    const probeY = window.innerHeight - 80;
    const centerEl = document.elementFromPoint(centerX, probeY);
    if (centerEl) {
      return centerEl.querySelector('textarea, [contenteditable="true"], input') || centerEl;
    }

    return null;
  }

  // Multi-tier human jitter calculation (12s, 16s, 14s, 18s, 15s)
  function calculateHumanJitterInterval(base) {
    const jitterSwing = Math.floor(Math.random() * 7) - 2; // -2 to +4
    let calculated = base + jitterSwing;
    if (calculated < 10) calculated = 10 + Math.floor(Math.random() * 3);

    // Human inspection pause every 4 generations (+3s to +5s)
    if (currentIteration > 0 && currentIteration % 4 === 0) {
      calculated += Math.floor(Math.random() * 3) + 3;
    }
    return calculated;
  }

  async function runIteration() {
    if (!isRunning) return;

    if (currentIteration >= maxIterations) {
      stopWorker('✅ Batch Finished');
      return;
    }

    const promptBox = getBottomPromptBox();

    if (!promptBox) {
      updatePageBadge('Locating prompt box...', currentIteration, maxIterations, true);
      loopTimeout = setTimeout(runIteration, 2000);
      return;
    }

    currentIteration++;

    // Calculate active prompt index via fair round-robin division
    const promptIndex = (currentIteration - 1) % activePrompts.length;
    const currentPrompt = activePrompts[promptIndex];
    const promptDisplayNum = promptIndex + 1;
    const totalPromptsCount = activePrompts.length;

    updatePageBadge(`Prompt #${promptDisplayNum}/${totalPromptsCount} · Typing & Enter...`, currentIteration, maxIterations, true);

    try {
      chrome.runtime.sendMessage({
        action: 'WORKER_PROGRESS',
        status: `P#${promptDisplayNum}/${totalPromptsCount}`,
        current: currentIteration,
        max: maxIterations,
        activePromptIndex: promptDisplayNum,
        totalPrompts: totalPromptsCount
      });
    } catch(e) {}

    // 1. Focus prompt box
    promptBox.focus();
    promptBox.click();
    await new Promise(r => setTimeout(r, 200));

    // 2. Dispatch Master Prompt & Hardware Enter (isTrusted: true)
    chrome.runtime.sendMessage({
      action: 'DISPATCH_HARDWARE_SUBMIT',
      prompt: currentPrompt
    }, (response) => {
      console.log(`⚡ [Batch ${currentIteration}/${maxIterations}] Prompt #${promptDisplayNum} Dispatched:`, response);
    });

    // 3. Calculate dynamic jitter interval for next generation
    const nextIntervalSec = calculateHumanJitterInterval(baseInterval);

    let countdown = nextIntervalSec;
    const countdownTimer = setInterval(() => {
      if (!isRunning) {
        clearInterval(countdownTimer);
        return;
      }
      countdown--;
      if (countdown > 0) {
        updatePageBadge(`Prompt #${promptDisplayNum}/${totalPromptsCount} · Next in ${countdown}s`, currentIteration, maxIterations, true);
      } else {
        clearInterval(countdownTimer);
      }
    }, 1000);

    loopTimeout = setTimeout(() => {
      if (isRunning) {
        runIteration();
      }
    }, nextIntervalSec * 1000);
  }

  // Floating HUD Badge on Google Flow
  function updatePageBadge(status, current, max, active = true) {
    let badge = document.getElementById('picmaze-floating-badge');
    if (!badge) {
      const iconUrl = chrome.runtime.getURL('icons/icon48.png');
      badge = document.createElement('div');
      badge.id = 'picmaze-floating-badge';
      badge.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${iconUrl}" style="width:16px; height:16px; border-radius:3px; object-fit:cover;">
          <div id="pm-badge-dot" style="width:7px; height:7px; border-radius:50%; background:#10B981; box-shadow:0 0 10px #10B981;"></div>
          <span id="pm-badge-text" style="font-weight:700; font-size:12px; color:#F8FAFC; letter-spacing:0.3px;">Flow Automation</span>
        </div>
      `;
      Object.assign(badge.style, {
        position: 'fixed',
        top: '16px',
        right: '16px',
        background: 'rgba(13, 17, 23, 0.94)',
        border: '1px solid rgba(48, 54, 61, 0.9)',
        borderRadius: '8px',
        padding: '8px 14px',
        zIndex: '99999999',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
        pointerEvents: 'none'
      });
      document.body.appendChild(badge);
    }

    const textEl = document.getElementById('pm-badge-text');
    const dotEl = document.getElementById('pm-badge-dot');

    if (textEl && dotEl) {
      textEl.textContent = `⚡ Flow Automation: ${status} (${current}/${max})`;
      dotEl.style.background = active ? '#10B981' : '#94A3B8';
      dotEl.style.boxShadow = active ? '0 0 10px #10B981' : 'none';
    }
  }

  // Only listen to explicit user triggers from popup (never hijack fresh tabs automatically)
})();
