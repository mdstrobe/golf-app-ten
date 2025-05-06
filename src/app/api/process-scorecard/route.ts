import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

interface ScorecardData {
  user_id: string;
  date_played: string;
  submission_type: string;
  front_nine_scores: number[];
  back_nine_scores: number[];
  front_nine_putts: number[];
  back_nine_putts: number[];
  front_nine_fairways: boolean[];
  back_nine_fairways: boolean[];
  front_nine_gir: boolean[];
  back_nine_gir: boolean[];
  total_score: number;
  total_putts: number;
  total_fairways_hit: number;
  total_gir: number;
  course_id: string;
  tee_box_id: string;
  [key: string]: string | number | number[] | boolean[] | undefined;
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  console.log('\n=== Starting Scorecard Processing ===');
  
  try {
    console.log('Parsing request body...');
    const { image } = await request.json();
    console.log('Image data received:', {
      dataLength: image?.length || 0,
      isBase64: image?.startsWith('data:image/'),
      prefix: image?.substring(0, 50) + '...'
    });

    // Validate image data
    if (!image || !image.startsWith('data:image/')) {
      console.error('Invalid image data received');
      throw new Error('Invalid image data');
    }

    // Initialize the model
    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log('Model initialized successfully');

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.log('Request timed out after 60 seconds');
        reject(new Error('Request timed out - the image may be too large or complex. Try taking the photo from further away or in better lighting.'));
      }, 60000); // Increased to 60 seconds
    });

    console.log('Sending request to Gemini AI...');
    // Process the image with timeout
    const result = await Promise.race([
      model.generateContent([
        `You are a specialized golf scorecard analyzer. I will show you a golf scorecard image. Your task is to carefully extract the following information with high precision:

1. Course Name:
   - Look for the course logo or name at the top of the scorecard

2. Date:
   - Look for a date field, typically at the top
   - If not explicitly shown, return null

3. For each hole (1-18), carefully analyze:
   - Score: Find the HANDWRITTEN numbers in the player's score row
   - Putts: Find the HANDWRITTEN numbers in the "Putts" row
   - Fairway Hit: Look for checkmarks (✓) or marks in the "F" row
   - Green in Regulation: Calculate using (Score - Putts) <= 2

Return the data in this exact JSON format:
{
"user_id": "", 
"date_played": null,
"submission_type": "scanned",
"front_nine_scores": [0,0,0,0,0,0,0,0,0],
"back_nine_scores": [0,0,0,0,0,0,0,0,0],
"front_nine_putts": [0,0,0,0,0,0,0,0,0],
"back_nine_putts": [0,0,0,0,0,0,0,0,0],
"front_nine_fairways": [false,false,false,false,false,false,false,false,false],
"back_nine_fairways": [false,false,false,false,false,false,false,false,false],
"front_nine_gir": [false,false,false,false,false,false,false,false,false],
"back_nine_gir": [false,false,false,false,false,false,false,false,false],
"total_score": 0,
"total_putts": 0,
"total_fairways_hit": 0,
"total_gir": 0,
"course_id": "",
"tee_box_id": ""
}`,
        image
      ]),
      timeoutPromise
    ]) as { response: { text: () => string } };

    console.log('Received response from Gemini AI');
    const response = await result.response;
    const text = response.text();
    console.log('Raw response text:', text);
    
    // Extract the first JSON object from the response text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    if (!jsonMatch) {
      console.warn('No JSON object found, using full text');
    }
    // Parse the JSON response
    console.log('Attempting to parse JSON response...');
    let scorecardData;
    try {
      scorecardData = JSON.parse(jsonText);
      console.log('Successfully parsed JSON:', scorecardData);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.log('Invalid JSON text:', jsonText);
      throw new Error('Failed to parse scorecard data');
    }

    // Validate the data structure
    console.log('Validating data structure...');
    if (!validateScorecardData(scorecardData)) {
      console.error('Data validation failed. Received data:', scorecardData);
      throw new Error('Invalid scorecard data structure');
    }
    console.log('Data validation successful');

    console.log('=== Processing completed successfully ===\n');
    return NextResponse.json(scorecardData);
  } catch (error) {
    console.error('\n=== Error processing scorecard ===');
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    console.error('===============================\n');
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process scorecard' },
      { status: 500 }
    );
  }
}

function validateScorecardData(data: ScorecardData): boolean {
  const requiredArrays = [
    'front_nine_scores',
    'back_nine_scores',
    'front_nine_putts',
    'back_nine_putts',
    'front_nine_fairways',
    'back_nine_fairways',
    'front_nine_gir',
    'back_nine_gir'
  ];

  // Check if all required arrays exist and have length 9
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key]) || data[key].length !== 9) {
      return false;
    }
  }

  // Check if all required fields exist
  const requiredFields = [
    'total_score',
    'total_putts',
    'total_fairways_hit',
    'total_gir',
    'course_id',
    'tee_box_id',
    'date_played',
    'submission_type'
  ];

  for (const field of requiredFields) {
    if (data[field] === undefined) {
      return false;
    }
  }

  return true;
} 