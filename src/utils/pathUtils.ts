/**
 * Sanitizes a path segment to remove invalid filesystem characters.
 * Handles undefined, null, and non-string inputs safely without crashing.
 */
export function sanitizePathSegment(name?: any): string {
  if (!name || typeof name !== 'string') {
    return 'untitled';
  }
  return name.trim().replace(/[/\\?%*:|"<>]/g, '-');
}

/**
 * Standard path generator for project briefs.
 */
export function getBriefBasePath(brief: any, ..._args: any[]): string {
  if (!brief) return 'Projects/Untitled';
  const pub = sanitizePathSegment(brief.publisher || 'Unknown_Publisher');
  const album = sanitizePathSegment(brief.albumTitle || brief.code || 'Untitled_Album');
  return `Projects/${pub}/${album}`;
}

/**
 * Standard path generator for individual cue tracks within a brief.
 */
export function getTrackBasePath(brief: any, track: any, ..._args: any[]): string {
  const briefPath = getBriefBasePath(brief);
  const trackName = sanitizePathSegment(track?.title || track?.name || 'Untitled_Cue');
  return `${briefPath}/${trackName}`;
}

/**
 * Builds a standardized generic library track path.
 * Accepts optional second argument since App.tsx passes 2 arguments.
 */
export function getGenericLibraryTrackPath(item?: any, secondary?: any): string {
  if (!item) return 'General/untitled';

  const trackName = item.name || item.title || item.trackName || (typeof secondary === 'string' ? secondary : 'untitled');
  const category = item.category || item.genre || 'General';

  return `${sanitizePathSegment(category)}/${sanitizePathSegment(trackName)}`;
}

/**
 * Helper to generate sanitized export or archive folder paths.
 */
export function sanitizeFolderPath(pathStr?: any): string {
  if (!pathStr || typeof pathStr !== 'string') return '';
  return pathStr
    .split('/')
    .map((seg: string) => sanitizePathSegment(seg))
    .join('/');
}