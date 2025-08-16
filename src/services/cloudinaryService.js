// File: src/services/cloudinaryService.js
// Description: Handle image uploads to Cloudinary using unsigned upload preset

import * as FileSystem from 'expo-file-system';

// Use env vars from .env (Expo style)
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImageToCloudinary(localUri) {
  try {
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${base64Data}`);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (data.secure_url) {
      return { success: true, url: data.secure_url };
    } else {
      return { success: false, error: data.error?.message || 'Upload failed' };
    }
  } catch (error) {
    console.error('Cloudinary upload error', error);
    return { success: false, error };
  }
}
