
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      text, 
      fieldType = 'general',
      tone = 'professional',
      context = '',
      summaryLength = 'medium'
    } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required for summarization' }, { status: 400 })
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are an AI writing assistant for the "Rise as One Yearly Program". Create concise, effective summaries that preserve the most important information and key points.`
      },
      {
        role: "user" as const,
        content: buildSummaryPrompt({
          text,
          fieldType,
          tone,
          context,
          summaryLength
        })
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
        max_tokens: getMaxTokensForSummary(summaryLength),
        temperature: 0.3
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
    console.error('AI writing summarize error:', error)
    return NextResponse.json(
      { error: 'Failed to summarize content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildSummaryPrompt(params: any): string {
  const { text, fieldType, tone, context, summaryLength } = params
  
  let prompt = `Summarize the following text:\n\n"${text}"\n\n`
  
  if (context) {
    prompt += `Context: ${context}\n\n`
  }
  
  prompt += `Summary requirements:\n`
  prompt += `- Field type: ${fieldType}\n`
  prompt += `- Tone: ${tone}\n`
  prompt += `- Length: ${summaryLength}\n\n`
  
  const lengthGuidelines = {
    brief: 'Create a very brief summary (1 sentence)',
    short: 'Create a short summary (2-3 sentences)',
    medium: 'Create a concise summary (1 paragraph)',
    detailed: 'Create a detailed summary (2-3 paragraphs with key points)'
  }
  
  prompt += lengthGuidelines[summaryLength as keyof typeof lengthGuidelines] || lengthGuidelines.medium
  prompt += `\n\nPreserve the most important information, key points, and actionable items while making the content more concise.`
  
  return prompt
}

function getMaxTokensForSummary(length: string): number {
  const tokenLimits = {
    brief: 50,
    short: 150,
    medium: 300,
    detailed: 600
  }
  return tokenLimits[length as keyof typeof tokenLimits] || 300
}
