import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { dbConnect } from '@/lib/mongodb'
import Project from '@/models/Project'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await dbConnect()

  if (req.method === 'GET') {
    try {
      const projects = await Project.find({ owner: session.user?.email })
      res.status(200).json(projects)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch projects' })
    }
  } else if (req.method === 'POST') {
    try {
      const { name, files = [] } = req.body
      
      if (!name) {
        return res.status(400).json({ error: 'Project name is required' })
      }

      const project = new Project({
        name,
        files,
        owner: session.user?.email
      })

      await project.save()
      res.status(201).json(project)
    } catch (error) {
      res.status(500).json({ error: 'Failed to create project' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}