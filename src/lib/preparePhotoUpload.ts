/** Browser-only, new uploads only. Never crops or writes to storage. */
export const PHOTO_TARGET_BYTES = 400 * 1024;
export function photoDimensions(width: number, height: number, maximum = 1600) {
  const scale = Math.min(1, maximum / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function preparePhotoUpload(file: File): Promise<File> {
  // Keep transparency, animation and specialist formats intact. Small photos need no conversion.
  if (!['image/jpeg', 'image/webp'].includes(file.type) || file.size <= PHOTO_TARGET_BYTES) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    // Browser decoding applies EXIF orientation; no second manual rotation.
    await image.decode();
    const { width, height } = photoDimensions(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, width, height);
    // WebP may have alpha: preserve the original rather than silently flatten it.
    if (file.type === 'image/webp') {
      const pixels = context.getImageData(0, 0, width, height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 255) return file;
    }
    let result: Blob | null = null;
    for (const quality of [0.86, 0.8, 0.74]) {
      result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (!result || result.type !== 'image/webp') return file;
      if (result.size <= PHOTO_TARGET_BYTES) break;
    }
    if (!result || result.size >= file.size) return file;
    return new File([result], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: result.type, lastModified: file.lastModified });
  } catch {
    // Unsupported decoder / memory constraints: retain the validated original.
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}