class PopupManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.loadCurrentSite();
  }

  async loadSettings() {
    this.settings = await browser.storage.local.get([
      "enabled",
      "mode",
      "position",
      "geminiApiKey",
    ]);

    this.settings.enabled = this.settings.enabled !== false;
    this.settings.mode = this.settings.mode || "habit";
    this.settings.position = this.settings.position || "top";
    this.settings.geminiApiKey = this.settings.geminiApiKey || "";
  }

  setupEventListeners() {
    document.getElementById("enabledToggle").addEventListener("change", (e) => {
      this.updateSetting("enabled", e.target.checked);
    });

    document.getElementById("habitMode").addEventListener("click", () => {
      this.updateSetting("mode", "habit");
    });

    document.getElementById("advancedMode").addEventListener("click", () => {
      this.updateSetting("mode", "advanced");
    });

    document.getElementById("topPosition").addEventListener("click", () => {
      this.updateSetting("position", "top");
    });

    document.getElementById("centerPosition").addEventListener("click", () => {
      this.updateSetting("position", "center");
    });

    document.getElementById("geminiApiKey").addEventListener("input", (e) => {
      this.updateSetting("geminiApiKey", e.target.value);
    });

    document.getElementById("toggleApiKey").addEventListener("click", () => {
      this.toggleApiKeyVisibility();
    });

    document.getElementById("openShortcuts").addEventListener("click", () => {
      browser.tabs.create({ url: "about:addons" });
    });

    document.getElementById("helpLink").addEventListener("click", (e) => {
      e.preventDefault();
      this.showHelp();
    });
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await browser.storage.local.set({ [key]: value });
    this.updateUI();

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) {
        browser.tabs.sendMessage(tab.id, {
          action: "settingsChanged",
          settings: this.settings,
        });
      }
    } catch (error) {
      console.log("Could not notify content script:", error);
    }
  }

  updateUI() {
    document.getElementById("enabledToggle").checked = this.settings.enabled;

    const modeText =
      this.settings.mode === "habit" ? "Habit Mode" : "Advanced Mode";
    document.getElementById("modeIndicator").textContent = modeText;

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    if (this.settings.mode === "habit") {
      document.getElementById("habitMode").classList.add("active");
    } else {
      document.getElementById("advancedMode").classList.add("active");
    }

    document.querySelectorAll(".position-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    if (this.settings.position === "top") {
      document.getElementById("topPosition").classList.add("active");
    } else {
      document.getElementById("centerPosition").classList.add("active");
    }

    document.getElementById("geminiApiKey").value = this.settings.geminiApiKey;

    const advancedSection = document.getElementById("advancedSettings");
    if (this.settings.mode === "advanced") {
      advancedSection.style.display = "block";
    } else {
      advancedSection.style.display = "none";
    }
  }

  toggleApiKeyVisibility() {
    const input = document.getElementById("geminiApiKey");
    const button = document.getElementById("toggleApiKey");

    if (input.type === "password") {
      input.type = "text";
      button.textContent = "🙈";
    } else {
      input.type = "password";
      button.textContent = "👁️";
    }
  }

  async loadCurrentSite() {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) {
        const url = new URL(tab.url);
        document.getElementById("currentSite").textContent = url.hostname;

        browser.tabs.sendMessage(
          tab.id,
          {
            action: "getInputCount",
          },
          (response) => {
            if (response && response.count !== undefined) {
              document.getElementById("activeInputs").textContent =
                response.count;
            }
          }
        );
      }
    } catch (error) {
      document.getElementById("currentSite").textContent = "N/A";
    }
  }

  showHelp() {
    const helpWindow = window.open("", "_blank", "width=500,height=600");
    helpWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Smart Input Box - Help</title>
        <style>
          body { font-family: system-ui; padding: 20px; line-height: 1.6; }
          h1 { color: #2196F3; }
          h2 { color: #333; margin-top: 20px; }
          .shortcut { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        </style>
      </head>
      <body>
        <h1>Smart Input Box - Help</h1>
        
        <h2>How It Works</h2>
        <p>Smart Input Box provides a floating textbox that appears when you focus on any input field, allowing you to type comfortably without scrolling.</p>
        
        <h2>Modes</h2>
        <p><strong>Habit Mode:</strong> Basic floating textbox with two-way sync</p>
        <p><strong>Advanced Mode:</strong> Includes AI-powered features like CSS improvements and text summarization</p>
        
        <h2>Keyboard Shortcuts</h2>
        <p><span class="shortcut">Ctrl+Shift+Y</span> - Toggle between Habit and Advanced mode</p>
        <p><span class="shortcut">Ctrl+Shift+U</span> - Show/hide floating box</p>
        <p><span class="shortcut">Ctrl+Shift+S</span> - Summarize inputs (Advanced mode)</p>
        <p><span class="shortcut">Esc</span> - Close floating box</p>
        
        <h2>Advanced Features</h2>
        <p>To use AI features, you need to provide a Google Gemini API key in the settings. This enables:</p>
        <ul>
          <li>CSS improvements for better page layout</li>
          <li>Text summarization for long inputs</li>
        </ul>
        
        <h2>Getting a Gemini API Key</h2>
        <ol>
          <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
          <li>Sign in with your Google account</li>
          <li>Click "Create API Key"</li>
          <li>Copy the key and paste it in the extension settings</li>
          <li>Switch to Advanced mode to use AI features</li>
        </ol>
        
        <h2>Privacy</h2>
        <p>Your API key is stored locally and never transmitted except to Google's Gemini API. No HTML content is permanently stored.</p>
        
        <h2>Keyboard Shortcuts Management</h2>
        <p>To customize keyboard shortcuts, go to about:addons, find this extension, and click on the gear icon to access preferences.</p>
        
        <h2>Support</h2>
        <p>For issues or questions, please visit our GitHub repository or contact support.</p>
      </body>
      </html>
    `);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
