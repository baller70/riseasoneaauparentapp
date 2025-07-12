
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, context, type } = await request.json()

    const messages = [
      {
        role: "system" as const,
        content: getSystemPrompt(type)
      },
      {
        role: "user" as const,
        content: `${context ? `Context: ${JSON.stringify(context)}\n\n` : ''}${prompt}`
      }
    ]

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        stream: true,
        max_tokens: 3000,
        temperature: 0.7
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`)
    }

    const stream = response.body
    if (!stream) {
      throw new Error('No response stream')
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = stream.getReader()
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                  controller.close()
                  return
                }
                
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Stream generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate stream', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function getSystemPrompt(type: string): string {
  const prompts = {
    message: `You are an AI assistant for the "Rise as One Yearly Program" parent communication system. Generate personalized, professional messages that are warm, supportive, and focused on the child's development. Always maintain a positive tone while addressing any concerns.`,
    
    analysis: `You are an AI analyst for the "Rise as One Yearly Program". Provide detailed, actionable insights based on data patterns. Focus on practical recommendations that can improve parent engagement and program outcomes.`,
    
    summary: `You are an AI summarizer for the "Rise as One Yearly Program". Create concise, informative summaries that highlight key points and actionable items. Focus on clarity and actionable insights.`,
    
    recommendation: `You are an AI advisor for the "Rise as One Yearly Program". Provide strategic recommendations based on data analysis. Focus on practical, implementable solutions that improve program efficiency and parent satisfaction.`,
    
    default: `You are an AI assistant for the "Rise as One Yearly Program". Provide helpful, accurate, and professional responses focused on program management and parent communication.`
  }

  return prompts[type as keyof typeof prompts] || prompts.default
}
