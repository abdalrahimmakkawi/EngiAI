import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Paperclip, AlertCircle, Send, FileIcon } from 'lucide-react';
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
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 4000); return () => clearTimeout(t); } }, [error]);

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
      <form onSubmit={handleSubmit} className={cn('flex items-end gap-2 px-4 py-3 rounded-2xl glass border border-white/10 transition-all', canSend ? 'border-cyan-500/30' : '')}>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={cn('flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#1a1a2e] border border-white/10 text-[#64748b] hover:text-cyan-400 hover:border-cyan-500/40 transition-all', processing && 'opacity-50')} disabled={disabled || processing}>
          {processing ? <Loader2 size={16} className="spinner text-cyan-400" /> : <Paperclip size={16} />}
        </button>
        <input ref={fileInputRef} type="file" multiple accept=".txt,.py,.m,.c,.cpp,.pdf,.jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleFileChange} />
        <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} rows={1} disabled={disabled} className={cn('flex-1 bg-transparent resize-none border-none focus:ring-0 text-sm placeholder-[#64748b] px-1 py-1 leading-relaxed', disabled && 'opacity-50 cursor-not-allowed')} />
        {attachments.length > 0 && <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 text-xs text-cyan-400"><FileIcon size={10} />{attachments.length}</div>}
        <button type="submit" disabled={!canSend} className={cn('flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-all', !canSend && 'opacity-40 cursor-not-allowed')}>
          <Send size={16} />
        </button>
      </form>
      <p className="text-center text-[10px] text-[#334155] mt-2">PDFs, code, images · Max 10 MB · Processed locally</p>
    </div>
  );
};
