
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
      currentText = '',
      fieldType = 'general',
      context = '',
      suggestionType = 'alternatives'
    } = await request.json()

    const messages = [
      {
        role: "system" as const,
        content: `You are an AI writing assistant for the "Rise as One Yearly Program". Provide helpful writing suggestions in JSON format.`
      },
      {
        role: "user" as const,
        content: buildSuggestionsPrompt({
          currentText,
          fieldType,
          context,
          suggestionType
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
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.6
      })
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`)
    }

    const aiResponse = await response.json()
    let content = aiResponse.choices[0].message.content
    
    // Remove markdown code blocks if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/\s*```/g, '')
    }
    
    const suggestions = JSON.parse(content)

    return NextResponse.json({
      success: true,
      suggestions,
      generatedAt: new Date()
    })

  } catch (error) {
    console.error('AI writing suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildSuggestionsPrompt(params: any): string {
  const { currentText, fieldType, context, suggestionType } = params
  
  let prompt = `Generate writing suggestions in JSON format for a ${fieldType} field.\n\n`
  
  if (currentText) {
    prompt += `Current text: "${currentText}"\n\n`
  }
  
  if (context) {
    prompt += `Context: ${context}\n\n`
  }
  
  prompt += `Suggestion type: ${suggestionType}\n\n`
  
  const suggestionFormats = {
    alternatives: `Provide JSON with:
- "alternatives": array of 3-5 alternative phrasings/versions
- "improvements": array of specific improvement suggestions
- "tone_variations": array of different tone options`,
    
    templates: `Provide JSON with:
- "templates": array of ready-to-use templates for this field type
- "placeholders": array of placeholder values that can be customized
- "examples": array of example completions`,
    
    enhancements: `Provide JSON with:
- "word_choices": better word alternatives
- "structure_improvements": suggestions for better organization
- "engagement_tips": ways to make the text more engaging`,
    
    quick_fixes: `Provide JSON with:
- "grammar_fixes": grammar and spelling corrections
- "clarity_improvements": ways to make text clearer
- "conciseness_tips": ways to make text more concise`
  }
  
  prompt += suggestionFormats[suggestionType as keyof typeof suggestionFormats] || suggestionFormats.alternatives
  prompt += `\n\nEnsure all suggestions are appropriate for the "Rise as One Yearly Program" context and maintain professionalism.`
  
  return prompt
}
