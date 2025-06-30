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
    ]);

    this.isEnabled = result.enabled !== false;
    this.mode = result.mode || "habit";
    this.position = result.position || "top";

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

    this.setupOneWayBinding(textArea);

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

    const textArea = document.createElement("textarea");
    textArea.className = "smart-input-textarea";
    textArea.placeholder = "This mirrors your original input...";
    textArea.style.whiteSpace = "pre-wrap";
    textArea.style.wordWrap = "break-word";

    // Redirect focus back to original input when custom textarea is clicked
    textArea.addEventListener("focus", () => {
      this.currentInput.focus();
    });

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
      ${
        this.mode === "advanced"
          ? `<div class="smart-input-control-group">
               <label class="smart-input-control-label">Action</label>
               <select class="smart-input-select" data-action="css">
                 <option value="">Fix CSS</option>
               </select>
             </div>`
          : ""
      }
      <button class="smart-input-close-btn" data-action="close">×</button>
    `;

    box.appendChild(textArea);
    box.appendChild(controls);

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
        this.updateFloatingBox();
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
      case "css":
        if (this.mode === "advanced") {
          this.applyCSSFix();
          // Reset the select to show placeholder again
          event.target.selectedIndex = 0;
        }
        break;
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

  async applyCSSFix() {
    if (this.mode !== "advanced") return;

    this.showNotification("Generating CSS improvements with Gemini...", "info");

    const html = document.documentElement.outerHTML.substring(0, 10000);

    browser.runtime.sendMessage(
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
    if (this.appliedCSS) {
      this.appliedCSS.remove();
    }

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
    const inputs = Array.from(document.querySelectorAll("input, textarea"))
      .filter((input) => input.value && input.value.length > 50)
      .map((input) => input.value)
      .join("\n\n");

    if (!inputs) {
      this.showNotification("No long inputs found to summarize", "info");
      return;
    }

    this.showNotification("Generating summary with Gemini...", "info");

    browser.runtime.sendMessage(
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
      const modeSelect = this.floatingBox.querySelector('[data-action="mode"]');
      if (modeSelect) {
        modeSelect.value = this.mode;
      }

      const positionSelect = this.floatingBox.querySelector(
        '[data-action="position"]'
      );
      if (positionSelect) {
        positionSelect.value = this.position;
      }

      const controls = this.floatingBox.querySelector(".smart-input-controls");
      if (controls) {
        const cssGroup = controls
          .querySelector('[data-action="css"]')
          ?.closest(".smart-input-control-group");

        if (this.mode === "advanced" && !cssGroup) {
          const newGroup = document.createElement("div");
          newGroup.className = "smart-input-control-group";
          newGroup.innerHTML = `
            <label class="smart-input-control-label">Action</label>
            <select class="smart-input-select" data-action="css">
              <option value="">Fix CSS</option>
            </select>
          `;
          controls.insertBefore(
            newGroup,
            controls.querySelector(".smart-input-close-btn")
          );
        } else if (this.mode === "habit" && cssGroup) {
          cssGroup.remove();
        }
      }
    }
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
