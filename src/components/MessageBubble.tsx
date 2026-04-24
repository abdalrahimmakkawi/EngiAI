import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '../lib/utils';

// Simple Markdown-like bold
const renderBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Inline LaTeX: $...$
const renderLatexInline = (text: string) => {
  const parts = text.split(/(\$[^$\n]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$') && !part.includes('\n')) {
      return <code key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-sm">{part.slice(1, -1)}</code>;
    }
    return renderBold(part);
  });
};

// Block LaTeX: $$...$$
const renderMarkdown = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Block math: $$...$$
    if (line.startsWith('$$')) {
      let mathLines = [line.slice(2)];
      i++;
      while (i < lines.length && !lines[i].endsWith('$$')) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        mathLines.push(lines[i].slice(0, -2));
        i++;
      }
      const mathText = mathLines.join('\n');
      result.push(
        <div key={i} className="my-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <code className="text-cyan-300 font-mono text-sm whitespace-pre-wrap">{mathText}</code>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith('###')) {
      result.push(<h3 key={i} className="text-lg font-semibold text-white mt-4 mb-2">{renderLatexInline(line.slice(4).trim())}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('##')) {
      result.push(<h2 key={i} className="text-xl font-semibold text-white mt-4 mb-2">{renderLatexInline(line.slice(3).trim())}</h2>);
      i++;
      continue;
    }
    if (line.startsWith('#')) {
      result.push(<h1 key={i} className="text-2xl font-bold text-white mt-4 mb-2">{renderLatexInline(line.slice(2).trim())}</h1>);
      i++;
      continue;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(<li key={i} className="ml-4 text-gray-300">{renderLatexInline(lines[i].trim().slice(2))}</li>);
        i++;
      }
      result.push(<ul key={i} className="list-disc list-inside my-2 space-y-1">{listItems}</ul>);
      continue;
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s/);
    if (numberedMatch) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(<li key={i} className="ml-4 text-gray-300">{renderLatexInline(lines[i].replace(/^\d+\.\s/, ''))}</li>);
        i++;
      }
      result.push(<ol key={i} className="list-decimal list-inside my-2 space-y-1">{listItems}</ol>);
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      result.push(<p key={i} className="text-gray-300 mb-2">{renderLatexInline(line)}</p>);
    } else {
      result.push(<br key={i} />);
    }
    i++;
  }

  return result;
};

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, isStreaming = false }) => {
  const isAI = role === 'assistant';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content, isStreaming]);

  return (
    <div className={cn('flex gap-3 px-4 py-3', isAI ? 'bg-white/2.5' : 'bg-transparent')}>
      <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', isAI ? 'bg-gradient-to-br from-cyan-500 to-purple-500' : 'bg-gray-600')}>
        {isAI ? <Bot size={16} className="text-white" /> : <User size={16} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium mb-1">{isAI ? 'EngiAI' : 'You'}</div>
        <div className="text-gray-300 whitespace-pre-wrap">
          {isAI ? renderMarkdown(content) : content}
          {isStreaming && <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1" />}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
