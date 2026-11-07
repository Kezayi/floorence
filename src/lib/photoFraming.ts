export * from "../../supabase/functions/_shared/photoFraming";

import type { FramingAdjust, PhotoFramingSetting } from "../../supabase/functions/_shared/photoFraming";

/** One-time copy: every URL remains independently editable after propagation. */
export function propagatePortraitAdjustment(
  setting: PhotoFramingSetting,
  photos: readonly string[],
  adjustment: FramingAdjust,
): PhotoFramingSetting {
  const overrides = { ...setting.overrides };
  for (const url of new Set(photos.filter(Boolean))) overrides[url] = { ...adjustment };
  return { ...setting, overrides };
}
