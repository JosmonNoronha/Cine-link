#!/usr/bin/env node

/**
 * Security Verification Script
 * Checks if environment variables are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CineLink Security Verification\n');

let hasErrors = false;
const warnings = [];

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: .env file not found!');
  console.error('   Run: cp .env.example .env');
  console.error('   Then fill in your actual credentials.\n');
  hasErrors = true;
} else {
  console.log('✅ .env file exists');
  
  // Check for example values still in .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('your_') || envContent.includes('_here')) {
    warnings.push('⚠️  WARNING: .env file contains placeholder values');
    warnings.push('   Make sure to replace all "your_*" values with actual credentials');
  }
}

// Check backend .env
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  console.error('❌ ERROR: backend/.env file not found!');
  console.error('   Run: cd backend && cp .env.example .env');
  console.error('   Then fill in your actual credentials.\n');
  hasErrors = true;
} else {
  console.log('✅ backend/.env file exists');
  
  const backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
  if (backendEnvContent.includes('your-') || backendEnvContent.includes('your_')) {
    warnings.push('⚠️  WARNING: backend/.env contains placeholder values');
  }
}

// Check if app.json still has hardcoded keys
const appJsonPath = path.join(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const extra = appJson.expo?.extra || {};
  
  if (extra.FIREBASE_API_KEY || extra.OMDB_API_KEY) {
    console.error('❌ ERROR: app.json still contains hardcoded API keys!');
    console.error('   These should be removed and moved to .env');
    hasErrors = true;
  }
}

// Check eas.json
const easJsonPath = path.join(__dirname, 'eas.json');
if (fs.existsSync(easJsonPath)) {
  const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  const prodEnv = easJson.build?.production?.env || {};
  
  if (prodEnv.FIREBASE_API_KEY && !prodEnv.FIREBASE_API_KEY.startsWith('$')) {
    console.error('❌ ERROR: eas.json contains hardcoded production keys!');
    console.error('   Use EAS secrets instead: eas secret:create');
    hasErrors = true;
  }
}

// Check Firebase service account
const serviceAccountPath = path.join(__dirname, 'backend', 'firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  warnings.push('⚠️  WARNING: backend/firebase-service-account.json not found');
  warnings.push('   Backend authentication will not work without this file');
  warnings.push('   Download from Firebase Console → Project Settings → Service Accounts');
}

// Check .gitignore
const gitignorePath = path.join(__dirname, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const requiredEntries = ['.env', '*.env', 'firebase-service-account*.json'];
  const missingEntries = requiredEntries.filter(entry => !gitignoreContent.includes(entry));
  
  if (missingEntries.length > 0) {
    console.error('❌ ERROR: .gitignore is missing critical entries:');
    missingEntries.forEach(entry => console.error(`   - ${entry}`));
    hasErrors = true;
  } else {
    console.log('✅ .gitignore properly configured');
  }
}

console.log('');

// Print warnings
if (warnings.length > 0) {
  warnings.forEach(w => console.log(w));
  console.log('');
}

// Final result
if (hasErrors) {
  console.log('❌ Security verification FAILED');
  console.log('📖 Read SECURITY_INSTRUCTIONS.md for detailed setup guide');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('⚠️  Security verification completed with warnings');
  console.log('📖 Check warnings above and read SECURITY_INSTRUCTIONS.md');
  process.exit(0);
} else {
  console.log('✅ Security verification PASSED');
  console.log('🚀 You\'re ready to start development!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. cd backend && npm run dev');
  console.log('  2. In another terminal: npx expo start');
  process.exit(0);
}
