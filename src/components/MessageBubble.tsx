import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { FileIcon, FileText, FileCode, ThumbsUp, ThumbsDown } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  attachments?: {
    name: string;
    type: string;
    preview?: string;
  }[];
  topicTags?: string[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  role, 
  content, 
  isStreaming = false,
  attachments = [],
  topicTags = []
}) => {
  const isAI = role === 'assistant';

  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'unhelpful' | null>(null);
  const [showThanks, setShowThanks] = useState(false);

  const handleFeedback = async (wasHelpful: boolean) => {
    if (feedbackGiven || !topicTags.length) return;
    
    setFeedbackGiven(wasHelpful ? 'helpful' : 'unhelpful');
    setShowThanks(true);
    
    // Update topic scores
    // await updateTopicScore(
    //   'user-id-placeholder', // This should come from user context
    //   topicTags,
    //   wasHelpful
    // );
    
    // Hide thanks message after 2 seconds
    setTimeout(() => setShowThanks(false), 2000);
  };

  const getFileIcon = (type: string, name: string) => {
    if (type === 'application/pdf') return <FileIcon className="text-red-500" size={14} />;
    const ext = name.split('.').pop()?.toLowerCase();
    if (['py', 'c', 'cpp', 'm'].includes(ext || '')) return <FileCode className="text-green-500" size={14} />;
    return <FileText className="text-blue-500" size={14} />;
  };

  const renderedContent = useMemo(() => {
    // Regex to find math blocks
    const segments = content.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);
    
    return segments.map((segment, i) => {
      if (segment.startsWith('$$') && segment.endsWith('$$')) {
        const math = segment.slice(2, -2);
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return (
            <div 
              key={i} 
              className="my-4 overflow-x-auto bg-black/30 p-4 rounded-xl border border-white/5 text-center math-font text-lg shadow-inner" 
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          );
        } catch (e) {
          return <code key={i} className="mono-font">{segment}</code>;
        }
      } else if (segment.startsWith('$') && segment.endsWith('$')) {
        const math = segment.slice(1, -1);
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={i} className="math-font italic px-0.5" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (e) {
          return <code key={i} className="mono-font">{segment}</code>;
        }
      }
      
      // Simple markdown support for bold, code, and newlines
      return (
        <span key={i} className="whitespace-pre-wrap">
          {segment.split(/(\*\*.*?\*\*|`.*?`)/g).map((sub, j) => {
            if (sub.startsWith('**') && sub.endsWith('**')) {
              return <strong key={j} className="text-[#00d4ff] font-bold">{sub.slice(2, -2)}</strong>;
            }
            if (sub.startsWith('`') && sub.endsWith('`')) {
              return (
                <code key={j} className="mono-font bg-black/40 px-1.5 py-0.5 rounded text-xs text-emerald-400 border border-white/5">
                  {sub.slice(1, -1)}
                </code>
              );
            }
            return sub;
          })}
        </span>
      );
    });
  }, [content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-1 mb-6",
        !isAI ? "items-end" : "items-start w-full"
      )}
    >
      {isAI && (
        <span className="text-[10px] font-bold text-[#00d4ff] uppercase tracking-widest ml-4 mb-1">
          EngiAI Assistant
        </span>
      )}
      
      <div
        className={cn(
          "max-w-[90%] px-5 py-4 rounded-2xl shadow-lg transition-all",
          !isAI 
            ? "eng-bubble-user rounded-tr-none text-white border-accent/20" 
            : "eng-bubble-ai rounded-tl-none text-slate-300"
        )}
      >
        <div className="prose prose-invert max-w-none text-[14px] leading-relaxed">
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5"
                >
                  {file.type.startsWith('image/') ? (
                    <img src={file.preview} alt={file.name} className="w-8 h-8 rounded object-cover border border-white/5" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-surface flex items-center justify-center border border-white/5">
                      {getFileIcon(file.type, file.name)}
                    </div>
                  )}
                  <span className="text-[10px] font-bold text-slate-300 truncate max-w-[150px]">
                    {file.name}
                  </span>
                </div>
              ))}
            </div>
          )}
          {renderedContent}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-accent/60 ml-2 animate-pulse align-middle rounded-sm" />
          )}
        </div>
        
        {isAI && !isStreaming && (
          <div className="border-t border-white/5 pt-3 mt-3">
            {content.length > 100 && (
              <p className="text-[11px] text-[#64748b] leading-snug mb-2">
                <span className="text-[#00d4ff] font-bold">Verification:</span> Accuracy of results should be checked against textbook standard constants.
              </p>
            )}
            
            {/* Feedback buttons */}
            {!feedbackGiven && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#64748b] mr-2">Was this helpful?</span>
                <button
                  onClick={() => handleFeedback(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#64748b] hover:text-green-400 hover:bg-green-500/10 transition-colors"
                >
                  <ThumbsUp size={12} />
                  Yes
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#64748b] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <ThumbsDown size={12} />
                  No
                </button>
              </div>
            )}
            
            {showThanks && (
              <p className="text-[10px] text-[#00d4ff] animate-pulse">
                Thanks for the feedback!
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
