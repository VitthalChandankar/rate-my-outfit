// src/utils/emailValidator.js

// A small, curated list of common disposable email domains.
// For a production app, this list should be much larger and ideally checked on a server.
const disposableDomains = new Set([
    'mailinator.com',
    'temp-mail.org',
    '10minutemail.com',
    'guerrillamail.com',
    'yopmail.com',
    'throwawaymail.com',
  ]);
  
  export async function isEmailDisposable(email) {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1].toLowerCase();
    return disposableDomains.has(domain);
  }
  