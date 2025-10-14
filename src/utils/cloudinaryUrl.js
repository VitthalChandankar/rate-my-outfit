// File: src/utils/cloudinaryUrl.js
// Description: Constructs full Cloudinary URLs from an image identifier and applies transforms.

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

export function withCloudinaryTransforms(url, transforms = 'w_600,q_auto,f_auto') {
    try {
      if (!url || typeof url !== 'string') return null;
  
      // For backward compatibility: if a full URL is passed, return it as is.
      // This allows old data to still be displayed during and after the transition.
      if (url.startsWith('http')) {
        return url;
      }
  
      if (!CLOUD_NAME) {
          console.error("Cloudinary cloud name is not configured.");
          return null;
      }

      // Check if the identifier already contains transformation parameters.
      // This is a simple check for 'w_', 'h_', 'q_', 'c_', etc. at the start of a path segment.
      const hasTransforms = url.split('/').some(segment => /^[whqc]_\w+/.test(segment));

      if (hasTransforms) {
        // If it already has transforms, build the URL without adding more.
        return `${BASE_URL}/${url}`;
      }

      // New logic: construct URL from an identifier (which is the public_id).
      // The `f_auto` transform will automatically select the best format (jpg, webp, etc.).
      // The identifier is expected to be in the format 'folder/asset_name'.
      return `${BASE_URL}/${transforms}/${url}`;

    } catch {
      return url; // return original on error
    }
  }
  
  // Optional constants for reuse
  export const IMG_FEED = 'w_600,q_auto,f_auto';
  export const IMG_GRID = 'w_300,q_auto,f_auto';
  export const IMG_SQUARE_THUMB = 'c_fill,g_auto,w_300,h_300,q_auto,f_auto';
  export const IMG_DETAIL = 'w_1080,dpr_auto,q_auto,f_auto';
  