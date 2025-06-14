// Content script for Smart Input Box extension

class SmartInputBox {
  constructor() {
    this.floatingBox = null;
    this.currentInput = null;
    this.isEnabled = true;
    this.mode = "habit";
    this.position = "top";
    this.syncTimeout = null;
    this.observer = null;
    this.appliedCSS = null;
    this.summaryPanel = null;

    this.init();
  }

  async init() {
    try {
      console.log("🚀 Smart Input Box initializing...");

      // Load settings
      await this.loadSettings();
      console.log("⚙️ Settings loaded:", {
        enabled: this.isEnabled,
        mode: this.mode,
        position: this.position,
      });

      // Set up input listeners
      this.setupInputListeners();
      console.log("👂 Input listeners set up");

      // Set up mutation observer for dynamic content
      this.setupMutationObserver();
      console.log("👀 Mutation observer set up");

      // Listen for messages from background script
      this.setupMessageListener();
      console.log("📨 Message listener set up");

      console.log("✅ Smart Input Box initialized successfully");
    } catch (error) {
      console.error("❌ Smart Input Box initialization failed:", error);
    }
  }

  async loadSettings() {
    const result = await chrome.storage.local.get([
      "enabled",
      "mode",
      "position",
      "siteSettings",
    ]);

    this.isEnabled = result.enabled !== false;
    this.mode = result.mode || "habit";
    this.position = result.position || "top";

    // Load site-specific settings
    const siteSettings = result.siteSettings || {};
    const domain = window.location.hostname;
    if (siteSettings[domain]) {
      this.position = siteSettings[domain].position || this.position;
    }
  }

