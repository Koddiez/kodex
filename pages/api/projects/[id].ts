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

  const { id } = req.query
  await dbConnect()

  if (req.method === 'GET') {
    try {
      const project = await Project.findOne({ 
        _id: id, 
        owner: session.user?.email 
      })
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' })
      }

      res.status(200).json(project)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch project' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, files } = req.body
      
      const project = await Project.findOneAndUpdate(
        { _id: id, owner: session.user?.email },
        { name, files },
        { new: true }
      )
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' })
      }

      res.status(200).json(project)
    } catch (error) {
      res.status(500).json({ error: 'Failed to update project' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const project = await Project.findOneAndDelete({ 
        _id: id, 
        owner: session.user?.email 
      })
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' })
      }

      res.status(200).json({ message: 'Project deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete project' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}