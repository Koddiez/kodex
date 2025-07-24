# Kodex Deployment Guide

This guide will help you deploy Kodex to production on Vercel.

## Prerequisites

- Vercel account
- MongoDB Atlas cluster
- OpenAI API key (optional)
- Moonshot API key (optional)

## Environment Variables

Set up the following environment variables in your Vercel dashboard:

### Required Variables
```env
MONGODB_URI=mongodb+srv://kodex:koddiezcluster@kodex.szwnjqo.mongodb.net/?retryWrites=true&w=majority&appName=Kodex
NEXTAUTH_SECRET=2w1v69G/RI3Gl/5x8x5LLJ/SiaUoclbapag=
NEXTAUTH_URL=https://your-domain.vercel.app
```

### AI API Keys (Optional)
```env
OPENAI_API_KEY=CC9JSn2jNq-NqJKCI4SZ6_EebASIEcqsYA
MOONSHOT_API_KEY=1PsPNSDUWa3HRDjplFYn9LTzzXYnD2Mhp
```

### OAuth Providers (Optional)
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

## Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Import your Kodex repository
4. Configure the project settings

### 2. Set Environment Variables
1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add all the required variables listed above
4. Make sure to set them for all environments (Production, Preview, Development)

### 3. Deploy
1. Trigger a deployment from the Vercel dashboard
2. Wait for the build to complete
3. Your app will be available at `https://your-project.vercel.app`

## Post-Deployment Configuration

### 1. Update NEXTAUTH_URL
After deployment, update the `NEXTAUTH_URL` environment variable to match your actual domain:
```env
NEXTAUTH_URL=https://your-actual-domain.vercel.app
```

### 2. Configure OAuth Callbacks
If using OAuth providers, update the callback URLs:
- Google: `https://your-domain.vercel.app/api/auth/callback/google`
- GitHub: `https://your-domain.vercel.app/api/auth/callback/github`

### 3. Test the Application
1. Visit your deployed application
2. Test the sign-in functionality
3. Create a test project
4. Verify AI code generation works
5. Test real-time collaboration features

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check NEXTAUTH_SECRET is set correctly
   - Verify NEXTAUTH_URL matches your domain
   - Ensure OAuth callback URLs are correct

2. **Database connection issues**
   - Verify MONGODB_URI is correct
   - Check MongoDB Atlas network access settings
   - Ensure database user has proper permissions

3. **AI features not working**
   - Verify API keys are set correctly
   - Check API key permissions and quotas
   - Monitor API usage in respective dashboards

4. **Real-time features not working**
   - Socket.io may need additional configuration for serverless
   - Consider using Vercel's Edge Functions for better WebSocket support

### Performance Optimization

1. **Enable caching**
   - Configure appropriate cache headers
   - Use Vercel's Edge Network for static assets

2. **Database optimization**
   - Add proper indexes to MongoDB collections
   - Implement connection pooling

3. **API optimization**
   - Implement rate limiting
   - Add request/response compression

## Monitoring

### Set up monitoring for:
- Application performance
- API response times
- Database connection health
- Error tracking
- User analytics

### Recommended tools:
- Vercel Analytics
- MongoDB Atlas monitoring
- Sentry for error tracking
- LogRocket for user sessions

## Security Checklist

- [ ] Environment variables are properly secured
- [ ] API keys have minimal required permissions
- [ ] Database access is restricted to application only
- [ ] HTTPS is enforced
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented
- [ ] Input validation is in place
- [ ] Authentication is working correctly

## Scaling Considerations

As your application grows, consider:
- Database sharding
- CDN for static assets
- Caching strategies
- Load balancing
- Microservices architecture
- Separate AI service deployment

---

For additional support, contact the Kodex team or check our documentation.