  setupInputListeners() {
    // Use event delegation for better performance
    document.addEventListener("focusin", this.handleFocusIn.bind(this));
    document.addEventListener("focusout", this.handleFocusOut.bind(this));
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new inputs were added
              const inputs = node.querySelectorAll("input, textarea");
              // Observer is already set up via event delegation
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case "modeChanged":
          this.mode = request.mode;
          this.updateFloatingBox();
          break;
        case "toggleFloatingBox":
          this.toggleFloatingBox();
          break;
        case "getInputsForSummary":
          this.getInputsForSummary();
          break;
        case "showError":
          this.showNotification(request.message, "error");
          break;
        case "getInputCount":
          const inputCount =
            document.querySelectorAll("input, textarea").length;
          sendResponse({ count: inputCount });
          break;
        case "settingsChanged":
          this.loadSettings();
          break;
      }
    });
  }

  handleFocusIn(event) {
    const target = event.target;

    console.log("🎯 Focus in:", target.tagName, target.type, target.className);

    // Skip if it's our floating box elements
    if (target.closest(".smart-input-floating-box")) {
      console.log("⏭️ Skipping focus - floating box element");
      return;
    }

    if (!this.isInputElement(target)) {
      console.log("⏭️ Skipping focus - not an input element");
      return;
    }

    if (!this.isEnabled) {
      console.log("⏭️ Skipping focus - extension disabled");
      return;
    }

    console.log("✅ Valid input focused, showing floating box");
    this.currentInput = target;

    // Debounce to avoid multiple rapid calls
    clearTimeout(this.focusTimeout);
    this.focusTimeout = setTimeout(() => {
      this.showFloatingBox();
    }, 50); // Increased debounce time
  }

  handleFocusOut(event) {
    // Don't hide if focus moved to floating box
    if (this.floatingBox && this.floatingBox.contains(event.relatedTarget)) {
      return;
    }

    // Don't hide if focus moved to another input
    if (event.relatedTarget && this.isInputElement(event.relatedTarget)) {
      return;
    }

    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      const activeElement = document.activeElement;

      // Don't hide if an input is focused or floating box is focused
      if (
        activeElement &&
        (this.isInputElement(activeElement) ||
          (this.floatingBox && this.floatingBox.contains(activeElement)))
      ) {
        return;
      }

      this.hideFloatingBox();
    }, 100); // Increased timeout to prevent flickering
  }

  handleKeyDown(event) {
    if (event.key === "Escape" && this.floatingBox) {
      this.hideFloatingBox();
      if (this.currentInput) {
        this.currentInput.focus();
      }
    }
  }

  isInputElement(element) {
    return (
      element &&
      (element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.contentEditable === "true")
    );
  }

  showFloatingBox() {
    if (!this.currentInput) {
      console.log("❌ Cannot show floating box - no current input");
      return;
    }

    // Don't create multiple boxes
    if (this.floatingBox) {
      console.log("⏭️ Floating box already exists");
      return;
    }

    console.log("📦 Creating floating box...");
    const startTime = performance.now();

    this.floatingBox = this.createFloatingBox();
    document.body.appendChild(this.floatingBox);

    // Focus the floating box
    const textArea = this.floatingBox.querySelector("textarea");
    const currentValue = this.getInputValue(this.currentInput);
    textArea.value = currentValue;

    console.log("💬 Initial value:", currentValue);

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(textArea.value.length, textArea.value.length);
      console.log("🎯 Floating box focused");
    }, 10);

    // Set up two-way binding
    this.setupTwoWayBinding(textArea);

    const endTime = performance.now();
    console.log(`✅ Floating box shown in ${endTime - startTime}ms`);
  }

  createFloatingBox() {
    const box = document.createElement("div");
    box.className = "smart-input-floating-box";
    box.style.cssText = this.getFloatingBoxStyles();

    const header = document.createElement("div");
    header.className = "smart-input-header";
    header.innerHTML = `
      <span class="smart-input-title">Smart Input (${
        this.mode === "habit" ? "Habit" : "Advanced"
      })</span>
      <div class="smart-input-controls">
        ${
          this.mode === "advanced"
            ? '<button class="smart-input-btn" data-action="css">Fix CSS</button>'
            : ""
        }
        <button class="smart-input-btn" data-action="position">Position</button>
        <button class="smart-input-btn" data-action="close">×</button>
      </div>
    `;

    const textArea = document.createElement("textarea");
    textArea.className = "smart-input-textarea";
    textArea.placeholder = "Type here...";

    box.appendChild(header);
    box.appendChild(textArea);

    // Add event listeners
    header.addEventListener("click", this.handleHeaderClick.bind(this));

    return box;
  }

  getFloatingBoxStyles() {
    const baseStyles = `
      position: fixed;
      z-index: 9999999;
      background: white;
      border: 2px solid #2196F3;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      min-width: 400px;
      max-width: 600px;
      width: 90vw;
    `;

    if (this.position === "top") {
      return (
        baseStyles +
        `
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
      `
      );
    } else {
      return (
        baseStyles +
        `
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      `
      );
    }
  }

  setupTwoWayBinding(textArea) {
    let lastValue = textArea.value;

    // From floating box to original input
    const syncToOriginal = () => {
      if (textArea.value !== lastValue) {
        this.setInputValue(this.currentInput, textArea.value);
        lastValue = textArea.value;
      }
    };

    // From original input to floating box
    const syncToFloating = () => {
      const currentValue = this.getInputValue(this.currentInput);
      if (currentValue !== textArea.value) {
        textArea.value = currentValue;
        lastValue = currentValue;
      }
    };

    // Debounced sync
    textArea.addEventListener("input", () => {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(syncToOriginal, 5);
    });

    // Monitor original input for external changes
    this.originalInputListener = () => {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(syncToFloating, 5);
    };

    this.currentInput.addEventListener("input", this.originalInputListener);
  }

  handleHeaderClick(event) {
    const action = event.target.getAttribute("data-action");

    switch (action) {
      case "close":
        this.hideFloatingBox();
        break;
      case "position":
        this.togglePosition();
        break;
      case "css":
        this.applyCSSFix();
        break;
    }
  }

  togglePosition() {
    this.position = this.position === "top" ? "center" : "top";

    // Save site-specific preference
    chrome.runtime.sendMessage({
      action: "updateSiteSettings",
      url: window.location.href,
      settings: { position: this.position },
    });

    // Update current floating box
    if (this.floatingBox) {
      this.floatingBox.style.cssText = this.getFloatingBoxStyles();
    }
  }

  async applyCSSFix() {
    if (this.mode !== "advanced") return;

    this.showNotification("Generating CSS improvements...", "info");

    // Get page HTML (simplified)
    const html = document.documentElement.outerHTML.substring(0, 10000); // Limit size

    chrome.runtime.sendMessage(
      {
        action: "llmRequest",
        html: html,
      },
      (response) => {
        if (response.success) {
          this.injectCSS(response.css);
          this.showNotification("CSS improvements applied!", "success");
        } else {
          this.showNotification(`Error: ${response.error}`, "error");
        }
      }
    );
  }

  injectCSS(css) {
    // Remove previous CSS
    if (this.appliedCSS) {
      this.appliedCSS.remove();
    }

    // Inject new CSS
    this.appliedCSS = document.createElement("style");
    this.appliedCSS.textContent = css;
    this.appliedCSS.setAttribute("data-smart-input-css", "true");
    document.head.appendChild(this.appliedCSS);
  }

  toggleFloatingBox() {
    if (this.floatingBox) {
      this.hideFloatingBox();
    } else if (this.currentInput) {
      this.showFloatingBox();
    }
  }

  hideFloatingBox() {
    if (this.floatingBox) {
      // Clean up listeners
      if (this.currentInput && this.originalInputListener) {
        this.currentInput.removeEventListener(
          "input",
          this.originalInputListener
        );
      }

      // Clear any pending timeouts to prevent flickering
      clearTimeout(this.focusTimeout);
      clearTimeout(this.hideTimeout);

      this.floatingBox.remove();
      this.floatingBox = null;
      this.originalInputListener = null;
    }
  }

  getInputValue(input) {
    if (!input) return "";

    if (input.contentEditable === "true") {
      return input.textContent || input.innerText || "";
    }
    return input.value || "";
  }

  setInputValue(input, value) {
    if (!input) return;

    if (input.contentEditable === "true") {
      input.textContent = value;
      // Trigger input event
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      input.value = value;
      // Trigger input event
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  async getInputsForSummary() {
    const inputs = Array.from(document.querySelectorAll("input, textarea"))
      .filter((input) => input.value && input.value.length > 50)
      .map((input) => input.value)
      .join("\n\n");

    if (!inputs) {
      this.showNotification("No long inputs found to summarize", "info");
      return;
    }

    this.showNotification("Generating summary...", "info");

    chrome.runtime.sendMessage(
      {
        action: "summarizeText",
        text: inputs,
      },
      (response) => {
        if (response.success) {
          this.showSummaryPanel(response.summary);
        } else {
          this.showNotification(`Error: ${response.error}`, "error");
        }
      }
    );
  }

  showSummaryPanel(summary) {
    // Remove existing panel
    if (this.summaryPanel) {
      this.summaryPanel.remove();
    }

    this.summaryPanel = document.createElement("div");
    this.summaryPanel.className = "smart-input-summary-panel";
    this.summaryPanel.innerHTML = `
      <div class="smart-input-summary-header">
        <h3>Input Summary</h3>
        <button data-action="close">×</button>
      </div>
      <div class="smart-input-summary-content">
        ${summary.replace(/\n/g, "<br>")}
      </div>
    `;

    this.summaryPanel.addEventListener("click", (e) => {
      if (e.target.getAttribute("data-action") === "close") {
        this.summaryPanel.remove();
        this.summaryPanel = null;
      }
    });

    document.body.appendChild(this.summaryPanel);
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `smart-input-notification smart-input-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  updateFloatingBox() {
    if (this.floatingBox) {
      const title = this.floatingBox.querySelector(".smart-input-title");
      if (title) {
        title.textContent = `Smart Input (${
          this.mode === "habit" ? "Habit" : "Advanced"
        })`;
      }

      // Update controls
      const controls = this.floatingBox.querySelector(".smart-input-controls");
      if (controls) {
        const cssBtn = controls.querySelector('[data-action="css"]');
        if (this.mode === "advanced" && !cssBtn) {
          const newBtn = document.createElement("button");
          newBtn.className = "smart-input-btn";
          newBtn.setAttribute("data-action", "css");
          newBtn.textContent = "Fix CSS";
          controls.insertBefore(newBtn, controls.firstChild);
        } else if (this.mode === "habit" && cssBtn) {
          cssBtn.remove();
        }
      }
    }
  }
}

// Initialize when DOM is ready - with better error handling
(function initializeSmartInputBox() {
  console.log("🔄 DOM State:", document.readyState);

  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        console.log("📄 DOM Content Loaded - initializing extension");
        window.smartInputBox = new SmartInputBox();
      });
    } else {
      console.log("📄 DOM already ready - initializing extension immediately");
      window.smartInputBox = new SmartInputBox();
    }
  } catch (error) {
    console.error("💥 Failed to initialize Smart Input Box:", error);

    // Retry after 1 second
    setTimeout(() => {
      console.log("🔄 Retrying initialization...");
      try {
        window.smartInputBox = new SmartInputBox();
      } catch (retryError) {
        console.error("💥 Retry failed:", retryError);
      }
    }, 1000);
  }
})();
