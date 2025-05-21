/**
 * Centralized environment configuration
 * Provides a consistent interface for accessing environment variables with fallback values
 */

import validateEnv from './envValidation';

// Validate environment variables
const env = validateEnv();

// Function to safely access environment variables with fallbacks
function getEnv(key, fallback = '') {
  return env[key] || import.meta.env[key] || fallback;
}

// Exported configuration object with organized sections
export const config = {
  // Application information
  app: {
    name: getEnv('VITE_APP_NAME', 'OvenPlatform'),
    mode: getEnv('VITE_MODE', 'production'),
    apiUrl: getEnv('VITE_API_URL', 'http://localhost:3000'),
    viteUrl: getEnv('VITE_HOST', 'localhost:3000'),
    isProduction: getEnv('VITE_MODE') === 'production',
    isDevelopment: getEnv('VITE_MODE') !== 'production',
  },
  
  // Streaming configuration
  streaming: {
    webrtcBase: getEnv('VITE_WEBRTC_URL_BASE', 'ws://localhost:3333/app'),
    llhlsBase: getEnv('VITE_LLHLS_URL_BASE', 'http://localhost:8080/app'),
    formatWebrtcUrl: (streamName) => `${getEnv('VITE_WEBRTC_URL_BASE')}/${streamName}`,
    formatLlhlsUrl: (streamName) => `${getEnv('VITE_LLHLS_URL_BASE')}/${streamName}/llhls.m3u8`,
  },
  
  // TURN/ICE server configuration
  iceServer: {
    urls: [
      getEnv('VITE_TURN_SERVER_URL_UDP', 'turn:localhost:3478?transport=udp').replace(/^"|"$/g, ''),
      getEnv('VITE_TURN_SERVER_URL_TCP', 'turn:localhost:3478?transport=tcp').replace(/^"|"$/g, ''),
    ],
    username: getEnv('VITE_TURN_SERVER_USERNAME', 'username'),
    credential: getEnv('VITE_TURN_SERVER_CREDENTIAL', 'password'),
  },
  
  // Debug and logging settings
  debug: {
    enabled: getEnv('VITE_DEBUG_ENABLED', 'false') === 'true',
    logLevel: getEnv('VITE_LOG_LEVEL', 'info'),
  }
};

// Utility logger that respects environment settings
export const logger = {
  debug: (...args) => {
    if (config.debug.enabled && config.debug.logLevel === 'debug') {
      console.debug('[OvenPlatform]', ...args);
    }
  },
  info: (...args) => {
    if (config.debug.enabled && ['debug', 'info'].includes(config.debug.logLevel)) {
      console.info('[OvenPlatform]', ...args);
    }
  },
  warn: (...args) => {
    if (config.debug.enabled && ['debug', 'info', 'warn'].includes(config.debug.logLevel)) {
      console.warn('[OvenPlatform]', ...args);
    }
  },
  error: (...args) => {
    console.error('[OvenPlatform]', ...args);
  }
};

// Export the configuration
export default config;
