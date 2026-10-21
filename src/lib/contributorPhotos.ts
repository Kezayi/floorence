import { supabase } from "@/integrations/supabase/client";

interface ContributorPhoto {
  user_id: string | null;
  author_photo_url: string | null;
}

interface PublicPortrait {
  user_id: string | null;
  avatar_url: string | null;
}

/** Resolve only by account identity, never by an author's name. */
export function applyContributorPhotos<T extends ContributorPhoto>(posts: T[], profiles: PublicPortrait[]): T[] {
  const portraits = new Map(profiles.map(profile => [profile.user_id, profile.avatar_url]));
  return posts.map(post => ({
    ...post,
    author_photo_url: (post.user_id ? portraits.get(post.user_id) : null) || post.author_photo_url || null,
  }));
}

/** One batched read of the privacy-safe public view; no private profile fields. */
export async function resolveContributorPhotos<T extends ContributorPhoto>(posts: T[]): Promise<T[]> {
  const userIds = [...new Set(posts.flatMap(post => post.user_id ? [post.user_id] : []))];
  if (userIds.length === 0) return posts;
  const { data, error } = await supabase
    .from("profiles_public")
    .select("user_id, avatar_url")
    .in("user_id", userIds);
  if (error) return posts;
  return applyContributorPhotos(posts, data || []);
}