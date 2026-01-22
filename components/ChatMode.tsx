import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { streamChat } from '../services/gemini';
import { blobToBase64 } from '../utils/audioUtils';

const ChatMode: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await blobToBase64(file);
      setSelectedImage(base64);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage || undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    const modelMsgId = (Date.now() + 1).toString();
    const initialModelMsg: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, initialModelMsg]);

    try {
      let accumulatedText = '';
      await streamChat(messages, userMsg.text, userMsg.image, (chunk) => {
        accumulatedText += chunk;
        setMessages(prev => prev.map(m => 
          m.id === modelMsgId 
            ? { ...m, text: accumulatedText } 
            : m
        ));
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => prev.map(m => 
        m.id === modelMsgId 
          ? { ...m, text: "Sorry, I encountered an error. Please try again." } 
          : m
      ));
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.map(m => 
        m.id === modelMsgId 
          ? { ...m, isStreaming: false } 
          : m
      ));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-xl font-medium">Start a conversation</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-lg ${
              msg.role === 'user' 
                ? 'bg-primary-600 text-white rounded-br-none' 
                : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
            }`}>
              {msg.image && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                  <img src={`data:image/jpeg;base64,${msg.image}`} alt="Uploaded content" className="max-h-64 object-cover" />
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
              {msg.isStreaming && (
                <span className="inline-block w-2 h-2 ml-1 bg-white rounded-full animate-pulse"></span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {selectedImage && (
                <div className="flex items-center gap-2 bg-gray-800 w-fit px-3 py-1 rounded-full text-xs text-gray-300">
                    <span>Image attached</span>
                    <button onClick={() => setSelectedImage(null)} className="hover:text-white">✕</button>
                </div>
            )}
            <div className="flex items-end gap-2 bg-gray-800 p-2 rounded-xl border border-gray-700 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    title="Add image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageSelect}
                />
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Gemini anything..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none py-3 max-h-32"
                    rows={1}
                />
                <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && !selectedImage) || isLoading}
                    className="p-3 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMode;