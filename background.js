// Background service worker for Smart Input Box extension

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.local.set({
    mode: "habit", // 'habit' or 'advanced'
    position: "top", // 'top' or 'center'
    enabled: true,
    apiKey: "",
    siteSettings: {},
  });

  // Update badge
  updateBadge("habit");
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  switch (command) {
    case "toggle-mode":
      await toggleMode(tab.id);
      break;
    case "toggle-floating-box":
      await toggleFloatingBox(tab.id);
      break;
    case "summarize-inputs":
      await summarizeInputs(tab.id);
      break;
  }
});

// Toggle between Habit and Advanced mode
async function toggleMode(tabId) {
  const result = await chrome.storage.local.get(["mode"]);
  const newMode = result.mode === "habit" ? "advanced" : "habit";

  await chrome.storage.local.set({ mode: newMode });
  updateBadge(newMode);

  // Notify content script
  chrome.tabs.sendMessage(tabId, {
    action: "modeChanged",
    mode: newMode,
  });
}

// Toggle floating box visibility
async function toggleFloatingBox(tabId) {
  chrome.tabs.sendMessage(tabId, {
    action: "toggleFloatingBox",
  });
}

// Summarize inputs using LLM
async function summarizeInputs(tabId) {
  const result = await chrome.storage.local.get(["apiKey", "mode"]);

  if (result.mode !== "advanced" || !result.apiKey) {
    chrome.tabs.sendMessage(tabId, {
      action: "showError",
      message: "LLM features require Advanced mode and API key",
    });
    return;
  }

  // Get inputs from content script
  chrome.tabs.sendMessage(tabId, {
    action: "getInputsForSummary",
  });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "llmRequest") {
    handleLLMRequest(request, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === "summarizeText") {
    handleSummarizeRequest(request, sendResponse);
    return true;
  } else if (request.action === "updateSiteSettings") {
    updateSiteSettings(request.url, request.settings);
  }
});

// Handle LLM CSS generation request
async function handleLLMRequest(request, sendResponse) {
  const result = await chrome.storage.local.get(["apiKey"]);

  if (!result.apiKey) {
    sendResponse({ error: "No API key configured" });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${result.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a CSS expert. Given HTML content, generate CSS that:
1. Simplifies the layout
2. Keeps input fields visible and accessible
3. Reduces visual clutter
4. Maintains usability
Return ONLY valid CSS code, no explanations.`,
          },
          {
            role: "user",
            content: `Please generate CSS to improve this page layout:\n${request.html}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      sendResponse({
        success: true,
        css: data.choices[0].message.content.trim(),
      });
    } else {
      sendResponse({ error: "Invalid response from LLM" });
    }
  } catch (error) {
    sendResponse({ error: `LLM request failed: ${error.message}` });
  }
}

// Handle text summarization request
async function handleSummarizeRequest(request, sendResponse) {
  const result = await chrome.storage.local.get(["apiKey"]);

  if (!result.apiKey) {
    sendResponse({ error: "No API key configured" });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${result.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Summarize the given text concisely. Keep it under 25% of the original length. Focus on key points and main ideas.",
          },
          {
            role: "user",
            content: request.text,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      sendResponse({
        success: true,
        summary: data.choices[0].message.content.trim(),
      });
    } else {
      sendResponse({ error: "Invalid response from LLM" });
    }
  } catch (error) {
    sendResponse({ error: `Summarization failed: ${error.message}` });
  }
}

// Update badge to show current mode
function updateBadge(mode) {
  const text = mode === "habit" ? "H" : "A";
  const color = mode === "habit" ? "#4CAF50" : "#2196F3";

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Update site-specific settings
async function updateSiteSettings(url, settings) {
  const result = await chrome.storage.local.get(["siteSettings"]);
  const siteSettings = result.siteSettings || {};

  const domain = new URL(url).hostname;
  siteSettings[domain] = { ...siteSettings[domain], ...settings };

  await chrome.storage.local.set({ siteSettings });
}
