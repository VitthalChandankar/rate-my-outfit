// File: src/utils/cloudinaryUrl.js
// Description: Inject Cloudinary delivery transforms (e.g., w_600,q_auto,f_auto) into secure_url.

export function withCloudinaryTransforms(url, transforms = 'w_600,q_auto,f_auto') {
    try {
      if (!url || typeof url !== 'string') return url;
  
      // Only touch Cloudinary URLs with the /image/upload segment
      const marker = '/image/upload/';
      const idx = url.indexOf(marker);
      if (idx === -1) return url;
  
      const after = url.slice(idx + marker.length);
      const slashPos = after.indexOf('/');
      const firstSegment = slashPos !== -1 ? after.slice(0, slashPos) : after;
  
      // Heuristic: if the first segment looks like transforms (contains '_' or ',') and is not a version (v12345)
      const looksLikeTransform = /[_ ,]/.test(firstSegment) && !/^v\d+$/.test(firstSegment);
      if (looksLikeTransform) {
        // Already has transforms — return as-is (or merge if you prefer)
        return url;
      }
  
      const before = url.slice(0, idx + marker.length);
      return `${before}${transforms}/${after}`;
    } catch {
      return url;
    }
  }
  
  // Optional constants for reuse
  export const IMG_FEED = 'w_600,q_auto,f_auto';
  export const IMG_GRID = 'w_300,q_auto,f_auto';
  export const IMG_SQUARE_THUMB = 'c_fill,g_auto,w_300,h_300,q_auto,f_auto';
  export const IMG_DETAIL = 'w_1080,dpr_auto,q_auto,f_auto';
  