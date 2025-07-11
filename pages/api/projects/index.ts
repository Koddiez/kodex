import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { dbConnect } from '../../../lib/mongodb'
import Project from '../../../models/Project'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  await dbConnect()

  if (req.method === 'GET') {
    // List projects for user
    const projects = await Project.find({ owner: session.user?.email }).sort({ updatedAt: -1 })
    return res.json(projects)
  }

  if (req.method === 'POST') {
    // Create new project
    const { name, files } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const project = await Project.create({
      name,
      files: files || [],
      owner: session.user?.email,
    })
    return res.status(201).json(project)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
} 