// Public file URL that respects the `base` option (GitHub Pages publishes under /<repo>/).
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return (base.endsWith("/") ? base : base + "/") + path.replace(/^\//, "");
}
