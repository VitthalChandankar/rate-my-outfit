const isDev = __DEV__;

export const log = (...args) => {
  if (isDev) {
    console.log('[LOG]', ...args);
  }
};

export const warn = (...args) => {
  if (isDev) {
    console.warn('[WARN]', ...args);
  }
};

export const error = (...args) => {
  if (isDev) {
    console.error('[ERROR]', ...args);
  }
};
