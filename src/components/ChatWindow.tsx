import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { Message } from '../lib/nvidia';
import { Cpu, Terminal, Zap, Layers, Beaker } from 'lucide-react';
import { motion } from 'motion/react';

interface ChatWindowProps {
  messages: Message[];
  isStreaming?: boolean;
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTIONS = [
  { id: 1, label: "Solve a circuit with 3 resistors in parallel", icon: <Zap size={14} /> },
  { id: 2, label: "Derive Bernoulli's equation", icon: <Layers size={14} /> },
  { id: 3, label: "Explain PID controllers", icon: <Terminal size={14} /> },
  { id: 4, label: "Calculate beam deflection", icon: <Beaker size={14} /> },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isStreaming, onSelectPrompt }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 eng-gradient rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-cyan-500/20"
        >
          <Cpu size={40} className="text-black" />
        </motion.div>
        
        <h2 className="text-2xl font-bold mb-2 text-white">What can I help you solve today?</h2>
        <p className="text-gray-400 mb-8 max-w-sm font-medium">
          Ask any engineering question
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full px-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectPrompt(s.label)}
              className="flex items-center gap-3 p-4 bg-[#1a1a2e] hover:bg-[#1a1a2e]/80 border border-white/10 rounded-2xl text-left transition-all hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#12121f] flex items-center justify-center text-gray-400 group-hover:text-cyan-400 transition-colors border border-white/10 shadow-inner">
                {s.icon}
              </div>
              <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-4 scroll-smooth"
      style={{ background: '#0a0a0f' }}
    >
      <div className="max-w-4xl mx-auto pb-4">
        {messages.map((m, i) => (
          <MessageBubble 
            key={i} 
            role={m.role as 'user' | 'assistant'} 
            content={m.content} 
            isStreaming={isStreaming && i === messages.length - 1 && m.role === 'assistant'}
          />
        ))}
      </div>
    </div>
  );
};