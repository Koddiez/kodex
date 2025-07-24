import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'

export const config = {
  api: {
    bodyParser: false,
  },
}

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket.server.io) {
    const path = '/api/collaboration/socket'
    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: path,
      addTrailingSlash: false,
    })

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

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
          ...data,
          userId: socket.id,
        })
      })

      socket.on('cursor-position', (data: { projectId: string; position: any; userId: string }) => {
        socket.to(data.projectId).emit('cursor-update', {
          ...data,
          socketId: socket.id,
        })
      })

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export default ioHandler