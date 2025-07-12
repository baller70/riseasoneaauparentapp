
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
      partialText, 
      fieldType = 'general',
      tone = 'professional',
      context = '',
      maxLength = 'medium'
    } = await request.json()

    if (!partialText?.trim()) {
      return NextResponse.json({ error: 'Partial text is required for completion' }, { status: 400 })
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are an AI writing assistant for the "Rise as One Yearly Program". Complete partial text in a natural, coherent way that maintains the original style and intent.`
      },
      {
        role: "user" as const,
        content: buildCompletionPrompt({
          partialText,
          fieldType,
          tone,
          context,
          maxLength
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
        max_tokens: getMaxTokensForLength(maxLength),
        temperature: 0.5
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
    console.error('AI writing complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildCompletionPrompt(params: any): string {
  const { partialText, fieldType, tone, context, maxLength } = params
  
  let prompt = `Complete the following partial text in a natural, coherent way:\n\n"${partialText}"\n\n`
  
  if (context) {
    prompt += `Context: ${context}\n\n`
  }
  
  prompt += `Requirements:\n`
  prompt += `- Field type: ${fieldType}\n`
  prompt += `- Tone: ${tone}\n`
  prompt += `- Maximum length: ${maxLength}\n`
  prompt += `- Maintain the original style and intent\n`
  prompt += `- Ensure the completion flows naturally from the existing text\n\n`
  
  const lengthGuidelines = {
    short: 'Complete with just a few words or one sentence',
    medium: 'Complete with 1-2 additional sentences',
    long: 'Complete with multiple sentences as needed'
  }
  
  prompt += lengthGuidelines[maxLength as keyof typeof lengthGuidelines] || lengthGuidelines.medium
  prompt += `\n\nProvide only the completion text without repeating the original partial text.`
  
  return prompt
}

function getMaxTokensForLength(length: string): number {
  const tokenLimits = {
    short: 100,
    medium: 300,
    long: 600
  }
  return tokenLimits[length as keyof typeof tokenLimits] || 300
}
