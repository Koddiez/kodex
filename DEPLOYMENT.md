# Kodex Deployment Guide

## 🚀 Quick Deploy to Vercel

### Step 1: Push to GitHub

1. **Create a new GitHub repository:**
   - Go to [GitHub](https://github.com)
   - Click "New repository"
   - Name it `kodex` or `kodex-platform`
   - Make it public or private (your choice)
   - Don't initialize with README (we already have one)

2. **Push your code to GitHub:**
   ```bash
   # If you haven't already initialized git
   git init
   git add .
   git commit -m "Initial Kodex platform"
   
   # Add your GitHub repository as remote
   git remote add origin https://github.com/YOUR_USERNAME/kodex.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Go to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import your repository:**
   - Click "New Project"
   - Import your `kodex` repository
   - Vercel will automatically detect it's a Next.js project

3. **Configure environment variables:**
   In the Vercel project settings, add these environment variables:
   
   ```
   MONGODB_URI=mongodb+srv://kodex:koddiezcluster@kodex.szwnjqo.mongodb.net/?retryWrites=true&w=majority&appName=Kodex
   NEXTAUTH_SECRET=your_secure_random_string_here
   NEXTAUTH_URL=https://your-vercel-domain.vercel.app
   ```

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your project
   - You'll get a URL like `https://kodex-username.vercel.app`

### Step 3: Test Your Deployment

1. **Visit your deployed URL**
2. **Sign in with demo account:**
   - Email: `demo@kodex.dev`
   - Password: `demo1234`

3. **Test features:**
   - Create a new project
   - Use AI code generation
   - Test real-time collaboration
   - Deploy a project

## 🔧 Environment Variables

### Required Variables:
- `MONGODB_URI`: Your MongoDB connection string
- `NEXTAUTH_SECRET`: A secure random string (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Your Vercel deployment URL

### Optional Variables (for future use):
- `VERCEL_TOKEN`: For real Vercel deployments
- `GITHUB_TOKEN`: For GitHub integration
- `GOOGLE_CLIENT_ID`: For Google OAuth
- `GOOGLE_CLIENT_SECRET`: For Google OAuth
- `GITHUB_ID`: For GitHub OAuth
- `GITHUB_SECRET`: For GitHub OAuth

## 🛠️ Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   MONGODB_URI=mongodb+srv://kodex:koddiezcluster@kodex.szwnjqo.mongodb.net/?retryWrites=true&w=majority&appName=Kodex
   NEXTAUTH_SECRET=your_local_secret_here
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Security Notes

- Never commit API keys to Git
- Use environment variables for all secrets
- The MongoDB connection string is already configured
- NextAuth secret should be a secure random string

## 🎯 Features to Test

### ✅ Working Features:
- **Authentication** - Sign in with demo account
- **Project Management** - Create, edit, delete projects
- **AI Code Generation** - Generate code with OpenAI/Moonshot
- **Real-time Collaboration** - Multi-user editing
- **Modern UI** - Responsive design with dark theme
- **File Management** - Create and edit multiple files
- **Deployment** - Deploy projects to Vercel

### 🚀 Advanced Features:
- **Socket.io** - Real-time collaboration
- **Monaco Editor** - VS Code-like editing experience
- **Tailwind CSS** - Modern styling
- **Framer Motion** - Smooth animations
- **TypeScript** - Type-safe development

## 📞 Support

If you encounter any issues:

1. **Check the logs** in Vercel dashboard
2. **Verify environment variables** are set correctly
3. **Test locally** first to isolate issues
4. **Check MongoDB connection** is working

## 🎉 Success!

Once deployed, you'll have a production-ready, full-stack web development platform that rivals and exceeds Lovable, v0, and bolt.new!

Your Kodex platform will be available at: `https://your-vercel-domain.vercel.app` 