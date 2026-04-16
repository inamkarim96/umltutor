/**
 * Utility to resolve resource URLs (images, PDFs) safely across the app.
 * Handles backend uploads, absolute URLs, and local public assets.
 */
export const resolveResourceUrl = (url) => {
  if (!url) return '';

  // If it's already a full URL or a blob/data URI, return as-is
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // Get API Base URL safely from environment (supports Webpack/Vite)
  let apiBaseUrl = 'http://localhost:3000';
  
  try {
    if (typeof process !== 'undefined' && process.env) {
      apiBaseUrl = process.env.REACT_APP_API_URL || process.env.API_BASE_URL || apiBaseUrl;
    } else if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiBaseUrl = import.meta.env.VITE_API_URL || apiBaseUrl;
    }
  } catch (e) {
    // Fallback to default if environment access fails
  }

  // If it starts with /uploads or uploads, it's a backend file
  if (url.startsWith('/uploads') || url.startsWith('uploads')) {
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${apiBaseUrl}${cleanUrl}`;
  }

  // For other relative paths, assume it's in the frontend public folder
  // and make sure it's root-relative
  return url.startsWith('/') ? url : `/${url}`;
};
