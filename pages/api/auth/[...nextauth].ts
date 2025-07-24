import NextAuth from 'next-auth'
import type { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
// import GoogleProvider from 'next-auth/providers/google'
// import GitHubProvider from 'next-auth/providers/github'
import { compare } from 'bcryptjs'

const users = [
  // Demo user for local testing - password: demo1234
  { id: '1', email: 'demo@kodex.dev', password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.93iOye' },
]

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        // Demo account - simple check for development
        if (credentials.email === 'demo@kodex.dev' && credentials.password === 'demo1234') {
          return { id: '1', email: 'demo@kodex.dev' }
        }
        
        // For other users, use bcrypt comparison
        const user = users.find(u => u.email === credentials.email)
        if (user && await compare(credentials.password, user.password)) {
          return { id: user.id, email: user.email }
        }
        return null
      },
    }),
    // GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
    // GitHubProvider({ clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions) 