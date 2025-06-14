// Background script for Smart Input Box Firefox extension

// Initialize extension
browser.runtime.onInstalled.addListener(() => {
  // Set default settings
  browser.storage.local.set({
    mode: "habit", // 'habit' or 'advanced'
    position: "top", // 'top' or 'center'
    enabled: true,
    geminiApiKey: "",
    siteSettings: {},
  });

  // Update badge
  updateBadge("habit");
});

// Handle keyboard shortcuts
browser.commands.onCommand.addListener(async (command) => {
  let tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

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
  const result = await browser.storage.local.get(["mode"]);
  const newMode = result.mode === "habit" ? "advanced" : "habit";

  await browser.storage.local.set({ mode: newMode });
  updateBadge(newMode);

  // Notify content script
  browser.tabs.sendMessage(tabId, {
    action: "modeChanged",
    mode: newMode,
  });
}

// Toggle floating box visibility
async function toggleFloatingBox(tabId) {
  browser.tabs.sendMessage(tabId, {
    action: "toggleFloatingBox",
  });
}

// Summarize inputs using Gemini
async function summarizeInputs(tabId) {
  const result = await browser.storage.local.get(["geminiApiKey", "mode"]);

  if (result.mode !== "advanced" || !result.geminiApiKey) {
    browser.tabs.sendMessage(tabId, {
      action: "showError",
      message: "AI features require Advanced mode and Gemini API key",
    });
    return;
  }

  // Get inputs from content script
  browser.tabs.sendMessage(tabId, {
    action: "getInputsForSummary",
  });
}

// Handle messages from content script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "llmRequest") {
    handleGeminiRequest(request, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === "summarizeText") {
    handleGeminiSummarizeRequest(request, sendResponse);
    return true;
  } else if (request.action === "updateSiteSettings") {
    updateSiteSettings(request.url, request.settings);
  }
});

// Handle Gemini CSS generation request
async function handleGeminiRequest(request, sendResponse) {
  const result = await browser.storage.local.get(["geminiApiKey"]);

  if (!result.geminiApiKey) {
    sendResponse({ error: "No Gemini API key configured" });
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${result.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a CSS expert. Given HTML content, generate CSS that:
1. Simplifies the layout
2. Keeps input fields visible and accessible
3. Reduces visual clutter
4. Maintains usability
Return ONLY valid CSS code, no explanations or markdown formatting.

HTML content to improve:
${request.html}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    const data = await response.json();

    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts[0]
    ) {
      sendResponse({
        success: true,
        css: data.candidates[0].content.parts[0].text.trim(),
      });
    } else {
      sendResponse({ error: "Invalid response from Gemini API" });
    }
  } catch (error) {
    sendResponse({ error: `Gemini API request failed: ${error.message}` });
  }
}

// Handle text summarization request with Gemini
async function handleGeminiSummarizeRequest(request, sendResponse) {
  const result = await browser.storage.local.get(["geminiApiKey"]);

  if (!result.geminiApiKey) {
    sendResponse({ error: "No Gemini API key configured" });
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${result.geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Summarize the following text concisely. Keep it under 25% of the original length. Focus on key points and main ideas:

${request.text}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const data = await response.json();

    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts[0]
    ) {
      sendResponse({
        success: true,
        summary: data.candidates[0].content.parts[0].text.trim(),
      });
    } else {
      sendResponse({ error: "Invalid response from Gemini API" });
    }
  } catch (error) {
    sendResponse({ error: `Gemini API request failed: ${error.message}` });
  }
}

// Update badge to show current mode
function updateBadge(mode) {
  const text = mode === "habit" ? "H" : "A";
  const color = mode === "habit" ? "#4CAF50" : "#2196F3";

  // Firefox uses browserAction
  if (browser.browserAction && browser.browserAction.setBadgeText) {
    browser.browserAction.setBadgeText({ text });
    browser.browserAction.setBadgeBackgroundColor({ color });
  }
}

// Update site-specific settings
async function updateSiteSettings(url, settings) {
  const result = await browser.storage.local.get(["siteSettings"]);
  const siteSettings = result.siteSettings || {};

  const domain = new URL(url).hostname;
  siteSettings[domain] = { ...siteSettings[domain], ...settings };

  await browser.storage.local.set({ siteSettings });
}
