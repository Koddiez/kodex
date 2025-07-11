import mongoose, { Schema, models } from 'mongoose'

const FileSchema = new Schema({
  name: { type: String, required: true },
  language: { type: String, required: true },
  content: { type: String, required: true },
})

const ProjectSchema = new Schema({
  name: { type: String, required: true },
  files: { type: [FileSchema], default: [] },
  owner: { type: String, required: true }, // user email or id
}, { timestamps: true })

export default models.Project || mongoose.model('Project', ProjectSchema) 