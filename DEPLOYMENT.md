# Deploying Slate to Vercel

This guide will walk you through deploying your Slate collaborative document editor to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
3. **Firebase Project**: Set up Firebase for real-time database functionality

## Step 1: Prepare Your Firebase Project

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Realtime Database
4. Set up Authentication (if needed)

### 1.2 Get Firebase Configuration
1. In Firebase Console, go to Project Settings
2. Scroll down to "Your apps" section
3. Click "Add app" and choose Web
4. Copy the configuration object

## Step 2: Set Up Environment Variables

### 2.1 Create .env.local File
Create a `.env.local` file in your project root:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2.2 Add .env.local to .gitignore
Make sure `.env.local` is in your `.gitignore` file:

```gitignore
# Environment variables
.env.local
.env.*.local
```

## Step 3: Deploy to Vercel

### 3.1 Connect Your Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Vercel will automatically detect it's a Vite project

### 3.2 Configure Environment Variables
In the Vercel project settings:
1. Go to Settings → Environment Variables
2. Add each Firebase environment variable:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

### 3.3 Deploy
1. Click "Deploy"
2. Vercel will build and deploy your project
3. You'll get a URL like `https://your-project.vercel.app`

## Step 4: Configure Firebase Security Rules

### 4.1 Realtime Database Rules
In Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**Note**: For production, implement proper authentication and security rules.

## Step 5: Test Your Deployment

### 5.1 Basic Functionality
1. Open your deployed URL
2. Test user authentication
3. Create a new document
4. Test real-time collaboration
5. Verify CRDT operations work correctly

### 5.2 Performance Testing
1. Test with multiple users
2. Verify real-time updates
3. Check mobile responsiveness
4. Test undo/redo functionality

## Troubleshooting

### Common Issues

#### 1. Build Failures
- Check that all dependencies are in `package.json`
- Ensure TypeScript compilation passes locally
- Verify all imports are correct

#### 2. Environment Variables
- Double-check all Firebase environment variables are set in Vercel
- Ensure variable names start with `VITE_`
- Redeploy after adding environment variables

#### 3. Firebase Connection Issues
- Verify Firebase project is properly configured
- Check database rules allow read/write
- Ensure Realtime Database is enabled

#### 4. CORS Issues
- Firebase handles CORS automatically
- If issues persist, check Firebase project settings

### Debugging
1. Check Vercel build logs
2. Use browser developer tools
3. Check Firebase console for errors
4. Verify network requests in browser

## Production Considerations

### 1. Security
- Implement proper Firebase security rules
- Add user authentication
- Validate all user inputs
- Use HTTPS only

### 2. Performance
- Enable Vercel's edge caching
- Optimize bundle size
- Use CDN for static assets
- Implement lazy loading

### 3. Monitoring
- Set up Vercel Analytics
- Monitor Firebase usage
- Track error rates
- Monitor performance metrics

## Custom Domain (Optional)

1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable HTTPS

## Continuous Deployment

Vercel automatically deploys when you push to your main branch. For other branches:
1. Push to a feature branch
2. Vercel creates a preview deployment
3. Test the preview URL
4. Merge to main for production deployment

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/) 