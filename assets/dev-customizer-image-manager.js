class ImageManager {
  constructor() {
    this.uploadedImages = [];
    this.imageIdCounter = 0;

    this.init();
  }

  init() {
    this.initDropzone();
    this.initFileInput();
  }

  initDropzone() {
    const dropzone = document.getElementById("image-dropzone");
    const fileInput = document.getElementById("image-upload-input");

    if (!dropzone || !fileInput) {
      console.warn("Image dropzone or file input not found");
      return;
    }

    // Click/tap to browse - with better mobile support
    const handleDropzoneClick = (e) => {
      // Don't trigger file upload if clicking on the image list or its children
      const imageList = document.getElementById("image-list-items");
      if (
        imageList &&
        (e.target === imageList || imageList.contains(e.target))
      ) {
        return; // Let the image item handle its own click event
      }

      e.stopPropagation();
      fileInput.click();
    };

    dropzone.addEventListener("click", handleDropzoneClick);

    // Add touchend for better mobile support
    dropzone.addEventListener("touchend", (e) => {
      // Only handle single touches (not multi-touch gestures)
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        // Don't trigger file upload if touching the image list or its children
        const imageList = document.getElementById("image-list-items");
        if (
          imageList &&
          (e.target === imageList || imageList.contains(e.target))
        ) {
          return; // Let the image item handle its own click event
        }

        e.preventDefault(); // Prevent ghost click on mobile
        e.stopPropagation();
        fileInput.click();
      }
    });

    // Drag and drop events (desktop only)
    dropzone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      if (!dropzone.contains(e.relatedTarget)) {
        dropzone.classList.remove("dragover");
      }
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");

      const files = Array.from(e.dataTransfer.files);
      this.handleFiles(files);
    });
  }

  initFileInput() {
    const fileInput = document.getElementById("image-upload-input");

    if (!fileInput) return;

    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      this.handleFiles(files);
      // Reset input so same file can be selected again
      e.target.value = "";
    });
  }

  handleFiles(files) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      alert("Please select valid image files.");
      return;
    }

    imageFiles.forEach((file) => {
      this.addImage(file);
    });
  }

  addImage(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const imageData = {
        id: ++this.imageIdCounter,
        name: file.name,
        url: e.target.result,
        file: file,
      };

      this.uploadedImages.push(imageData);
      this.renderImageList();

      console.log("Image added:", imageData.name);
    };

    reader.readAsDataURL(file);
  }

  removeImage(imageId) {
    // Remove all canvas images that use this uploaded image
    if (
      window.customizerCanvas &&
      window.customizerCanvas.removeCanvasImagesBySourceId
    ) {
      window.customizerCanvas.removeCanvasImagesBySourceId(imageId);
    }

    // Remove from uploaded images list
    this.uploadedImages = this.uploadedImages.filter(
      (img) => img.id !== imageId
    );
    this.renderImageList();
    console.log("Image removed:", imageId);
  }

  renderImageList() {
    const container = document.getElementById("image-list-items");

    if (!container) {
      console.error("Image list container not found");
      return;
    }

    // Prevent modal opening when clicking on the container itself
    container.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    container.innerHTML = "";

    // if (this.uploadedImages.length === 0) {
    //   container.innerHTML =
    //     '<p class="dev-customizer-image-list__empty">No images uploaded yet</p>';
    //   return;
    // }

    this.uploadedImages.forEach((image) => {
      const imageItem = document.createElement("div");
      imageItem.className = "dev-customizer-image-item";
      imageItem.dataset.imageId = image.id;

      imageItem.innerHTML = `
          <img src="${image.url}" alt="${image.name}" loading="lazy">
          <button class="dev-customizer-image-item__remove" onclick="window.imageManager.removeImage(${image.id})">
           <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="16" height="16" rx="8" fill="#090909"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M3.64671 3.64623C3.74047 3.55259 3.86755 3.5 4.00005 3.5C4.13255 3.5 4.25963 3.55259 4.35338 3.64623L12.3534 11.6462C12.4025 11.692 12.4419 11.7472 12.4692 11.8085C12.4966 11.8699 12.5113 11.9361 12.5124 12.0032C12.5136 12.0703 12.5013 12.137 12.4761 12.1993C12.451 12.2615 12.4136 12.3181 12.3661 12.3656C12.3186 12.4131 12.262 12.4505 12.1998 12.4756C12.1375 12.5008 12.0708 12.5131 12.0037 12.512C11.9366 12.5108 11.8704 12.4961 11.809 12.4687C11.7477 12.4414 11.6925 12.402 11.6467 12.3529L3.64671 4.35289C3.55308 4.25914 3.50049 4.13206 3.50049 3.99956C3.50049 3.86706 3.55308 3.73998 3.64671 3.64623Z" fill="white"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12.3531 3.64623C12.4467 3.73998 12.4993 3.86706 12.4993 3.99956C12.4993 4.13206 12.4467 4.25914 12.3531 4.35289L4.35307 12.3529C4.25829 12.4412 4.13292 12.4893 4.00339 12.487C3.87385 12.4847 3.75026 12.4323 3.65865 12.3406C3.56704 12.249 3.51457 12.1254 3.51228 11.9959C3.51 11.8664 3.55808 11.741 3.6464 11.6462L11.6464 3.64623C11.7402 3.55259 11.8672 3.5 11.9997 3.5C12.1322 3.5 12.2593 3.55259 12.3531 3.64623Z" fill="white"/>
            </svg>
          </button>
        `;

      // Add click handler to place image on canvas
      imageItem.addEventListener("click", (e) => {
        if (
          !e.target.classList.contains("dev-customizer-image-item__remove") &&
          !e.target.closest(".dev-customizer-image-item__remove")
        ) {
          this.placeImageOnCanvas(image);
        }
      });

      // Add click handler to remove button to prevent event bubbling
      const removeButton = imageItem.querySelector(
        ".dev-customizer-image-item__remove"
      );
      if (removeButton) {
        removeButton.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      }

      container.appendChild(imageItem);
    });
  }

  placeImageOnCanvas(imageData) {
    console.log("Placing image on canvas:", imageData.name);

    // Check if canvas is available
    if (!window.customizerCanvas) {
      console.error("Canvas not available");
      return;
    }

    // Create image element and load it
    const img = new Image();
    img.onload = () => {
      // Add image to canvas
      if (window.customizerCanvas.addImageToCanvas) {
        window.customizerCanvas.addImageToCanvas(img, imageData);
      } else {
        console.warn("Canvas addImageToCanvas method not available");
      }
    };

    img.src = imageData.url;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.imageManager = new ImageManager();
});

// Export for use in other modules
window.ImageManager = ImageManager;
