// File: src/services/cloudinaryService.js
// Description: Upload to Cloudinary with multipart first (preserves original format), base64 fallback, and clear diagnostics.

import * as FileSystem from 'expo-file-system';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function errorResult(message, extra) {
  if (extra) console.warn('Cloudinary error detail:', extra);
  return { success: false, error: message };
}

// Infer MIME from URI extension (best-effort)
function guessMimeFromUri(uri) {
  const path = (uri || '').split('?')[0].toLowerCase();
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  // Default to JPEG if unknown
  return 'image/jpeg';
}

// Build a safe filename from URI
function pickFileName(uri, fallbackBase = 'upload') {
  const last = (uri || '').split('/').pop() || `${fallbackBase}.jpg`;
  return last.includes('.') ? last : `${last}.jpg`;
}

export async function uploadImageToCloudinary(localUri) {
  try {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      return errorResult('Cloudinary env vars missing (CLOUD_NAME or UPLOAD_PRESET).');
    }
    if (!localUri) return errorResult('No local image URI provided.');

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    // 1) Multipart first (preserves original format and avoids base64 overhead)
    try {
      const mime = guessMimeFromUri(localUri);
      const name = pickFileName(localUri, `upload_${Date.now()}`);
      const file = { uri: localUri, name, type: mime };

      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);

      const resp = await fetch(url, { method: 'POST', body: fd });
      let data = null;
      try {
        data = await resp.json();
      } catch (e) {
        return errorResult('Invalid Cloudinary response (not JSON).', e);
      }

      if (resp.ok && data?.secure_url) {
        return { success: true, url: data.secure_url };
      }

      // If preset is async or any error, keep details and fall through to base64
      if (data?.status === 'pending' || data?.error?.message) {
        console.warn('Cloudinary multipart info:', data);
      }
    } catch (e) {
      // Network or RN-specific multipart edge case – fallback to base64
      console.warn('Multipart upload failed, falling back to base64:', e?.message || e);
    }

    // 2) Base64 fallback (works reliably in Expo; slightly larger payload)
    try {
      const base64Data = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const mime = guessMimeFromUri(localUri);
      const formData = new FormData();
      formData.append('file', `data:${mime};base64,${base64Data}`);
      formData.append('upload_preset', UPLOAD_PRESET);

      const resp2 = await fetch(url, { method: 'POST', body: formData });
      let data2 = null;
      try {
        data2 = await resp2.json();
      } catch (e) {
        return errorResult('Invalid Cloudinary fallback response (not JSON).', e);
      }

      if (resp2.ok && data2?.secure_url) {
        return { success: true, url: data2.secure_url };
      }

      const cloudError = data2?.error?.message || 'Upload failed';
      return errorResult(cloudError, data2);
    } catch (e) {
      return errorResult(e?.message || 'Base64 upload failed');
    }
  } catch (error) {
    console.error('Cloudinary upload error', error);
    return { success: false, error: error?.message || 'Upload failed' };
  }
}
