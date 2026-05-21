import OpenAI from "openai";

/**
 * Downloads a Telegram voice/audio file and transcribes it with Whisper.
 * Audio is NOT saved anywhere per CLAUDE.md — only the transcription text is kept.
 */
export async function transcribeVoice(fileId: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;

  // Get file path from Telegram
  const fileRes = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
  );
  const fileData = await fileRes.json();

  if (!fileData.ok || !fileData.result?.file_path) {
    throw new Error(`Failed to get file from Telegram: ${JSON.stringify(fileData)}`);
  }

  // Download the audio file
  const audioRes = await fetch(
    `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`,
  );
  const audioBuffer = await audioRes.arrayBuffer();

  // Transcribe with Whisper — Hebrew language
  const openai = new OpenAI();
  const file = new File([audioBuffer], "voice.ogg", { type: "audio/ogg" });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "he",
  });

  return transcription.text;
}
