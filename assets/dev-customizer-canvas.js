class CustomizerCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.backgroundImage = null;
    this.isDragging = false;
    this.textManager = null;
    this.themeSelected = false;
    this.canvasImages = []; // Store uploaded images on canvas
    this.selectedImage = null;
    this.dragOffset = { x: 0, y: 0 };

    // Add customizer page class to body to disable scroll
    document.body.classList.add("customizer-page");

    this.isResizing = false;
    this.resizeHandle = null; // 'tl', 'tr', 'bl', 'br' for top-left, top-right, bottom-left, bottom-right
    this.originalImageState = null;
    this.isBottleView = false; // New state variable
    this.bottleMockupUrl = null; // New state variable
    this.originalTextStates = []; // To store original text states
    this.originalImageStates = []; // To store original image states
    this.bottleScale = 1; // Store bottle view scale factor
    this.originalCanvasSize = null; // Store original canvas dimensions
    this.zoomLevel = 1; // Current zoom level
    this.zoomFactor = 1.5; // Zoom factor for zoom in
    this.isPanning = false; // Track if user is panning the canvas
    this.panStart = { x: 0, y: 0 }; // Store pan start position
    this.panOffset = { x: 0, y: 0 }; // Store current pan offset
    this.fontsReady = false; // Track font loading state

    // Fixed design-space dimensions (locked canvas size)
    this.CANVAS_WIDTH = 400;
    this.CANVAS_HEIGHT = 600;

    // Wait for fonts to load before initializing
    this.initWithFonts();
  }

  async initWithFonts() {
    // Wait for document fonts to be ready
    try {
      await document.fonts.ready;
      this.fontsReady = true;
    } catch (error) {
      console.warn("⚠️ Font loading failed, proceeding anyway:", error);
      this.fontsReady = true;
    }

    // Set canvas size (now with fixed dimensions)
    this.resizeCanvas();

    // Set up ResizeObserver to sync canvas resolution
    this.initResizeObserver();

    // Initialize drag and drop
    this.initDragAndDrop();

    // Initialize mouse events for image dragging
    this.initMouseEvents();

    // Initialize zoom events
    this.initZoomEvents();

    // Initialize theme listeners
    this.initThemeListeners();

    // Initialize text manager after canvas is ready
    this.initTextManager();

    // Initialize bottle overlay functionality
    this.initBottleOverlay();

    // Initialize control buttons
    this.initControlButtons();

    // Listen for redraw requests
    document.addEventListener("canvasNeedsRedraw", () => this.redraw());

    // Listen for steps toggle events
    document.addEventListener("stepsToggled", (e) => {
      // Ensure canvas remains functional after toggle
      if (!e.detail.minimized) {
        // When steps are expanded, redraw canvas to ensure everything is visible
        setTimeout(() => {
          this.redraw();
        }, 350); // Wait for CSS transition to complete
      }
    });

    // Listen for window resize to adjust canvas size
    window.addEventListener("resize", () => {
      if (this.backgroundImage) {
        setTimeout(() => {
          this.resizeCanvas();
        }, 100); // Small delay to ensure window resize is complete
      }
    });
  }

  initTextManager() {
    if (window.TextManager) {
      this.textManager = new window.TextManager(this.canvas);

      // Override the addText method to apply bottle scaling if needed
      const originalAddText = this.textManager.addText.bind(this.textManager);
      this.textManager.addText = (textData) => {
        const textId = originalAddText(textData);

        // If we're in bottle view, scale the newly added text
        if (this.isBottleView && this.bottleScale !== 1) {
          const newText = this.textManager.texts.find((t) => t.id === textId);
          if (newText) {
            this.scaleIndividualText(newText, this.bottleScale);
          }
        }

        return textId;
      };
    } else {
      console.error(
        "TextManager not available! Make sure dev-customizer-text-manager.js is loaded."
      );
    }
  }

  scaleIndividualText(text, scale) {
    text.x = text.x * scale;
    text.y = text.y * scale;
    text.fontSize = Math.round(text.fontSize * scale);
    // Scale letterSpacing if present
    if (typeof text.letterSpacing === "number") {
      text.letterSpacing = text.letterSpacing * scale;
    }

    // Recalculate text dimensions with new font size
    this.ctx.save();
    this.ctx.font = `${text.fontSize}px ${text.font}`;
    const metrics = this.ctx.measureText(text.text);
    const extra = (text.letterSpacing || 0) * Math.max(0, text.text.length - 1);
    text.width = metrics.width + extra;
    text.height = text.fontSize;
    this.ctx.restore();
  }

  initControlButtons() {
    // Find all control buttons
    const controlButtons = document.querySelectorAll(
      ".dev-customizer__control[data-control]"
    );

    controlButtons.forEach((button) => {
      const controlType = button.dataset.control;

      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if we're in pre-steps mode
        if (window.stepManager && window.stepManager.isPreStepsActive) {
          return;
        }

        // Set this button as active and deactivate others
        this.setActiveControl(controlType);

        // Handle specific control actions
        this.handleControlAction(controlType);
      });
    });

    // Listen for step changes to auto-click bottle on step 3
    document.addEventListener("stepChanged", (e) => {
      if (e.detail.step === 3) {
        this.setActiveControl("bottle");
        this.handleControlAction("bottle");
      } else if (e.detail.step === 2 && this.isBottleView) {
        // When going back to step 2 from step 3, switch back to image view

        this.setActiveControl("image");
        this.handleControlAction("image");
      }

      // If already in bottle view, recalculate label dimensions for the new step
      if (this.isBottleView) {
        this.updateBottleLabelDimensions();
      }
    });
  }

  setActiveControl(activeControlType) {
    // Add loading overlay for smooth transition feedback
    const canvasContainer = document.querySelector(
      ".dev-customizer__canvas-container"
    );
    if (
      canvasContainer &&
      !canvasContainer.querySelector(".dev-customizer__loading-overlay")
    ) {
      const loadingOverlay = document.createElement("div");
      loadingOverlay.className = "dev-customizer__loading-overlay";
      loadingOverlay.innerHTML =
        '<div class="dev-customizer__loading-spinner"></div>';
      canvasContainer.appendChild(loadingOverlay);

      // Remove loading overlay after a brief moment
      setTimeout(() => {
        loadingOverlay.classList.add("fade-out");
        setTimeout(() => {
          if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
          }
        }, 400);
      }, 200);
    }

    // Remove active class from all controls with smooth transition
    document.querySelectorAll(".dev-customizer__control").forEach((control) => {
      control.classList.remove("active");
      // Add subtle feedback animation
      if (control.dataset.control !== activeControlType) {
        control.style.transform = "translateY(0) scale(1)";
      }
    });

    // Add active class to the clicked control with enhanced feedback
    const activeControl = document.querySelector(
      `[data-control="${activeControlType}"]`
    );
    if (activeControl) {
      activeControl.classList.add("active");

      // Add activation animation
      activeControl.style.transform = "translateY(-1px) scale(1.05)";
      setTimeout(() => {
        activeControl.style.transform = "translateY(-1px) scale(1)";
      }, 150);
    } else {
      console.warn(`⚠️ Could not find control: ${activeControlType}`);
    }
  }

  handleControlAction(controlType) {
    switch (controlType) {
      case "bottle":
        // Bottle control is already handled by initBottleOverlay
        // But we can trigger it here if needed
        if (!this.isBottleView) {
          this.handleBottleClick();
        }
        break;

      case "image":
        // Set back to normal canvas view if in bottle mode
        if (this.isBottleView) {
          this.switchToNormalView();
        }

        break;

      case "loop":
        // Toggle zoom functionality

        this.toggleZoom();
        break;

      case "download":
        // Add download functionality here if needed

        this.downloadCanvas();
        break;

      default:
        console.warn(`Unknown control type: ${controlType}`);
    }
  }

  downloadCanvas() {
    this.showSaveAsModal();
  }

  drawImageCover(ctx, img, destW, destH) {
    const sw = img.width,
      sh = img.height;
    const scale = Math.max(destW / sw, destH / sh); // COVER
    const w = sw * scale,
      h = sh * scale;
    const dx = (destW - w) / 2,
      dy = (destH - h) / 2;
    ctx.drawImage(img, dx, dy, w, h);
  }

  drawBackgroundForDownload(ctx) {
    if (!this.backgroundImage) return;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.width / dpr;
    const displayHeight = this.canvas.height / dpr;

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    this.drawImageCover(ctx, this.backgroundImage, displayWidth, displayHeight);
  }

  drawCanvasImagesForDownload(ctx) {
    // Enable high-quality image smoothing for all images
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    this.canvasImages.forEach((imageData) => {
      // Draw the image without any selection borders or UI elements
      ctx.drawImage(
        imageData.img,
        imageData.x,
        imageData.y,
        imageData.width,
        imageData.height
      );
    });
  }

  drawTextsForDownload(ctx) {
    if (!this.textManager || !this.textManager.texts) return;

    // Enable high-quality text rendering
    ctx.textRenderingOptimization = "optimizeQuality";
    if (ctx.fontKerning) {
      ctx.fontKerning = "normal";
    }

    this.textManager.texts.forEach((text) => {
      // Save context state
      ctx.save();

      // Set text properties (match TextManager alignment)
      ctx.fillStyle = text.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Apply rotation if needed
      if (text.rotation) {
        ctx.translate(text.x, text.y);
        ctx.rotate((text.rotation * Math.PI) / 180);
        ctx.translate(-text.x, -text.y);
      }

      // Build complete font string with all effects
      let fontStyle = "";
      if (text.effects && text.effects.italic) fontStyle += "italic ";
      if (text.effects && text.effects.bold) fontStyle += "bold ";
      ctx.font = `${fontStyle}${text.fontSize}px ${text.font}`;

      // Apply text effects
      if (text.effects) {
        if (text.effects.shadow) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        }

        if (text.effects.outline) {
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeText(text.text, text.x, text.y);
        }
      }

      // Apply letter spacing if needed
      if (text.letterSpacing) {
        this.drawTextWithLetterSpacing(
          ctx,
          text.text,
          text.x,
          text.y,
          text.letterSpacing
        );
      } else {
        ctx.fillText(text.text, text.x, text.y);
      }

      // Restore context state
      ctx.restore();
    });
  }

  // --- ADD: single source of truth for PNG rendering ---
  async renderDesignToBlob(qualityMultiplier = 4) {
    // Ensure fonts are stable before measuring/drawing text
    try {
      await document.fonts?.ready;
    } catch {}

    const wasInBottleView = this.isBottleView;
    if (wasInBottleView) {
      // Match your old export behavior: render the flat banner
      this.switchToNormalView();
    }

    const off = document.createElement("canvas");
    const ctx = off.getContext("2d");

    const dpr = window.devicePixelRatio || 2;
    const displayWidth = this.canvas.width / dpr;
    const displayHeight = this.canvas.height / dpr;

    off.width = displayWidth * qualityMultiplier;
    off.height = displayHeight * qualityMultiplier;

    ctx.scale(qualityMultiplier, qualityMultiplier);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.textRenderingOptimization = "optimizeQuality";
    if (ctx.fontKerning) ctx.fontKerning = "normal";

    // Use the same pipeline as your export (so pixels match)
    this.drawBackgroundForDownload(ctx);
    this.drawCanvasImagesForDownload(ctx);
    if (this.textManager) this.drawTextsForDownload(ctx);

    return await new Promise((resolve, reject) => {
      off.toBlob(
        (blob) => {
          try {
            // Restore bottle view if we temporarily left it
            if (wasInBottleView) {
              const bottleControl = document.querySelector(
                '[data-control="bottle"]'
              );
              if (bottleControl) bottleControl.click();
            }
          } finally {
            blob
              ? resolve(blob)
              : reject(new Error("Failed to render PNG blob"));
          }
        },
        "image/png",
        1.0
      );
    });
  }

  drawTextWithLetterSpacing(ctx, text, x, y, letterSpacing) {
    // Sum glyph widths + spacing
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      totalWidth += ctx.measureText(text[i]).width;
      if (i < text.length - 1) totalWidth += letterSpacing;
    }

    // Respect textAlign
    let startX = x;
    if (ctx.textAlign === "center") {
      startX = x - totalWidth / 2;
    } else if (ctx.textAlign === "right" || ctx.textAlign === "end") {
      startX = x - totalWidth;
    }

    // Draw each glyph with effects
    let currentX = startX;
    for (let i = 0; i < text.length; i++) {
      // Apply outline effect if present
      if (ctx.strokeStyle && ctx.lineWidth > 0) {
        ctx.strokeText(text[i], currentX, y);
      }
      // Apply fill
      ctx.fillText(text[i], currentX, y);
      currentX += ctx.measureText(text[i]).width + letterSpacing;
    }
  }

  // Save As Modal Methods
  showSaveAsModal() {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.className = "save-as-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "save-as-modal-title");

    modal.innerHTML = `
      <div class="save-as-modal__overlay">
        <div class="save-as-modal__content">
          <div class="save-as-modal__header">
            <h3 id="save-as-modal-title">Save as...</h3>
            <button class="save-as-modal__close" aria-label="Close modal" id="close-save-as-modal">×</button>
          </div>
          <div class="save-as-modal__body">
            <button class="save-as-modal__option" data-export-type="design" tabindex="0">
              <div class="save-as-modal__option-title">
                
                Design
              </div>
              
              
            </button>
            <button class="save-as-modal__option" data-export-type="bottle" tabindex="0">
              <div class="save-as-modal__option-title">
              
                Bottle Preview
              </div>
              
              
            </button>
          </div>
        
        </div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(modal);

    // Store reference for cleanup
    this.saveAsModal = modal;

    // Prevent body scroll
    document.body.style.overflow = "hidden";

    // Add event listeners
    const closeButton = modal.querySelector("#close-save-as-modal");
    closeButton.addEventListener("click", () => this.closeSaveAsModal());

    // Export option buttons
    const options = modal.querySelectorAll(".save-as-modal__option");
    options.forEach((option) => {
      option.addEventListener("click", () => {
        const exportType = option.getAttribute("data-export-type");
        this.handleExport(exportType);
      });

      // Keyboard support for options
      option.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const exportType = option.getAttribute("data-export-type");
          this.handleExport(exportType);
        }
      });
    });

    // Close on overlay click
    modal
      .querySelector(".save-as-modal__overlay")
      .addEventListener("click", (e) => {
        if (e.target === e.currentTarget) {
          this.closeSaveAsModal();
        }
      });

    // Keyboard accessibility
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        this.closeSaveAsModal();
      }
    };
    modal.addEventListener("keydown", handleKeydown);
    this.saveAsModalKeyHandler = handleKeydown;

    // Focus the first option
    setTimeout(() => {
      options[0].focus();
    }, 100);
  }

  closeSaveAsModal() {
    if (this.saveAsModal) {
      this.saveAsModal.remove();
      this.saveAsModal = null;
    }

    // Restore body scroll
    document.body.style.overflow = "";
  }

  // --- MODIFY: make async + add 'post' without breaking current flows ---
  async handleExport(exportType) {
    // Close modal first (no-op if not open)
    this.closeSaveAsModal();

    try {
      if (exportType === "design") {
        // Keep the same UX: download a file
        const blob = await this.renderDesignToBlob(4);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `customized-design-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(link);

        return; // preserve old behavior (no return payload)
      } else if (exportType === "bottle") {
        // Leave bottle preview logic untouched
        this.exportBottlePreview();
        return;
      } else if (exportType === "post") {
        // New: same pixels as 'design', but upload instead of download
        const blob = await this.renderDesignToBlob(4);
        const file = new File([blob], `customized-design-${Date.now()}.png`, {
          type: "image/png",
        });

        const result = await uploadImageToAPI(file);

        // Let other parts of the app react if they want
        this.canvas.dispatchEvent(
          new CustomEvent("imagePosted", { detail: { result, file } })
        );

        // Also return result so callers can await it
        return { result, file };
      }
    } catch (err) {
      console.error("❌ handleExport failed:", err);
    }
  }

  exportDesign() {
    // If in bottle view, temporarily switch to normal view for export
    let wasInBottleView = this.isBottleView;
    if (wasInBottleView) {
      this.switchToNormalView();
    }

    // Create a high-resolution download canvas
    const downloadCanvas = document.createElement("canvas");
    const downloadCtx = downloadCanvas.getContext("2d");

    // Get the display dimensions (what the user sees)
    const displayWidth = this.canvas.width / (window.devicePixelRatio || 2);
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 2);

    // Use a high quality multiplier for export (4x for ultra-high quality)
    const qualityMultiplier = 4;
    const exportWidth = displayWidth * qualityMultiplier;
    const exportHeight = displayHeight * qualityMultiplier;

    // Set canvas size for high quality export
    downloadCanvas.width = exportWidth;
    downloadCanvas.height = exportHeight;

    // Scale the context for high quality rendering
    downloadCtx.scale(qualityMultiplier, qualityMultiplier);

    // Enable high-quality image smoothing
    downloadCtx.imageSmoothingEnabled = true;
    downloadCtx.imageSmoothingQuality = "high";

    // Set high-quality text rendering
    downloadCtx.textRenderingOptimization = "optimizeQuality";
    if (downloadCtx.fontKerning) {
      downloadCtx.fontKerning = "normal";
    }

    // Draw background with high quality
    this.drawBackgroundForDownload(downloadCtx);

    // Draw uploaded images without selection borders
    this.drawCanvasImagesForDownload(downloadCtx);

    // Draw texts without selection borders
    if (this.textManager) {
      this.drawTextsForDownload(downloadCtx);
    }

    // Create download link with high quality PNG
    const link = document.createElement("a");
    link.download = `customized-design-${Date.now()}.png`;

    // Use toDataURL with maximum quality
    link.href = downloadCanvas.toDataURL("image/png", 1.0);

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // If we were in bottle view, restore bottle view
    if (wasInBottleView) {
      // Find the bottle control and trigger it
      const bottleControl = document.querySelector('[data-control="bottle"]');
      if (bottleControl) {
        bottleControl.click();
      }
    }
  }

  exportBottlePreview() {
    // Check if bottle mockup URL is available
    const bottleMockupUrl = window.bottleMockupImageUrl;
    if (!bottleMockupUrl) {
      alert("Bottle preview is not available for this product.");
      return;
    }

    // Create a temporary composite canvas
    this.exportBottleComposite(bottleMockupUrl);
  }

  exportBottleComposite(bottleMockupUrl) {
    // Store current view state
    const wasInBottleView = this.isBottleView;

    // Use high quality multiplier for ultra-high resolution export
    const qualityMultiplier = 8; // 8x for maximum quality

    // Base bottle dimensions
    const baseWidth = 98;
    const baseHeight = 446;

    // Create high-resolution composite canvas
    const compositeCanvas = document.createElement("canvas");
    const compositeCtx = compositeCanvas.getContext("2d");

    // Set bottle dimensions with quality multiplier
    const exportWidth = baseWidth * qualityMultiplier;
    const exportHeight = baseHeight * qualityMultiplier;
    compositeCanvas.width = exportWidth;
    compositeCanvas.height = exportHeight;

    // Enable maximum quality image smoothing
    compositeCtx.imageSmoothingEnabled = true;
    compositeCtx.imageSmoothingQuality = "high";

    // Get high-quality canvas data for the label
    // First, create a temporary high-res canvas for the design
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Get the display dimensions
    const displayWidth = this.canvas.width / (window.devicePixelRatio || 2);
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 2);

    // Create ultra-high quality temporary canvas
    const designQualityMultiplier = 4;
    tempCanvas.width = displayWidth * designQualityMultiplier;
    tempCanvas.height = displayHeight * designQualityMultiplier;

    // Scale and enable quality settings
    tempCtx.scale(designQualityMultiplier, designQualityMultiplier);
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = "high";
    tempCtx.textRenderingOptimization = "optimizeQuality";
    if (tempCtx.fontKerning) {
      tempCtx.fontKerning = "normal";
    }

    // Draw high-quality design
    this.drawBackgroundForDownload(tempCtx);
    this.drawCanvasImagesForDownload(tempCtx);
    if (this.textManager) {
      this.drawTextsForDownload(tempCtx);
    }

    // Get high-quality canvas data
    const canvasDataUrl = tempCanvas.toDataURL("image/png", 1.0);

    // Load bottle mockup image
    const bottleImg = new Image();
    bottleImg.crossOrigin = "anonymous";
    bottleImg.onload = () => {
      // Draw bottle background at high resolution
      compositeCtx.imageSmoothingEnabled = true;
      compositeCtx.imageSmoothingQuality = "high";
      compositeCtx.drawImage(bottleImg, 0, 0, exportWidth, exportHeight);

      // Load and overlay canvas content
      const canvasImg = new Image();
      canvasImg.onload = () => {
        // Label position and size on bottle (scaled by quality multiplier)
        const overlayX = 2 * qualityMultiplier; // left position
        const overlayY = 178.4 * qualityMultiplier; // top position
        const overlayWidth = 92 * qualityMultiplier; // width
        const overlayHeight = 189 * qualityMultiplier; // height

        // Enable maximum quality for label drawing
        compositeCtx.imageSmoothingEnabled = true;
        compositeCtx.imageSmoothingQuality = "high";

        // Draw canvas content on top of bottle with high quality
        compositeCtx.drawImage(
          canvasImg,
          overlayX,
          overlayY,
          overlayWidth,
          overlayHeight
        );

        // Create download link with maximum quality PNG
        const link = document.createElement("a");
        link.download = `bottle-preview-${Date.now()}.png`;
        link.href = compositeCanvas.toDataURL("image/png", 1.0);

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      canvasImg.src = canvasDataUrl;
    };

    bottleImg.onerror = () => {
      console.error("❌ Failed to load bottle mockup image");
      alert("Failed to load bottle preview. Please try again.");
    };

    bottleImg.src = bottleMockupUrl;
  }

  resizeCanvas() {
    // Don't resize if we're in bottle view - preserve bottle scaling
    if (this.isBottleView) {
      this.redraw(); // Still redraw with new background
      return;
    }

    const container = this.canvas.parentElement;

    // Use FIXED design-space dimensions (locked canvas size)
    // This ensures text measurements are identical regardless of background image
    const width = this.CANVAS_WIDTH;
    const height = this.CANVAS_HEIGHT;

    // Store original canvas size for bottle view calculations
    this.originalCanvasSize = { width, height };

    // Update container size
    container.style.width = width + "px";
    container.style.height = height + "px";

    // Set display size
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";

    // Sync canvas resolution with proper DPR scaling
    this.syncCanvasResolution();

    // Redraw everything (background and texts)
    if (this.backgroundImage) {
      this.redraw();
    }
  }

  syncCanvasResolution() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;

    // Set canvas internal resolution to match display size × DPR
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Reset transform to identity
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Scale all drawing operations by DPR
    this.ctx.scale(dpr, dpr);
  }

  initResizeObserver() {
    // Create ResizeObserver to watch for canvas size changes
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Sync canvas resolution when size changes
        this.syncCanvasResolution();

        // Redraw content
        if (this.backgroundImage) {
          this.redraw();
        }
      }
    });

    // Observe the canvas element
    this.resizeObserver.observe(this.canvas);
  }

  initDragAndDrop() {
    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      this.canvas.addEventListener(
        eventName,
        (e) => {
          // Disable drag and drop in bottle view
          if (this.isBottleView) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          this.preventDefaults(e);
        },
        false
      );
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ["dragenter", "dragover"].forEach((eventName) => {
      this.canvas.addEventListener(
        eventName,
        () => {
          // Disable highlighting in bottle view
          if (this.isBottleView) {
            return;
          }
          this.highlight();
        },
        false
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      this.canvas.addEventListener(
        eventName,
        () => {
          // Disable unhighlighting in bottle view
          if (this.isBottleView) {
            return;
          }
          this.unhighlight();
        },
        false
      );
    });

    // Handle dropped files
    this.canvas.addEventListener(
      "drop",
      (e) => {
        // Disable drop in bottle view
        if (this.isBottleView) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        this.handleDrop(e);
      },
      false
    );

    // Also allow click/tap to upload (only if no theme is selected and on step 1)
    // Use both click and touchend for better mobile support
    const handleUploadTrigger = (e) => {
      // Disable upload trigger in bottle view
      if (this.isBottleView) {
        return;
      }
      if (this.isOnStep1()) {
        e.preventDefault(); // Prevent double-firing on mobile
        this.triggerFileUpload();
      }
    };

    this.canvas.addEventListener("click", handleUploadTrigger, false);

    // Add touchend for mobile devices - ensures tap works reliably
    this.canvas.addEventListener(
      "touchend",
      (e) => {
        // Only handle single touches (not multi-touch gestures)
        if (e.touches.length === 0 && e.changedTouches.length === 1) {
          handleUploadTrigger(e);
        }
      },
      false
    );
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  isOnStep1() {
    // Check if we're on step 1 by looking at the step manager
    if (
      window.stepManager &&
      typeof window.stepManager.currentStep === "number"
    ) {
      return window.stepManager.currentStep === 1;
    }

    // Fallback: check the DOM for step indicators
    const stepsContainer = document.querySelector(".dev-customizer-steps");
    if (stepsContainer) {
      return stepsContainer.classList.contains("step-1");
    }

    // Default to true if we can't determine the step (assume step 1)
    return true;
  }

  highlight() {
    // Don't highlight if not on step 1
    if (this.isOnStep1()) {
      this.canvas.classList.add("highlight");
    }
  }

  unhighlight() {
    this.canvas.classList.remove("highlight");
  }

  handleDrop(e) {
    // Don't allow file drop if not on step 1
    if (!this.isOnStep1()) {
      return;
    }

    const dt = e.dataTransfer;
    const files = dt.files;

    this.handleFiles(files);
  }

  triggerFileUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    // For iOS Safari and better mobile support
    input.style.position = "fixed";
    input.style.top = "-100px";
    input.style.left = "-100px";

    input.onchange = (e) => {
      this.handleFiles(e.target.files);
      // Clean up the input element
      if (input.parentNode) {
        document.body.removeChild(input);
      }
    };

    // Append to body to ensure it works on all mobile devices
    document.body.appendChild(input);

    // Trigger the file picker
    input.click();

    // Clean up if user cancels (after a delay)
    setTimeout(() => {
      if (input.parentNode) {
        document.body.removeChild(input);
      }
    }, 1000);
  }

  handleFiles(files) {
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        this.loadImage(file);
      }
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;

        // Mark that NO theme is selected (custom image uploaded)
        this.themeSelected = false;
        this.currentTheme = null;

        // Clear color options since this is a custom image, not a theme
        this.clearColorOptions();

        // Resize canvas to match image dimensions
        this.resizeCanvas();

        // Hide placeholder
        const placeholder = document.getElementById("canvas-placeholder");
        if (placeholder) {
          placeholder.classList.add("has-image");
        }

        // Trigger custom event for other components
        this.canvas.dispatchEvent(
          new CustomEvent("imageLoaded", {
            detail: { image: img, file: file },
          })
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  drawBackground() {
    if (!this.backgroundImage) return;

    // Get display dimensions (CSS pixels, not scaled by DPR)
    const displayWidth = this.canvas.width / (window.devicePixelRatio || 2);
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 2);

    // Clear canvas
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Calculate scaling with 'cover' behavior (fills canvas, may crop)
    const scale = Math.max(
      displayWidth / this.backgroundImage.width,
      displayHeight / this.backgroundImage.height
    );

    // Center the image
    const x = (displayWidth - this.backgroundImage.width * scale) / 2;
    const y = (displayHeight - this.backgroundImage.height * scale) / 2;

    // Enable image smoothing for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    this.ctx.drawImage(
      this.backgroundImage,
      x,
      y,
      this.backgroundImage.width * scale,
      this.backgroundImage.height * scale
    );
  }

  redraw() {
    // Get display dimensions
    const displayWidth = this.canvas.width / (window.devicePixelRatio || 2);
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 2);

    // Clear and redraw everything
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw background
    this.drawBackground();

    // Draw uploaded images
    this.drawCanvasImages();

    // Draw texts
    if (this.textManager) {
      this.textManager.drawTexts();
    } else {
    }
  }

  initThemeListeners() {
    // Listen for theme selection changes

    document.addEventListener("themeSelected", (e) => {
      this.applyTheme(e.detail);
    });
  }

  applyTheme(themeData) {
    // Store theme data for later use
    this.currentTheme = themeData;

    // Mark that a theme has been selected
    this.themeSelected = true;

    // Populate color options for step 2
    this.populateColorOptions(themeData);

    // Get background image URL from theme data
    let backgroundImageUrl = themeData.backgroundImage;

    if (backgroundImageUrl) {
      // Load the background image in high resolution
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        this.backgroundImage = img;

        // Resize canvas to match image dimensions
        this.resizeCanvas();

        // Hide placeholder
        const placeholder = document.getElementById("canvas-placeholder");
        if (placeholder) {
          placeholder.classList.add("has-image");
        }

        // Move to step 2
        this.moveToStep(2);
      };

      img.onerror = () => {
        console.error("Failed to load background image:", backgroundImageUrl);
      };

      // Use the background image URL as provided (already optimized from Liquid)
      img.src = backgroundImageUrl;
    }
  }

  moveToStep(stepNumber) {
    // Dispatch event to update step UI
    document.dispatchEvent(
      new CustomEvent("stepChanged", {
        detail: { step: stepNumber },
      })
    );
  }

  populateColorOptions(themeData) {
    const colorOptionsContainer = document.getElementById("color-options-list");
    if (!colorOptionsContainer) {
      console.error("Color options container not found!");
      return;
    }

    // Clear existing options
    colorOptionsContainer.innerHTML = "";

    // Use the already parsed colors from themeData
    const colorThemes = themeData.colors || [];

    if (!Array.isArray(colorThemes) || colorThemes.length === 0) {
      console.warn("No color themes found for this theme", colorThemes);

      // Create fallback test colors for debugging
      const fallbackColors = [
        { color: "#67b7a8", title: "TEAL", name: "Teal" },
        { color: "#e07a5f", title: "SALMON", name: "Salmon" },
        { color: "#f2cc8f", title: "BEIGE", name: "Beige" },
        { color: "#d3d3d3", title: "GREY", name: "Grey" },
        { color: "#ffffff", title: "WHITE", name: "White" },
        { color: "#000000", title: "DARK", name: "Dark" },
      ];

      // Use fallback colors
      fallbackColors.forEach((colorTheme, index) => {
        const colorOption = document.createElement("div");
        colorOption.className = "dev-customizer-color-option";
        colorOption.dataset.colorThemeId = index;

        const colorCircle = document.createElement("div");
        colorCircle.className = "dev-customizer-color-option__circle";
        colorCircle.style.backgroundColor = colorTheme.color;

        const colorLabel = document.createElement("div");
        colorLabel.className = "dev-customizer-color-option__label";
        colorLabel.textContent = colorTheme.title;

        colorOption.appendChild(colorCircle);
        colorOption.appendChild(colorLabel);

        // Add click handler with better event handling
        colorOption.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.selectColor(colorTheme, colorOption);
        });

        colorOptionsContainer.appendChild(colorOption);
      });

      return;
    }

    // Create color option elements
    colorThemes.forEach((colorTheme, index) => {
      const colorOption = document.createElement("div");
      colorOption.className = "dev-customizer-color-option";
      colorOption.dataset.colorThemeId = colorTheme.id || index;

      const colorCircle = document.createElement("div");
      colorCircle.className = "dev-customizer-color-option__circle";
      const backgroundColor =
        colorTheme.color || colorTheme.background_color || "#cccccc";
      colorCircle.style.backgroundColor = backgroundColor;

      // Add debug styling to ensure visibility
      colorCircle.style.border = "3px solid #e0e0e0";
      colorCircle.style.display = "block";
      colorCircle.style.minWidth = "60px";
      colorCircle.style.minHeight = "60px";

      const colorLabel = document.createElement("div");
      colorLabel.className = "dev-customizer-color-option__label";
      const labelText =
        colorTheme.title || colorTheme.name || `Color ${index + 1}`;
      colorLabel.textContent = labelText;

      colorOption.appendChild(colorCircle);
      colorOption.appendChild(colorLabel);

      // Add click handler with better event handling
      colorOption.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectColor(colorTheme, colorOption);
      });

      colorOptionsContainer.appendChild(colorOption);
    });

    // Debug CSS visibility
  }

  clearColorOptions() {
    const colorOptionsContainer = document.getElementById("color-options-list");
    if (colorOptionsContainer) {
      colorOptionsContainer.innerHTML = "";
    }
  }

  selectColor(colorTheme, optionElement) {
    // Remove selected class from all options
    document
      .querySelectorAll(".dev-customizer-color-option")
      .forEach((option) => {
        option.classList.remove("selected");
      });

    // Add selected class to clicked option
    optionElement.classList.add("selected");

    // Apply the color theme to the canvas background
    if (colorTheme.background_image) {
      // Verify the URL is valid (not a GID)
      if (colorTheme.background_image.startsWith("gid://")) {
        console.error(
          "Background image is still a GID, not a URL:",
          colorTheme.background_image
        );
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        this.backgroundImage = img;
        this.resizeCanvas();
      };

      img.onerror = () => {
        console.error(
          "Failed to load color theme background image:",
          colorTheme.background_image
        );
      };

      img.src = colorTheme.background_image;
    } else {
      console.warn("No background image found for color theme:", colorTheme);
    }
  }

  // Method to update canvas with real-time input changes
  updateFromInputs(inputData) {
    // This will handle real-time updates from form inputs

    // Redraw canvas with new data
    this.drawBackground();

    // Apply any text, colors, or other customizations
  }

  addImageToCanvas(img, imageData) {
    // Get display dimensions
    const displayWidth = this.canvas.width / (window.devicePixelRatio || 2);
    const displayHeight = this.canvas.height / (window.devicePixelRatio || 2);

    // Calculate image size (max 150px, maintain aspect ratio)
    const maxSize = 150;
    let imgWidth = img.width;
    let imgHeight = img.height;

    if (imgWidth > maxSize || imgHeight > maxSize) {
      const scale = Math.min(maxSize / imgWidth, maxSize / imgHeight);
      imgWidth = imgWidth * scale;
      imgHeight = imgHeight * scale;
    }

    // Position image in center initially
    const canvasImageData = {
      id: Date.now(),
      img: img,
      x: (displayWidth - imgWidth) / 2,
      y: (displayHeight - imgHeight) / 2,
      width: imgWidth,
      height: imgHeight,
      originalData: imageData,
    };

    this.canvasImages.push(canvasImageData);

    // Auto-select and bring to front the newly added image
    this.selectedImage = canvasImageData;

    this.redraw();
  }

  drawCanvasImages() {
    this.canvasImages.forEach((imageData) => {
      this.ctx.save();

      // Draw the image
      this.ctx.drawImage(
        imageData.img,
        imageData.x,
        imageData.y,
        imageData.width,
        imageData.height
      );

      // Draw bucket/trash icon for removal only when image is selected
      if (this.selectedImage && this.selectedImage.id === imageData.id) {
        this.drawBucketIcon(imageData);
      }

      // Draw selection border if this image is selected
      if (this.selectedImage && this.selectedImage.id === imageData.id) {
        // Draw elegant selection border with gradient effect
        this.ctx.save();

        // Outer glow effect
        this.ctx.shadowColor = "rgba(103, 183, 168, 0.3)";
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // Main border
        this.ctx.strokeStyle = "#67b7a8";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 4]); // More elegant dash pattern
        this.ctx.strokeRect(
          imageData.x - 3,
          imageData.y - 3,
          imageData.width + 6,
          imageData.height + 6
        );

        // Inner highlight
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([8, 4]);
        this.ctx.strokeRect(
          imageData.x - 2,
          imageData.y - 2,
          imageData.width + 4,
          imageData.height + 4
        );

        this.ctx.setLineDash([]); // Reset line dash
        this.ctx.restore();

        // Draw corner handles for resize indication
        const handleSize = 10; // Slightly larger for better usability
        const handles = [
          { x: imageData.x - handleSize / 2, y: imageData.y - handleSize / 2 }, // Top-left
          {
            x: imageData.x + imageData.width - handleSize / 2,
            y: imageData.y - handleSize / 2,
          }, // Top-right
          {
            x: imageData.x - handleSize / 2,
            y: imageData.y + imageData.height - handleSize / 2,
          }, // Bottom-left
          {
            x: imageData.x + imageData.width - handleSize / 2,
            y: imageData.y + imageData.height - handleSize / 2,
          }, // Bottom-right
        ];

        // Draw elegant resize handles
        handles.forEach((handle) => {
          this.ctx.save();

          // Outer glow for handles
          this.ctx.shadowColor = "rgba(103, 183, 168, 0.4)";
          this.ctx.shadowBlur = 6;
          this.ctx.shadowOffsetX = 0;
          this.ctx.shadowOffsetY = 0;

          // Main handle with gradient effect
          const gradient = this.ctx.createLinearGradient(
            handle.x,
            handle.y,
            handle.x + handleSize,
            handle.y + handleSize
          );
          gradient.addColorStop(0, "#67b7a8");
          gradient.addColorStop(1, "#4a9b8e");

          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);

          // Inner highlight
          this.ctx.shadowBlur = 0;
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          this.ctx.fillRect(
            handle.x + 1,
            handle.y + 1,
            handleSize - 2,
            handleSize - 2
          );

          // Border
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);

          this.ctx.restore();
        });
      }

      this.ctx.restore();
    });
  }

  drawBucketIcon(imageData) {
    const iconSize = 20; // Larger for better visibility
    const padding = 8;

    // Position the bucket icon INSIDE the image at the top-right corner
    const iconX = imageData.x + imageData.width - iconSize - padding;
    const iconY = imageData.y + padding;

    this.ctx.save();

    // Outer glow effect
    this.ctx.shadowColor = "rgba(255, 68, 68, 0.4)";
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Draw background circle with gradient
    const gradient = this.ctx.createRadialGradient(
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      0,
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      iconSize / 2
    );
    gradient.addColorStop(0, "#ff6666");
    gradient.addColorStop(1, "#ff4444");

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      iconSize / 2,
      0,
      2 * Math.PI
    );
    this.ctx.fill();

    // Draw white border
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw cross icon
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = "round";

    const centerX = iconX + iconSize / 2;
    const centerY = iconY + iconSize / 2;
    const crossSize = 7;

    // Draw X cross
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - crossSize / 2, centerY - crossSize / 2);
    this.ctx.lineTo(centerX + crossSize / 2, centerY + crossSize / 2);
    this.ctx.moveTo(centerX + crossSize / 2, centerY - crossSize / 2);
    this.ctx.lineTo(centerX - crossSize / 2, centerY + crossSize / 2);
    this.ctx.stroke();

    this.ctx.restore();

    // Store bucket icon position for click detection (with larger hit area)
    imageData.bucketIcon = {
      x: iconX - 4,
      y: iconY - 4,
      width: iconSize + 8,
      height: iconSize + 8,
    };
  }

  removeCanvasImage(imageId) {
    const deletedIndex = this.canvasImages.findIndex(
      (img) => img.id === imageId
    );
    this.canvasImages = this.canvasImages.filter((img) => img.id !== imageId);

    // Auto-select a neighbor after deletion
    if (this.canvasImages.length > 0) {
      // Try to select the image that was after the deleted one, or the last one
      const newIndex = Math.min(deletedIndex, this.canvasImages.length - 1);
      this.selectedImage = this.canvasImages[newIndex];
    } else {
      this.selectedImage = null;
    }

    this.redraw();
  }

  removeCanvasImagesBySourceId(sourceImageId) {
    // Remove all canvas images that were created from the uploaded image with sourceImageId
    const removedCount = this.canvasImages.filter(
      (img) => img.originalData && img.originalData.id === sourceImageId
    ).length;

    this.canvasImages = this.canvasImages.filter(
      (img) => !img.originalData || img.originalData.id !== sourceImageId
    );

    // Clear selection if the selected image was removed
    if (
      this.selectedImage &&
      this.selectedImage.originalData &&
      this.selectedImage.originalData.id === sourceImageId
    ) {
      this.selectedImage = null;
    }

    this.redraw();

    return removedCount;
  }

  zoomIn() {
    // Calculate new zoom level with smooth increments
    const newZoomLevel = Math.min(3, this.zoomLevel * this.zoomFactor);

    if (newZoomLevel !== this.zoomLevel) {
      this.zoomToLevel(newZoomLevel);
    }
  }

  updateCanvasForZoom() {
    // Store original size if not already stored
    if (!this.originalCanvasSize) {
      this.originalCanvasSize = {
        width: this.canvas.width,
        height: this.canvas.height,
        styleWidth: this.canvas.style.width,
        styleHeight: this.canvas.style.height,
      };
    }

    // Update canvas display size to maintain quality
    const baseWidth = parseInt(this.originalCanvasSize.styleWidth);
    const baseHeight = parseInt(this.originalCanvasSize.styleHeight);

    this.canvas.style.width = `${baseWidth * this.zoomLevel}px`;
    this.canvas.style.height = `${baseHeight * this.zoomLevel}px`;

    // Redraw with new zoom level
    this.redraw();
  }

  toggleZoom() {
    // Simple toggle: 1x <-> 1.5x
    if (this.zoomLevel === 1) {
      this.zoomToLevel(1.5);
    } else {
      this.zoomToLevel(1);
    }
  }

  zoomOut() {
    // Calculate new zoom level with smooth decrements
    const newZoomLevel = Math.max(0.5, this.zoomLevel / this.zoomFactor);

    if (newZoomLevel !== this.zoomLevel) {
      this.zoomToLevel(newZoomLevel);
    } else if (this.zoomLevel > 1) {
      // If already at minimum zoom, reset to 1x
      this.zoomToFit();
    }
  }

  updateCanvasTransform() {
    // Update canvas transform with current zoom and pan
    this.canvas.style.transform = `scale(${this.zoomLevel}) translate(${this.panOffset.x}px, ${this.panOffset.y}px)`;
  }

  updateZoomIcon() {
    const loopButton = document.querySelector('[data-control="loop"]');
    if (loopButton) {
      const icon = loopButton.querySelector("svg");
      const label = loopButton.querySelector(".dev-customizer__control-label");

      if (icon) {
        if (this.zoomLevel > 1) {
          // Show zoom out icon when zoomed in
          icon.innerHTML = `
            <svg class="{{ class }}" xmlns="http://www.w3.org/2000/svg" width="20" height="19" viewBox="0 0 20 19" fill="none">
      <path d="M19 19L14.6569 14.6569M14.6569 14.6569C16.1046 13.2091 17 11.2091 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17C11.2091 17 13.2091 16.1046 14.6569 14.6569Z" stroke="#434343" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M6 9H12" stroke="#434343" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
          `;
        } else {
          // Show original loop icon when not zoomed
          icon.innerHTML = `
              <svg class="{{ class }}" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M17.5 17.5002L13.8808 13.881M13.8808 13.881C14.4999 13.2619 14.991 12.527 15.326 11.7181C15.661 10.9093 15.8335 10.0423 15.8335 9.16684C15.8335 8.29134 15.6611 7.42441 15.326 6.61555C14.991 5.80669 14.4999 5.07174 13.8808 4.45267C13.2617 3.8336 12.5268 3.34252 11.7179 3.00748C10.9091 2.67244 10.0422 2.5 9.16666 2.5C8.29115 2.5 7.42422 2.67244 6.61537 3.00748C5.80651 3.34252 5.07156 3.8336 4.45249 4.45267C3.20221 5.70295 2.49982 7.39868 2.49982 9.16684C2.49982 10.935 3.20221 12.6307 4.45249 13.881C5.70276 15.1313 7.3985 15.8337 9.16666 15.8337C10.9348 15.8337 12.6305 15.1313 13.8808 13.881ZM9.16666 6.66684V11.6668M6.66666 9.16684H11.6667" stroke="#434343" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
          `;
        }
      }

      // Update button label to show zoom level
      if (label) {
        if (this.zoomLevel > 1) {
          label.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        } else {
          label.textContent = "Zoom In";
        }
      }
    }
  }

  handleWheelZoom(e) {
    e.preventDefault();

    // Only zoom if not in bottle view
    if (this.isBottleView) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom direction and amount with better increments
    const zoomDelta = e.deltaY > 0 ? -0.2 : 0.2;
    const newZoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel + zoomDelta));

    if (newZoomLevel !== this.zoomLevel) {
      this.zoomToLevel(newZoomLevel, mouseX, mouseY);
    }
  }

  handleKeyboardZoom(e) {
    // Only handle zoom shortcuts if not in bottle view
    if (this.isBottleView) return;

    // Check if user is typing in an input field
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    switch (e.key) {
      case "+":
      case "=":
        e.preventDefault();
        this.zoomIn();
        break;
      case "-":
        e.preventDefault();
        this.zoomOut();
        break;
      case "0":
        e.preventDefault();
        this.zoomToFit();
        break;
      case "1":
        e.preventDefault();
        this.zoomToLevel(1);
        break;
      case "2":
        e.preventDefault();
        this.zoomToLevel(2);
        break;
      case "3":
        e.preventDefault();
        this.zoomToLevel(3);
        break;
      case "Escape":
        if (this.zoomLevel > 1) {
          e.preventDefault();
          this.zoomToFit();
        }
        break;
    }
  }

  zoomToLevel(level, centerX = null, centerY = null) {
    const oldZoom = this.zoomLevel;
    this.zoomLevel = level;

    // If zooming to a specific point (mouse position)
    if (centerX !== null && centerY !== null) {
      const rect = this.canvas.getBoundingClientRect();
      const canvasCenterX = rect.width / 2;
      const canvasCenterY = rect.height / 2;

      // Calculate the point relative to canvas center
      const relativeX = centerX - canvasCenterX;
      const relativeY = centerY - canvasCenterY;

      // Adjust pan offset to keep the point under the mouse
      const zoomRatio = level / oldZoom;
      this.panOffset.x =
        this.panOffset.x * zoomRatio - relativeX * (zoomRatio - 1);
      this.panOffset.y =
        this.panOffset.y * zoomRatio - relativeY * (zoomRatio - 1);
    }

    // Apply constraints
    this.constrainPanOffset();

    // Update canvas
    this.updateCanvasForZoom();
    this.updateCanvasTransform();
    this.updateZoomIcon();

    // Show zoom level indicator
    // this.showZoomIndicator();
  }

  zoomToFit() {
    this.zoomLevel = 1;
    this.panOffset = { x: 0, y: 0 };

    // Smooth transition
    this.canvas.style.transition = "transform 0.3s ease-out";
    this.updateCanvasTransform();

    setTimeout(() => {
      this.canvas.style.transition = "";
    }, 300);

    this.updateCanvasForZoom();
    this.updateZoomIcon();
    // this.showZoomIndicator();
  }

  constrainPanOffset() {
    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 2);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 2);

    // Calculate maximum pan based on zoom level
    const maxPanX = canvasWidth * (this.zoomLevel - 1) * 0.5;
    const maxPanY = canvasHeight * (this.zoomLevel - 1) * 0.5;

    this.panOffset.x = Math.max(-maxPanX, Math.min(maxPanX, this.panOffset.x));
    this.panOffset.y = Math.max(-maxPanY, Math.min(maxPanY, this.panOffset.y));
  }

  showZoomIndicator() {
    // Remove existing indicator
    const existingIndicator = document.querySelector(".zoom-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create zoom indicator with more info
    const indicator = document.createElement("div");
    indicator.className = "zoom-indicator";
    indicator.innerHTML = `
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">
        ${Math.round(this.zoomLevel * 100)}%
      </div>
      <div style="font-size: 11px; opacity: 0.8;">
        Click loop button to toggle zoom
      </div>
    `;

    // Style the indicator
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
      transition: opacity 0.3s ease;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(indicator);

    // Fade out after 3 seconds
    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 3000);
  }

  initMouseEvents() {
    this.canvas.addEventListener("mousedown", (e) => {
      // Disable interactions in bottle view
      if (this.isBottleView) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.handleMouseDown(e);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      // Disable interactions in bottle view
      if (this.isBottleView) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.handleMouseMove(e);
    });

    this.canvas.addEventListener("mouseup", (e) => {
      // Disable interactions in bottle view
      if (this.isBottleView) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.handleMouseUp(e);
    });

    this.canvas.addEventListener("mouseleave", (e) => {
      // Disable interactions in bottle view
      if (this.isBottleView) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.handleMouseLeave(e);
    });

    // Touch events for mobile
    this.canvas.addEventListener("touchstart", (e) => {
      // Disable interactions in bottle view
      if (this.isBottleView) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.handleTouchStart(e);
    });

    this.canvas.addEventListener("touchmove", (e) => {
      // Disable interactions in bottle view
      if (this.isBottleView) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.handleTouchMove(e);
    });

    this.canvas.addEventListener("touchend", (e) => {
      // Disable interactions in bottle view
      if (this.isBottleView) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      this.handleTouchEnd(e);
    });
  }

  initZoomEvents() {
    // Mouse wheel zoom - DISABLED
    // this.canvas.addEventListener(
    //   "wheel",
    //   (e) => {
    //     // Disable zoom in bottle view
    //     if (this.isBottleView) {
    //       e.preventDefault();
    //       e.stopPropagation();
    //       return;
    //     }
    //     this.handleWheelZoom(e);
    //   },
    //   {
    //     passive: false,
    //   }
    // );

    // Keyboard zoom shortcuts
    document.addEventListener("keydown", (e) => {
      // Disable zoom in bottle view
      if (this.isBottleView) {
        return;
      }
      this.handleKeyboardZoom(e);
    });
  }

  getImageAtPoint(x, y) {
    // Check images in reverse order (top to bottom)
    for (let i = this.canvasImages.length - 1; i >= 0; i--) {
      const img = this.canvasImages[i];
      if (
        x >= img.x &&
        x <= img.x + img.width &&
        y >= img.y &&
        y <= img.y + img.height
      ) {
        return img;
      }
    }
    return null;
  }

  getImageWithBucketAtPoint(x, y) {
    // Check if click is on any bucket icon
    for (let i = this.canvasImages.length - 1; i >= 0; i--) {
      const image = this.canvasImages[i];
      if (image.bucketIcon) {
        if (
          x >= image.bucketIcon.x &&
          x <= image.bucketIcon.x + image.bucketIcon.width &&
          y >= image.bucketIcon.y &&
          y <= image.bucketIcon.y + image.bucketIcon.height
        ) {
          return image;
        }
      }
    }
    return null;
  }

  getResizeHandle(x, y, image) {
    if (!image) return null;

    const handleSize = 10; // Match the visual handle size
    const tolerance = 6; // Increased tolerance for easier clicking

    const handles = {
      tl: { x: image.x - handleSize / 2, y: image.y - handleSize / 2 }, // Top-left
      tr: {
        x: image.x + image.width - handleSize / 2,
        y: image.y - handleSize / 2,
      }, // Top-right
      bl: {
        x: image.x - handleSize / 2,
        y: image.y + image.height - handleSize / 2,
      }, // Bottom-left
      br: {
        x: image.x + image.width - handleSize / 2,
        y: image.y + image.height - handleSize / 2,
      }, // Bottom-right
    };

    for (const [handleName, handle] of Object.entries(handles)) {
      if (
        x >= handle.x - tolerance &&
        x <= handle.x + handleSize + tolerance &&
        y >= handle.y - tolerance &&
        y <= handle.y + handleSize + tolerance
      ) {
        return handleName;
      }
    }

    return null;
  }

  setResizeCursor(handle) {
    const cursors = {
      tl: "nw-resize", // Top-left: northwest resize
      tr: "ne-resize", // Top-right: northeast resize
      bl: "sw-resize", // Bottom-left: southwest resize
      br: "se-resize", // Bottom-right: southeast resize
    };
    this.canvas.style.cursor = cursors[handle] || "default";
  }

  getResizeCursor(handle) {
    const cursors = {
      tl: "nw-resize", // Top-left: northwest resize
      tr: "ne-resize", // Top-right: northeast resize
      bl: "sw-resize", // Bottom-left: southwest resize
      br: "se-resize", // Bottom-right: southeast resize
    };
    return cursors[handle] || "default";
  }

  getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;

    // Calculate scale factor to map from CSS pixels to canvas pixels
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    // Get pointer position in CSS pixels relative to canvas
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    // Map to canvas coordinates (accounting for DPR scaling)
    let coords = {
      x: (cssX * scaleX) / dpr,
      y: (cssY * scaleY) / dpr,
    };

    // Account for zoom level if present
    if (this.zoomLevel && this.zoomLevel !== 1) {
      coords.x = coords.x / this.zoomLevel;
      coords.y = coords.y / this.zoomLevel;
    }

    // If in bottle view, account for the bottle scale factor
    if (this.isBottleView && this.bottleScaleFactor) {
      coords.x = coords.x / this.bottleScaleFactor;
      coords.y = coords.y / this.bottleScaleFactor;
    }

    // Get canvas display dimensions in CSS pixels
    const displayWidth = this.canvas.width / dpr;
    const displayHeight = this.canvas.height / dpr;

    // Ensure coordinates are within canvas bounds
    const maxX = this.isBottleView
      ? displayWidth / this.bottleScaleFactor
      : displayWidth;
    const maxY = this.isBottleView
      ? displayHeight / this.bottleScaleFactor
      : displayHeight;

    coords.x = Math.max(0, Math.min(coords.x, maxX));
    coords.y = Math.max(0, Math.min(coords.y, maxY));

    return coords;
  }

  handleMouseDown(e) {
    const coords = this.getCanvasCoordinates(e);

    // Check if clicking on a bucket icon first
    const bucketImage = this.getImageWithBucketAtPoint(coords.x, coords.y);
    if (bucketImage) {
      // Remove the image from canvas
      this.removeCanvasImage(bucketImage.id);
      e.preventDefault();
      return;
    }

    // Check if clicking on an image
    const image = this.getImageAtPoint(coords.x, coords.y);
    if (image) {
      this.selectedImage = image;

      // Clear text selection when selecting an image
      if (this.textManager && this.textManager.selectedText) {
        this.textManager.selectedText = null;
      }

      // Check if clicking on a resize handle
      const handle = this.getResizeHandle(coords.x, coords.y, image);
      if (handle) {
        this.isResizing = true;
        this.resizeHandle = handle;
        this.originalImageState = {
          x: image.x,
          y: image.y,
          width: image.width,
          height: image.height,
        };
        this.dragOffset = { x: coords.x, y: coords.y };

        // Set appropriate resize cursor and provide immediate feedback
        this.setResizeCursor(handle);
        this.canvas.style.cursor = this.getResizeCursor(handle);

        // Redraw to show resize is starting
        this.redraw();
      } else {
        // Regular drag
        this.isDragging = true;
        this.dragOffset = {
          x: coords.x - image.x,
          y: coords.y - image.y,
        };
        this.canvas.style.cursor = "grabbing";
      }

      // Prevent text selection during drag/resize
      e.preventDefault();
      return;
    }

    // If not clicking on image, check if we should start panning (when zoomed)
    if (this.zoomLevel > 1) {
      // Start panning when zoomed in
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }

    // If not clicking on image in Step 2, keep current image selection
    // Only clear selection if we're NOT in Step 2 (customization step)
    if (!this.isOnStep2()) {
      this.selectedImage = null;
    } else {
    }

    // Let text manager handle click for text selection
    if (this.textManager) {
      const wasTextSelected = this.textManager.selectedText !== null;
      this.textManager.handleCanvasClick(coords.x, coords.y);

      // If a text was selected (either newly selected or clicked on selected text), don't change anything
      if (this.textManager.selectedText) {
        return;
      }

      // If we deselected a text, redraw to remove selection border
      if (wasTextSelected && !this.textManager.selectedText) {
        this.redraw();
        return;
      }
    }

    // Redraw to update UI
    this.redraw();
  }

  handleMouseMove(e) {
    const coords = this.getCanvasCoordinates(e);

    if (this.isResizing && this.selectedImage && this.originalImageState) {
      // Handle resizing with improved responsiveness
      const deltaX = coords.x - this.dragOffset.x;
      const deltaY = coords.y - this.dragOffset.y;

      // Apply resize with smooth updates
      this.resizeImage(this.selectedImage, this.resizeHandle, deltaX, deltaY);

      // Update cursor to show resize is active
      this.setResizeCursor(this.resizeHandle);

      // Redraw with smooth updates
      this.redraw();
      return;
    }

    if (this.isDragging && this.selectedImage) {
      // Update image position
      this.selectedImage.x = coords.x - this.dragOffset.x;
      this.selectedImage.y = coords.y - this.dragOffset.y;

      // Keep image within canvas bounds
      const canvasWidth = this.canvas.width / (window.devicePixelRatio || 2);
      const canvasHeight = this.canvas.height / (window.devicePixelRatio || 2);

      this.selectedImage.x = Math.max(
        0,
        Math.min(this.selectedImage.x, canvasWidth - this.selectedImage.width)
      );
      this.selectedImage.y = Math.max(
        0,
        Math.min(this.selectedImage.y, canvasHeight - this.selectedImage.height)
      );

      // Redraw canvas
      this.redraw();
      return;
    }

    if (this.isPanning) {
      // Handle panning when zoomed in
      const deltaX = e.clientX - this.panStart.x;
      const deltaY = e.clientY - this.panStart.y;

      // Apply pan with improved sensitivity
      const panSensitivity = 1.0; // Full sensitivity for responsive control
      this.panOffset.x += deltaX * panSensitivity;
      this.panOffset.y += deltaY * panSensitivity;

      // Apply constraints
      this.constrainPanOffset();

      // Update canvas transform
      this.updateCanvasTransform();

      // Update pan start position for next move
      this.panStart = { x: e.clientX, y: e.clientY };

      return;
    }

    // Change cursor when hovering over images or resize handles
    const image = this.getImageAtPoint(coords.x, coords.y);
    if (image && this.selectedImage && image.id === this.selectedImage.id) {
      const handle = this.getResizeHandle(coords.x, coords.y, image);
      if (handle) {
        this.setResizeCursor(handle);
      } else {
        this.canvas.style.cursor = "grab";
      }
    } else if (image) {
      this.canvas.style.cursor = "grab";
    } else if (this.zoomLevel > 1) {
      // Show pan cursor when zoomed in and not over an image
      this.canvas.style.cursor = "grab";
    } else {
      this.canvas.style.cursor = "default";
    }
  }

  handleMouseUp(e) {
    if (this.isDragging || this.isResizing) {
      this.isDragging = false;
      this.isResizing = false;
      this.resizeHandle = null;
      this.originalImageState = null;
      // Keep selectedImage so selection border remains visible
      this.canvas.style.cursor = "default";

      // Update original content if in bottle view
      this.updateOriginalContent();
    }

    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = "default";
    }
  }

  handleMouseLeave(e) {
    // Gracefully end any active drag or resize operation
    if (this.isDragging || this.isResizing) {
      this.isDragging = false;
      this.isResizing = false;
      this.resizeHandle = null;
      this.originalImageState = null;
      this.canvas.style.cursor = "default";
      this.redraw();
    }

    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = "default";
    }
  }

  resizeImage(image, handle, deltaX, deltaY) {
    const original = this.originalImageState;
    const minSize = 20; // Minimum size to prevent image from disappearing
    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 2);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 2);

    // Calculate new dimensions based on which handle is being dragged
    let newX = original.x;
    let newY = original.y;
    let newWidth = original.width;
    let newHeight = original.height;

    switch (handle) {
      case "tl": // Top-left: move top-left corner
        newX = original.x + deltaX;
        newY = original.y + deltaY;
        newWidth = original.width - deltaX;
        newHeight = original.height - deltaY;
        break;
      case "tr": // Top-right: move top-right corner
        newY = original.y + deltaY;
        newWidth = original.width + deltaX;
        newHeight = original.height - deltaY;
        break;
      case "bl": // Bottom-left: move bottom-left corner
        newX = original.x + deltaX;
        newWidth = original.width - deltaX;
        newHeight = original.height + deltaY;
        break;
      case "br": // Bottom-right: move bottom-right corner
        newWidth = original.width + deltaX;
        newHeight = original.height + deltaY;
        break;
    }

    // Maintain aspect ratio (hold Shift key to disable)
    if (!window.event || !window.event.shiftKey) {
      const aspectRatio = original.width / original.height;

      // Use the dimension that changed the most to determine the new size
      const widthChange = Math.abs(newWidth - original.width);
      const heightChange = Math.abs(newHeight - original.height);

      if (widthChange > heightChange) {
        newHeight = newWidth / aspectRatio;
        // Adjust Y position for top handles
        if (handle === "tl" || handle === "tr") {
          newY = original.y + original.height - newHeight;
        }
      } else {
        newWidth = newHeight * aspectRatio;
        // Adjust X position for left handles
        if (handle === "tl" || handle === "bl") {
          newX = original.x + original.width - newWidth;
        }
      }
    }

    // Apply minimum size constraints first
    if (newWidth < minSize) {
      newWidth = minSize;
      if (handle === "tl" || handle === "bl") {
        newX = original.x + original.width - minSize;
      }
    }
    if (newHeight < minSize) {
      newHeight = minSize;
      if (handle === "tl" || handle === "tr") {
        newY = original.y + original.height - minSize;
      }
    }

    // Keep within canvas bounds with smooth constraint
    if (newX < 0) {
      newWidth += newX;
      newX = 0;
    }
    if (newY < 0) {
      newHeight += newY;
      newY = 0;
    }
    if (newX + newWidth > canvasWidth) {
      newWidth = canvasWidth - newX;
    }
    if (newY + newHeight > canvasHeight) {
      newHeight = canvasHeight - newY;
    }

    // Final minimum size check after all constraints
    if (newWidth < minSize) {
      newWidth = minSize;
      if (handle === "tl" || handle === "bl") {
        newX = original.x + original.width - minSize;
      }
    }
    if (newHeight < minSize) {
      newHeight = minSize;
      if (handle === "tl" || handle === "tr") {
        newY = original.y + original.height - minSize;
      }
    }

    // Apply the new dimensions smoothly
    image.x = Math.round(newX);
    image.y = Math.round(newY);
    image.width = Math.round(newWidth);
    image.height = Math.round(newHeight);
  }

  // Touch event handlers for mobile support
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.handleMouseDown(mouseEvent);
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    this.handleMouseMove(mouseEvent);
  }

  handleTouchEnd(e) {
    e.preventDefault();
    this.handleMouseUp(e);
  }
}

