import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { recentRounds, previousRounds, allRounds } = await request.json();

    // Use allRounds if provided, otherwise fallback to recentRounds + previousRounds
    let rounds = allRounds || [...recentRounds, ...previousRounds];
    if (!Array.isArray(rounds) || rounds.length === 0) {
      return NextResponse.json({ error: 'No rounds provided' }, { status: 400 });
    }

    // Sort rounds by date (most recent first)
    rounds.sort((a: any, b: any) => new Date(b.date_played).getTime() - new Date(a.date_played).getTime());

    // Get the most recent 5 rounds
    const recent5 = rounds.slice(0, 5);
    // Get the next 5 most recent rounds
    const previous5 = rounds.slice(5, 10);

    // Calculate averages for recent rounds
    const recentAvgScore = recent5.reduce((sum: number, round: any) => sum + (round.total_score || 0), 0) / (recent5.length || 1);
    const recentAvgPutts = recent5.reduce((sum: number, round: any) => sum + (round.total_putts || 0), 0) / (recent5.length || 1);
    const recentTotalGir = recent5.reduce((sum: number, round: any) => sum + (round.total_gir || 0), 0);
    const recentGirPercentage = (recentTotalGir / (recent5.length * 18)) * 100;

    // Calculate averages for previous rounds
    const previousAvgScore = previous5.length > 0 ? previous5.reduce((sum: number, round: any) => sum + (round.total_score || 0), 0) / previous5.length : 0;
    const previousAvgPutts = previous5.length > 0 ? previous5.reduce((sum: number, round: any) => sum + (round.total_putts || 0), 0) / previous5.length : 0;
    const previousTotalGir = previous5.length > 0 ? previous5.reduce((sum: number, round: any) => sum + (round.total_gir || 0), 0) : 0;
    const previousGirPercentage = previous5.length > 0 ? (previousTotalGir / (previous5.length * 18)) * 100 : 0;

    // Calculate hole-by-hole averages for recent5
    const holeAverages = {
      par3: { score: 0, count: 0 },
      par4: { score: 0, count: 0 },
      par5: { score: 0, count: 0 }
    };
    recent5.forEach((round: any) => {
      if (round.front_nine_scores && round.back_nine_scores) {
        const allScores = [...round.front_nine_scores, ...round.back_nine_scores];
        allScores.forEach((score, index) => {
          const holeNumber = index + 1;
          // Assuming standard course layout: par 3s on holes 3, 6, 12, 15; par 5s on holes 5, 9, 14, 18; rest are par 4s
          if ([3, 6, 12, 15].includes(holeNumber)) {
            holeAverages.par3.score += score;
            holeAverages.par3.count++;
          } else if ([5, 9, 14, 18].includes(holeNumber)) {
            holeAverages.par5.score += score;
            holeAverages.par5.count++;
          } else {
            holeAverages.par4.score += score;
            holeAverages.par4.count++;
          }
        });
      }
    });
    const par3Avg = holeAverages.par3.count > 0 ? holeAverages.par3.score / holeAverages.par3.count : 0;
    const par4Avg = holeAverages.par4.count > 0 ? holeAverages.par4.score / holeAverages.par4.count : 0;
    const par5Avg = holeAverages.par5.count > 0 ? holeAverages.par5.score / holeAverages.par5.count : 0;

    // Determine score trend
    let scoreTrend = '';
    if (recentAvgScore < previousAvgScore) {
      scoreTrend = `Improvement: average score decreased from ${previousAvgScore.toFixed(1)} to ${recentAvgScore.toFixed(1)}`;
    } else if (recentAvgScore > previousAvgScore) {
      scoreTrend = `Decline: average score increased from ${previousAvgScore.toFixed(1)} to ${recentAvgScore.toFixed(1)}`;
    } else {
      scoreTrend = `No change in average score (${recentAvgScore.toFixed(1)})`;
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare data for Gemini
    const prompt = `Analyze this golf performance data and provide focused insights:
    A lower score is better in golf.
    Recent 5 rounds average score: ${recentAvgScore.toFixed(1)}
    Previous 5 rounds average score: ${previousAvgScore.toFixed(1)}
    Score trend: ${scoreTrend}
    Recent average putts per round: ${recentAvgPutts.toFixed(1)}
    Previous average putts per round: ${previousAvgPutts.toFixed(1)}
    Recent GIR percentage: ${recentGirPercentage.toFixed(1)}%
    Previous GIR percentage: ${previousGirPercentage.toFixed(1)}%
    
    Hole-by-hole performance (recent 5 rounds):
    Par 3 average: ${par3Avg.toFixed(1)}
    Par 4 average: ${par4Avg.toFixed(1)}
    Par 5 average: ${par5Avg.toFixed(1)}
    
    Please provide:
    1. One major insight about the player's overall game, using the trend direction above
    2. One specific insight about their performance on par 3s, 4s, or 5s
    Keep the response concise and focused on actionable insights.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ analysis: text });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate performance analysis' },
      { status: 500 }
    );
  }
} 