import React, { useEffect, useRef, useState } from 'react';
import { getGeminiClient } from '../services/gemini';
import { LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToBytes, blobToBase64 } from '../utils/audioUtils';

const FRAME_RATE = 5;
const JPEG_QUALITY = 0.5;

const LiveMode: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [micPermission, setMicPermission] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const stopSession = () => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
            try {
                session.close();
            } catch (e) {
                console.warn("Error closing session", e);
            }
        });
    }
    sessionPromiseRef.current = null;

    if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
    }

    // Stop Audio
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    setIsActive(false);
    setStatus('disconnected');
  };

  const startSession = async () => {
    try {
        setStatus('connecting');
        setError(null);
        
        // 1. Setup Audio Contexts
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;

        // 2. Setup Input Stream (Mic)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setMicPermission(true);
        
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
        }

        // 3. Connect to Gemini Live
        const ai = getGeminiClient();
        const model = 'gemini-2.5-flash-native-audio-preview-12-2025';

        const sessionPromise = ai.live.connect({
            model,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                },
                systemInstruction: 'You are a friendly, helpful, and enthusiastic AI assistant. You can see what I am showing you.',
            },
            callbacks: {
                onopen: () => {
                    console.log('Live Session Opened');
                    setStatus('connected');
                    setIsActive(true);

                    // Setup Mic Processor
                    if (!inputAudioContextRef.current) return;
                    
                    const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);
                        sessionPromise.then(session => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current.destination);

                    // Setup Video Polling
                    startVideoStreaming(sessionPromise);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Audio Output
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current) {
                         const ctx = outputAudioContextRef.current;
                         nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                         
                         const audioBuffer = await decodeAudioData(
                             base64ToBytes(base64Audio),
                             ctx,
                             24000,
                             1
                         );

                         const source = ctx.createBufferSource();
                         source.buffer = audioBuffer;
                         source.connect(ctx.destination);
                         
                         source.addEventListener('ended', () => {
                             sourcesRef.current.delete(source);
                         });

                         source.start(nextStartTimeRef.current);
                         nextStartTimeRef.current += audioBuffer.duration;
                         sourcesRef.current.add(source);
                    }

                    // Handle Interruption
                    if (message.serverContent?.interrupted) {
                        sourcesRef.current.forEach(src => src.stop());
                        sourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                    }
                },
                onclose: () => {
                    console.log('Live Session Closed');
                    stopSession();
                },
                onerror: (e) => {
                    console.error('Live Session Error', e);
                    setError("Connection error.");
                    stopSession();
                }
            }
        });
        
        sessionPromiseRef.current = sessionPromise;

    } catch (err) {
        console.error("Failed to start session", err);
        setError("Could not access camera/microphone or connect to API.");
        setStatus('disconnected');
    }
  };

  const startVideoStreaming = (sessionPromise: Promise<any>) => {
      if (!videoRef.current || !canvasRef.current) return;

      const videoEl = videoRef.current;
      const canvasEl = canvasRef.current;
      const ctx = canvasEl.getContext('2d');
      
      if (!ctx) return;

      frameIntervalRef.current = window.setInterval(() => {
          if (videoEl.videoWidth === 0) return;

          canvasEl.width = videoEl.videoWidth;
          canvasEl.height = videoEl.videoHeight;
          ctx.drawImage(videoEl, 0, 0);

          canvasEl.toBlob(async (blob) => {
              if (blob) {
                  const base64Data = await blobToBase64(blob);
                  sessionPromise.then(session => {
                      session.sendRealtimeInput({
                          media: { data: base64Data, mimeType: 'image/jpeg' }
                      });
                  }).catch(() => {
                      // Session likely closed
                      clearInterval(frameIntervalRef.current!);
                  });
              }
          }, 'image/jpeg', JPEG_QUALITY);

      }, 1000 / FRAME_RATE);
  };

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          stopSession();
      };
  }, []);

  return (
    <div className="h-full flex flex-col p-4 md:p-8 bg-gray-950">
      <div className="flex-1 flex flex-col items-center justify-center relative">
         
         {/* Video Feed */}
         <div className="relative w-full max-w-4xl aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
            <video 
                ref={videoRef} 
                muted 
                playsInline 
                autoPlay 
                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-30'}`}
            />
            
            {/* Overlay UI when disconnected */}
            {!isActive && status !== 'connecting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="bg-gray-900/80 backdrop-blur-md p-8 rounded-2xl border border-gray-700 text-center max-w-md">
                        <h2 className="text-2xl font-bold mb-4 text-white">Live Multimodal Interaction</h2>
                        <p className="text-gray-400 mb-8">
                            Experience real-time voice and video conversations with Gemini 2.5. 
                            The model sees what you see and hears what you say.
                        </p>
                        <button 
                            onClick={startSession}
                            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg shadow-red-600/30 flex items-center gap-2"
                        >
                            <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                            Start Live Session
                        </button>
                    </div>
                </div>
            )}

            {/* Connecting State */}
            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                     <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <span className="text-white font-medium">Connecting to Gemini Live...</span>
                     </div>
                </div>
            )}

            {/* Active Controls */}
            {isActive && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
                     <button 
                        onClick={stopSession}
                        className="bg-gray-800/80 hover:bg-red-900/80 hover:text-red-200 text-white backdrop-blur-md px-6 py-3 rounded-full font-medium border border-white/10 transition-colors"
                     >
                        End Session
                     </button>
                </div>
            )}
            
            {/* Status Indicator */}
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-mono text-gray-300 uppercase">
                    {status === 'connected' ? 'LIVE' : status}
                </span>
            </div>
         </div>

         {/* Error Message */}
         {error && (
             <div className="mt-4 bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg">
                 {error}
             </div>
         )}
         
         <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default LiveMode;