// API Upload functionality with cart add
async function uploadImageToAPI(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://0.0.0.0:8000/upload-to-shopify/", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    const imageUrl = result.image_url || result.url;
    console.log("imageUrl", imageUrl);

    if (imageUrl) {
      await addToCartWithImage(imageUrl);
    }

    return result;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

async function addToCartWithImage(imageUrl) {
  try {
    // Get product variant ID (you may need to adjust this)
    const productVariantId =
      window.productVariantId ||
      document.querySelector("[data-product-variant-id]")?.dataset
        .productVariantId;

    if (!productVariantId) {
      throw new Error("Product variant ID not found");
    }

    const cartData = {
      items: [
        {
          id: productVariantId,
          quantity: 1,
          properties: {
            "Custom Image": imageUrl,
          },
        },
      ],
    };

    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cartData),
    });

    if (!response.ok) {
      throw new Error(`Cart add failed! status: ${response.status}`);
    }

    const result = await response.json();

    // Redirect to cart
    window.location.href = "/checkout";
  } catch (error) {
    console.error("❌ Add to cart failed:", error);
    throw error;
  }
}
// Debug function to check current state
window.debugCustomizer = function () {
  const colorContainer = document.getElementById("color-options-list");

  // Debug color circles
  const colorOptions = document.querySelectorAll(
    ".dev-customizer-color-option"
  );

  colorOptions.forEach((option, index) => {
    const circle = option.querySelector(".dev-customizer-color-option__circle");
    const label = option.querySelector(".dev-customizer-color-option__label");
  });

  const colorWrapper = document.querySelector(
    ".dev-customizer-color-selection-wrapper"
  );

  const stepsContainer = document.querySelector(".dev-customizer-steps");
};

