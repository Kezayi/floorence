import { describe, expect, it } from 'vitest';
import { photoDimensions, preparePhotoUpload, PHOTO_TARGET_BYTES } from './preparePhotoUpload';

describe('new photo preparation', () => {
  it('keeps portrait proportions', () => expect(photoDimensions(3000, 4000)).toEqual({ width: 1200, height: 1600 }));
  it('keeps landscape proportions', () => expect(photoDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 }));
  it('keeps square proportions', () => expect(photoDimensions(4000, 4000)).toEqual({ width: 1600, height: 1600 }));
  it('never upscales', () => expect(photoDimensions(300, 400)).toEqual({ width: 300, height: 400 }));
  it('targets 400 KiB', () => expect(PHOTO_TARGET_BYTES).toBe(409600));
  it('keeps PNG including transparency intact', async () => {
    const file = new File([new Uint8Array(500000)], 'photo.png', { type: 'image/png' });
    expect(await preparePhotoUpload(file)).toBe(file);
  });
  it('keeps small JPEG intact', async () => {
    const file = new File(['small'], 'photo.jpg', { type: 'image/jpeg' });
    expect(await preparePhotoUpload(file)).toBe(file);
  });
});