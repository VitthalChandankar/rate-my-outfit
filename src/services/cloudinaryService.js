import * as FileSystem from 'expo-file-system';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function errorResult(message, extra) {
  if (extra) console.warn('Cloudinary error detail:', extra);
  return { success: false, error: message };
}

export async function uploadImageToCloudinary(localUri) {
  try {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      return errorResult('Cloudinary env vars missing (CLOUD_NAME or UPLOAD_PRESET).');
    }
    if (!localUri) return errorResult('No local image URI provided.');

    // 1) Base64 data URL approach
    let base64Data = null;
    try {
      base64Data = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (e) {
      // If reading fails (rare), skip to multipart fallback
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    if (base64Data) {
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${base64Data}`);
      formData.append('upload_preset', UPLOAD_PRESET);

      const resp1 = await fetch(url, { method: 'POST', body: formData });
      let data1 = null;
      try {
        data1 = await resp1.json();
      } catch (e) {
        return errorResult('Invalid Cloudinary response (not JSON).', e);
      }

      if (resp1.ok && data1?.secure_url) {
        return { success: true, url: data1.secure_url };
      }
      // If Cloudinary returned structured error, keep it for diagnostics
      if (data1?.error?.message) {
        console.warn('Cloudinary base64 error:', data1.error.message);
      }
    }

    // 2) Fallback: multipart file object
    const fileName = localUri.split('/').pop() || `upload_${Date.now()}.jpg`;
    const file = { uri: localUri, name: fileName, type: 'image/jpeg' };

    const fd2 = new FormData();
    fd2.append('file', file);
    fd2.append('upload_preset', UPLOAD_PRESET);

    const resp2 = await fetch(url, { method: 'POST', body: fd2 });
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
  } catch (error) {
    console.error('Cloudinary upload error', error);
    return { success: false, error: error?.message || 'Upload failed' };
  }
}
