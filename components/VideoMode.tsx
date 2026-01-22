import React, { useState, useEffect } from 'react';
import { generateVideo } from '../services/gemini';
import { VideoGenerationState } from '../types';

const VideoMode: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoState, setVideoState] = useState<VideoGenerationState>({
    isGenerating: false,
    progressMessage: '',
  });
  const [hasPaidKey, setHasPaidKey] = useState<boolean>(false);
  const [keyCheckLoading, setKeyCheckLoading] = useState(true);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasPaidKey(hasKey);
      } else {
        // Fallback if not running in a specific environment that injects this
        setHasPaidKey(true); 
      }
    } catch (e) {
      console.error("Error checking API key", e);
    } finally {
      setKeyCheckLoading(false);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        // Assuming success after closing dialog as per instructions to avoid race conditions
        setHasPaidKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setVideoState({
      isGenerating: true,
      progressMessage: 'Initializing Veo model...',
      error: undefined,
      videoUri: undefined
    });

    try {
      setVideoState(prev => ({ ...prev, progressMessage: 'Dreaming up your video (this may take a minute)...' }));
      
      const uri = await generateVideo(prompt, aspectRatio);
      
      const apiKey = process.env.API_KEY;
      const finalUri = `${uri}&key=${apiKey}`;

      setVideoState({
        isGenerating: false,
        progressMessage: 'Done!',
        videoUri: finalUri
      });

    } catch (err: any) {
      // Check for specific "Requested entity was not found" error to reset key
      if (err.message && err.message.includes("Requested entity was not found")) {
          setHasPaidKey(false);
          setVideoState({
              isGenerating: false,
              progressMessage: '',
              error: "API Key invalid or project not found. Please select a key again."
          });
      } else {
          setVideoState({
            isGenerating: false,
            progressMessage: '',
            error: err.message || "Failed to generate video."
          });
      }
    }
  };

  if (keyCheckLoading) {
      return <div className="h-full flex items-center justify-center text-gray-400">Loading Studio...</div>;
  }

  if (!hasPaidKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-950">
        <div className="max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl mx-auto mb-6 flex items-center justify-center text-3xl">🎥</div>
          <h2 className="text-2xl font-bold text-white mb-4">Veo Video Studio</h2>
          <p className="text-gray-400 mb-6">
            To generate high-quality videos with Veo, you need to select a paid API key from a Google Cloud Project with billing enabled.
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-white text-black font-bold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors mb-4"
          >
            Select Paid API Key
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            Read about billing requirements
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 bg-gray-950 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Veo Video Generator
            </h2>
            <p className="text-gray-400 mt-2">Create cinematic 1080p videos from text prompts.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
            <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A cyberpunk city with neon rain..."
                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all h-32 resize-none mb-6"
            />
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 bg-gray-950 p-2 rounded-lg border border-gray-800">
                    <span className="text-sm text-gray-400 px-2">Aspect Ratio:</span>
                    <button 
                        onClick={() => setAspectRatio('16:9')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${aspectRatio === '16:9' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        16:9
                    </button>
                    <button 
                        onClick={() => setAspectRatio('9:16')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${aspectRatio === '9:16' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        9:16
                    </button>
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={videoState.isGenerating || !prompt.trim()}
                    className={`
                        px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5
                        ${videoState.isGenerating || !prompt.trim()
                            ? 'bg-gray-700 cursor-not-allowed opacity-50' 
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-900/20'}
                    `}
                >
                    {videoState.isGenerating ? 'Generating...' : 'Generate Video'}
                </button>
            </div>
            
            {/* Result Area */}
            {videoState.progressMessage && (
                <div className="mt-8 bg-black/30 rounded-xl p-6 border border-gray-800 text-center animate-fade-in">
                    {!videoState.videoUri && !videoState.error && (
                         <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-300 animate-pulse">{videoState.progressMessage}</p>
                         </div>
                    )}

                    {videoState.error && (
                        <div className="text-red-400 bg-red-900/20 px-4 py-2 rounded-lg inline-block">
                            Error: {videoState.error}
                        </div>
                    )}

                    {videoState.videoUri && (
                        <div className="space-y-4">
                            <p className="text-green-400 font-medium">✨ Video Generated Successfully!</p>
                            <div className="relative rounded-lg overflow-hidden shadow-2xl border border-gray-700 max-w-2xl mx-auto">
                                <video 
                                    src={videoState.videoUri} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    className="w-full h-auto"
                                />
                            </div>
                            <a 
                                href={videoState.videoUri} 
                                download="veo-generation.mp4"
                                className="inline-block text-sm text-purple-400 hover:text-purple-300 hover:underline mt-2"
                            >
                                Download Video
                            </a>
                        </div>
                    )}
                </div>
            )}

        </div>

        <div className="text-center text-xs text-gray-600 pb-4">
            Veo 3.1 Preview • Generated videos are for research and creative use.
        </div>
      </div>
    </div>
  );
};

export default VideoMode;