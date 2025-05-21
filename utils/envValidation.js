/**
 * Environment Variable Schema and Validation
 * 
 * This file provides:
 * 1. Zod schema for validating environment variables
 * 2. Validation functions to ensure correct values
 */

import { z } from 'zod';

// Environment variables schema
/**
 * Schema for validating environment variables using Zod.
 * 
 * @typedef {Object} EnvSchema
 * 
 * @property {string} VITE_APP_NAME - The name of the application. Defaults to 'OvenPlatform'.
 * @property {'development'|'production'} VITE_MODE - The mode in which the application is running. Defaults to 'development'.
 * @property {string} [VITE_API_URL] - The base URL of the API. Must be a valid URL. Optional.
 * @property {string} [VITE_HOST] - The host address of the application. Optional.
 * 
 * @property {string} VITE_WEBRTC_URL_BASE - The base URL for WebRTC streaming.
 * @property {string} VITE_LLHLS_URL_BASE - The base URL for LLHLS streaming.
 * 
 * @property {string} VITE_TURN_SERVER_URL_UDP - The URL for the TURN server (UDP protocol).
 * @property {string} VITE_TURN_SERVER_URL_TCP - The URL for the TURN server (TCP protocol).
 * @property {string} VITE_TURN_SERVER_USERNAME - The username for the TURN server.
 * @property {string} VITE_TURN_SERVER_CREDENTIAL - The credential for the TURN server.
 * 
 * @property {'true'|'false'} VITE_DEBUG_ENABLED - Whether debug mode is enabled. Defaults to 'false'.
 * @property {'debug'|'info'|'warn'|'error'} VITE_LOG_LEVEL - The log level for the application. Defaults to 'info'.
 */
const envSchema = z.object({
  // Application information
  VITE_APP_NAME: z.string().default('OvenPlatform'),
  VITE_MODE: z.enum(['development', 'production']).default('development'),
  VITE_API_URL: z.string().url().optional(),
  VITE_HOST: z.string().optional(),
  
  // Streaming endpoints
  VITE_WEBRTC_URL_BASE: z.string(),
  VITE_LLHLS_URL_BASE: z.string(),
  
  // ICE server configuration
  VITE_TURN_SERVER_URL_UDP: z.string(),
  VITE_TURN_SERVER_URL_TCP: z.string(),
  VITE_TURN_SERVER_USERNAME: z.string(),
  VITE_TURN_SERVER_CREDENTIAL: z.string(),
  
  // Debug settings
  VITE_DEBUG_ENABLED: z.enum(['true', 'false']).default('false'),
  VITE_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Validates environment variables using Zod schema
 * @returns {Object} Validated environment variables or default values
 */
export function validateEnv() {
  // Collect all VITE_* environment variables
  const envVars = {};
  Object.keys(import.meta.env).forEach(key => {
    if (key.startsWith('VITE_')) {
      envVars[key] = import.meta.env[key];
    }
  });
  
  try {
    // Parse with Zod
    const parsedEnv = envSchema.parse(envVars);
    return parsedEnv;
  } catch (error) {
    console.error('Error validating environment variables:', error);
    
    // In development, show warning; in production, fatal error
    if (import.meta.env.DEV) {
      console.warn('Using default values where possible.');
      return envSchema.partial().parse(envVars);
    } else {
      throw new Error('Invalid environment variable configuration in production.');
    }
  }
}

// Export schema for use in other modules
export const environmentSchema = envSchema;
export default validateEnv;
