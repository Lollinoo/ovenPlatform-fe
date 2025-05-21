#!/usr/bin/env node

/**
 * Script to generate an updated .env.example file
 * 
 * This script:
 * 1. Reads all existing .env files
 * 2. Extracts all used environment variables
 * 3. Generates a .env.example file with empty variables
 * 
 * Version: 1.1.2
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Terminal colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Define the base directory
const baseDir = path.resolve(__dirname, '..');

// Files to analyze
const envFiles = [
  '.env',
  '.env.development',
  '.env.production',
  '.env.local',
];

// Variable collection
console.log(`${colors.bold}${colors.blue}=== Generating .env.example ===${colors.reset}\n`);

const allVariables = new Map();

// Read files and extract variables
envFiles.forEach(file => {
  const filePath = path.join(baseDir, file);
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  console.log(`${colors.cyan}Analyzing ${file}...${colors.reset}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Ignore comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        return;
      }
      
      // Extract variable
      const match = line.match(/^([A-Za-z0-9_]+)=/);
      if (match && match[1]) {
        const varName = match[1];
        if (!allVariables.has(varName)) {
          allVariables.set(varName, {
            name: varName,
            sources: []
          });
        }
        
        allVariables.get(varName).sources.push(file);
      }
    });
  } catch (error) {
    console.error(`Error reading ${file}:`, error.message);
  }
});

// Group variables by source
const categorizedVars = {
  base: [],
  development: [],
  production: [],
  local: []
};

allVariables.forEach(variable => {
  // Base if present in .env or in all environments
  if (variable.sources.includes('.env') || 
     (variable.sources.includes('.env.development') && 
      variable.sources.includes('.env.production'))) {
    categorizedVars.base.push(variable.name);
  }
  // Development-specific
  else if (variable.sources.includes('.env.development')) {
    categorizedVars.development.push(variable.name);
  }
  // Production-specific
  else if (variable.sources.includes('.env.production')) {
    categorizedVars.production.push(variable.name);
  }
  // Local-specific
  else if (variable.sources.includes('.env.local')) {
    categorizedVars.local.push(variable.name);
  }
});

// Generate the .env.example file
let exampleContent = `# Example file for environment variables
# Copy this file to .env, .env.development, or .env.production and update the values

# ======================================
# Base Variables (shared across environments)
# ======================================
`;

categorizedVars.base.forEach(variable => {
  exampleContent += `${variable}=\n`;
});

exampleContent += `
# ======================================
# Development-Specific Variables
# ======================================
`;

categorizedVars.development.forEach(variable => {
  exampleContent += `# ${variable}=\n`;
});

exampleContent += `
# ======================================
# Production-Specific Variables
# ======================================
`;

categorizedVars.production.forEach(variable => {
  exampleContent += `# ${variable}=\n`;
});

if (categorizedVars.local.length > 0) {
  exampleContent += `
# ======================================
# Local Variables (only in .env.local, not versioned)
# ======================================
`;

  categorizedVars.local.forEach(variable => {
    exampleContent += `# ${variable}=\n`;
  });
}

// Write the file
fs.writeFileSync(path.join(baseDir, '.env.example'), exampleContent);

console.log(`\n${colors.green}${colors.bold}✓ .env.example file successfully generated!${colors.reset}`);
console.log(`It contains ${allVariables.size} environment variables.\n`);

process.exit(0);
