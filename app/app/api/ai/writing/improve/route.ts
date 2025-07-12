
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
      improvementType = 'overall',
      targetTone = 'professional',
      fieldType = 'general',
      context = ''
    } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required for improvement' }, { status: 400 })
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are an AI writing assistant for the "Rise as One Yearly Program". Improve existing text while maintaining the original intent and key information. Focus on clarity, professionalism, and effectiveness.`
      },
      {
        role: "user" as const,
        content: buildImprovementPrompt({
          text,
          improvementType,
          targetTone,
          fieldType,
          context
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
        max_tokens: 800,
        temperature: 0.4
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
    console.error('AI writing improve error:', error)
    return NextResponse.json(
      { error: 'Failed to improve content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildImprovementPrompt(params: any): string {
  const { text, improvementType, targetTone, fieldType, context } = params
  
  let prompt = `Improve the following text:\n\n"${text}"\n\n`
  
  if (context) {
    prompt += `Context: ${context}\n\n`
  }
  
  prompt += `Improvement requirements:\n`
  prompt += `- Field type: ${fieldType}\n`
  prompt += `- Target tone: ${targetTone}\n`
  prompt += `- Improvement focus: ${improvementType}\n\n`
  
  const improvementInstructions = {
    clarity: 'Focus on making the text clearer and easier to understand',
    grammar: 'Fix grammar, spelling, and punctuation errors',
    tone: `Adjust the tone to be more ${targetTone}`,
    conciseness: 'Make the text more concise while preserving key information',
    engagement: 'Make the text more engaging and compelling',
    professionalism: 'Enhance the professional quality of the text',
    overall: 'Improve clarity, grammar, tone, and overall effectiveness'
  }
  
  prompt += improvementInstructions[improvementType as keyof typeof improvementInstructions] || improvementInstructions.overall
  prompt += `\n\nProvide only the improved version of the text without additional commentary.`
  
  return prompt
}
