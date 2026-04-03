import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 500 })
  }

  const { yesterdayLunch, yesterdayDinner, yesterdaySnacks, todayLunch, todayDinner } = await req.json()

  const mealSummary = [
    yesterdayLunch || yesterdayDinner || yesterdaySnacks
      ? `Yesterday — Lunch: ${yesterdayLunch || 'not logged'}, Dinner: ${yesterdayDinner || 'not logged'}${yesterdaySnacks ? `, Snacks: ${yesterdaySnacks}` : ''}`
      : 'Yesterday: no meals logged',
    todayLunch || todayDinner
      ? `Today's plan — Lunch: ${todayLunch || 'not set'}, Dinner: ${todayDinner || 'not set'}`
      : 'Today: no meals planned yet',
  ].join('\n')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: `You are an elite Hyrox performance coach and sports nutritionist. Your athlete is:
- 180 lbs male, training hard every day
- Competing at Hyrox Ottawa qualifier on May 15, 2026 (about 6 weeks out)
- Targeting Hyrox World Championships in Stockholm, June 2026
- Goal: peak shape and performance for race day

Give direct, specific, actionable nutritional feedback. Focus on:
1. Recovery and muscle repair (protein timing and quality)
2. Glycogen replenishment for daily training
3. Anti-inflammatory foods for hard training blocks
4. Any gaps or improvements vs their Hyrox performance goals

Be encouraging but honest. Keep it concise — 3-4 sentences max. Speak like a coach, not a textbook.`,
    messages: [
      {
        role: 'user',
        content: `Here are my meals:\n${mealSummary}\n\nGive me your honest coach feedback on my nutrition.`,
      },
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
