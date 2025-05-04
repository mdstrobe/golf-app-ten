export const runtime = 'edge';

export async function POST(req: Request) {
  const { question, allRounds } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ answer: 'Gemini API key not set.' }), { status: 500 });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text:
                    `You are a golf performance AI assistant. Here is the user's golf round data as JSON: ${JSON.stringify(allRounds)}.\n\nUser question: ${question}\n\nGive a concise, actionable answer based on the data.`
                }
              ]
            }
          ]
        })
      }
    );
    const geminiData = await geminiRes.json();
    const answer =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      geminiData.candidates?.[0]?.content?.parts?.[0] ||
      'No answer from AI.';
    return new Response(JSON.stringify({ answer }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ answer: 'Error contacting Gemini API.' }), { status: 500 });
  }
} 