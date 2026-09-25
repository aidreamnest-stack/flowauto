document.addEventListener('DOMContentLoaded', async () => {
  const promptsContainer = document.getElementById('promptsContainer');
  const addPromptBtn = document.getElementById('addPromptBtn');
  const promptsCountLabel = document.getElementById('promptsCountLabel');
  const limitInput = document.getElementById('limitInput');
  const intervalInput = document.getElementById('intervalInput');
  const soundToggle = document.getElementById('soundToggle');
  const distributionHintText = document.getElementById('distributionHintText');
  const statusVal = document.getElementById('statusVal');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');

  let prompts = [''];

  // Load saved configuration from storage
  chrome.storage.local.get(['pm_prompts', 'pm_prompt', 'pm_limit', 'pm_interval', 'pm_sound', 'pm_running', 'pm_current', 'pm_max', 'pm_active_prompt_index', 'pm_total_prompts'], (data) => {
    if (Array.isArray(data.pm_prompts) && data.pm_prompts.length > 0) {
      prompts = data.pm_prompts;
    } else if (data.pm_prompt && typeof data.pm_prompt === 'string') {
      prompts = [data.pm_prompt];
    } else {
      prompts = [''];
    }

    if (data.pm_limit) limitInput.value = data.pm_limit;
    if (data.pm_interval) intervalInput.value = data.pm_interval;
    if (typeof data.pm_sound === 'boolean') soundToggle.checked = data.pm_sound;

    renderPrompts();
    updateDistributionHint();

    if (data.pm_running) {
      setRunningUI(
        data.pm_current || 0,
        data.pm_max || data.pm_limit || 10,
        data.pm_active_prompt_index || 1,
        data.pm_total_prompts || prompts.length
      );
    }
  });

  function renderPrompts() {
    promptsContainer.innerHTML = '';
    promptsCountLabel.textContent = `PROMPT LIST (${prompts.length})`;

    prompts.forEach((text, index) => {
      const card = document.createElement('div');
      card.className = 'prompt-card';
      card.dataset.index = index;

      const header = document.createElement('div');
      header.className = 'prompt-card-header';

      const tag = document.createElement('span');
      tag.className = 'prompt-tag';
      tag.textContent = `PROMPT #${index + 1}`;

      header.appendChild(tag);

      // Only show delete button if more than 1 prompt exists
      if (prompts.length > 1) {
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-del-prompt';
        delBtn.innerHTML = '✕';
        delBtn.title = `Remove Prompt #${index + 1}`;
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          prompts.splice(index, 1);
          savePrompts();
          renderPrompts();
          updateDistributionHint();
        });
        header.appendChild(delBtn);
      }

      const textarea = document.createElement('textarea');
      textarea.placeholder = `Enter prompt #${index + 1} (e.g. Cyberpunk samurai in rain, dark background, 4k wallpaper...)`;
      textarea.value = text;
      textarea.addEventListener('input', () => {
        prompts[index] = textarea.value;
        savePrompts();
        updateDistributionHint();
      });

      card.appendChild(header);
      card.appendChild(textarea);
      promptsContainer.appendChild(card);
    });
  }

  function savePrompts() {
    chrome.storage.local.set({ pm_prompts: prompts });
  }

  function updateDistributionHint() {
    const validPromptsCount = prompts.filter(p => p.trim().length > 0).length || 1;
    const totalBatch = parseInt(limitInput.value) || 10;
    const perPrompt = Math.floor(totalBatch / validPromptsCount);
    const remainder = totalBatch % validPromptsCount;

    if (validPromptsCount === 1) {
      distributionHintText.textContent = `All ${totalBatch} generations will use 1 prompt`;
    } else {
      const summary = remainder === 0
        ? `~${perPrompt} per prompt`
        : `~${perPrompt} to ${perPrompt + 1} per prompt`;
      distributionHintText.textContent = `${totalBatch} batch ÷ ${validPromptsCount} prompts (${summary} round-robin)`;
    }
  }

  // Add Prompt button handler
  addPromptBtn.addEventListener('click', () => {
    if (prompts.length >= 10) {
      alert("You can add up to 10 prompts per batch.");
      return;
    }
    prompts.push('');
    savePrompts();
    renderPrompts();
    updateDistributionHint();
    
    // Focus newly added prompt textarea
    setTimeout(() => {
      const textareas = promptsContainer.querySelectorAll('textarea');
      if (textareas.length > 0) {
        textareas[textareas.length - 1].focus();
      }
    }, 50);
  });

  limitInput.addEventListener('input', () => {
    chrome.storage.local.set({ pm_limit: parseInt(limitInput.value) || 10 });
    updateDistributionHint();
  });

  intervalInput.addEventListener('input', () => {
    chrome.storage.local.set({ pm_interval: parseInt(intervalInput.value) || 15 });
  });

  soundToggle.addEventListener('change', () => {
    chrome.storage.local.set({ pm_sound: soundToggle.checked });
  });

  function setRunningUI(current, max, promptIdx = 1, totalP = 1) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    statusVal.textContent = `RUNNING (${current}/${max}) · P#${promptIdx}`;
    statusVal.style.color = '#34D399';
  }

  function setIdleUI(msg = 'READY') {
    startBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    statusVal.textContent = msg;
    statusVal.style.color = '#94A3B8';
  }

  // Start generation batch
  startBtn.addEventListener('click', async () => {
    const validPrompts = prompts.map(p => p.trim()).filter(p => p.length > 0);
    const limit = parseInt(limitInput.value) || 10;
    const interval = parseInt(intervalInput.value) || 15;
    const soundEnabled = soundToggle.checked;

    if (validPrompts.length === 0) {
      alert("Please enter at least 1 prompt before starting!");
      return;
    }

    chrome.storage.local.set({
      pm_prompts: prompts,
      pm_limit: limit,
      pm_interval: interval,
      pm_sound: soundEnabled,
      pm_running: true,
      pm_current: 0,
      pm_max: limit,
      pm_active_prompt_index: 1,
      pm_total_prompts: validPrompts.length
    });

    setRunningUI(0, limit, 1, validPrompts.length);

    // Send command to active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'START_WORKER',
        prompts: validPrompts,
        limit: limit,
        interval: interval,
        sound: soundEnabled
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          statusVal.textContent = 'RELOAD FLOW PAGE ONCE';
          statusVal.style.color = '#EF4444';
        }
      });
    }
  });

  // Stop generation batch
  stopBtn.addEventListener('click', async () => {
    chrome.storage.local.set({ pm_running: false });
    setIdleUI('STOPPED');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'STOP_WORKER' });
    }
  });

  // Listen for progress updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'WORKER_PROGRESS') {
      setRunningUI(message.current, message.max, message.activePromptIndex || 1, message.totalPrompts || 1);
    } else if (message.action === 'WORKER_COMPLETED') {
      setIdleUI(message.reason || 'COMPLETED');
    }
  });
});
