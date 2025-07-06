#!/usr/bin/env node

/**
 * Helper script to update Firebase credentials in .env.local
 * Usage: node scripts/update-firebase-credentials.js path/to/service-account.json
 */

const fs = require('fs');
const path = require('path');

// Get the service account JSON file path from command line arguments
const serviceAccountPath = process.argv[2];

if (!serviceAccountPath) {
  console.error('❌ Please provide the path to your service account JSON file');
  console.error('Usage: node scripts/update-firebase-credentials.js path/to/service-account.json');
  process.exit(1);
}

// Check if the service account file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

try {
  // Read the service account JSON file
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  // Validate required fields
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('❌ Invalid service account file. Missing required fields.');
    process.exit(1);
  }
  
  console.log('✅ Service account file loaded successfully');
  console.log('📧 Client Email:', serviceAccount.client_email);
  console.log('🆔 Project ID:', serviceAccount.project_id);
  
  // Path to .env.local file
  const envPath = path.join(__dirname, '..', '.env.local');
  
  // Read current .env.local content
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Create a backup
    fs.writeFileSync(envPath + '.backup', envContent);
    console.log('🔄 Created backup of .env.local');
  }
  
  // Update or add Firebase credentials
  const updates = {
    'FIREBASE_PROJECT_ID': serviceAccount.project_id,
    'FIREBASE_CLIENT_EMAIL': serviceAccount.client_email,
    'FIREBASE_PRIVATE_KEY': `"${serviceAccount.private_key}"`
  };
  
  // Process each environment variable
  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      // Update existing variable
      envContent = envContent.replace(regex, `${key}=${value}`);
      console.log(`🔄 Updated ${key}`);
    } else {
      // Add new variable
      envContent += `\n${key}=${value}`;
      console.log(`➕ Added ${key}`);
    }
  });
  
  // Write the updated content back to .env.local
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Firebase credentials updated successfully in .env.local');
  console.log('🔄 Restart your development server to apply changes');
  
} catch (error) {
  console.error('❌ Error updating Firebase credentials:', error.message);
  process.exit(1);
} 