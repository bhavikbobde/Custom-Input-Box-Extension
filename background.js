browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.set({
    mode: "habit",
    position: "top",
    enabled: true,
    geminiApiKey: "",
    siteSettings: {},
  });

  updateBadge("habit");
});

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

async function toggleMode(tabId) {
  const result = await browser.storage.local.get(["mode"]);
  const newMode = result.mode === "habit" ? "advanced" : "habit";

  await browser.storage.local.set({ mode: newMode });
  updateBadge(newMode);

  browser.tabs.sendMessage(tabId, {
    action: "modeChanged",
    mode: newMode,
  });
}

async function toggleFloatingBox(tabId) {
  browser.tabs.sendMessage(tabId, {
    action: "toggleFloatingBox",
  });
}

async function summarizeInputs(tabId) {
  const result = await browser.storage.local.get(["geminiApiKey", "mode"]);

  if (result.mode !== "advanced" || !result.geminiApiKey) {
    browser.tabs.sendMessage(tabId, {
      action: "showError",
      message: "AI features require Advanced mode and Gemini API key",
    });
    return;
  }

  browser.tabs.sendMessage(tabId, {
    action: "getInputsForSummary",
  });
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "llmRequest") {
    handleGeminiRequest(request, sendResponse);
    return true;
  } else if (request.action === "summarizeText") {
    handleGeminiSummarizeRequest(request, sendResponse);
    return true;
  } else if (request.action === "updateSiteSettings") {
    updateSiteSettings(request.url, request.settings);
  }
});

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

function updateBadge(mode) {
  const text = mode === "habit" ? "H" : "A";
  const color = mode === "habit" ? "#4CAF50" : "#2196F3";

  if (browser.browserAction && browser.browserAction.setBadgeText) {
    browser.browserAction.setBadgeText({ text });
    browser.browserAction.setBadgeBackgroundColor({ color });
  }
}

async function updateSiteSettings(url, settings) {
  const result = await browser.storage.local.get(["siteSettings"]);
  const siteSettings = result.siteSettings || {};

  const domain = new URL(url).hostname;
  siteSettings[domain] = { ...siteSettings[domain], ...settings };

  await browser.storage.local.set({ siteSettings });
}
