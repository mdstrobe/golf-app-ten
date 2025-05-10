import { OpenAI } from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  const { question, allRounds } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ answer: 'OpenAI API key not set.' }), { status: 500 });
  }

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: "You are a golf performance AI assistant. Your task is to provide concise, actionable insights based on golf round data."
        },
        {
          role: "user",
          content: `Here is the user's golf round data as JSON: ${JSON.stringify(allRounds)}.\n\nUser question: ${question}\n\nGive a concise, actionable answer based on the data.`
        }
      ],
      max_tokens: 500
    });

    const answer = result.choices[0].message.content || 'No answer from AI.';
    return new Response(JSON.stringify({ answer }), { status: 200 });
  } catch (error: unknown) {
    console.error('OpenAI API error:', error);
    return new Response(JSON.stringify({ answer: 'Error contacting OpenAI API.' }), { status: 500 });
  }
} 