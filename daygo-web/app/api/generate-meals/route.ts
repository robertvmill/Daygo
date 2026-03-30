import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a nutrition coach helping an athlete eat healthy and perform well. Generate simple, practical, satisfying meal suggestions for lunch and dinner. Focus on whole foods, quality protein, and vegetables. Keep it realistic and appetizing. Return valid JSON only.',
      },
      {
        role: 'user',
        content:
          'Suggest a healthy lunch and dinner for today. Give each meal a short appetizing name (3–6 words) and one brief note (ingredients or a quick prep tip, max 12 words). Return as JSON: { "lunch": { "title": "...", "notes": "..." }, "dinner": { "title": "...", "notes": "..." } }',
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.85,
  })

  const result = JSON.parse(completion.choices[0].message.content ?? '{}')
  return NextResponse.json(result)
}
