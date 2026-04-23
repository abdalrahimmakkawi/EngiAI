import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { FileIcon, FileText, FileCode, ThumbsUp, ThumbsDown } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  attachments?: { name: string; type: string; preview?: string }[];
  topicTags?: string[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role, content, isStreaming = false, attachments = [], topicTags = []
}) => {
  const isAI = role === 'assistant';
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'unhelpful' | null>(null);
  const [showThanks, setShowThanks] = useState(false);

  const handleFeedback = async (wasHelpful: boolean) => {
    if (feedbackGiven || !topicTags.length) return;
    setFeedbackGiven(wasHelpful ? 'helpful' : 'unhelpful');
    setShowThanks(true);
    setTimeout(() => setShowThanks(false), 2000);
  };

  const getFileIcon = (type: string, name: string) => {
    if (type === 'application/pdf') return <FileText size={12} className="text-red-400" />;
    const ext = name.split('.').pop()?.toLowerCase();
    if (['py', 'c', 'cpp', 'm'].includes(ext || '')) return <FileCode size={12} className="text-blue-400" />;
    return <FileIcon size={12} className="text-gray-400" />;
  };

  const renderedContent = useMemo(() => {
    const segments = content.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g);

    return segments.map((segment, i) => {
      if (segment.startsWith('$$') && segment.endsWith('$$')) {
        const math = segment.slice(2, -2);
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <div key={i} className="my-3 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
        } catch { return <span key={i}>{segment}</span>; }
      }
      if (segment.startsWith('$') && segment.endsWith('$') && segment.length > 2) {
        const math = segment.slice(1, -1);
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch { return <span key={i}>{segment}</span>; }
      }

      return (
        <span key={i}>
          {segment.split(/(\*\*.*?\*\*|`.*?`)/g).map((sub, j) => {
            if (sub.startsWith('**') && sub.endsWith('**')) return <strong key={j} className="font-semibold text-white">{sub.slice(2, -2)}</strong>;
            if (sub.startsWith('`') && sub.endsWith('`')) return <code key={j} className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 text-xs font-mono">{sub.slice(1, -1)}</code>;
            return sub;
          })}
        </span>
      );
    });
  }, [content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isAI ? '' : 'flex-row-reverse')}
    >
      {isAI && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a2e] border border-cyan-500/30 flex items-center justify-center">
          <span className="text-cyan-400 text-xs font-bold">E</span>
        </div>
      )}

      <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed', isAI ? 'bg-[#1a1a2e] border border-white/10 text-gray-100' : 'bg-cyan-500/20 border border-cyan-500/30 text-white')}>
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, idx) => (
              <div key={idx} className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs', isAI ? 'bg-white/5' : 'bg-cyan-500/30')}>
                {getFileIcon(file.type, file.name)}
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap">{renderedContent}</div>

        {isStreaming && (
          <span className="ml-1 inline-block w-2 h-4 bg-cyan-400 animate-pulse rounded" />
        )}

        {isAI && !isStreaming && (
          <>
            {content.length > 100 && (
              <p className="mt-2 text-xs text-[#64748b] border-t border-white/5 pt-2">
                Verification: Accuracy of results should be checked against textbook standard constants.
              </p>
            )}
            {!feedbackGiven && (
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
                <span className="text-xs text-[#64748b]">Was this helpful?</span>
                <button onClick={() => handleFeedback(true)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#64748b] hover:text-green-400 hover:bg-green-500/10 transition-colors">
                  <ThumbsUp size={12} /> Yes
                </button>
                <button onClick={() => handleFeedback(false)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#64748b] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <ThumbsDown size={12} /> No
                </button>
                {showThanks && <span className="text-xs text-green-400">Thanks!</span>}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
