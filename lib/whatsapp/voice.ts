import OpenAI from "openai";
import { downloadMedia } from "./api";

export async function transcribeVoice(mediaId: string): Promise<string> {
  const audioBuffer = await downloadMedia(mediaId);

  const openai = new OpenAI();
  const file = new File([new Uint8Array(audioBuffer)], "voice.ogg", {
    type: "audio/ogg; codecs=opus",
  });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "he",
  });

  return transcription.text;
}
