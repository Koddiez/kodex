import { Server as NetServer, Socket } from 'net'
import { NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer
    }
  }
}

export interface CollaborationData {
  projectId: string
  fileIndex: number
  content: string
}

export interface CursorData {
  projectId: string
  position: {
    line: number
    column: number
  }
} 