// Test function to simulate the bug scenario

function initThemeSelection() {
  // Try multiple selectors to find theme options
  let themeOptions = document.querySelectorAll(".theme-option-item");

  if (themeOptions.length === 0) {
    themeOptions = document.querySelectorAll(".theme-metaobject");
  }

  if (themeOptions.length === 0) {
    themeOptions = document.querySelectorAll("[data-theme-id]");
  }

  if (themeOptions.length === 0) {
    themeOptions = document.querySelectorAll(".dev-theme-option-wrapper");
  }

  if (themeOptions.length === 0) {
    return;
  }

  themeOptions.forEach((option, index) => {
    option.addEventListener("click", async function () {
      try {
        // Remove selected class from all options
        themeOptions.forEach((opt) => {
          // Check if this option is the wrapper itself or contains a wrapper
          if (opt.classList.contains("dev-theme-option-wrapper")) {
            opt.classList.remove("selected");
          } else {
            const wrapper = opt.querySelector(".dev-theme-option-wrapper");
            if (wrapper) {
              wrapper.classList.remove("selected");
            }
          }
        });

        // Add selected class to clicked option
        if (this.classList.contains("dev-theme-option-wrapper")) {
          // Clicked element is the wrapper itself
          this.classList.add("selected");
        } else {
          // Look for wrapper within clicked element
          const thisWrapper = this.querySelector(".dev-theme-option-wrapper");
          if (thisWrapper) {
            thisWrapper.classList.add("selected");
          } else {
            console.warn(
              "⚠️ Could not find .dev-theme-option-wrapper in clicked theme option"
            );
          }
        }
      } catch (error) {
        console.error("❌ Error handling theme selection UI:", error);
      }

      // Get theme data - check if data is on this element or parent
      let dataElement = this;

      // If this element doesn't have theme data, check parent
      if (!this.dataset.themeId) {
        dataElement = this.closest("[data-theme-id]");
        if (!dataElement) {
          console.error("❌ Could not find theme data on element or parent!");
          return;
        }
      }

      const themeId = dataElement.dataset.themeId;
      const themeColors = dataElement.dataset.themeColors;
      const themeBackgroundImage = dataElement.dataset.themeBackgroundImage;
      const debugInfo = dataElement.dataset.debugInfo;
      const themeTitle =
        this.querySelector(".dev-theme-option__text")?.textContent ||
        "Unknown Theme";

      // Parse color themes data
      let parsedColors = [];
      try {
        if (themeColors) {
          parsedColors = JSON.parse(themeColors);
        } else {
          console.warn("No theme colors data found");
        }
      } catch (e) {
        console.error(
          "Error parsing theme colors:",
          e,
          "Raw data:",
          themeColors
        );
      }

      // Dispatch theme selected event with background image
      const themeDetail = {
        id: themeId,
        title: themeTitle,
        colors: parsedColors,
        backgroundImage: themeBackgroundImage,
      };

      document.dispatchEvent(
        new CustomEvent("themeSelected", {
          detail: themeDetail,
        })
      );
    });
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("customizer-canvas")) {
    window.customizerCanvas = new CustomizerCanvas("customizer-canvas");

    // Theme init (unchanged)

    setTimeout(() => {
      initThemeSelection();
    }, 200);

    // NEW: Post buttons init

    setTimeout(() => {
      initPostImageButtons();
    }, 300);
  }
});

