import React from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onToggle: () => void;
  sidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggle, sidebarOpen }) => {

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-[#0a0a0f] border-b border-white/5 z-50 shrink-0 sticky top-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="w-8 h-8 rounded-lg eng-gradient flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-accent/20">
          E
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-none">
            Engi<span className="text-[#00d4ff]">AI</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-[#64748b] font-semibold mt-1">
            University Engineering Assistant
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">
            Powered by NVIDIA NIM
          </span>
        </div>
      </div>
    </header>
  );
};
