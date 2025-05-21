#!/usr/bin/env node

/**
 * Environment Setup Script
 * 
 * This script helps prepare environment files for different deployment scenarios.
 * 
 * Features:
 * - Creates appropriate environment files based on target environment
 * - Validates required environment variables
 * - Provides guidance for missing configuration
 * 
 * Version: 1.1.2
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Terminal colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Define the base directory
const baseDir = path.resolve(__dirname, '..');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Required environment variables for each environment
const requiredVars = {
  base: [
    'VITE_APP_NAME'
  ],
  development: [
    'VITE_WEBRTC_URL_BASE',
    'VITE_LLHLS_URL_BASE',
    'VITE_TURN_SERVER_URL_UDP',
    'VITE_TURN_SERVER_URL_TCP',
    'VITE_TURN_SERVER_USERNAME',
    'VITE_TURN_SERVER_CREDENTIAL'
  ],
  production: [
    'VITE_WEBRTC_URL_BASE',
    'VITE_LLHLS_URL_BASE',
    'VITE_TURN_SERVER_URL_UDP',
    'VITE_TURN_SERVER_URL_TCP',
    'VITE_TURN_SERVER_USERNAME',
    'VITE_TURN_SERVER_CREDENTIAL'
  ]
};

// Default template values for different environments
const defaultValues = {
  base: {
    VITE_APP_NAME: 'OvenPlatform'
  },
  development: {
    VITE_WEBRTC_URL_BASE: 'ws://localhost:3333/app',
    VITE_LLHLS_URL_BASE: 'http://localhost:8080/app',
    VITE_TURN_SERVER_URL_UDP: 'turn:localhost:3478',
    VITE_TURN_SERVER_URL_TCP: 'turn:localhost:3478?transport=tcp',
    VITE_TURN_SERVER_USERNAME: 'username',
    VITE_TURN_SERVER_CREDENTIAL: 'credential'
  },
  production: {
    VITE_WEBRTC_URL_BASE: 'wss://example.com/app',
    VITE_LLHLS_URL_BASE: 'https://example.com/app',
    VITE_TURN_SERVER_URL_UDP: 'turn:turn.example.com:3478',
    VITE_TURN_SERVER_URL_TCP: 'turn:turn.example.com:3478?transport=tcp',
    VITE_TURN_SERVER_USERNAME: '', // Empty by default for security
    VITE_TURN_SERVER_CREDENTIAL: '' // Empty by default for security
  }
};

/**
 * Main function to run the setup
 */
async function run() {
  console.log(`${colors.bold}${colors.blue}=== OvenPlatform Environment Setup ===${colors.reset}\n`);
  
  // Ask which environment to set up
  const env = await askQuestion(`Which environment do you want to set up? ${colors.cyan}[development/production]${colors.reset}: `);
  
  if (env !== 'development' && env !== 'production') {
    console.log(`${colors.red}Invalid environment. Please choose 'development' or 'production'.${colors.reset}`);
    rl.close();
    return;
  }
  
  console.log(`\n${colors.bold}Setting up environment for: ${colors.green}${env}${colors.reset}\n`);
  
  // Create or update the base .env file
  await setupEnvFile('.env', 'base', env);
  
  // Create or update the environment-specific .env file
  await setupEnvFile(`.env.${env}`, env, env);
  
  console.log(`\n${colors.green}${colors.bold}✓ Environment setup completed for ${env}!${colors.reset}`);
  console.log(`\n${colors.yellow}Note: You may need to manually edit the files to adjust values for your specific deployment.${colors.reset}\n`);
  
  rl.close();
}

/**
 * Set up an environment file
 */
async function setupEnvFile(filename, varsType, env) {
  const filePath = path.join(baseDir, filename);
  const fileExists = fs.existsSync(filePath);
  
  console.log(`\n${colors.bold}${colors.blue}Setting up ${filename}:${colors.reset}`);
  
  // Load existing file if it exists
  let existingVars = {};
  if (fileExists) {
    console.log(`${colors.yellow}File already exists. Will update/append values.${colors.reset}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim();
          existingVars[key] = value;
        }
      }
    }
  }
  
  // Create content for the file
  let fileContent = `# OvenPlatform ${env} environment configuration\n`;
  fileContent += `# Generated on ${new Date().toISOString()}\n\n`;
  
  // Add variables
  for (const varName of requiredVars[varsType]) {
    let value = '';
    
    // If variable exists in file, use that value as default
    if (existingVars[varName]) {
      value = await askQuestion(`${varName} ${colors.yellow}[${existingVars[varName]}]${colors.reset}: `, existingVars[varName]);
    } 
    // Otherwise use our template defaults
    else if (defaultValues[varsType][varName]) {
      value = await askQuestion(`${varName} ${colors.yellow}[${defaultValues[varsType][varName]}]${colors.reset}: `, defaultValues[varsType][varName]);
    } 
    // Or ask without a default
    else {
      value = await askQuestion(`${varName}: `);
    }
    
    fileContent += `${varName}=${value}\n`;
  }
  
  // Write to file
  fs.writeFileSync(filePath, fileContent);
  console.log(`${colors.green}✓ ${filename} created/updated successfully${colors.reset}`);
}

/**
 * Ask a question and return the answer
 */
function askQuestion(question, defaultValue = '') {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

// Run the script
run().catch(err => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  rl.close();
  process.exit(1);
});
