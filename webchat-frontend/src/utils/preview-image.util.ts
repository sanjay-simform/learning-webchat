type PreviewOptions = {
  size?: number;
  quality?: number;
  blur?: number;
  mimeType?: "image/webp" | "image/jpeg";
};

export async function generateImagePreview(
  file: File,
  options: PreviewOptions = {},
): Promise<string> {
  const {
    size = 32,
    quality = 0.3,
    blur = 2,
    mimeType = "image/webp",
  } = options;

  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const bitmap = await loadImageBitmap(file);

  const canvas = createSafeCanvas(size, size);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  if (
    ctx instanceof CanvasRenderingContext2D ||
    ctx instanceof OffscreenCanvasRenderingContext2D
  ) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if ("filter" in ctx) {
      ctx.filter = `blur(${blur}px)`;
    }

    const { width, height } = bitmap;

    const aspect = width / height;

    let drawWidth = size;
    let drawHeight = size;

    if (aspect > 1) {
      drawHeight = size / aspect;
    } else {
      drawWidth = size * aspect;
    }

    const offsetX = (size - drawWidth) / 2;
    const offsetY = (size - drawHeight) / 2;

    ctx.drawImage(
      bitmap as CanvasImageSource,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight,
    );
  }

  if (isImageBitmap(bitmap)) {
    bitmap.close();
  }

  const blob = await canvasToBlob(canvas, mimeType, quality);

  return await blobToDataURL(blob);
}

async function loadImageBitmap(
  file: File,
): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      return await loadImageElement(file);
    }
  }

  return await loadImageElement(file);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

function createSafeCanvas(
  width: number,
  height: number,
): OffscreenCanvas | HTMLCanvasElement {
  if ("OffscreenCanvas" in window) {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

async function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({
      type: mimeType,
      quality,
    });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas conversion failed"));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to convert blob to base64"));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error("FileReader failed"));
    };

    reader.readAsDataURL(blob);
  });
}

function isImageBitmap(value: unknown): value is ImageBitmap {
  return typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap;
}

export const extractGifFromClipboard = async (
  clipboard: DataTransfer,
): Promise<File | null> => {
  const html = clipboard.getData("text/html");

  if (!html) return null;

  const parser = new DOMParser();

  const doc = parser.parseFromString(html, "text/html");

  const imgElements = Array.from(doc.querySelectorAll("img"));

  for (const img of imgElements) {
    const src = img.src;

    if (!src) continue;

    // detect probable gif url
    const isGif =
      src.toLowerCase().endsWith(".gif") ||
      src.toLowerCase().includes(".gif?") ||
      src.toLowerCase().includes("tenor") ||
      src.toLowerCase().includes("giphy");

    if (!isGif) continue;

    try {
      const response = await fetch(src, {});

      if (!response.ok) continue;

      const blob = await response.blob();

      // ensure actual gif mime
      if (blob.type !== "image/gif") continue;

      const file = new File([blob], `pasted-${Date.now()}.gif`, {
        type: "image/gif",
      });

      return file;
    } catch (error) {
      console.error("Failed to fetch GIF:", error);
    }
  }

  return null;
};