// Add bottle overlay methods to the CustomizerCanvas prototype
CustomizerCanvas.prototype.initBottleOverlay = function () {
  // Check if bottle control exists
  const bottleControl = document.querySelector('[data-control="bottle"]');

  if (bottleControl) {
    // Note: Click listener is now handled by initControlButtons method
  } else {
    // Fallback: try to find old structure
    const bottleClickArea = document.getElementById("bottle-click-area");
    const bottleImage = document.getElementById("bottle-mockup-image");

    if (bottleClickArea && bottleImage) {
      bottleClickArea.addEventListener("click", () => this.handleBottleClick());
    } else {
    }
  }
};

CustomizerCanvas.prototype.handleBottleClick = function () {
  // Clear any selected text or images before switching to bottle view
  this.clearAllSelections();

  // Check if we're already in bottle view
  if (this.isBottleView) {
    // Switch back to normal view
    this.switchToNormalView();
    return;
  }

  // Hide canvas container with height: 0 to avoid CSS interference
  const canvasContainer = document.querySelector(
    ".dev-customizer__canvas-container"
  );
  if (canvasContainer) {
    // Use setProperty to add !important
    canvasContainer.style.setProperty("height", "0px", "important");
    canvasContainer.style.setProperty("display", "none", "important");
    canvasContainer.style.setProperty("overflow", "hidden", "important");
  }

  // Get bottle mockup image URL from multiple possible sources
  let bottleMockupUrl = null;

  // Try to get from existing bottle image element (old structure)
  const bottleImage = document.getElementById("bottle-mockup-image");
  if (bottleImage && bottleImage.dataset.bottleMockupUrl) {
    bottleMockupUrl = bottleImage.dataset.bottleMockupUrl;
  } else {
    // Try to get from a data attribute on the page or window object
    if (window.bottleMockupImageUrl) {
      bottleMockupUrl = window.bottleMockupImageUrl;
    } else {
      // Try to find it in any element with bottle mockup data
      const mockupElement = document.querySelector("[data-bottle-mockup-url]");
      if (mockupElement) {
        bottleMockupUrl = mockupElement.dataset.bottleMockupUrl;
      }
    }
  }

  if (!bottleMockupUrl) {
    console.error(
      "❌ No bottle mockup image URL found! Cannot create bottle view."
    );
    alert("Bottle view not available - no mockup image configured.");
    return;
  }

  // Switch to bottle view
  this.switchToBottleView(bottleMockupUrl);
};

