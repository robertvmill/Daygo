import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Get the audio file from the form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Check if API key is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('your_') || apiKey === 'your-api-key-here') {
      return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Transcribe the audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // English language for better accuracy
      response_format: "text", // Just return the text
      temperature: 0, // More deterministic results
    });

    return Response.json({ text: transcription });
  } catch (error) {
    console.error('Speech-to-text error:', error);
    return Response.json({ 
      error: 'Failed to transcribe audio' 
    }, { status: 500 });
  }
} 