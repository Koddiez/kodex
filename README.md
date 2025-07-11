# Kodex - Next-Generation Full-Stack Development Platform

Kodex is a modern, collaborative web development platform that combines the best features of Lovable, v0, and bolt.new. Built with Next.js, TypeScript, and MongoDB, it provides a seamless development experience with AI assistance and real-time collaboration.

## 🚀 Features

### Core Features
- **AI-Powered Code Generation** - Generate production-ready code with advanced AI assistance
- **Real-time Collaboration** - Code together with your team in real-time using WebSocket
- **Project Management** - Create, organize, and manage your projects efficiently
- **Modern Code Editor** - Monaco Editor with syntax highlighting and IntelliSense
- **Instant Deployment** - Deploy your apps with one click to Vercel
- **Authentication** - Secure user authentication with NextAuth.js

### Advanced Features
- **Multi-language Support** - JavaScript, TypeScript, Python, React, and more
- **File Management** - Create, edit, and organize files within projects
- **AI Chat Assistant** - Get help and generate code with AI
- **Collaborative Editing** - See real-time changes from other users
- **Project Templates** - Start with pre-built templates
- **Version Control** - Track changes and collaborate effectively

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Editor**: Monaco Editor (VS Code's editor)
- **Backend**: Next.js API Routes, MongoDB
- **Authentication**: NextAuth.js
- **Real-time**: Socket.io
- **Deployment**: Vercel integration
- **Database**: MongoDB Atlas

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/kodex.git
   cd kodex
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb+srv://kodex:koddiezcluster@kodex.szwnjqo.mongodb.net/?retryWrites=true&w=majority&appName=Kodex
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication

Kodex uses NextAuth.js for authentication. Currently supported:

- **Email/Password** - Traditional login
- **OAuth Providers** - Google, GitHub (configured but disabled)

### Demo Account
- **Email**: demo@kodex.dev
- **Password**: demo1234

## 🎯 Usage

### Getting Started
1. Sign in to your account
2. Create a new project or open an existing one
3. Start coding in the Monaco Editor
4. Use AI assistance for code generation
5. Collaborate with team members in real-time
6. Deploy your project with one click

### AI Code Generation
- Ask the AI assistant to generate code
- Specify the programming language
- Insert generated code directly into your files
- Get help with debugging and optimization

### Real-time Collaboration
- Multiple users can edit the same project simultaneously
- See real-time cursor movements and changes
- Chat with collaborators using the AI assistant
- Save changes automatically

### Project Management
- Create unlimited projects
- Organize files within projects
- Share projects with team members
- Track project history and changes

## 🚀 Deployment

### Vercel Deployment
1. Connect your Vercel account
2. Click the "Deploy" button in the dashboard
3. Your project will be deployed to a unique URL
4. Share the URL with your team or clients

### Environment Variables for Production
```env
MONGODB_URI=your_production_mongodb_uri
NEXTAUTH_SECRET=your_production_secret
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

## 🔧 Configuration

### Adding OAuth Providers

1. **Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add your domain to authorized origins

2. **GitHub OAuth**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create a new OAuth App
   - Set the callback URL to `http://localhost:3000/api/auth/callback/github`

3. **Update environment variables**
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GITHUB_ID=your_github_client_id
   GITHUB_SECRET=your_github_client_secret
   ```

### MongoDB Setup
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Update the `MONGODB_URI` in your environment variables

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.kodex.dev](https://docs.kodex.dev)
- **Issues**: [GitHub Issues](https://github.com/yourusername/kodex/issues)
- **Discord**: [Join our community](https://discord.gg/kodex)
- **Email**: support@kodex.dev

## 🎉 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - The code editor
- [Tailwind CSS](https://tailwindcss.com/) - The CSS framework
- [Socket.io](https://socket.io/) - Real-time communication
- [NextAuth.js](https://next-auth.js.org/) - Authentication

---

Built with ❤️ by the Kodex team 