CustomizerCanvas.prototype.switchToBottleView = function (bottleMockupUrl) {
  // Store original content state before scaling
  this.storeOriginalContentState();

  // Store that we're in bottle view mode
  this.isBottleView = true;
  this.bottleMockupUrl = bottleMockupUrl;

  // Disable all form inputs and controls

  const inputs = document.querySelectorAll("input, textarea, select, button");
  inputs.forEach((input) => {
    // Skip quantity selector - keep it enabled
    if (input.closest(".dev-customizer-quantity-selector")) {
      return;
    }
    input.disabled = true;
    input.style.pointerEvents = "none";
    input.style.opacity = "0.5";
  });

  // Disable specific UI elements
  const dropdowns = document.querySelectorAll(".dev-form-ui--dropdown");
  dropdowns.forEach((dropdown) => {
    // Skip quantity selector - keep it enabled
    if (dropdown.closest(".dev-customizer-quantity-selector")) {
      return;
    }
    dropdown.style.pointerEvents = "none";
    dropdown.style.opacity = "0.5";
  });

  const imageDropzones = document.querySelectorAll(
    ".dev-customizer-image-dropzone"
  );
  imageDropzones.forEach((dropzone) => {
    dropzone.style.pointerEvents = "none";
    dropzone.style.opacity = "0.5";
  });

  // Create bottle background and scale canvas to match bottle width
  this.createSimpleBottleView(bottleMockupUrl);
};

