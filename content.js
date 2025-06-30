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
    this.isProcessing = false;
    this.geminiApiKey = "";

    this.init();
  }

  async init() {
    try {
      console.log("Smart Input Box initializing...");

      await this.loadSettings();
      console.log("Settings loaded:", {
        enabled: this.isEnabled,
        mode: this.mode,
        position: this.position,
      });

      this.setupInputListeners();
      console.log("Input listeners set up");

      this.setupMutationObserver();
      console.log("Mutation observer set up");

      this.setupMessageListener();
      console.log("Message listener set up");

      console.log("Smart Input Box initialized successfully");
    } catch (error) {
      console.error("Smart Input Box initialization failed:", error);
    }
  }

  async loadSettings() {
    const result = await browser.storage.local.get([
      "enabled",
      "mode",
      "position",
      "siteSettings",
      "geminiApiKey",
    ]);

    this.isEnabled = result.enabled !== false;
    this.mode = result.mode || "habit";
    this.position = result.position || "top";
    this.geminiApiKey = result.geminiApiKey || "";

    const siteSettings = result.siteSettings || {};
    const domain = window.location.hostname;
    if (siteSettings[domain]) {
      this.position = siteSettings[domain].position || this.position;
    }
  }

  setupInputListeners() {
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
              const inputs = node.querySelectorAll("input, textarea");
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
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case "modeChanged":
          this.mode = request.mode;
          // Recreate floating box if it exists
          if (this.floatingBox) {
            this.hideFloatingBox();
            setTimeout(() => {
              this.showFloatingBox();
            }, 100);
          }
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

    console.log("Focus in:", target.tagName, target.type, target.className);

    if (target.closest(".smart-input-floating-box")) {
      console.log("Skipping focus - floating box element");
      return;
    }

    if (!this.isInputElement(target)) {
      console.log("Skipping focus - not an input element");
      return;
    }

    if (!this.isEnabled) {
      console.log("Skipping focus - extension disabled");
      return;
    }

    console.log("Valid input focused, showing floating box");
    this.currentInput = target;

    clearTimeout(this.focusTimeout);
    this.focusTimeout = setTimeout(() => {
      this.showFloatingBox();
    }, 50);
  }

  handleFocusOut(event) {
    // Don't close if we're processing an AI request
    if (this.isProcessing) {
      console.log("Skipping focus out - processing AI request");
      return;
    }

    if (this.floatingBox && this.floatingBox.contains(event.relatedTarget)) {
      return;
    }

    if (event.relatedTarget && this.isInputElement(event.relatedTarget)) {
      return;
    }

    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      const activeElement = document.activeElement;

      if (
        activeElement &&
        (this.isInputElement(activeElement) ||
          (this.floatingBox && this.floatingBox.contains(activeElement)))
      ) {
        return;
      }

      this.hideFloatingBox();
    }, 100);
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
      console.log("Cannot show floating box - no current input");
      return;
    }

    if (this.floatingBox) {
      console.log("Floating box already exists");
      return;
    }

    console.log("Creating floating box...");
    const startTime = performance.now();

    this.floatingBox = this.createFloatingBox();
    document.body.appendChild(this.floatingBox);

    // Only handle textarea in habit mode
    if (this.mode === "habit") {
      const textArea = this.floatingBox.querySelector("textarea");
      const currentValue = this.getInputValue(this.currentInput);

      // Clean up the value to remove extra whitespace
      const cleanValue = currentValue.trim();
      textArea.value = cleanValue;

      console.log("Initial value:", cleanValue);

      // Keep focus on original input, not the floating textarea
      setTimeout(() => {
        this.currentInput.focus();
        console.log("Original input focused");
      }, 10);
    } else {
      // In advanced mode, just keep focus on original input
      setTimeout(() => {
        this.currentInput.focus();
        console.log("Original input focused (advanced mode)");
      }, 10);
    }

    const endTime = performance.now();
    console.log(`Floating box shown in ${endTime - startTime}ms`);
  }

  createFloatingBox() {
    const box = document.createElement("div");
    const overlay = document.createElement("div");
    overlay.className = "smart-input-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 2147483646;
    `;
    overlay.appendChild(box);
    box.className = `smart-input-floating-box ${
      this.position === "center" ? "smart-input-center" : ""
    }`;
    box.style.cssText = this.getFloatingBoxStyles();

    // Add content based on mode using helper methods
    const controls = document.createElement("div");
    controls.className = "smart-input-controls";
    controls.innerHTML = `
      <div class="smart-input-control-group">
        <label class="smart-input-control-label">Mode</label>
        <select class="smart-input-select" data-action="mode">
          <option value="habit" ${
            this.mode === "habit" ? "selected" : ""
          }>Habit</option>
          <option value="advanced" ${
            this.mode === "advanced" ? "selected" : ""
          }>Advanced</option>
        </select>
      </div>
      <div class="smart-input-control-group">
        <label class="smart-input-control-label">Position</label>
        <select class="smart-input-select" data-action="position">
          <option value="top" ${
            this.position === "top" ? "selected" : ""
          }>Top</option>
          <option value="center" ${
            this.position === "center" ? "selected" : ""
          }>Center</option>
        </select>
      </div>
      <button class="smart-input-close-btn" data-action="close">×</button>
    `;

    box.appendChild(controls);

    // Add content based on mode
    if (this.mode === "advanced") {
      // Add API key management first
      this.addApiKeyManagement(box, controls);

      // Add buttons if API key exists
      if (this.geminiApiKey) {
        this.addActionButtons(box, controls);
      }
    } else {
      // Add textarea for habit mode
      this.addTextArea(box, controls);
    }

    controls.addEventListener("change", this.handleControlChange.bind(this));
    controls.addEventListener("click", this.handleControlClick.bind(this));

    // Add click handler to overlay to close on outside click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.hideFloatingBox();
      }
    });

    return overlay;
  }

  getFloatingBoxStyles() {
    const baseStyles = `
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

  setupOneWayBinding(textArea) {
    let isSyncing = false;

    // Copy from original input to floating textarea ONLY
    const syncToFloating = () => {
      if (isSyncing) return;
      isSyncing = true;
      const currentValue = this.getInputValue(this.currentInput);
      if (currentValue !== textArea.value) {
        const cursorPosition = textArea.selectionStart;
        textArea.value = currentValue;
        // Restore cursor position if possible
        if (cursorPosition <= currentValue.length) {
          textArea.setSelectionRange(cursorPosition, cursorPosition);
        }
      }
      isSyncing = false;
    };

    // Listen to original input changes ONLY
    this.originalInputListener = syncToFloating;
    this.currentInput.addEventListener("input", this.originalInputListener);

    // Check for external changes periodically
    this.syncInterval = setInterval(() => {
      if (!isSyncing) {
        const currentValue = this.getInputValue(this.currentInput);
        if (currentValue !== textArea.value) {
          syncToFloating();
        }
      }
    }, 100);
  }

  handleControlChange(event) {
    const action = event.target.getAttribute("data-action");
    const value = event.target.value;

    switch (action) {
      case "mode":
        this.mode = value;
        browser.runtime.sendMessage({
          action: "updateMode",
          mode: value,
        });
        // Update the floating box content in place instead of closing/reopening
        this.updateFloatingBoxContent();
        break;
      case "position":
        this.position = value;
        browser.runtime.sendMessage({
          action: "updateSiteSettings",
          url: window.location.href,
          settings: { position: value },
        });
        if (this.floatingBox) {
          const box = this.floatingBox.querySelector(
            ".smart-input-floating-box"
          );
          // Update position class
          box.className = `smart-input-floating-box ${
            value === "center" ? "smart-input-center" : ""
          }`;
          box.style.cssText = this.getFloatingBoxStyles();
        }
        break;
    }
  }

  updateFloatingBoxContent() {
    if (!this.floatingBox) return;

    const box = this.floatingBox.querySelector(".smart-input-floating-box");

    // Remove existing content (textarea or buttons)
    const existingTextarea = box.querySelector("textarea");
    const existingButtonContainer = box.querySelector(
      ".smart-input-button-container"
    );
    const existingApiContainer = box.querySelector(
      ".smart-input-api-container"
    );

    if (existingTextarea) existingTextarea.remove();
    if (existingButtonContainer) existingButtonContainer.remove();
    if (existingApiContainer) existingApiContainer.remove();

    // Add new content based on mode
    const controls = box.querySelector(".smart-input-controls");

    if (this.mode === "advanced") {
      // Add API key management first
      this.addApiKeyManagement(box, controls);

      // Add buttons if API key exists
      if (this.geminiApiKey) {
        this.addActionButtons(box, controls);
      }
    } else {
      // Add textarea for habit mode
      this.addTextArea(box, controls);
    }
  }

  handleControlClick(event) {
    const action = event.target.getAttribute("data-action");

    switch (action) {
      case "close":
        this.hideFloatingBox();
        break;
    }
  }

  handleActionButtonClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");

    // Check if API key exists
    if (!this.geminiApiKey) {
      this.showNotification("API key required for AI features", "error");
      return;
    }

    switch (action) {
      case "fix-css":
        this.showButtonLoading(button);
        this.applyCSSFix();
        break;
      case "summarize":
        this.showButtonLoading(button);
        this.getInputsForSummary();
        break;
    }
  }

  showButtonLoading(activeButton) {
    if (!this.floatingBox) return;

    this.isProcessing = true;
    console.log("Starting AI processing - preventing box close");

    const allButtons = this.floatingBox.querySelectorAll(
      ".smart-input-action-btn"
    );

    allButtons.forEach((button) => {
      if (button === activeButton) {
        // Add loading state to active button
        button.classList.add("loading");
        button.disabled = true;

        // Add spinner to the right side
        const spinner = document.createElement("div");
        spinner.className = "smart-input-btn-spinner";
        button.appendChild(spinner);
      } else {
        // Disable other buttons
        button.disabled = true;
        button.classList.add("disabled");
      }
    });
  }

  hideButtonLoading() {
    if (!this.floatingBox) return;

    this.isProcessing = false;
    console.log("AI processing complete - allowing box close");

    const allButtons = this.floatingBox.querySelectorAll(
      ".smart-input-action-btn"
    );

    allButtons.forEach((button) => {
      // Remove loading state
      button.classList.remove("loading", "disabled");
      button.disabled = false;

      // Remove spinner
      const spinner = button.querySelector(".smart-input-btn-spinner");
      if (spinner) {
        spinner.remove();
      }
    });
  }

  async applyCSSFix() {
    if (this.mode !== "advanced") return;

    this.showNotification(
      "Generating input repositioning with Gemini...",
      "info"
    );

    const html = document.documentElement.outerHTML.substring(0, 10000);

    try {
      browser.runtime.sendMessage(
        {
          action: "jsRequest",
          html: html,
        },
        (response) => {
          this.hideButtonLoading();
          if (response.success) {
            this.executeJavaScript(response.js);
            this.showNotification("Input positions optimized!", "success");
          } else {
            this.showNotification(`Error: ${response.error}`, "error");
          }
        }
      );
    } catch (error) {
      this.hideButtonLoading();
      this.showNotification("Request failed", "error");
    }
  }

  executeJavaScript(jsCode) {
    try {
      // Create a function to safely execute the code
      const executeCode = new Function(jsCode);
      executeCode();
      console.log("JavaScript code executed successfully");
    } catch (error) {
      console.error("Error executing JavaScript:", error);
      this.showNotification("Error executing generated code", "error");
    }
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
      // Reset processing state
      this.isProcessing = false;

      const box = this.floatingBox.querySelector(".smart-input-floating-box");
      const overlay = this.floatingBox;

      // Add closing animation
      box.classList.add("smart-input-closing");
      overlay.classList.add("smart-input-overlay-closing");

      // Wait for animation to complete before removing
      setTimeout(() => {
        // Clean up event listeners
        if (this.currentInput && this.originalInputListener) {
          this.currentInput.removeEventListener(
            "input",
            this.originalInputListener
          );
        }

        // Clear intervals and timeouts
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
          this.syncInterval = null;
        }

        clearTimeout(this.focusTimeout);
        clearTimeout(this.hideTimeout);

        if (this.floatingBox) {
          this.floatingBox.remove();
          this.floatingBox = null;
          this.originalInputListener = null;
        }
      }, 200); // Match the animation duration
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
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  async getInputsForSummary() {
    this.showNotification("Analyzing page inputs with Gemini...", "info");

    // Send the page HTML for analysis instead of just input values
    const html = document.documentElement.outerHTML.substring(0, 15000);

    try {
      browser.runtime.sendMessage(
        {
          action: "analyzePageInputs",
          html: html,
          url: window.location.href,
        },
        (response) => {
          this.hideButtonLoading();
          if (response.success) {
            this.showSummaryPanel(response.analysis);
          } else {
            this.showNotification(`Error: ${response.error}`, "error");
          }
        }
      );
    } catch (error) {
      this.hideButtonLoading();
      this.showNotification("Request failed", "error");
    }
  }

  showSummaryPanel(summary) {
    // Instead of separate panel, show in the floating box
    if (!this.floatingBox) return;

    const floatingBoxContent = this.floatingBox.querySelector(
      ".smart-input-floating-box"
    );

    // Remove any existing summary
    const existingSummary = floatingBoxContent.querySelector(
      ".smart-input-analysis-result"
    );
    if (existingSummary) {
      existingSummary.remove();
    }

    // Create summary container
    const summaryContainer = document.createElement("div");
    summaryContainer.className = "smart-input-analysis-result";

    // Simple markdown-to-HTML conversion
    const htmlContent = this.convertMarkdownToHtml(summary);

    summaryContainer.innerHTML = `
      <div class="smart-input-analysis-header">
        <h4>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px; vertical-align: -2px;">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Page Analysis
        </h4>
        <button class="smart-input-analysis-close" data-action="close-analysis">×</button>
      </div>
      <div class="smart-input-analysis-content">
        ${htmlContent}
      </div>
    `;

    // Add close functionality
    summaryContainer.addEventListener("click", (e) => {
      if (e.target.getAttribute("data-action") === "close-analysis") {
        summaryContainer.remove();
      }
    });

    // Insert after button container
    const buttonContainer = floatingBoxContent.querySelector(
      ".smart-input-button-container"
    );
    if (buttonContainer) {
      buttonContainer.parentNode.insertBefore(
        summaryContainer,
        buttonContainer.nextSibling
      );
    }
  }

  convertMarkdownToHtml(markdown) {
    let html = markdown;

    // Convert headers
    html = html.replace(/^### (.*$)/gim, "<h6>$1</h6>");
    html = html.replace(/^## (.*$)/gim, "<h5>$1</h5>");
    html = html.replace(/^# (.*$)/gim, "<h4>$1</h4>");

    // Convert bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

    // Convert italic
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.*?)_/g, "<em>$1</em>");

    // Convert numbered lists
    html = html.replace(/^\d+\.\s+(.*$)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ol>$1</ol>");

    // Convert bullet lists
    html = html.replace(/^[-*+]\s+(.*$)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    // Convert line breaks
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");

    // Wrap in paragraphs
    html = "<p>" + html + "</p>";

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, "");
    html = html.replace(/<p><br><\/p>/g, "");

    return html;
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

  addApiKeyManagement(box, controls) {
    const apiContainer = document.createElement("div");
    apiContainer.className = "smart-input-api-container";

    if (!this.geminiApiKey) {
      // Show API key input if no key exists
      apiContainer.innerHTML = `
        <div class="smart-input-api-input-group">
          <label class="smart-input-api-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="8" r="6"/>
              <path d="m13 13 5 5"/>
              <path d="m21 21-1-1"/>
              <path d="m16 8 2 2"/>
            </svg>
            Gemini API Key Required
          </label>
          <div class="smart-input-api-input-wrapper">
            <input type="password" class="smart-input-api-input" placeholder="Enter your Gemini API key..." />
            <button class="smart-input-api-save-btn" data-action="save-api">Save</button>
          </div>
          <div class="smart-input-api-help">
            <a href="https://makersuite.google.com/app/apikey" target="_blank">Get API Key</a>
          </div>
        </div>
      `;
    } else {
      // Show API key as button-like input with action icons
      apiContainer.innerHTML = `
        <div class="smart-input-api-button">
          <div class="smart-input-api-content">
            <svg class="api-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="8" r="6"/>
              <path d="m13 13 5 5"/>
              <path d="m21 21-1-1"/>
              <path d="m16 8 2 2"/>
            </svg>
            <input type="password" class="smart-input-api-display" value="${this.geminiApiKey}" readonly />
          </div>
          <div class="smart-input-api-actions">
            <button class="smart-input-api-action-btn" data-action="edit-api" title="Edit API Key">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button class="smart-input-api-action-btn" data-action="toggle-visibility" title="Show/Hide Key">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="smart-input-api-action-btn" data-action="delete-api" title="Delete Key">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }

    // Add event listeners
    apiContainer.addEventListener("click", this.handleApiKeyAction.bind(this));
    apiContainer.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (e.target.classList.contains("smart-input-api-input")) {
          this.saveApiKey();
        } else if (
          e.target.classList.contains("smart-input-api-display") &&
          !e.target.readOnly
        ) {
          this.updateApiKey();
        }
      }
      if (
        e.key === "Escape" &&
        e.target.classList.contains("smart-input-api-display")
      ) {
        this.cancelEdit();
      }
    });

    box.insertBefore(apiContainer, controls);
  }

  addActionButtons(box, controls) {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "smart-input-button-container";
    buttonContainer.innerHTML = `
      <button class="smart-input-action-btn" data-action="fix-css">
        <div class="smart-input-btn-content">
          <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <span class="btn-text">Fix CSS - Reposition Inputs</span>
        </div>
      </button>
      <button class="smart-input-action-btn" data-action="summarize">
        <div class="smart-input-btn-content">
          <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          <span class="btn-text">Analyze Page Inputs</span>
        </div>
      </button>
    `;

    buttonContainer.addEventListener(
      "click",
      this.handleActionButtonClick.bind(this)
    );
    box.insertBefore(buttonContainer, controls);
  }

  addTextArea(box, controls) {
    const textArea = document.createElement("textarea");
    textArea.className = "smart-input-textarea";
    textArea.placeholder = "This mirrors your original input...";
    textArea.style.whiteSpace = "pre-wrap";
    textArea.style.wordWrap = "break-word";

    // Redirect focus back to original input when custom textarea is clicked
    textArea.addEventListener("focus", () => {
      this.currentInput.focus();
    });

    box.insertBefore(textArea, controls);

    // Set up binding for habit mode
    if (this.currentInput) {
      const currentValue = this.getInputValue(this.currentInput);
      const cleanValue = currentValue.trim();
      textArea.value = cleanValue;

      setTimeout(() => {
        this.currentInput.focus();
      }, 10);

      this.setupOneWayBinding(textArea);
    }
  }

  handleApiKeyAction(event) {
    const action = event.target.getAttribute("data-action");

    switch (action) {
      case "save-api":
        this.saveApiKey();
        break;
      case "edit-api":
        this.editApiKey();
        break;
      case "save-edit":
        this.updateApiKey();
        break;
      case "toggle-visibility":
        this.toggleApiKeyVisibility();
        break;
      case "delete-api":
        this.deleteApiKey();
        break;
    }
  }

  editApiKey() {
    const input = this.floatingBox.querySelector(".smart-input-api-display");
    if (!input) return;

    input.readOnly = false;
    input.focus();
    input.select();

    // Change the edit button to save/cancel
    const editBtn = this.floatingBox.querySelector('[data-action="edit-api"]');
    if (editBtn) {
      editBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17,21 17,13 7,13 7,21"/>
          <polyline points="7,3 7,8 15,8"/>
        </svg>
      `;
      editBtn.setAttribute("data-action", "save-edit");
      editBtn.title = "Save Changes";
    }
  }

  async updateApiKey() {
    const input = this.floatingBox.querySelector(".smart-input-api-display");
    if (!input) return;

    const newKey = input.value.trim();

    // Basic validation
    if (!newKey.startsWith("AIza")) {
      this.showNotification("Invalid API key format", "error");
      this.cancelEdit();
      return;
    }

    this.geminiApiKey = newKey;

    // Save to storage
    await browser.storage.local.set({ geminiApiKey: newKey });

    this.showNotification("API key updated successfully!", "success");

    // Reset to readonly state
    input.readOnly = true;

    // Reset edit button
    const saveBtn = this.floatingBox.querySelector('[data-action="save-edit"]');
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      `;
      saveBtn.setAttribute("data-action", "edit-api");
      saveBtn.title = "Edit API Key";
    }
  }

  cancelEdit() {
    const input = this.floatingBox.querySelector(".smart-input-api-display");
    if (!input) return;

    // Restore original value
    input.value = this.geminiApiKey;
    input.readOnly = true;

    // Reset edit button
    const saveBtn = this.floatingBox.querySelector('[data-action="save-edit"]');
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      `;
      saveBtn.setAttribute("data-action", "edit-api");
      saveBtn.title = "Edit API Key";
    }
  }

  toggleApiKeyVisibility() {
    const input = this.floatingBox.querySelector(".smart-input-api-display");
    const toggleBtn = this.floatingBox.querySelector(
      '[data-action="toggle-visibility"]'
    );

    if (!input || !toggleBtn) return;

    if (input.type === "password") {
      input.type = "text";
      toggleBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94L17.94 17.94z"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19l-6.65-6.65a3 3 0 0 0-4.12-4.12"/>
        </svg>
      `;
      toggleBtn.title = "Hide Key";
    } else {
      input.type = "password";
      toggleBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `;
      toggleBtn.title = "Show Key";
    }
  }

  async saveApiKey() {
    const input = this.floatingBox.querySelector(".smart-input-api-input");
    if (!input || !input.value.trim()) return;

    const apiKey = input.value.trim();

    // Basic validation
    if (!apiKey.startsWith("AIza")) {
      this.showNotification("Invalid API key format", "error");
      return;
    }

    this.geminiApiKey = apiKey;

    // Save to storage
    await browser.storage.local.set({ geminiApiKey: apiKey });

    this.showNotification("API key saved successfully!", "success");

    // Update the floating box to show buttons
    this.updateFloatingBoxContent();
  }

  async deleteApiKey() {
    this.geminiApiKey = "";

    // Remove from storage
    await browser.storage.local.set({ geminiApiKey: "" });

    this.showNotification("API key deleted", "info");

    // Update the floating box to show input again
    this.updateFloatingBoxContent();
  }
}

(function initializeSmartInputBox() {
  console.log("DOM State:", document.readyState);

  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        console.log("DOM Content Loaded - initializing extension");
        window.smartInputBox = new SmartInputBox();
      });
    } else {
      console.log("DOM already ready - initializing extension immediately");
      window.smartInputBox = new SmartInputBox();
    }
  } catch (error) {
    console.error("Failed to initialize Smart Input Box:", error);

    setTimeout(() => {
      console.log("Retrying initialization...");
      try {
        window.smartInputBox = new SmartInputBox();
      } catch (retryError) {
        console.error("Retry failed:", retryError);
      }
    }, 1000);
  }
})();
