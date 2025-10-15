class TextManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.texts = [];
    this.selectedText = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    this.initEventListeners();
  }

  initEventListeners() {
    // Canvas mouse events for drag and drop
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));

    // Touch events for mobile
    this.canvas.addEventListener("touchstart", (e) => this.handleTouchStart(e));
    this.canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e));
    this.canvas.addEventListener("touchend", (e) => this.handleTouchEnd(e));
  }

  addText(textData) {
    const newText = {
      id: textData.id || Date.now(),
      text: textData.text || "ENTER TEXT HERE",
      x: textData.x || this.canvas.width / 2,
      y: textData.y || this.canvas.height / 2,
      font: textData.font || "Arial",
      fontSize: textData.fontSize || 24,
      color: textData.color || "#000000",
      width: 0,
      height: 0,
      // Advanced styling properties
      rotation: textData.rotation || 0,
      letterSpacing: textData.letterSpacing || 0,
      lineHeight: textData.lineHeight || 1.2,
      // Enhanced curve properties
      curveAngle: textData.curveAngle || 90, // Curve angle in degrees
      curveRadius: textData.curveRadius || 2, // Radius multiplier
      curveDirection: textData.curveDirection || 1, // 1 for upward, -1 for downward
      curveOffset: textData.curveOffset || 0, // Offset along the curve
      curveSpacing: textData.curveSpacing || 1, // Character spacing multiplier
      effects: textData.effects || {
        shadow: false,
        outline: false,
        bold: false,
        italic: false,
        uppercase: false,
        curve: false,
      },
    };

    // Calculate text dimensions
    this.ctx.font = `${newText.fontSize}px ${newText.font}`;
    const metrics = this.ctx.measureText(newText.text);
    newText.width = metrics.width;
    newText.height = newText.fontSize;

    // Apply boundary constraints to ensure text is within canvas bounds
    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 2);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 2);

    // Allow text to be positioned more freely with margin
    const margin = 20;
    newText.x = Math.max(
      -newText.width + margin,
      Math.min(newText.x, canvasWidth - margin)
    );
    newText.y = Math.max(
      -newText.height + margin,
      Math.min(newText.y, canvasHeight - margin)
    );

    this.texts.push(newText);
    return newText.id;
  }

  updateText(id, updates) {
    const text = this.texts.find((t) => t.id === id);
    if (text) {
      Object.assign(text, updates);

      // Update effects if provided
      if (updates.effects) {
        Object.assign(text.effects, updates.effects);
      }

      // Recalculate dimensions if text, font, or size changed
      if (updates.text || updates.font || updates.fontSize) {
        this.ctx.font = `${text.fontSize}px ${text.font}`;
        const metrics = this.ctx.measureText(text.text);
        text.width = metrics.width;
        text.height = text.fontSize;
      }

      return text;
    }
    return null;
  }

  removeText(id) {
    this.texts = this.texts.filter((t) => t.id !== id);
  }

  drawTexts() {
    this.texts.forEach((text, index) => {
      this.ctx.save();

      // Use actual text position without clamping
      const x = text.x;
      const y = text.y;

      // Apply rotation
      if (text.rotation && text.rotation !== 0) {
        this.ctx.translate(x, y);
        this.ctx.rotate((text.rotation * Math.PI) / 180);
        this.ctx.translate(-x, -y);
      }

      // Build font string with effects
      let fontStyle = "";
      if (text.effects.italic) fontStyle += "italic ";
      if (text.effects.bold) fontStyle += "bold ";
      this.ctx.font = `${fontStyle}${text.fontSize}px ${text.font}`;

      // Apply text transform
      let displayText = text.text;
      if (text.effects.uppercase) {
        displayText = displayText.toUpperCase();
      }

      // Set text properties

      this.ctx.fillStyle = text.color;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Apply text effects first (before letter spacing check)
      if (text.effects && text.effects.shadow) {
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
      }

      if (text.effects && text.effects.outline) {
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 2;
      }

      // Apply letter spacing if needed
      if (text.letterSpacing && text.letterSpacing !== 0) {
        this.drawTextWithLetterSpacing(displayText, x, y, text.letterSpacing);
      } else if (text.effects && text.effects.curve) {
        this.drawCurvedText(text, x, y, text.fontSize);
      } else {
        // Apply outline stroke if present
        if (text.effects && text.effects.outline) {
          this.ctx.strokeText(displayText, x, y);
        }
        // Apply fill
        this.ctx.fillText(displayText, x, y);
      }

      // Draw selection border if selected
      if (this.selectedText && this.selectedText.id === text.id) {
        this.drawSelectionOutline(text);
      }

      this.ctx.restore();
    });
  }

  drawSelectionOutline(text) {
    this.ctx.save();

    // Calculate bounds based on text style
    const bounds = this.calculateTextBounds(text);

    // Draw elegant selection outline with glow effect
    this.ctx.shadowColor = "rgba(0, 102, 255, 0.3)";
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // Main border
    this.ctx.strokeStyle = "#0066ff";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]); // More elegant dash pattern

    if (text.effects.curve && bounds.type === "curve") {
      // Draw curved outline for curved text
      this.drawCurvedOutline(bounds);
    } else if (text.rotation && text.rotation !== 0) {
      // Draw rotated outline for rotated text
      this.drawRotatedOutline(bounds, text.rotation);
    } else {
      // Draw regular rectangular outline
      this.drawRectangularOutline(bounds);
    }

    // Inner highlight
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([8, 4]);

    if (text.effects.curve && bounds.type === "curve") {
      this.drawCurvedOutline(bounds);
    } else if (text.rotation && text.rotation !== 0) {
      this.drawRotatedOutline(bounds, text.rotation);
    } else {
      this.drawRectangularOutline(bounds);
    }

    this.ctx.setLineDash([]); // Reset line dash

    // Draw elegant corner handles
    this.drawElegantCornerHandles(bounds, text.rotation || 0);

    this.ctx.restore();
  }

  calculateTextBounds(text) {
    this.ctx.save();
    this.ctx.font = `${text.fontSize}px ${text.font}`;

    const displayText = text.effects.uppercase
      ? text.text.toUpperCase()
      : text.text;

    if (text.effects.curve) {
      return this.calculateCurvedTextBounds(text, displayText);
    } else if (text.letterSpacing && text.letterSpacing !== 0) {
      return this.calculateSpacedTextBounds(text, displayText);
    } else {
      return this.calculateRegularTextBounds(text, displayText);
    }
  }

  calculateRegularTextBounds(text, displayText) {
    const metrics = this.ctx.measureText(displayText);
    let width = metrics.width;
    let height = text.fontSize;

    // Add padding for effects
    const effectPadding = this.getEffectPadding(text);
    width += effectPadding.horizontal;
    height += effectPadding.vertical;

    // Update stored dimensions
    text.width = width;
    text.height = height;

    this.ctx.restore();

    return {
      type: "rectangular",
      x: text.x,
      y: text.y,
      width: width,
      height: height,
      centerX: text.x,
      centerY: text.y,
    };
  }

  calculateSpacedTextBounds(text, displayText) {
    // Calculate width with letter spacing
    let totalWidth = 0;
    for (let i = 0; i < displayText.length; i++) {
      totalWidth += this.ctx.measureText(displayText[i]).width;
      if (i < displayText.length - 1) {
        totalWidth += text.letterSpacing;
      }
    }

    let height = text.fontSize;

    // Add padding for effects
    const effectPadding = this.getEffectPadding(text);
    totalWidth += effectPadding.horizontal;
    height += effectPadding.vertical;

    // Update stored dimensions
    text.width = totalWidth;
    text.height = height;

    this.ctx.restore();

    return {
      type: "rectangular",
      x: text.x,
      y: text.y,
      width: totalWidth,
      height: height,
      centerX: text.x,
      centerY: text.y,
    };
  }

  calculateCurvedTextBounds(text, displayText) {
    const curveRadius = (text.curveRadius || 2) * text.fontSize;
    const curveAngle = ((text.curveAngle || 90) * Math.PI) / 180;

    // Calculate the bounding box of the curved text
    const points = [];
    const charWidths = [];
    let totalTextWidth = 0;

    // Calculate character positions
    for (let i = 0; i < displayText.length; i++) {
      const charWidth = this.ctx.measureText(displayText[i]).width;
      charWidths.push(charWidth);
      totalTextWidth += charWidth;
    }

    const baseAngleStep = curveAngle / totalTextWidth;
    const startAngle =
      -curveAngle / 2 + ((text.curveOffset || 0) * Math.PI) / 180;
    const effectiveRadius = curveRadius * (text.curveDirection || 1);

    let currentAngle = startAngle;

    // Calculate all character positions to find bounds
    for (let i = 0; i < displayText.length; i++) {
      const charWidth = charWidths[i];
      const x = text.x + Math.cos(currentAngle) * effectiveRadius;
      const y = text.y + Math.sin(currentAngle) * effectiveRadius;

      // Add character bounds considering rotation
      const charHeight = text.fontSize;
      const halfChar = charWidth / 2;
      const halfHeight = charHeight / 2;

      // Character corners (considering rotation)
      const corners = [
        { x: x - halfChar, y: y - halfHeight },
        { x: x + halfChar, y: y - halfHeight },
        { x: x - halfChar, y: y + halfHeight },
        { x: x + halfChar, y: y + halfHeight },
      ];

      points.push(...corners);
      currentAngle += charWidth * baseAngleStep * (text.curveSpacing || 1);
    }

    // Find bounding box
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Add padding for effects
    const effectPadding = this.getEffectPadding(text);

    // Update stored dimensions
    text.width = width + effectPadding.horizontal;
    text.height = height + effectPadding.vertical;

    this.ctx.restore();

    return {
      type: "curve",
      x: centerX,
      y: centerY,
      width: width + effectPadding.horizontal,
      height: height + effectPadding.vertical,
      centerX: centerX,
      centerY: centerY,
      points: points,
    };
  }

  getEffectPadding(text) {
    let horizontal = 0;
    let vertical = 0;

    if (text.effects.shadow) {
      horizontal += 4; // Shadow offset
      vertical += 4;
    }

    if (text.effects.outline) {
      horizontal += 4; // Outline width
      vertical += 4;
    }

    return { horizontal, vertical };
  }

  drawRectangularOutline(bounds) {
    const padding = 8;
    this.ctx.strokeRect(
      bounds.centerX - bounds.width / 2 - padding,
      bounds.centerY - bounds.height / 2 - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );
  }

  drawRotatedOutline(bounds, rotation) {
    const padding = 8;
    const centerX = bounds.centerX;
    const centerY = bounds.centerY;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate((rotation * Math.PI) / 180);
    this.ctx.strokeRect(
      -bounds.width / 2 - padding,
      -bounds.height / 2 - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );
    this.ctx.restore();
  }

  drawCurvedOutline(bounds) {
    const padding = 8;

    // For curved text, draw a more complex outline that follows the curve
    if (bounds.points && bounds.points.length > 0) {
      // Create a path that encompasses all character positions
      const minX = Math.min(...bounds.points.map((p) => p.x)) - padding;
      const maxX = Math.max(...bounds.points.map((p) => p.x)) + padding;
      const minY = Math.min(...bounds.points.map((p) => p.y)) - padding;
      const maxY = Math.max(...bounds.points.map((p) => p.y)) + padding;

      // Draw an elliptical outline that encompasses the curved text
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const radiusX = (maxX - minX) / 2;
      const radiusY = (maxY - minY) / 2;

      this.ctx.beginPath();
      this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      this.ctx.stroke();
    } else {
      // Fallback to rectangular outline
      this.drawRectangularOutline(bounds);
    }
  }

  drawCornerHandles(bounds, rotation = 0) {
    const handleSize = 6;
    const padding = 8;

    this.ctx.setLineDash([]);
    this.ctx.fillStyle = "#0066ff";

    if (bounds.type === "curve") {
      // For curved text, place handles at the extremes
      if (bounds.points && bounds.points.length > 0) {
        const minX = Math.min(...bounds.points.map((p) => p.x)) - padding;
        const maxX = Math.max(...bounds.points.map((p) => p.x)) + padding;
        const minY = Math.min(...bounds.points.map((p) => p.y)) - padding;
        const maxY = Math.max(...bounds.points.map((p) => p.y)) + padding;

        const corners = [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: minX, y: maxY },
          { x: maxX, y: maxY },
        ];

        corners.forEach((corner) => {
          this.ctx.fillRect(
            corner.x - handleSize / 2,
            corner.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      }
    } else {
      // Regular corners
      const centerX = bounds.centerX;
      const centerY = bounds.centerY;

      let corners = [
        {
          x: centerX - bounds.width / 2 - padding,
          y: centerY - bounds.height / 2 - padding,
        },
        {
          x: centerX + bounds.width / 2 + padding,
          y: centerY - bounds.height / 2 - padding,
        },
        {
          x: centerX - bounds.width / 2 - padding,
          y: centerY + bounds.height / 2 + padding,
        },
        {
          x: centerX + bounds.width / 2 + padding,
          y: centerY + bounds.height / 2 + padding,
        },
      ];

      // Apply rotation if needed
      if (rotation !== 0) {
        const rotRad = (rotation * Math.PI) / 180;
        corners = corners.map((corner) => {
          const dx = corner.x - centerX;
          const dy = corner.y - centerY;
          return {
            x: centerX + dx * Math.cos(rotRad) - dy * Math.sin(rotRad),
            y: centerY + dx * Math.sin(rotRad) + dy * Math.cos(rotRad),
          };
        });
      }

      corners.forEach((corner) => {
        this.ctx.fillRect(
          corner.x - handleSize / 2,
          corner.y - handleSize / 2,
          handleSize,
          handleSize
        );
      });
    }
  }

  drawElegantCornerHandles(bounds, rotation = 0) {
    const handleSize = 8;
    const padding = 8;

    this.ctx.setLineDash([]);

    if (bounds.type === "curve") {
      // For curved text, place handles at the extremes
      if (bounds.points && bounds.points.length > 0) {
        const minX = Math.min(...bounds.points.map((p) => p.x)) - padding;
        const maxX = Math.max(...bounds.points.map((p) => p.x)) + padding;
        const minY = Math.min(...bounds.points.map((p) => p.y)) - padding;
        const maxY = Math.max(...bounds.points.map((p) => p.y)) + padding;

        const corners = [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: minX, y: maxY },
          { x: maxX, y: maxY },
        ];

        corners.forEach((corner) => {
          this.ctx.save();

          // Outer glow for handles
          this.ctx.shadowColor = "rgba(0, 102, 255, 0.4)";
          this.ctx.shadowBlur = 6;
          this.ctx.shadowOffsetX = 0;
          this.ctx.shadowOffsetY = 0;

          // Main handle with gradient effect
          const gradient = this.ctx.createLinearGradient(
            corner.x - handleSize / 2,
            corner.y - handleSize / 2,
            corner.x + handleSize / 2,
            corner.y + handleSize / 2
          );
          gradient.addColorStop(0, "#0066ff");
          gradient.addColorStop(1, "#0044cc");

          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(
            corner.x - handleSize / 2,
            corner.y - handleSize / 2,
            handleSize,
            handleSize
          );

          // Inner highlight
          this.ctx.shadowBlur = 0;
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          this.ctx.fillRect(
            corner.x - handleSize / 2 + 1,
            corner.y - handleSize / 2 + 1,
            handleSize - 2,
            handleSize - 2
          );

          // Border
          this.ctx.strokeStyle = "#ffffff";
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(
            corner.x - handleSize / 2,
            corner.y - handleSize / 2,
            handleSize,
            handleSize
          );

          this.ctx.restore();
        });
      }
    } else {
      // Regular corners
      const centerX = bounds.centerX;
      const centerY = bounds.centerY;

      let corners = [
        {
          x: centerX - bounds.width / 2 - padding,
          y: centerY - bounds.height / 2 - padding,
        },
        {
          x: centerX + bounds.width / 2 + padding,
          y: centerY - bounds.height / 2 - padding,
        },
        {
          x: centerX - bounds.width / 2 - padding,
          y: centerY + bounds.height / 2 + padding,
        },
        {
          x: centerX + bounds.width / 2 + padding,
          y: centerY + bounds.height / 2 + padding,
        },
      ];

      // Apply rotation if needed
      if (rotation !== 0) {
        const rotRad = (rotation * Math.PI) / 180;
        corners = corners.map((corner) => {
          const dx = corner.x - centerX;
          const dy = corner.y - centerY;
          return {
            x: centerX + dx * Math.cos(rotRad) - dy * Math.sin(rotRad),
            y: centerY + dx * Math.sin(rotRad) + dy * Math.cos(rotRad),
          };
        });
      }

      corners.forEach((corner) => {
        this.ctx.save();

        // Outer glow for handles
        this.ctx.shadowColor = "rgba(0, 102, 255, 0.4)";
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // Main handle with gradient effect
        const gradient = this.ctx.createLinearGradient(
          corner.x - handleSize / 2,
          corner.y - handleSize / 2,
          corner.x + handleSize / 2,
          corner.y + handleSize / 2
        );
        gradient.addColorStop(0, "#0066ff");
        gradient.addColorStop(1, "#0044cc");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
          corner.x - handleSize / 2,
          corner.y - handleSize / 2,
          handleSize,
          handleSize
        );

        // Inner highlight
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        this.ctx.fillRect(
          corner.x - handleSize / 2 + 1,
          corner.y - handleSize / 2 + 1,
          handleSize - 2,
          handleSize - 2
        );

        // Border
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(
          corner.x - handleSize / 2,
          corner.y - handleSize / 2,
          handleSize,
          handleSize
        );

        this.ctx.restore();
      });
    }
  }

  getTextAtPoint(x, y) {
    // Check texts in reverse order (top to bottom)
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const text = this.texts[i];

      // Use the same bounds calculation as selection outline
      const bounds = this.calculateTextBounds(text);

      if (this.isPointInBounds(x, y, bounds, text.rotation || 0)) {
        return text;
      }
    }
    return null;
  }

  isPointInBounds(x, y, bounds, rotation = 0) {
    const padding = 8;

    if (bounds.type === "curve") {
      // For curved text, use elliptical hit detection
      if (bounds.points && bounds.points.length > 0) {
        const minX = Math.min(...bounds.points.map((p) => p.x)) - padding;
        const maxX = Math.max(...bounds.points.map((p) => p.x)) + padding;
        const minY = Math.min(...bounds.points.map((p) => p.y)) - padding;
        const maxY = Math.max(...bounds.points.map((p) => p.y)) + padding;

        // Simple rectangular bounds for curved text (could be improved with elliptical detection)
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      }
    } else {
      // Regular rectangular bounds with rotation support
      const centerX = bounds.centerX;
      const centerY = bounds.centerY;
      const halfWidth = bounds.width / 2 + padding;
      const halfHeight = bounds.height / 2 + padding;

      if (rotation === 0) {
        // Simple rectangular hit detection
        return (
          x >= centerX - halfWidth &&
          x <= centerX + halfWidth &&
          y >= centerY - halfHeight &&
          y <= centerY + halfHeight
        );
      } else {
        // Rotated rectangle hit detection
        const rotRad = (-rotation * Math.PI) / 180; // Negative because we're inverse transforming
        const dx = x - centerX;
        const dy = y - centerY;

        // Transform point to text's local coordinate system
        const localX = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
        const localY = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

        return (
          localX >= -halfWidth &&
          localX <= halfWidth &&
          localY >= -halfHeight &&
          localY <= halfHeight
        );
      }
    }

    return false;
  }

  getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Calculate the actual scale factor between canvas internal size and display size
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    return {
      x: ((e.clientX - rect.left) * scaleX) / dpr,
      y: ((e.clientY - rect.top) * scaleY) / dpr,
    };
  }

  handleMouseDown(e) {
    // Disable text interactions in bottle view
    if (window.customizerCanvas && window.customizerCanvas.isBottleView) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const coords = this.getCanvasCoordinates(e);
    const x = coords.x;
    const y = coords.y;

    const text = this.getTextAtPoint(x, y);
    if (text) {
      this.selectedText = text;

      // Clear image selection when selecting text
      if (window.customizerCanvas && window.customizerCanvas.selectedImage) {
        window.customizerCanvas.selectedImage = null;
      }

      this.isDragging = true;
      this.dragOffset = {
        x: x - text.x,
        y: y - text.y,
      };

      // Notify UI about selection
      document.dispatchEvent(
        new CustomEvent("textSelected", {
          detail: { textId: text.id, text: text },
        })
      );
    } else {
      // Clear text selection if clicking on empty area
      this.selectedText = null;

      // Request redraw to clear selection borders
      document.dispatchEvent(new CustomEvent("canvasNeedsRedraw"));
    }
  }

  handleMouseMove(e) {
    // Disable text interactions in bottle view
    if (window.customizerCanvas && window.customizerCanvas.isBottleView) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (this.isDragging && this.selectedText) {
      const coords = this.getCanvasCoordinates(e);

      // Calculate new position
      let newX = coords.x - this.dragOffset.x;
      let newY = coords.y - this.dragOffset.y;

      // Get canvas dimensions for boundary constraints
      const canvasWidth = this.canvas.width / (window.devicePixelRatio || 2);
      const canvasHeight = this.canvas.height / (window.devicePixelRatio || 2);

      // Apply boundary constraints to keep text within canvas bounds
      const textWidth = this.selectedText.width || 0;
      const textHeight =
        this.selectedText.height || this.selectedText.fontSize || 20;

      // Allow text to move more freely - only constrain to prevent it from going completely off-screen
      // Allow text to extend slightly beyond canvas edges for better positioning flexibility
      const margin = 20; // Allow 20px margin beyond canvas edges
      newX = Math.max(
        -textWidth + margin,
        Math.min(newX, canvasWidth - margin)
      );
      newY = Math.max(
        -textHeight + margin,
        Math.min(newY, canvasHeight - margin)
      );

      this.selectedText.x = newX;
      this.selectedText.y = newY;

      // Set dragging cursor
      this.canvas.style.cursor = "grabbing";

      // Request redraw
      document.dispatchEvent(new CustomEvent("canvasNeedsRedraw"));
    } else {
      // Check if hovering over text for better UX
      const coords = this.getCanvasCoordinates(e);
      const hoveredText = this.getTextAtPoint(coords.x, coords.y);

      if (hoveredText) {
        this.canvas.style.cursor = "grab";
      } else {
        this.canvas.style.cursor = "default";
      }
    }
  }

  handleMouseUp(e) {
    // Disable text interactions in bottle view
    if (window.customizerCanvas && window.customizerCanvas.isBottleView) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    this.isDragging = false;

    // Update original content if in bottle view
    if (window.customizerCanvas && window.customizerCanvas.isBottleView) {
      window.customizerCanvas.updateOriginalContent();
    }

    // Reset cursor after drag
    const coords = this.getCanvasCoordinates(e);
    const hoveredText = this.getTextAtPoint(coords.x, coords.y);

    if (hoveredText) {
      this.canvas.style.cursor = "grab";
    } else {
      this.canvas.style.cursor = "default";
    }
  }

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

  drawTextWithLetterSpacing(text, x, y, letterSpacing) {
    const chars = text.split("");
    let currentX =
      x -
      (this.ctx.measureText(text).width + letterSpacing * (chars.length - 1)) /
        2;

    chars.forEach((char) => {
      // Apply outline effect if present
      if (this.ctx.strokeStyle && this.ctx.lineWidth > 0) {
        this.ctx.strokeText(char, currentX, y);
      }
      // Apply fill
      this.ctx.fillText(char, currentX, y);
      currentX += this.ctx.measureText(char).width + letterSpacing;
    });
  }

  drawCurvedText(textObj, centerX, centerY, fontSize) {
    const text = textObj.text || textObj; // Support both text object and string
    const curveAngle = textObj.curveAngle || 90;
    const curveRadius = textObj.curveRadius || 2;
    const curveDirection = textObj.curveDirection || 1;
    const curveOffset = textObj.curveOffset || 0;
    const curveSpacing = textObj.curveSpacing || 1;

    // Calculate radius based on font size and radius multiplier
    const radius = fontSize * curveRadius;

    // Convert curve angle from degrees to radians
    const totalAngleRadians = (curveAngle * Math.PI) / 180;

    // Calculate character widths for better spacing
    const charWidths = [];
    let totalTextWidth = 0;

    for (let i = 0; i < text.length; i++) {
      const charWidth = this.ctx.measureText(text[i]).width;
      charWidths.push(charWidth);
      totalTextWidth += charWidth;
    }

    // Calculate angle step based on character widths and spacing
    const baseAngleStep = totalAngleRadians / totalTextWidth;

    // Start angle - center the text arc with offset
    let startAngle = -totalAngleRadians / 2 + (curveOffset * Math.PI) / 180;

    let currentAngle = startAngle;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = charWidths[i];

      // Calculate position on curve with direction
      const effectiveRadius = radius * curveDirection;
      const x = centerX + Math.cos(currentAngle) * effectiveRadius;
      const y = centerY + Math.sin(currentAngle) * effectiveRadius;

      this.ctx.save();
      this.ctx.translate(x, y);

      // Rotate character to be tangent to the curve
      const rotationAngle =
        curveDirection > 0
          ? currentAngle + Math.PI / 2
          : currentAngle - Math.PI / 2;
      this.ctx.rotate(rotationAngle);

      // Apply text effects for curved text
      if (textObj.effects && textObj.effects.shadow) {
        this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
      }

      if (textObj.effects && textObj.effects.outline) {
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(char, 0, 0);
      }

      this.ctx.fillText(char, 0, 0);
      this.ctx.restore();

      // Move to next character position with spacing
      currentAngle += charWidth * baseAngleStep * curveSpacing;
    }
  }
}

// Export for use in main canvas
window.TextManager = TextManager;
