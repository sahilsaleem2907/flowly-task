#!/bin/bash

# Slate Deployment Script for Vercel
echo "🚀 Preparing Slate for Vercel deployment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local file not found!"
    echo "Please create .env.local with your Firebase configuration:"
    echo ""
    echo "VITE_FIREBASE_API_KEY=your_api_key_here"
    echo "VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com"
    echo "VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com"
    echo "VITE_FIREBASE_PROJECT_ID=your_project_id"
    echo "VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com"
    echo "VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id"
    echo "VITE_FIREBASE_APP_ID=your_app_id"
    echo "VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id"
    echo ""
fi

# Check if all dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run linting
echo "🔍 Running linting..."
npm run lint

# Build the project
echo "🏗️  Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Your project is ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Push your code to GitHub/GitLab/Bitbucket"
    echo "2. Go to https://vercel.com/dashboard"
    echo "3. Click 'New Project' and import your repository"
    echo "4. Add your Firebase environment variables in Vercel settings"
    echo "5. Deploy!"
    echo ""
    echo "📖 See DEPLOYMENT.md for detailed instructions"
else
    echo "❌ Build failed! Please fix the errors above."
    exit 1
fi 