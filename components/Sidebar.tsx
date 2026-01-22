import React from 'react';
import { AppMode } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode }) => {
  const navItems = [
    { mode: AppMode.CHAT, label: 'Chat & Vision', icon: '💬' },
    { mode: AppMode.LIVE, label: 'Live (Real-time)', icon: '⚡' },
    { mode: AppMode.VIDEO, label: 'Veo Studio', icon: '🎥' },
  ];

  return (
    <div className="w-20 md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col items-center md:items-stretch py-6 transition-all duration-300">
      <div className="mb-8 px-4 flex items-center justify-center md:justify-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg">
          G
        </div>
        <span className="hidden md:block font-bold text-xl tracking-tight text-white">Omniverse</span>
      </div>

      <nav className="flex-1 flex flex-col gap-2 px-2">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => setMode(item.mode)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              ${currentMode === item.mode 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="hidden md:block font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <div className="hidden md:block text-xs text-gray-500">
          Powered by Gemini 2.5 & 3.0
        </div>
      </div>
    </div>
  );
};

export default Sidebar;