import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  // Just return a mock deployment response for now
  return res.json({
    id: `deploy_${Date.now()}`,
    url: `https://mock-deployment-url.vercel.app`,
    status: 'ready',
    createdAt: new Date().toISOString(),
  })
} 