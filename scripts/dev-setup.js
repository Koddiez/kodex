#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up Kodex development environment...')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env.local file not found!')
  console.log('Creating .env.local with default values...')
  
  const envContent = `# Kodex Environment Variables
MONGODB_URI=mongodb+srv://kodex:koddiezcluster@kodex.szwnjqo.mongodb.net/?retryWrites=true&w=majority&appName=Kodex
NEXTAUTH_SECRET=2w1v69G/RI3Gl/5x8x5LLJ/SiaUoclbapag=
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=CC9JSn2jNq-NqJKCI4SZ6_EebASIEcqsYA
MOONSHOT_API_KEY=1PsPNSDUWa3HRDjplFYn9LTzzXYnD2Mhp

# Optional OAuth providers
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# GITHUB_ID=your_github_client_id
# GITHUB_SECRET=your_github_client_secret
`
  
  fs.writeFileSync(envPath, envContent)
  console.log('✅ .env.local created successfully!')
} else {
  console.log('✅ .env.local already exists')
}

// Check if node_modules exists
const nodeModulesPath = path.join(process.cwd(), 'node_modules')
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...')
  const { execSync } = require('child_process')
  try {
    execSync('npm install', { stdio: 'inherit' })
    console.log('✅ Dependencies installed successfully!')
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message)
    process.exit(1)
  }
} else {
  console.log('✅ Dependencies already installed')
}

console.log('\n🎉 Development environment setup complete!')
console.log('\nNext steps:')
console.log('1. Run "npm run dev" to start the development server')
console.log('2. Open http://localhost:3000 in your browser')
console.log('3. Sign in with demo@kodex.dev / demo1234')
console.log('\nHappy coding! 🚀')