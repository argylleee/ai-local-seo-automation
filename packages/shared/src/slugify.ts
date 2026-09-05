/**
 * Converts a display name into a URL-safe slug fragment. Never
 * guaranteed unique on its own — callers append an id/timestamp suffix
 * when uniqueness matters (see apps/web/lib/auth/provision.ts).
 */
export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "org";
}
