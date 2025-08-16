// File: src/utils/validations.js
// Description: small helpers

export function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\.,;:\s@"]+.)+[^<>()[\]\.,;:\s@"]{2,})$/i;
  return re.test(String(email).toLowerCase());
}

export function validateCaption(text, max = 300) {
  if (!text) return true;
  return text.length <= max;
}
