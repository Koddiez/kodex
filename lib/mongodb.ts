import mongoose from 'mongoose'
import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kodex:koddiezcluster@kodex.szwnjqo.mongodb.net/?retryWrites=true&w=majority&appName=Kodex'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

let cached = (global as any).mongoose || { conn: null, promise: null }
let mongoClient: MongoClient | null = null
let mongoDb: Db | null = null

export async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((mongoose) => {
      return mongoose
    })
  }
  cached.conn = await cached.promise
  ;(global as any).mongoose = cached
  return cached.conn
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (mongoClient && mongoDb) {
    return { client: mongoClient, db: mongoDb }
  }

  try {
    mongoClient = new MongoClient(MONGODB_URI)
    await mongoClient.connect()
    mongoDb = mongoClient.db('kodex')
    
    console.log('Connected to MongoDB for analytics')
    return { client: mongoClient, db: mongoDb }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw error
  }
} 