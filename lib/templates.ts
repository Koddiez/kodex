export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: 'web-app' | 'landing' | 'dashboard' | 'ecommerce' | 'blog' | 'portfolio'
  framework: 'react' | 'nextjs' | 'vue' | 'vanilla'
  features: string[]
  files: Array<{
    name: string
    path: string
    content: string
    language: string
  }>
  dependencies: string[]
  preview?: string
}

export const templates: ProjectTemplate[] = [
  {
    id: 'react-dashboard',
    name: 'Admin Dashboard',
    description: 'Complete admin dashboard with charts, tables, and user management',
    category: 'dashboard',
    framework: 'react',
    features: ['Authentication', 'Charts & Analytics', 'Data Tables', 'User Management', 'Dark Mode'],
    dependencies: ['react', 'react-dom', 'react-router-dom', 'recharts', 'lucide-react'],
    files: [
      {
        name: 'App.tsx',
        path: '/src/App.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App`
      },
      {
        name: 'Dashboard.tsx',
        path: '/src/pages/Dashboard.tsx',
        language: 'typescript',
        content: `import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 500 },
]

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900">12,345</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
          <p className="text-2xl font-bold text-gray-900">$54,321</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Orders</h3>
          <p className="text-2xl font-bold text-gray-900">1,234</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Growth</h3>
          <p className="text-2xl font-bold text-green-600">+12.5%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}`
      },
      {
        name: 'Sidebar.tsx',
        path: '/src/components/Sidebar.tsx',
        language: 'typescript',
        content: `import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, BarChart3, Settings } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation()

  return (
    <div className={\`bg-gray-900 text-white transition-all duration-300 \${isOpen ? 'w-64' : 'w-16'}\`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className={\`font-bold text-xl \${!isOpen && 'hidden'}\`}>Admin</h1>
          <button onClick={onToggle} className="p-1 rounded hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="mt-8">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={\`flex items-center px-4 py-3 text-sm font-medium hover:bg-gray-800 \${
                isActive ? 'bg-gray-800 border-r-2 border-blue-500' : ''
              }\`}
            >
              <Icon className="w-5 h-5" />
              <span className={\`ml-3 \${!isOpen && 'hidden'}\`}>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}`
      }
    ]
  },
  {
    id: 'nextjs-landing',
    name: 'Landing Page',
    description: 'Modern landing page with hero section, features, and contact form',
    category: 'landing',
    framework: 'nextjs',
    features: ['Responsive Design', 'SEO Optimized', 'Contact Form', 'Animations', 'Dark Mode'],
    dependencies: ['next', 'react', 'react-dom', 'framer-motion', 'tailwindcss'],
    files: [
      {
        name: 'page.tsx',
        path: '/app/page.tsx',
        language: 'typescript',
        content: `'use client'

import { motion } from 'framer-motion'
import Hero from './components/Hero'
import Features from './components/Features'
import Contact from './components/Contact'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <Contact />
    </main>
  )
}`
      },
      {
        name: 'Hero.tsx',
        path: '/app/components/Hero.tsx',
        language: 'typescript',
        content: `'use client'

import { motion } from 'framer-motion'

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="text-center text-white px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-7xl font-bold mb-6"
        >
          Build Amazing
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400">
            Products
          </span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto"
        >
          Transform your ideas into reality with our cutting-edge platform
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-x-4"
        >
          <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors">
            Get Started
          </button>
          <button className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-colors">
            Learn More
          </button>
        </motion.div>
      </div>
    </section>
  )
}`
      }
    ]
  },
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'Full-featured online store with product catalog and shopping cart',
    category: 'ecommerce',
    framework: 'react',
    features: ['Product Catalog', 'Shopping Cart', 'Checkout', 'User Accounts', 'Payment Integration'],
    dependencies: ['react', 'react-dom', 'react-router-dom', 'stripe', 'axios'],
    files: [
      {
        name: 'App.tsx',
        path: '/src/App.tsx',
        language: 'typescript',
        content: `import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Header from './components/Header'
import Home from './pages/Home'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  )
}

export default App`
      }
    ]
  }
]

export function getTemplate(id: string): ProjectTemplate | undefined {
  return templates.find(template => template.id === id)
}

export function getTemplatesByCategory(category: string): ProjectTemplate[] {
  return templates.filter(template => template.category === category)
}

export function getAllTemplates(): ProjectTemplate[] {
  return templates
}