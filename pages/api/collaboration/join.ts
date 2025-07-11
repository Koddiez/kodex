import { Server as NetServer } from 'http'
import { NextApiRequest } from 'next'
import { Server as ServerIO } from 'socket.io'
import { NextApiResponseServerIO } from '../../../types/socket'

export const config = {
  api: {
    bodyParser: false,
  },
}

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: '/api/collaboration',
      addTrailingSlash: false,
    })
    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('join-project', (projectId: string) => {
        socket.join(projectId)
        console.log(`User ${socket.id} joined project ${projectId}`)
      })

      socket.on('leave-project', (projectId: string) => {
        socket.leave(projectId)
        console.log(`User ${socket.id} left project ${projectId}`)
      })

      socket.on('code-change', (data: { projectId: string; fileIndex: number; content: string }) => {
        socket.to(data.projectId).emit('code-update', {
          fileIndex: data.fileIndex,
          content: data.content,
          userId: socket.id,
        })
      })

      socket.on('cursor-move', (data: { projectId: string; position: any }) => {
        socket.to(data.projectId).emit('cursor-update', {
          position: data.position,
          userId: socket.id,
        })
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }
  res.end()
}

export default ioHandler 