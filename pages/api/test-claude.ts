import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const hasClaude = process.env.ANTHROPIC_API_KEY && 
                     process.env.ANTHROPIC_API_KEY !== 'sk-ant-your-actual-claude-api-key-here'

    if (!hasClaude) {
      return res.status(400).json({ 
        error: 'Claude API key not configured',
        message: 'Please add your Anthropic API key to .env.local'
      })
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Claude!" and confirm you can generate React code.'
        }
      ]
    })

    const response = message.content[0]
    if (response.type === 'text') {
      return res.status(200).json({
        success: true,
        message: response.text,
        model: 'claude-3-5-sonnet-20241022'
      })
    }

    return res.status(500).json({ error: 'Unexpected response format' })

  } catch (error) {
    console.error('Claude test error:', error)
    return res.status(500).json({ 
      error: 'Claude API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}