CustomizerCanvas.prototype.createSimpleBottleView = function (bottleMockupUrl) {
  // Get canvas container
  const canvasContainer = document.querySelector(
    ".dev-customizer__canvas-container"
  );
  if (!canvasContainer) {
    console.error("❌ Canvas container not found");
    return;
  }

  // Create bottle background image
  const bottleBackground = document.createElement("div");
  bottleBackground.className = "simple-bottle-background";
  bottleBackground.innerHTML = `<img src="${bottleMockupUrl}" alt="Bottle" class="simple-bottle-image">`;

  // Insert bottle background before canvas container
  canvasContainer.parentNode.insertBefore(bottleBackground, canvasContainer);

  // Wait for bottle image to load, then scale canvas
  const bottleImg = bottleBackground.querySelector(".simple-bottle-image");
  bottleImg.onload = () => {
    this.scaleCanvasToBottle(bottleImg);
  };

  // Set bottle control as active
  this.setActiveControl("bottle");
};

CustomizerCanvas.prototype.scaleCanvasToBottle = function (bottleImg) {
  // Get bottle image dimensions and position
  const bottleRect = bottleImg.getBoundingClientRect();
  const bottleWidth = bottleRect.width;
  const bottleHeight = bottleRect.height;

  // Scale canvas to match bottle width (maintain aspect ratio)
  const canvas = this.canvas;

  // Use fixed original canvas dimensions (1:2 aspect ratio)
  const originalWidth = 225;
  const originalHeight = 449;

  if (!this.originalCanvasSize) {
    this.originalCanvasSize = {
      width: originalWidth,
      height: originalHeight,
    };
  }

  // Use specific dimensions as requested - check if mobile step 3
  const isMobile = window.innerWidth <= 600;
  const isStep3 = document.body.classList.contains("step-3");

  let labelWidth, labelHeight;
  let labelAreaTop, labelAreaLeft;

  if (isMobile && isStep3) {
    // Mobile step 3 dimensions
    labelWidth = 61.722;
    labelHeight = 126.099;
    labelAreaTop = 127;
    labelAreaLeft = 2;
  } else {
    // Default desktop dimensions
    labelWidth = 93;
    labelHeight = 189;
    labelAreaTop = bottleHeight * 0.4; // Position at 40% down the bottle
    labelAreaLeft = 2;
  }

  // Calculate uniform scale factor to maintain aspect ratio
  // Use the same scale for both X and Y to avoid distortion
  const scaleX = labelWidth / originalWidth;
  const scaleY = labelHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY);

  // Calculate actual canvas dimensions with uniform scaling
  const canvasWidth = originalWidth * scale;
  const canvasHeight = originalHeight * scale;

  // Position canvas on top of bottle (in the label area)
  const bottleBackground = document.querySelector(".simple-bottle-background");

  // Apply specific positioning and sizing to canvas with !important
  canvas.style.cssText = `
    position: absolute !important;
    left: ${labelAreaLeft}px !important;
    width: ${canvasWidth}px !important;
    height: ${canvasHeight}px !important;
    top: ${labelAreaTop}px !important;
    z-index: 1 !important;
    transform: none !important;
  `;

  // Update internal canvas resolution for high quality
  const devicePixelRatio = window.devicePixelRatio || 2;
  canvas.width = canvasWidth * devicePixelRatio;
  canvas.height = canvasHeight * devicePixelRatio;

  // Scale the context for high quality rendering
  const ctx = canvas.getContext("2d");
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Update the main context reference to use the new scaled context
  this.ctx = ctx;

  // Store the scale factor for coordinate transformation
  this.bottleScaleFactor = scale;

  // Scale all content proportionally for display
  this.scaleCanvasContent(scale);

  // Move canvas to be a child of the bottle background for proper positioning
  bottleBackground.appendChild(canvas);

  // Redraw canvas content with scaled elements
  this.redraw();
};

