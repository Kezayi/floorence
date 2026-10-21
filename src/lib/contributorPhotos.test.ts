import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { applyContributorPhotos } from "./contributorPhotos";

describe("contributor account portraits", () => {
  it("uses each account's current portrait even when the tribute has no photo", () => {
    const posts = [
      { user_id: "markyse", author_photo_url: null },
      { user_id: "michel", author_photo_url: null },
    ];
    expect(applyContributorPhotos(posts, [
      { user_id: "michel", avatar_url: "/michel.jpg" },
      { user_id: "markyse", avatar_url: "/markyse.jpg" },
    ]).map(post => post.author_photo_url)).toEqual(["/markyse.jpg", "/michel.jpg"]);
  });

  it("prefers the updated account portrait over an old tribute snapshot", () => {
    expect(applyContributorPhotos([{ user_id: "a", author_photo_url: "/old.jpg" }],
      [{ user_id: "a", avatar_url: "/new.jpg" }])[0].author_photo_url).toBe("/new.jpg");
  });

  it("retains a saved portrait without matching a different account or an unknown identity", () => {
    const posts = [
      { user_id: "a", author_photo_url: "/saved.jpg" },
      { user_id: null, author_photo_url: null },
    ];
    expect(applyContributorPhotos(posts, [{ user_id: "b", avatar_url: "/other.jpg" }]))
      .toEqual(posts);
  });
});