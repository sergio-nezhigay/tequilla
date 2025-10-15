class StepManager {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.textIdCounter = 1; // Start with 1 initial text
    this.isPreStepsActive = true; // Start in pre-steps mode

    this.init();
  }

  init() {
    // Listen for step changes
    document.addEventListener("stepChanged", (e) => {
      this.moveToStep(e.detail.step);
    });

    // Initialize navigation arrows
    this.initNavigation();

    // Initialize text controls
    this.initTextControls();

    // Initialize add text button
    this.initAddTextButton();

    // Initialize dropdown functionality
    this.initDropdowns();

    // Initialize existing text controls (including color pickers)
    this.initExistingTextControls();

    // Initialize toggle functionality
    this.initToggle();

    // Initialize quantity controls
    this.initQuantityControls();

    // Initialize pre-steps functionality
    this.initPreSteps();
  }

  moveToStep(step) {
    this.currentStep = step;
    this.isPreStepsActive = false; // Exit pre-steps mode when moving to a step

    // Update pre-steps state
    this.updatePreStepsState();

    // Dispatch stepChanged event for other components to listen
    document.dispatchEvent(
      new CustomEvent("stepChanged", {
        detail: { step: step },
      })
    );

    // Update step display
    const stepsContainer = document.querySelector(".dev-customizer-steps");
    const stepName = document.querySelector(
      ".customizer-steps-head__text__name"
    );
    const stepNumber = document.querySelector(
      ".customizer-steps-head__text__number__current"
    );

    // Remove all step classes and add current
    stepsContainer.classList.remove("step-1", "step-2", "step-3");
    stepsContainer.classList.add(`step-${step}`);

    // Also add step class to body for easier CSS targeting
    document.body.classList.remove("step-1", "step-2", "step-3");
    document.body.classList.add(`step-${step}`);

    // Update step text
    const stepNames = ["Choose Theme", "Color", "Quantity"];
    if (stepName) {
      stepName.textContent = stepNames[step - 1];
    }
    if (stepNumber) {
      stepNumber.textContent = step;
    }

    // Show/hide appropriate content
    const themeOptions = document.querySelector(
      ".dev-customizer-steps-options"
    );
    const colorSelectionWrapper = document.querySelector(
      ".dev-customizer-color-selection-wrapper"
    );
    const textControlsWrapper = document.querySelector(
      ".dev-customizer-text-controls-wrapper"
    );
    const quantitySelectionWrapper = document.querySelector(
      ".dev-customizer-quantity-selection-wrapper"
    );

    if (step === 1) {
      if (themeOptions) themeOptions.style.display = "flex";
      if (colorSelectionWrapper) colorSelectionWrapper.style.display = "none";
      if (textControlsWrapper) textControlsWrapper.style.display = "none";
      if (quantitySelectionWrapper)
        quantitySelectionWrapper.style.display = "none";
    } else if (step === 2) {
      if (themeOptions) themeOptions.style.display = "none";

      // Only show color selection if a theme was selected (not a custom image)
      const themeSelected =
        window.customizerCanvas && window.customizerCanvas.themeSelected;

      if (colorSelectionWrapper) {
        if (themeSelected) {
          colorSelectionWrapper.style.display = "block";
          colorSelectionWrapper.style.visibility = "visible";
          colorSelectionWrapper.style.opacity = "1";
        } else {
          colorSelectionWrapper.style.display = "none";
        }
      } else {
        console.error("Color selection wrapper not found!");
      }

      if (textControlsWrapper) {
        textControlsWrapper.style.display = "block";
      } else {
        console.error("Text controls wrapper not found!");
      }
      if (quantitySelectionWrapper)
        quantitySelectionWrapper.style.display = "none";

      // Initialize texts on canvas if not already done
      this.initializeCanvasTexts();
    } else if (step === 3) {
      if (themeOptions) themeOptions.style.display = "none";
      if (colorSelectionWrapper) colorSelectionWrapper.style.display = "none";
      if (textControlsWrapper) textControlsWrapper.style.display = "none";
      if (quantitySelectionWrapper) {
        quantitySelectionWrapper.style.display = "block";
      } else {
        console.error("Quantity selection wrapper not found!");
      }
    }

    // Update navigation arrows
    this.updateNavigation();

    // Re-measure heights after step change (content may have changed)
    setTimeout(() => {
      if (this.measureOriginalHeights) {
        this.measureOriginalHeights();
      }
    }, 100);
  }

  initNavigation() {
    const prevBtn = document.querySelector(".customizer-steps-head__icon-prev");
    const nextBtn = document.querySelector(".customizer-steps-head__icon-next");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (this.currentStep > 1) {
          this.moveToStep(this.currentStep - 1);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (this.currentStep < this.totalSteps) {
          this.moveToStep(this.currentStep + 1);
        }
      });
    }
  }

  updateNavigation() {
    const prevBtn = document.querySelector(".customizer-steps-head__icon-prev");
    const nextBtn = document.querySelector(".customizer-steps-head__icon-next");

    // Update prev button state
    if (prevBtn) {
      if (this.currentStep === 1) {
        prevBtn.style.opacity = "0.3";
        prevBtn.style.cursor = "not-allowed";
      } else {
        prevBtn.style.opacity = "1";
        prevBtn.style.cursor = "pointer";
      }
    }

    // Update next button state
    if (nextBtn) {
      if (this.currentStep === this.totalSteps) {
        nextBtn.style.opacity = "0.3";
        nextBtn.style.cursor = "not-allowed";
      } else {
        nextBtn.style.opacity = "1";
        nextBtn.style.cursor = "pointer";
      }
    }
  }

  initTextControls() {
    // Initialize all text input listeners
    document.querySelectorAll(".text-input").forEach((input) => {
      input.addEventListener("input", (e) => this.handleTextChange(e));
    });

    // Initialize font size sliders
    document.querySelectorAll(".font-size-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => this.handleFontSizeChange(e));
    });

    // Advanced text controls
    this.initAdvancedTextControls();
    this.updateNavigation();
  }

  initAdvancedTextControls() {
    // Rotation controls
    document
      .querySelectorAll(".dev-customizer-rotation-slider")
      .forEach((slider) => {
        slider.addEventListener("input", (e) => this.handleRotationChange(e));
      });

    // Advanced menu buttons
    document
      .querySelectorAll(".dev-customizer-advanced-menu-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => this.toggleAdvancedMenu(e));
      });

    // Text effect checkboxes
    document.querySelectorAll(".text-effect-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => this.handleEffectChange(e));
    });

    // Spacing sliders
    document.querySelectorAll(".text-spacing-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => this.handleSpacingChange(e));
    });

    // Curve control sliders
    document
      .querySelectorAll(
        ".text-curve-angle-slider, .text-curve-radius-slider, .text-curve-offset-slider, .text-curve-spacing-slider"
      )
      .forEach((slider) => {
        slider.addEventListener("input", (e) =>
          this.handleCurvePropertyChange(e)
        );
      });

    // Curve direction dropdowns
    document
      .querySelectorAll(".dev-customizer-curve-direction")
      .forEach((dropdown) => {
        dropdown.addEventListener("change", (e) =>
          this.handleCurvePropertyChange(e)
        );
      });

    // Close menus when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dev-customizer-text-control__menu")) {
        document
          .querySelectorAll(".dev-customizer-advanced-menu")
          .forEach((menu) => {
            menu.classList.remove("active");
          });
      }
    });

    // Close menus on window resize or scroll to prevent positioning issues
    window.addEventListener("resize", () => {
      document
        .querySelectorAll(".dev-customizer-advanced-menu")
        .forEach((menu) => {
          menu.classList.remove("active");
        });
    });

    window.addEventListener("scroll", () => {
      document
        .querySelectorAll(".dev-customizer-advanced-menu")
        .forEach((menu) => {
          menu.classList.remove("active");
        });
    });
  }

  initializeCanvasTexts() {
    if (!window.customizerCanvas || !window.customizerCanvas.textManager) {
      console.error(
        "Canvas or TextManager not available for initializing texts"
      );
      return;
    }

    // Add initial texts to canvas
    const textControls = document.querySelectorAll(
      ".dev-customizer-text-control"
    );

    textControls.forEach((control, index) => {
      const textId = control.dataset.textId;
      if (
        !window.customizerCanvas.textManager.texts.find((t) => t.id === textId)
      ) {
        const textData = {
          id: textId,
          text: `TEXT ${index + 1}`,
          x:
            window.customizerCanvas.canvas.width /
            (window.devicePixelRatio || 2) /
            2,
          y: 200 + index * 60,
          fontSize: 24,
          font: "Arial",
          color: "#000000",
        };

        window.customizerCanvas.textManager.addText(textData);
      }
    });

    // Redraw canvas
    window.customizerCanvas.redraw();
  }

  handleTextChange(e) {
    const input = e.target;
    const control = input.closest(".dev-customizer-text-control");
    const textId = control.dataset.textId;

    if (window.customizerCanvas && window.customizerCanvas.textManager) {
      window.customizerCanvas.textManager.updateText(textId, {
        text: input.value || "TEXT",
      });
      window.customizerCanvas.redraw();
    }
  }

  handleFontSizeChange(e) {
    const slider = e.target;
    const control = slider.closest(".dev-customizer-text-control");
    const textId = control.dataset.textId;
    const sizeValue = control.querySelector(".dev-customizer-font-size-value");

    // Update display
    sizeValue.textContent = `${slider.value}px`;

    // Update canvas
    if (window.customizerCanvas && window.customizerCanvas.textManager) {
      window.customizerCanvas.textManager.updateText(textId, {
        fontSize: parseInt(slider.value),
      });
      window.customizerCanvas.redraw();
    }
  }

  initDropdowns() {
    // Handle dropdown clicks
    document.addEventListener("click", (e) => {
      const dropdown = e.target.closest(".dev-form-ui--dropdown");
      const dropdownValue = e.target.closest(".dev-form-ui--dropdown--value");

      if (dropdown && dropdownValue) {
        e.stopPropagation();

        this.toggleDropdown(dropdown);
      } else if (!dropdown) {
        // Close all dropdowns when clicking outside
        this.closeAllDropdowns();
      }
    });

    // Handle option selection
    document.addEventListener("click", (e) => {
      const option = e.target.closest(
        ".dev-form-ui--dropdown--options--option, .dev-form-ui--dropdown--options--option--color-wrapper"
      );
      if (option) {
        e.stopPropagation();

        // Handle color picker option
        if (option.classList.contains("color-picker-wrapper")) {
          this.handleColorPickerClick(option);
        } else {
          this.selectOption(option);
        }
      }
    });

    // Handle color input changes
    document.addEventListener("change", (e) => {
      if (e.target.classList.contains("dev-form-ui--color-input")) {
        this.handleColorPickerChange(e);
      }
    });

    // Close dropdowns on window resize or scroll
    window.addEventListener("resize", () => {
      this.closeAllDropdowns();
    });

    window.addEventListener("scroll", () => {
      this.closeAllDropdowns();
    });
  }

  toggleDropdown(dropdown) {
    const isOpen = dropdown.classList.contains("open");
    this.closeAllDropdowns();
    if (!isOpen) {
      this.openDropdown(dropdown);
    }
  }

  openDropdown(dropdown) {
    const dropdownValue = dropdown.querySelector(
      ".dev-form-ui--dropdown--value"
    );
    const dropdownOptions = dropdown.querySelector(
      ".dev-form-ui--dropdown--options, .dev-form-ui--dropdown--options--color"
    );

    if (!dropdownValue || !dropdownOptions) return;

    dropdown.classList.add("open");

    // Position the dropdown options relative to the dropdown value
    const valueRect = dropdownValue.getBoundingClientRect();
    const isColorDropdown = dropdownOptions.classList.contains(
      "dev-form-ui--dropdown--options--color"
    );
    const optionsWidth = isColorDropdown ? 200 : 150;
    const optionsHeight = 300; // max-height from CSS

    // Get viewport dimensions with padding
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 16;

    // Calculate initial position (prefer below the dropdown)
    let left = valueRect.left;
    let top = valueRect.bottom + 4; // 4px gap below dropdown

    // Horizontal positioning adjustments
    if (left + optionsWidth > viewportWidth - padding) {
      // Align to right edge of dropdown if not enough space
      left = valueRect.right - optionsWidth;
    }
    if (left < padding) {
      // Align to left edge of viewport if still not enough space
      left = padding;
    }

    // Vertical positioning adjustments
    if (top + optionsHeight > viewportHeight - padding) {
      // Show above dropdown if not enough space below
      top = valueRect.top - optionsHeight - 4;
      if (top < padding) {
        // Position at top with reduced height if not enough space above
        top = padding;
        dropdownOptions.style.maxHeight = valueRect.top - padding - 4 + "px";
      }
    } else {
      // Reset max-height if we have space
      dropdownOptions.style.maxHeight = "300px";
    }

    // Apply position
    dropdownOptions.style.left = left + "px";
    dropdownOptions.style.top = top + "px";
    dropdownOptions.style.width = optionsWidth + "px";
  }

  closeAllDropdowns() {
    document.querySelectorAll(".dev-form-ui--dropdown.open").forEach((dd) => {
      dd.classList.remove("open");
    });
  }

  selectOption(option) {
    const dropdown = option.closest(".dev-form-ui--dropdown");
    const valueText = dropdown.querySelector(
      ".dev-form-ui--dropdown--value--text"
    );
    const control = dropdown.closest(".dev-customizer-text-control");
    const textId = control.dataset.textId;

    // Handle font selection
    if (dropdown.classList.contains("font-dropdown")) {
      const font = option.textContent.trim();
      // valueText.textContent = font;

      // Remove selected class from all font options
      dropdown
        .querySelectorAll(".dev-form-ui--dropdown--options--option")
        .forEach((opt) => {
          opt.classList.remove("selected");
        });

      // Add selected class to clicked option
      option.classList.add("selected");

      if (window.customizerCanvas && window.customizerCanvas.textManager) {
        window.customizerCanvas.textManager.updateText(textId, { font });
        window.customizerCanvas.redraw();
      }
    }

    // Handle color selection
    else if (dropdown.classList.contains("color-dropdown")) {
      const colorDiv = option.querySelector(
        ".dev-form-ui--dropdown--options--option--color"
      );
      if (colorDiv) {
        // Remove selected class from all color options
        dropdown
          .querySelectorAll(
            ".dev-form-ui--dropdown--options--option--color-wrapper"
          )
          .forEach((wrapper) => {
            wrapper.classList.remove("selected");
          });

        // Add selected class to clicked option
        option.classList.add("selected");

        const color = colorDiv.style.backgroundColor;

        // Clear any custom color indicator
        const existingIndicator = valueText.querySelector(".color-indicator");
        if (existingIndicator) {
          existingIndicator.remove();
        }

        // Update dropdown display
        valueText.textContent = "Color";
        // valueText.style.color = color;

        if (window.customizerCanvas && window.customizerCanvas.textManager) {
          // Convert rgb to hex
          const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          let hexColor = color;
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
            hexColor = `#${r}${g}${b}`;
          }

          window.customizerCanvas.textManager.updateText(textId, {
            color: hexColor,
          });
          window.customizerCanvas.redraw();
        }
      }
    }

    this.closeAllDropdowns();
  }

  initAddTextButton() {
    const addBtn = document.getElementById("add-text-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => this.addNewTextField());
    }
  }

  initExistingTextControls() {
    const existingControls = document.querySelectorAll(
      ".dev-customizer-text-control"
    );

    existingControls.forEach((control, index) => {
      const textId = control.dataset.textId;

      // Initialize color picker for existing text field
      const colorInput = control.querySelector(".dev-form-ui--color-input");
      if (colorInput) {
        // Real-time updates while dragging
        colorInput.addEventListener("input", (e) => {
          this.handleColorPickerChange(e, true); // true = real-time mode
        });

        // Final update when done
        colorInput.addEventListener("change", (e) => {
          this.handleColorPickerChange(e, false); // false = final mode
        });
      } else {
      }

      // Initialize other event listeners for existing controls
      const textInput = control.querySelector(".text-input");
      if (textInput) {
        textInput.addEventListener("input", (e) => this.handleTextChange(e));
      }

      const fontSizeSlider = control.querySelector(".font-size-slider");
      if (fontSizeSlider) {
        fontSizeSlider.addEventListener("input", (e) =>
          this.handleFontSizeChange(e)
        );
      }
    });
  }

  addNewTextField() {
    this.textIdCounter++;
    const textId = `text-${this.textIdCounter}`;

    // Create new text control HTML
    const controlHtml = `
      <div class="dev-customizer-text-control dev-customizer-text-control--additional" data-text-id="${textId}">
        <div class="dev-customizer-text-control__row dev-customizer-text-control__row--full">
          <input type="text" id="text-input-${this.textIdCounter}" 
                 class="dev-form-ui--input dev-customizer-text-control__input text-input" 
                 placeholder="Modify text">
        </div>
        <div class="dev-customizer-text-control__row">
          <div class="dev-form-ui--dropdown dev-customizer-text-control__dropdown font-dropdown">
            <div class="dev-form-ui--dropdown--value">
              <span class="dev-form-ui--dropdown--value--text">Font</span>
              <svg class="" xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6" fill="none">
                <path d="M10.5148 0.0501585L11.3982 0.934325L6.58401 5.75016C6.50687 5.82779 6.41514 5.88939 6.3141 5.93143C6.21306 5.97347 6.1047 5.99512 5.99526 5.99512C5.88582 5.99512 5.77746 5.97347 5.67642 5.93143C5.57538 5.88939 5.48365 5.82779 5.40651 5.75016L0.589844 0.934325L1.47318 0.0509915L5.99401 4.57099L10.5148 0.0501585Z" fill="black"></path>
              </svg>
            </div>
            <div class="dev-form-ui--dropdown--options">
              <div class="dev-form-ui--dropdown--options--option">Arial</div>
              <div class="dev-form-ui--dropdown--options--option">Helvetica</div>
              <div class="dev-form-ui--dropdown--options--option">Times New Roman</div>
              <div class="dev-form-ui--dropdown--options--option">Georgia</div>
              <div class="dev-form-ui--dropdown--options--option">Courier New</div>
            </div>
          </div>
          <div class="dev-form-ui--dropdown dev-customizer-text-control__dropdown color-dropdown">
            <div class="dev-form-ui--dropdown--value">
              <span class="dev-form-ui--dropdown--value--text">Color</span>
             <svg class="" xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6" fill="none">
              <path d="M10.5148 0.0501585L11.3982 0.934325L6.58401 5.75016C6.50687 5.82779 6.41514 5.88939 6.3141 5.93143C6.21306 5.97347 6.1047 5.99512 5.99526 5.99512C5.88582 5.99512 5.77746 5.97347 5.67642 5.93143C5.57538 5.88939 5.48365 5.82779 5.40651 5.75016L0.589844 0.934325L1.47318 0.0509915L5.99401 4.57099L10.5148 0.0501585Z" fill="black"></path>
            </svg>
            </div>
            <div class="dev-form-ui--dropdown--options--color">
              ${[
                "#000000",
                "#FFFFFF",
                "#FF0000",
                "#00FF00",
                "#0000FF",
                "#FFFF00",
                "#FF00FF",
                "#00FFFF",
              ]
                .map(
                  (color) => `
                  <div class="dev-form-ui--dropdown--options--option--color-wrapper">
                    <div style="background-color: ${color};" class="dev-form-ui--dropdown--options--option--color">
                    
                    </div>
                  </div>
                `
                )
                .join("")}
              <div class="dev-form-ui--dropdown--options--option--color-wrapper color-picker-wrapper">
                <div class="dev-form-ui--dropdown--options--option--color-picker"></div>
                <input type="color" class="dev-form-ui--color-input" data-text-id="text-${
                  this.textIdCounter
                }">
              </div>
            </div>
          </div>
        </div>
        <div class="dev-customizer-font-size-control">
          <label for="font-size-${this.textIdCounter}">Size:</label>
          <input type="range" id="font-size-${
            this.textIdCounter
          }" min="12" max="72" value="24" class="font-size-slider">
          <span class="dev-customizer-font-size-value">24px</span>
        </div>
        
        <!-- Advanced text controls -->
        <div class="dev-customizer-text-control__advanced">
          <div class="dev-customizer-text-control__rotation">
            <label for="rotation-${this.textIdCounter}">Rotation:</label>
            <input type="range" class="dev-customizer-rotation-slider" min="0" max="360" value="0" data-text-id="${textId}">
            <span class="dev-customizer-rotation-value">0°</span>
          </div>
          
          <div class="dev-customizer-text-control__menu">
            <button class="dev-customizer-advanced-menu-btn" data-text-id="${textId}" title="Advanced options">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            
            <!-- Advanced menu dropdown -->
            <div class="dev-customizer-advanced-menu" data-text-id="${textId}">
              <div class="dev-customizer-advanced-menu__section">
                <h5>Text Effects</h5>
                <label class="dev-customizer-checkbox">
                  <input type="checkbox" class="text-effect-checkbox" data-effect="shadow" data-text-id="${textId}">
                  <span>Drop Shadow</span>
                </label>
                <label class="dev-customizer-checkbox">
                  <input type="checkbox" class="text-effect-checkbox" data-effect="outline" data-text-id="${textId}">
                  <span>Outline</span>
                </label>
                <label class="dev-customizer-checkbox">
                  <input type="checkbox" class="text-effect-checkbox" data-effect="bold" data-text-id="${textId}">
                  <span>Bold</span>
                </label>
                <label class="dev-customizer-checkbox">
                  <input type="checkbox" class="text-effect-checkbox" data-effect="italic" data-text-id="${textId}">
                  <span>Italic</span>
                </label>
              </div>
              
              
              <div class="dev-customizer-advanced-menu__section">
                <h5>Spacing</h5>
                <div class="dev-customizer-slider-control">
                  <label>Letter Spacing:</label>
                  <input type="range" class="text-spacing-slider" data-property="letterSpacing" data-text-id="${textId}" min="-5" max="20" value="0">
                  <span class="spacing-value">0px</span>
                </div>
                <div class="dev-customizer-slider-control">
                  <label>Line Height:</label>
                  <input type="range" class="text-spacing-slider" data-property="lineHeight" data-text-id="${textId}" min="0.8" max="3" step="0.1" value="1.2">
                  <span class="spacing-value">1.2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button class="dev-customizer-text-control__remove" data-remove-text="${
          this.textIdCounter
        }">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;

    // Add to DOM
    const controlsList = document.getElementById("text-controls-list");
    controlsList.insertAdjacentHTML("beforeend", controlHtml);

    // Add to canvas
    if (window.customizerCanvas && window.customizerCanvas.textManager) {
      window.customizerCanvas.textManager.addText({
        id: `text-${this.textIdCounter}`,
        text: `TEXT ${this.textIdCounter}`,
        y: 200 + (this.textIdCounter - 1) * 60,
        fontSize: 24,
      });
      window.customizerCanvas.redraw();
    }

    // Initialize new control listeners
    const newControl = controlsList.querySelector(
      `[data-text-id="text-${this.textIdCounter}"]`
    );
    newControl
      .querySelector(".text-input")
      .addEventListener("input", (e) => this.handleTextChange(e));
    newControl
      .querySelector(".font-size-slider")
      .addEventListener("input", (e) => this.handleFontSizeChange(e));
    newControl
      .querySelector(".dev-customizer-text-control__remove")
      .addEventListener("click", (e) => this.removeTextField(e));

    // Initialize advanced controls for new text field
    const rotationSlider = newControl.querySelector(
      ".dev-customizer-rotation-slider"
    );
    if (rotationSlider) {
      rotationSlider.addEventListener("input", (e) =>
        this.handleRotationChange(e)
      );
    }

    const advancedMenuBtn = newControl.querySelector(
      ".dev-customizer-advanced-menu-btn"
    );
    if (advancedMenuBtn) {
      advancedMenuBtn.addEventListener("click", (e) =>
        this.toggleAdvancedMenu(e)
      );
    }

    const effectCheckboxes = newControl.querySelectorAll(
      ".text-effect-checkbox"
    );
    effectCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => this.handleEffectChange(e));
    });

    const spacingSliders = newControl.querySelectorAll(".text-spacing-slider");
    spacingSliders.forEach((slider) => {
      slider.addEventListener("input", (e) => this.handleSpacingChange(e));
    });

    // Initialize all curve control sliders
    const curveSliders = newControl.querySelectorAll(
      ".text-curve-angle-slider, .text-curve-radius-slider, .text-curve-offset-slider, .text-curve-spacing-slider"
    );
    curveSliders.forEach((slider) => {
      slider.addEventListener("input", (e) =>
        this.handleCurvePropertyChange(e)
      );
    });

    // Initialize curve direction dropdown
    const curveDirection = newControl.querySelector(
      ".dev-customizer-curve-direction"
    );
    if (curveDirection) {
      curveDirection.addEventListener("change", (e) =>
        this.handleCurvePropertyChange(e)
      );
    }

    // Initialize color picker for new text field
    const colorInput = newControl.querySelector(".dev-form-ui--color-input");
    if (colorInput) {
      // Real-time updates while dragging
      colorInput.addEventListener("input", (e) =>
        this.handleColorPickerChange(e, true)
      );
      // Final update when done
      colorInput.addEventListener("change", (e) =>
        this.handleColorPickerChange(e, false)
      );
    }
  }

  removeTextField(e) {
    const btn = e.target.closest(".dev-customizer-text-control__remove");
    const control = btn.closest(".dev-customizer-text-control");
    const textId = control.dataset.textId;

    // Remove from canvas
    if (window.customizerCanvas && window.customizerCanvas.textManager) {
      window.customizerCanvas.textManager.removeText(textId);
      window.customizerCanvas.redraw();
    }

    // Remove from DOM
    control.remove();
  }

  initToggle() {
    const toggleTrigger = document.querySelector(
      ".dev-customizer-steps--toggle-trigger"
    );
    const stepsContainer = document.querySelector(".dev-customizer-steps");

    if (!toggleTrigger || !stepsContainer) {
      console.warn("Toggle trigger or steps container not found");
      return;
    }

    // Set initial state (expanded)
    this.isMinimized = false;

    // Add click event listener
    toggleTrigger.addEventListener("click", () => {
      this.toggleSteps();
    });
  }

  toggleSteps() {
    const stepsContainer = document.querySelector(".dev-customizer-steps");

    if (!stepsContainer) {
      console.error("Steps container not found");
      return;
    }

    // Don't allow toggle when in pre-steps mode
    if (this.isPreStepsActive) {
      return;
    }

    this.isMinimized = !this.isMinimized;

    if (this.isMinimized) {
      // Minimize: add minimized class (CSS handles the animation)
      stepsContainer.classList.add("dev-customizer-steps--minimized");
    } else {
      // Expand: remove minimized class (CSS handles the animation)
      stepsContainer.classList.remove("dev-customizer-steps--minimized");
    }
  }

  handleRotationChange(e) {
    const slider = e.target;
    const textId = slider.dataset.textId;
    const rotation = parseInt(slider.value);

    // Update display
    const valueDisplay = slider.parentElement.querySelector(
      ".dev-customizer-rotation-value"
    );
    if (valueDisplay) {
      valueDisplay.textContent = rotation + "°";
    }

    // Update canvas text
    if (window.customizerCanvas && window.customizerCanvas.textManager) {
      window.customizerCanvas.textManager.updateText(textId, { rotation });
      window.customizerCanvas.redraw();
    }
  }

  toggleAdvancedMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.target.closest(".dev-customizer-advanced-menu-btn");
    const textId = btn.dataset.textId;
    const menu = document.querySelector(
      `.dev-customizer-advanced-menu[data-text-id="${textId}"]`
    );

    // Close all other menus
    document.querySelectorAll(".dev-customizer-advanced-menu").forEach((m) => {
      if (m !== menu) m.classList.remove("active");
    });

    // Toggle current menu
    if (menu) {
      const isActive = menu.classList.contains("active");

      if (!isActive) {
        // Position the menu relative to the button
        const btnRect = btn.getBoundingClientRect();
        const menuWidth = 220; // min-width from CSS
        const menuHeight = Math.min(400, window.innerHeight * 0.8); // Max 80% of viewport height

        // Get viewport dimensions with padding
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 16; // Padding from viewport edges

        // Check if we're on mobile (width <= 600px)
        const isMobile = viewportWidth <= 600;

        if (isMobile) {
          // Mobile positioning - use calculated optimal position
          let left = btnRect.left - 85; // Position 85px to the left of button
          let top = btnRect.bottom + 8; // Position below button

          // Ensure menu doesn't go off-screen horizontally
          if (left < padding) {
            left = padding;
          }
          if (left + menuWidth > viewportWidth - padding) {
            left = viewportWidth - menuWidth - padding;
          }

          // Ensure menu doesn't go off-screen vertically
          if (top + menuHeight > viewportHeight - padding) {
            // Try above button
            top = btnRect.top - menuHeight - 8;
            if (top < padding) {
              // If still doesn't fit, center vertically
              top = Math.max(padding, (viewportHeight - menuHeight) / 2);
            }
          }

          // Apply mobile positioning
          menu.style.left = left + "px";
          menu.style.top = top + "px";
        } else {
          // Desktop positioning - original logic
          // Calculate initial position - force menu to appear to the left of the button
          let left = btnRect.right - menuWidth - 130; // Right-align menu with button + 100px more to the left
          let top = btnRect.top; // 8px gap below button

          // Ensure menu never goes off-screen to the right
          const maxAllowedLeft = viewportWidth - menuWidth - padding;
          if (left > maxAllowedLeft) {
            left = btnRect.left - menuWidth - 8;
          }

          // Ensure menu never goes off-screen to the left
          if (left < padding) {
            left = padding;
          }

          // If menu is still too wide for viewport, make it fit
          if (menuWidth > viewportWidth - padding * 2) {
            left = padding;
            menu.style.width = viewportWidth - padding * 2 + "px";
            menu.style.minWidth = "auto";
          }

          // Vertical positioning adjustments
          if (top + menuHeight > viewportHeight - padding) {
            // Not enough space below, try above button
            top = btnRect.top - menuHeight - 8;
            if (top < padding) {
              // Not enough space above either, position at top with reduced height
              top = padding;
              menu.style.maxHeight = btnRect.top - padding - 8 + "px";
            }
          } else {
            // Reset max-height if we have space
            menu.style.maxHeight = "400px";
          }

          // Apply position
          menu.style.left = left + "px";
          menu.style.top = top + "px";
        }

        menu.classList.add("active");
      } else {
        menu.classList.remove("active");
        // Reset any dynamic styling
        menu.style.width = "";
        menu.style.minWidth = "";
        menu.style.maxHeight = "";
      }
    }
  }

  handleEffectChange(e) {
    const checkbox = e.target;
    const textId = checkbox.dataset.textId;
    const effect = checkbox.dataset.effect;
    const isChecked = checkbox.checked;

    // Show/hide curve angle control for curve effect
    if (effect === "curve") {
      const curveControl = document.querySelector(
        `.dev-customizer-curve-control[data-text-id="${textId}"]`
      );
      if (curveControl) {
        curveControl.style.display = isChecked ? "block" : "none";
      }
    }

    // Update canvas text
    if (window.customizerCanvas && window.customizerCanvas.textManager) {
      const text = window.customizerCanvas.textManager.texts.find(
        (t) => t.id === textId
      );
      if (text) {
        text.effects[effect] = isChecked;
        window.customizerCanvas.redraw();
      }
    }
  }

  handleSpacingChange(e) {
    const slider = e.target;
    const textId = slider.dataset.textId;
    const property = slider.dataset.property;
    const value = parseFloat(slider.value);

    // Update display
    const valueDisplay = slider.parentElement.querySelector(".spacing-value");
    if (valueDisplay) {
      if (property === "letterSpacing") {
        valueDisplay.textContent = value + "px";
      } else {
        valueDisplay.textContent = value.toFixed(1);
      }
    }

    // Update canvas text
    if (window.customizerCanvas && window.customizerCanvas.textManager) {
      const updateData = {};
      updateData[property] = value;
      window.customizerCanvas.textManager.updateText(textId, updateData);
      window.customizerCanvas.redraw();
    }
  }

  handleCurvePropertyChange(e) {
    const element = e.target;
    const textId = element.dataset.textId;
    const property = element.dataset.property;
    let value = element.value;

    // Convert value to appropriate type
    if (property === "curveAngle" || property === "curveOffset") {
      value = parseInt(value);
    } else if (property === "curveRadius" || property === "curveSpacing") {
      value = parseFloat(value);
    } else if (property === "curveDirection") {
      value = parseInt(value);
    }

    // Update display value
    const valueDisplay = element.parentElement.querySelector(
      `.${property.replace("curve", "curve-").toLowerCase()}-value`
    );
    if (valueDisplay) {
      if (property === "curveAngle" || property === "curveOffset") {
        valueDisplay.textContent = value + "°";
      } else if (property === "curveRadius" || property === "curveSpacing") {
        valueDisplay.textContent = value.toFixed(1);
      }
    }

    // Update canvas text
    if (window.customizerCanvas && window.customizerCanvas.textManager) {
      const updateData = {};
      updateData[property] = value;

      window.customizerCanvas.textManager.updateText(textId, updateData);
      window.customizerCanvas.redraw();
    }
  }

  handleColorPickerClick(colorPickerWrapper) {
    const colorInput = colorPickerWrapper.querySelector(
      ".dev-form-ui--color-input"
    );
    if (colorInput) {
      // If data-text-id is empty, try to find it from the parent control
      if (!colorInput.dataset.textId) {
        const parentControl = colorInput.closest(
          ".dev-customizer-text-control"
        );
        if (parentControl && parentControl.dataset.textId) {
          colorInput.dataset.textId = parentControl.dataset.textId;
        }
      }

      // Trigger the native color picker
      colorInput.click();
    } else {
      console.error("Color input not found in wrapper:", colorPickerWrapper);
    }
  }

  handleColorPickerChange(e, isRealTime = false) {
    const colorInput = e.target;
    let textId = colorInput.dataset.textId;
    const selectedColor = colorInput.value;

    // If textId is empty, try to get it from parent control
    if (!textId) {
      const parentControl = colorInput.closest(".dev-customizer-text-control");
      if (parentControl && parentControl.dataset.textId) {
        textId = parentControl.dataset.textId;
        colorInput.dataset.textId = textId; // Cache it for future use
      }
    }

    // Update UI only on final selection (not real-time)
    if (!isRealTime) {
      const dropdown = colorInput.closest(".dev-form-ui--dropdown");
      if (dropdown) {
        // Remove selected class from all color options
        dropdown
          .querySelectorAll(
            ".dev-form-ui--dropdown--options--option--color-wrapper"
          )
          .forEach((wrapper) => {
            wrapper.classList.remove("selected");
          });

        // Add selected class to color picker wrapper
        const colorPickerWrapper = colorInput.closest(".color-picker-wrapper");
        if (colorPickerWrapper) {
          colorPickerWrapper.classList.add("selected");
        }

        const valueText = dropdown.querySelector(
          ".dev-form-ui--dropdown--value--text"
        );
        if (valueText) {
          // Clear any existing color styling
          valueText.style.color = "";

          // Add a small color indicator
          const existingIndicator = valueText.querySelector(".color-indicator");
          if (existingIndicator) {
            existingIndicator.remove();
          }

          const colorIndicator = document.createElement("span");
          colorIndicator.className = "color-indicator";
          colorIndicator.style.cssText = `
            display: inline-block;
            width: 14px;
            height: 14px;
            background-color: ${selectedColor};
            border-radius: 50%;
            margin-left: 8px;
            border: 2px solid #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          `;

          valueText.textContent = "Custom";
          valueText.appendChild(colorIndicator);
        }
      }
    }

    // Update the canvas text color (both real-time and final)
    if (
      window.customizerCanvas &&
      window.customizerCanvas.textManager &&
      textId
    ) {
      const result = window.customizerCanvas.textManager.updateText(textId, {
        color: selectedColor,
      });
      if (result) {
        if (isRealTime) {
        } else {
        }
        window.customizerCanvas.redraw();
      } else {
        console.error(
          `❌ Failed to update text color - text with ID "${textId}" not found`
        );
      }
    } else {
      if (!textId) {
        console.error("❌ No textId found - cannot update text color");
      } else {
        console.error("Canvas or TextManager not available");
      }
    }

    // Close the dropdown only on final selection
    if (!isRealTime) {
      this.closeAllDropdowns();
    }
  }

  initQuantityControls() {
    // Quantity increase/decrease buttons
    const quantityButtons = document.querySelectorAll(".quantity-btn");
    const quantityInput = document.querySelector(".quantity-input");

    quantityButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const action = e.currentTarget.dataset.action;
        let currentValue = parseInt(quantityInput.value);

        if (action === "increase") {
          currentValue++;
        } else if (action === "decrease" && currentValue > 3) {
          currentValue--;
        }

        quantityInput.value = currentValue;
      });
    });

    // Validate quantity input
    if (quantityInput) {
      quantityInput.addEventListener("input", (e) => {
        let value = parseInt(e.target.value);
        if (value < 3) {
          e.target.value = 3;
        } else if (value > 999) {
          e.target.value = 999;
        }
      });
    }

    // Final action buttons
    const helpButton = document.querySelector(".dev-customizer-btn--help");
    const continueButton = document.querySelector(
      ".dev-customizer-btn--continue"
    );

    if (helpButton) {
      helpButton.addEventListener("click", () => {
        // You can add help functionality here
        alert("Help functionality coming soon!");
      });
    }

    if (continueButton) {
      continueButton.addEventListener("click", () => {
        const quantity = parseInt(quantityInput.value);

        // You can add continue functionality here (e.g., add to cart)
        alert(`Ready to continue with ${quantity} items!`);
      });
    }
  }

  initPreSteps() {
    // Set initial pre-steps state
    this.updatePreStepsState();

    // Add click handlers for pre-steps items
    const preStepsItems = document.querySelectorAll(
      ".dev-customizer-pre-steps-item"
    );
    preStepsItems.forEach((item, index) => {
      item.addEventListener("click", () => {
        const stepNumber = index + 1;

        this.moveToStep(stepNumber);
      });
    });
  }

  updatePreStepsState() {
    const stepsContainer = document.querySelector(".dev-customizer-steps");
    const preStepsWrapper = document.querySelector(
      ".dev-customizer-pre-steps-wrapper"
    );
    const preStepsItems = document.querySelectorAll(
      ".dev-customizer-pre-steps-item"
    );
    const contentContainer = document.querySelector(".dev-customizer-content");

    if (this.isPreStepsActive) {
      // Show pre-steps, hide steps head
      if (stepsContainer) {
        stepsContainer.classList.add("pre-steps-active");
      }
      if (preStepsWrapper) {
        preStepsWrapper.style.display = "flex";
      }
      // Add blur class to content
      if (contentContainer) {
        contentContainer.classList.add("pre-steps-blur");
      }

      // Disable all modal functionality
      this.disableAllModals();

      // Update active pre-steps item
      preStepsItems.forEach((item, index) => {
        if (index + 1 === this.currentStep) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });
    } else {
      // Hide pre-steps, show steps head
      if (stepsContainer) {
        stepsContainer.classList.remove("pre-steps-active");
      }
      if (preStepsWrapper) {
        preStepsWrapper.style.display = "none";
      }
      // Remove blur class from content
      if (contentContainer) {
        contentContainer.classList.remove("pre-steps-blur");
      }

      // Re-enable all modal functionality
      this.enableAllModals();

      // Remove active class from all pre-steps items
      preStepsItems.forEach((item) => {
        item.classList.remove("active");
      });
    }
  }

  disableAllModals() {
    // Disable all modal triggers
    const modalTriggers = document.querySelectorAll(
      '[data-modal], .modal-opener, details-modal, [id*="modal"], [id*="Modal"], button[aria-haspopup="dialog"], .product__modal-opener, .quick-add-hidden, .product-popup-modal__opener'
    );

    modalTriggers.forEach((trigger) => {
      trigger.style.pointerEvents = "none";
      trigger.style.opacity = "0.5";
      trigger.style.cursor = "not-allowed";
      trigger.setAttribute("data-modal-disabled", "true");
    });

    // Disable all modal opening functions globally
    window.modalDisabled = true;
  }

  enableAllModals() {
    // Re-enable all modal triggers
    const disabledTriggers = document.querySelectorAll(
      '[data-modal-disabled="true"]'
    );

    disabledTriggers.forEach((trigger) => {
      trigger.style.pointerEvents = "";
      trigger.style.opacity = "";
      trigger.style.cursor = "";
      trigger.removeAttribute("data-modal-disabled");
    });

    // Re-enable modal opening functions globally
    window.modalDisabled = false;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.stepManager = new StepManager();
});
