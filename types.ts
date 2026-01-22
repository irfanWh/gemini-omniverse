import { Modality } from "@google/genai";

export enum AppMode {
  CHAT = 'CHAT',
  LIVE = 'LIVE',
  VIDEO = 'VIDEO'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  timestamp: number;
  isStreaming?: boolean;
  groundingUrls?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface VideoGenerationState {
  isGenerating: boolean;
  progressMessage: string;
  videoUri?: string;
  error?: string;
}

// Augment window for the AI Studio key selection
declare global {
  // Define AIStudio interface to match the existing type expected by the environment.
  // We augment the interface to ensure it has the methods we need.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // aistudio property is already declared on Window with type AIStudio in the environment.
    // We do not redeclare it to avoid "Subsequent property declarations must have the same type" error.
    // The augmented AIStudio interface above ensures the methods are typed correctly.
    
    webkitAudioContext: typeof AudioContext;
  }
}
