import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Paperclip, AlertCircle, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { Attachment, processFile, revokePreview } from '../lib/fileProcessor';
import { AttachmentBar } from './AttachmentBar';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

export const InputBar: React.FC<InputBarProps> = ({ onSendMessage, disabled, attachments, setAttachments }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !disabled && !processing;

  const placeholder = attachments.length > 0 && input.trim() === ''
    ? 'Add a message or send files alone...'
    : 'Ask about thermodynamics, circuit analysis, materials science...';

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  useEffect(() => { adjustHeight(); }, [input]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 4000); return () => clearTimeout(t); }
  }, [error]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    onSendMessage(input.trim());
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) handleSubmit(); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (attachments.length + files.length > 3) { setError('Max 3 files at a time'); return; }

    setProcessing(true);
    for (const file of files) {
      const att = await processFile(file).catch(() => null);
      if (!att) { setError(`Couldn't process: ${file.name}`); continue; }
      setAttachments(prev => [...prev, att]);
    }
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    textareaRef.current?.focus();
  };

  const handleRemove = (id: string) => {
    setAttachments(prev => { const r = prev.find(a => a.id === id); if (r) revokePreview(r); return prev.filter(a => a.id !== id); });
  };

  return (
    <div className="relative px-4 pb-4">
      {error && (
        <div className="absolute bottom-full left-4 right-4 mb-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {attachments.length > 0 && <AttachmentBar attachments={attachments} onRemove={handleRemove} />}

      <form onSubmit={handleSubmit} className={cn('flex items-end gap-2 px-4 py-3 rounded-2xl glass border border-white/10 transition-all focus-within:border-accent/40 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.05)]', disabled && 'opacity-50')}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || processing || attachments.length >= 3}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-accent hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {processing ? <Loader2 className="animate-spin" size={18} /> : <Paperclip size={18} />}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,.pdf,.txt,.py,.m,.c,.cpp"
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder-[#64748b] resize-none py-1 leading-relaxed"
        />

        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
            canSend ? 'eng-gradient text-black shadow-lg shadow-accent/20 hover:scale-105 active:scale-95' : 'bg-white/5 text-[#64748b] opacity-40 cursor-not-allowed'
          )}
        >
          {disabled ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} strokeWidth={3} className="-rotate-45" />}
        </button>
      </form>
    </div>
  );
};
