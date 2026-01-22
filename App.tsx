import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatMode from './components/ChatMode';
import LiveMode from './components/LiveMode';
import VideoMode from './components/VideoMode';
import { AppMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);

  return (
    <div className="flex h-screen w-full bg-gray-950 text-white overflow-hidden font-sans">
      <Sidebar currentMode={mode} setMode={setMode} />
      <main className="flex-1 h-full overflow-hidden relative">
        {mode === AppMode.CHAT && <ChatMode />}
        {mode === AppMode.LIVE && <LiveMode />}
        {mode === AppMode.VIDEO && <VideoMode />}
      </main>
    </div>
  );
};

export default App;