// Method to update bottle label dimensions when step changes
CustomizerCanvas.prototype.updateBottleLabelDimensions = function () {
  if (!this.isBottleView) {
    return;
  }

  const bottleImg = document.querySelector(".simple-bottle-image");
  if (!bottleImg) {
    console.error("❌ Bottle image not found");
    return;
  }

  // Get bottle image dimensions
  const bottleRect = bottleImg.getBoundingClientRect();
  const bottleHeight = bottleRect.height;

  // Use fixed original canvas dimensions (1:2 aspect ratio)
  const originalWidth = 225;
  const originalHeight = 449;

  // Check current step and mobile status
  const isMobile = window.innerWidth <= 600;
  const isStep3 = document.body.classList.contains("step-3");

  let labelWidth, labelHeight;
  let labelAreaTop, labelAreaLeft;

  if (isMobile && isStep3) {
    // Mobile step 3 dimensions
    labelWidth = 61.722;
    labelHeight = 126.099;
    labelAreaTop = 127;
    labelAreaLeft = 2;
  } else {
    // Default desktop dimensions
    labelWidth = 93;
    labelHeight = 189;
    labelAreaTop = bottleHeight * 0.4; // Position at 40% down the bottle
    labelAreaLeft = 2;
  }

  // Calculate new scale factor
  const scaleX = labelWidth / originalWidth;
  const scaleY = labelHeight / originalHeight;
  const newScale = Math.min(scaleX, scaleY);

  // Store the old scale factor for content adjustment
  const oldScale = this.bottleScaleFactor;

  // Calculate actual canvas dimensions with uniform scaling
  const canvasWidth = originalWidth * newScale;
  const canvasHeight = originalHeight * newScale;

  const canvas = this.canvas;

  // Update canvas position and size
  canvas.style.cssText = `
    position: absolute !important;
    left: ${labelAreaLeft}px !important;
    width: ${canvasWidth}px !important;
    height: ${canvasHeight}px !important;
    top: ${labelAreaTop}px !important;
    z-index: 1 !important;
    transform: none !important;
  `;

  // Update internal canvas resolution for high quality
  const devicePixelRatio = window.devicePixelRatio || 2;
  canvas.width = canvasWidth * devicePixelRatio;
  canvas.height = canvasHeight * devicePixelRatio;

  // Scale the context for high quality rendering
  const ctx = canvas.getContext("2d");
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Update the main context reference to use the new scaled context
  this.ctx = ctx;

  // Calculate the scale ratio between old and new
  const scaleRatio = newScale / oldScale;

  // Update the bottle scale factor
  this.bottleScaleFactor = newScale;

  // Rescale all content proportionally
  if (this.textManager && this.textManager.texts) {
    this.textManager.texts.forEach((text) => {
      text.x *= scaleRatio;
      text.y *= scaleRatio;
      text.fontSize = Math.round(text.fontSize * scaleRatio);
      text.width *= scaleRatio;
      text.height *= scaleRatio;
      if (text.letterSpacing) {
        text.letterSpacing *= scaleRatio;
      }
    });
  }

  // Rescale all images proportionally
  if (this.canvasImages && this.canvasImages.length > 0) {
    this.canvasImages.forEach((img) => {
      img.x *= scaleRatio;
      img.y *= scaleRatio;
      img.width *= scaleRatio;
      img.height *= scaleRatio;
    });
  }

  // Redraw canvas content with rescaled elements
  this.redraw();
};

// Old complex methods removed - using simple approach now

CustomizerCanvas.prototype.switchToNormalView = function () {
  // Clear any selections when switching back to normal view
  this.clearAllSelections();

  // Store bottle view state before resetting
  const wasInBottleView = this.isBottleView;

  // Reset bottle view state BEFORE restoring content
  this.isBottleView = false;
  this.bottleMockupUrl = null;
  this.bottleScaleFactor = null;

  // Move canvas back to its original container first
  const canvas = this.canvas;
  const originalContainer = document.querySelector(
    ".dev-customizer__canvas-container"
  );

  if (originalContainer) {
    // Restore container height, display, and remove overflow hidden
    originalContainer.style.removeProperty("height");
    originalContainer.style.removeProperty("display");
    originalContainer.style.removeProperty("overflow");
    originalContainer.appendChild(canvas);
  }

  // Remove bottle background
  const bottleBackground = document.querySelector(".simple-bottle-background");
  if (bottleBackground) {
    bottleBackground.remove();
  }

  // Reset canvas styles to normal - use removeProperty to clear all inline styles
  canvas.style.cssText = "";

  // Restore original content state BEFORE resizing canvas
  if (wasInBottleView) {
    this.restoreOriginalContentState();
  }

  // Re-enable all form inputs and controls

  const inputs = document.querySelectorAll("input, textarea, select, button");
  inputs.forEach((input) => {
    // Ensure quantity selector is always enabled
    if (input.closest(".dev-customizer-quantity-selector")) {
      input.disabled = false;
      input.style.pointerEvents = "auto";
      input.style.opacity = "1";
      return;
    }
    input.disabled = false;
    input.style.pointerEvents = "auto";
    input.style.opacity = "1";
  });

  // Re-enable specific UI elements
  const dropdowns = document.querySelectorAll(".dev-form-ui--dropdown");
  dropdowns.forEach((dropdown) => {
    // Ensure quantity selector is always enabled
    if (dropdown.closest(".dev-customizer-quantity-selector")) {
      dropdown.style.pointerEvents = "auto";
      dropdown.style.opacity = "1";
      return;
    }
    dropdown.style.pointerEvents = "auto";
    dropdown.style.opacity = "1";
  });

  const imageDropzones = document.querySelectorAll(
    ".dev-customizer-image-dropzone"
  );
  imageDropzones.forEach((dropzone) => {
    dropzone.style.pointerEvents = "auto";
    dropzone.style.opacity = "1";
  });

  // Resize canvas back to normal dimensions
  this.resizeCanvas();

  // Set image control as active
  this.setActiveControl("image");
};

// Method to clear all selections (text and images)
CustomizerCanvas.prototype.clearAllSelections = function () {
  // Clear selected image
  this.selectedImage = null;

  // Clear selected text if text manager exists
  if (this.textManager && this.textManager.selectedText) {
    this.textManager.selectedText = null;
  }

  // Redraw canvas to remove selection borders
  this.redraw();
};

// Removed old complex restoreCanvasView method

// Content scaling methods for bottle view
CustomizerCanvas.prototype.storeOriginalContentState = function () {
  // Only store if not already in bottle view (prevent storing scaled values)
  if (this.isBottleView) {
    console.warn("⚠️ Already in bottle view - not overwriting original state");
    return;
  }

  // Store original text states
  this.originalTextStates = [];
  if (this.textManager && this.textManager.texts) {
    this.originalTextStates = this.textManager.texts.map((text) => ({
      id: text.id,
      x: text.x,
      y: text.y,
      fontSize: text.fontSize,
      width: text.width,
      height: text.height,
      letterSpacing:
        typeof text.letterSpacing === "number" ? text.letterSpacing : 0,
    }));
  }

  // Store original image states
  this.originalImageStates = [];
  if (this.canvasImages && this.canvasImages.length > 0) {
    this.originalImageStates = this.canvasImages.map((img) => ({
      id: img.id,
      x: img.x,
      y: img.y,
      width: img.width,
      height: img.height,
    }));
  }
};

CustomizerCanvas.prototype.scaleCanvasContent = function (scale) {
  // Store original content if not already stored
  if (!this.originalTextStates) {
    this.storeOriginalContentState();
  }

  // Scale text positions and sizes for display only
  if (this.textManager && this.textManager.texts) {
    this.textManager.texts.forEach((text) => {
      // Find original text state
      const originalText = this.originalTextStates.find(
        (t) => t.id === text.id
      );
      if (originalText) {
        // Scale position from original
        text.x = originalText.x * scale;
        text.y = originalText.y * scale;

        // Scale font size from original
        text.fontSize = Math.round(originalText.fontSize * scale);

        // Scale letterSpacing from original
        const ls = (originalText.letterSpacing || 0) * scale;
        text.letterSpacing = ls;

        // Recalculate dimensions with new font size
        this.ctx.save();
        this.ctx.font = `${text.fontSize}px ${text.font}`;
        const metrics = this.ctx.measureText(text.text);
        const extra = ls * Math.max(0, text.text.length - 1);
        text.width = metrics.width + extra;
        text.height = text.fontSize;
        this.ctx.restore();
      }
    });
  }

  // Scale canvas images for display only
  if (this.canvasImages && this.canvasImages.length > 0) {
    this.canvasImages.forEach((img) => {
      // Find original image state
      const originalImg = this.originalImageStates.find((i) => i.id === img.id);
      if (originalImg) {
        // Scale position and size from original
        img.x = Math.round(originalImg.x * scale);
        img.y = Math.round(originalImg.y * scale);
        img.width = Math.round(originalImg.width * scale);
        img.height = Math.round(originalImg.height * scale);
      }
    });
  }
};

// Method to update original content when changes are made in bottle view
CustomizerCanvas.prototype.updateOriginalContent = function () {
  if (this.isBottleView && this.bottleScaleFactor) {
    // Update original text states
    if (this.textManager && this.textManager.texts) {
      this.textManager.texts.forEach((text) => {
        const originalText = this.originalTextStates.find(
          (t) => t.id === text.id
        );
        if (originalText) {
          // Convert from scaled coordinates back to original
          originalText.x = text.x / this.bottleScaleFactor;
          originalText.y = text.y / this.bottleScaleFactor;
          originalText.fontSize = Math.round(
            text.fontSize / this.bottleScaleFactor
          );
          originalText.width = text.width / this.bottleScaleFactor;
          originalText.height = text.height / this.bottleScaleFactor;
          originalText.letterSpacing =
            (text.letterSpacing || 0) / this.bottleScaleFactor;
        }
      });
    }

    // Update original image states
    if (this.canvasImages && this.canvasImages.length > 0) {
      this.canvasImages.forEach((img) => {
        const originalImg = this.originalImageStates.find(
          (i) => i.id === img.id
        );
        if (originalImg) {
          // Convert from scaled coordinates back to original
          originalImg.x = img.x / this.bottleScaleFactor;
          originalImg.y = img.y / this.bottleScaleFactor;
          originalImg.width = img.width / this.bottleScaleFactor;
          originalImg.height = img.height / this.bottleScaleFactor;
        }
      });
    }
  }
};

// --- ADD: wire up buttons/divs that should post the image ---
function initPostImageButtons() {
  const targets = document.querySelectorAll("[data-post-image]");

  targets.forEach((el, i) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Set opacity to 0.7 on click
      el.style.opacity = "0.7";

      try {
        if (!window.customizerCanvas)
          throw new Error("CustomizerCanvas missing");
        const res = await window.customizerCanvas.handleExport("post");
      } catch (err) {
        console.error("❌ Post failed:", err);
      } finally {
        // Restore opacity after operation completes
        el.style.opacity = "1";
      }
    });
  });
}

CustomizerCanvas.prototype.restoreOriginalContentState = function () {
  // Restore original text states
  if (this.originalTextStates && this.textManager && this.textManager.texts) {
    this.originalTextStates.forEach((originalText) => {
      const currentText = this.textManager.texts.find(
        (t) => t.id === originalText.id
      );
      if (currentText) {
        currentText.x = originalText.x;
        currentText.y = originalText.y;
        currentText.fontSize = originalText.fontSize;
        currentText.width = originalText.width;
        currentText.height = originalText.height;
        currentText.letterSpacing = originalText.letterSpacing || 0;
      }
    });
  }

  // Restore original image states
  if (
    this.originalImageStates &&
    this.canvasImages &&
    this.canvasImages.length > 0
  ) {
    this.originalImageStates.forEach((originalImg) => {
      const currentImg = this.canvasImages.find(
        (img) => img.id === originalImg.id
      );
      if (currentImg) {
        currentImg.x = originalImg.x;
        currentImg.y = originalImg.y;
        currentImg.width = originalImg.width;
        currentImg.height = originalImg.height;
      }
    });
  }
};

CustomizerCanvas.prototype.createBottlePreviewModal = function (
  canvasDataUrl,
  bottleMockupUrl
) {
  // Create modal overlay
  const modal = document.createElement("div");
  modal.className = "bottle-preview-modal";
  modal.innerHTML = `
      <div class="bottle-preview-modal__overlay">
        <div class="bottle-preview-modal__content">
          <div class="bottle-preview-modal__header">
            <h3>Bottle Preview</h3>
            <button class="bottle-preview-modal__close" id="close-bottle-modal">×</button>
          </div>
          <div class="bottle-preview-modal__body">
            <div class="bottle-preview-canvas-container" id="bottle-preview-canvas-container">
              <canvas id="bottle-preview-canvas"></canvas>
            </div>
          </div>
          <div class="bottle-preview-modal__footer">
            <button class="bottle-preview-modal__button bottle-preview-modal__button--secondary" id="close-bottle-preview">Close</button>
            <button class="bottle-preview-modal__button bottle-preview-modal__button--primary" id="save-bottle-preview">Save Preview</button>
          </div>
        </div>
      </div>
    `;

  // Add to DOM
  document.body.appendChild(modal);

  // Initialize the preview canvas
  this.initBottlePreviewCanvas(canvasDataUrl, bottleMockupUrl);

  // Add event listeners
  const closeButtons = modal.querySelectorAll(
    "#close-bottle-modal, #close-bottle-preview"
  );
  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => this.closeBottlePreviewModal());
  });

  // Close on overlay click
  modal
    .querySelector(".bottle-preview-modal__overlay")
    .addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        this.closeBottlePreviewModal();
      }
    });

  // Save button functionality
  modal.querySelector("#save-bottle-preview").addEventListener("click", () => {
    this.saveBottlePreview();
  });
};

CustomizerCanvas.prototype.initBottlePreviewCanvas = function (
  canvasDataUrl,
  bottleMockupUrl
) {
  const previewCanvas = document.getElementById("bottle-preview-canvas");
  const previewCtx = previewCanvas.getContext("2d");

  // Set canvas size
  previewCanvas.width = 800;
  previewCanvas.height = 1000;

  // Load bottle mockup image
  const bottleImg = new Image();
  bottleImg.crossOrigin = "anonymous";
  bottleImg.onload = () => {
    // Draw bottle image
    previewCtx.drawImage(
      bottleImg,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height
    );

    // Load and overlay canvas content
    const canvasImg = new Image();
    canvasImg.onload = () => {
      // Calculate position and size for canvas overlay
      // Adjust these values based on your bottle design
      const overlayX = previewCanvas.width * 0.3; // 30% from left
      const overlayY = previewCanvas.height * 0.3; // 30% from top
      const overlayWidth = previewCanvas.width * 0.4; // 40% of bottle width
      const overlayHeight = (canvasImg.height / canvasImg.width) * overlayWidth; // Maintain aspect ratio

      // Draw canvas content on top of bottle
      previewCtx.drawImage(
        canvasImg,
        overlayX,
        overlayY,
        overlayWidth,
        overlayHeight
      );
    };
    canvasImg.src = canvasDataUrl;
  };
  bottleImg.src = bottleMockupUrl;
};

CustomizerCanvas.prototype.closeBottlePreviewModal = function () {
  const modal = document.querySelector(".bottle-preview-modal");
  if (modal) {
    modal.remove();
  }
};

CustomizerCanvas.prototype.saveBottlePreview = function () {
  const previewCanvas = document.getElementById("bottle-preview-canvas");
  const dataUrl = previewCanvas.toDataURL("image/png");

  // Create download link
  const link = document.createElement("a");
  link.download = "bottle-preview.png";
  link.href = dataUrl;
  link.click();
};

// Debug function to check current state
