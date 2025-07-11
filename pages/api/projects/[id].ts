import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { dbConnect } from '../../../lib/mongodb'
import Project from '../../../models/Project'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  await dbConnect()
  const { id } = req.query

  if (req.method === 'GET') {
    const project = await Project.findOne({ _id: id, owner: session.user?.email })
    if (!project) return res.status(404).json({ error: 'Not found' })
    return res.json(project)
  }

  if (req.method === 'PUT') {
    const { name, files } = req.body
    const project = await Project.findOneAndUpdate(
      { _id: id, owner: session.user?.email },
      { name, files },
      { new: true }
    )
    if (!project) return res.status(404).json({ error: 'Not found' })
    return res.json(project)
  }

  if (req.method === 'DELETE') {
    const deleted = await Project.findOneAndDelete({ _id: id, owner: session.user?.email })
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    return res.json({ success: true })
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
} 