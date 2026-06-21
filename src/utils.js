/**
 * Resolve asset paths that work in both dev and production (GitHub Pages).
 */
export const baseUrl = import.meta.env.BASE_URL;

export function assetPath(path) {
  if (path.startsWith('/')) {
    return `${baseUrl}${path.slice(1)}`;
  }
  return `${baseUrl}${path}`;
}
