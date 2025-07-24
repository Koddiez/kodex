'use client'

import { motion } from 'framer-motion'

interface IconProps {
  className?: string
}

const Code = ({ className }: IconProps) => <span className={className}>💻</span>
const Zap = ({ className }: IconProps) => <span className={className}>⚡</span>
const Users = ({ className }: IconProps) => <span className={className}>👥</span>
const Rocket = ({ className }: IconProps) => <span className={className}>🚀</span>
const Shield = ({ className }: IconProps) => <span className={className}>🛡️</span>
const Sparkles = ({ className }: IconProps) => <span className={className}>✨</span>
const ArrowRight = ({ className }: IconProps) => <span className={className}>→</span>

export default function HomePage() {

  const features = [
    {
      icon: <Code className="w-6 h-6" />,
      title: 'AI-Powered Code Generation',
      description: 'Generate production-ready code with advanced AI assistance'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Real-time Collaboration',
      description: 'Code together with your team in real-time'
    },
    {
      icon: <Rocket className="w-6 h-6" />,
      title: 'Instant Deployment',
      description: 'Deploy your apps with one click to multiple platforms'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Enterprise Security',
      description: 'Bank-grade security with SOC 2 compliance'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Team Management',
      description: 'Manage your team and projects efficiently'
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: 'Advanced Analytics',
      description: 'Track performance and optimize your applications'
    }
  ]

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-dark-900/80 backdrop-blur-md border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Code className="w-8 h-8 text-primary-500" />
              <span className="ml-2 text-xl font-bold gradient-text">Kodex</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-dark-300 hover:text-white transition-colors">Features</a>
              <a href="#docs" className="text-dark-300 hover:text-white transition-colors">Docs</a>
              <a href="/auth/signin" className="btn-primary">Get Started</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              The Future of{' '}
              <span className="gradient-text">Web Development</span>
            </h1>
            <p className="text-xl md:text-2xl text-dark-300 mb-8 max-w-3xl mx-auto">
              Build, deploy, and scale your web applications with AI-powered assistance.
              The ultimate platform for modern developers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/auth/signin" className="btn-primary text-lg px-8 py-4 flex items-center justify-center">
                Start Building Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <button className="btn-secondary text-lg px-8 py-4">
                Watch Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Kodex?</h2>
            <p className="text-xl text-dark-300 max-w-2xl mx-auto">
              Experience the next generation of web development with cutting-edge features
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card hover:border-primary-500/50 transition-all duration-300"
              >
                <div className="text-primary-500 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Build the Future?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of developers who are already building amazing applications with Kodex
          </p>
          <a href="/auth/signin" className="bg-white text-primary-600 font-semibold py-4 px-8 rounded-lg text-lg hover:bg-gray-100 transition-colors inline-block">
            Start Building Now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-dark-800 border-t border-dark-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Code className="w-6 h-6 text-primary-500" />
                <span className="ml-2 text-lg font-bold gradient-text">Kodex</span>
              </div>
              <p className="text-dark-300">
                The next-generation full-stack development platform for modern developers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-dark-300">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-dark-300">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-dark-300">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-dark-700 mt-8 pt-8 text-center text-dark-300">
            <p>&copy; 2024 Kodex. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}