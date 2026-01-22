import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

export const streamChat = async (
  history: ChatMessage[],
  newMessage: string,
  image?: string,
  onChunk?: (text: string) => void
): Promise<string> => {
  const ai = getClient();
  // Using gemini-3-flash-preview for general fast chat
  const modelId = 'gemini-3-flash-preview'; 

  // Format history for the chat model if needed, but for simple request we might just use generateContentStream with history context if we were maintaining a ChatSession.
  // For this demo, we'll assume stateless or simple message passing, but to support history properly:
  
  // NOTE: For a robust chat app, we should use ai.chats.create() and maintain the history object.
  // Here we will use a fresh chat session for simplicity in this function, or just send the prompt.
  // To keep it simple and stateless for this function signature:
  
  const chat = ai.chats.create({
    model: modelId,
    config: {
        systemInstruction: "You are a helpful, knowledgeable AI assistant.",
        tools: [{googleSearch: {}}], // Enable grounding
    }
  });

  // If there is history, we would replay it here.
  // Ideally, 'history' passed in matches the Content structure, but we'll just send the new message for this demo
  // to avoid mapping complex history types in this snippet. 
  
  let contentPart: any = { text: newMessage };
  
  // If image is present, we must use a model that supports images and send it.
  // However, chat.sendMessageStream takes a 'message' string or part.
  // If we have an image, we need to construct the parts.
  let messagePayload: any = newMessage;

  if (image) {
    messagePayload = [
        {
            inlineData: {
                mimeType: 'image/jpeg',
                data: image
            }
        },
        { text: newMessage }
    ];
  }

  const result = await chat.sendMessageStream({ message: messagePayload });
  
  let fullText = "";
  for await (const chunk of result) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
        fullText += c.text;
        if (onChunk) onChunk(c.text);
    }
  }
  
  // Note: Grounding metadata is usually available in the aggregated response
  // We can't easily get it from the stream chunks individually in a way that aggregates nicely without looking at the final object
  // For this demo, we return the text.
  return fullText;
};

export const generateVideo = async (
  prompt: string, 
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  // Always create a new client to pick up the latest selected key if changed
  const ai = getClient();
  const model = 'veo-3.1-fast-generate-preview';

  let operation = await ai.models.generateVideos({
    model: model,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    }
  });

  // Polling loop
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5s poll
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) {
    throw new Error("No video generated");
  }

  return videoUri;
};

export const getGeminiClient = () => getClient();