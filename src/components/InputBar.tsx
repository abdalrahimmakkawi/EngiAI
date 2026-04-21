import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Paperclip, AlertCircle, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { Attachment, validateFile, imageToBase64, extractText, extractPdfText } from '../lib/fileProcessor';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !disabled;
  
  const placeholder = attachments.length > 0 && input.trim() === ""
    ? "Add a message or send file alone..."
    : "Ask about thermodynamics, circuit analysis, or material science...";

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (canSend) {
      onSendMessage(input.trim());
      setInput('');
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSubmit();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (attachments.length + files.length > 3) {
      setError('Max 3 files allowed');
      return;
    }

    const processedFiles: Attachment[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        continue;
      }

      const id = Math.random().toString(36).substr(2, 9);
      let attachment: Attachment = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
      };

      try {
        if (file.type.startsWith('image/')) {
          attachment.base64 = await imageToBase64(file);
          attachment.preview = URL.createObjectURL(file);
        } else if (file.type === 'application/pdf') {
          attachment.textContent = await extractPdfText(file);
        } else {
          attachment.textContent = await extractText(file);
        }
        processedFiles.push(attachment);
      } catch (err) {
        console.error('Error processing file:', err);
        setError(`Failed to process ${file.name}`);
      }
    }

    setAttachments(prev => [...prev, ...processedFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Autofocus textarea after selecting files so user can keep typing
    textareaRef.current?.focus();
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => {
      const filtered = prev.filter(a => a.id !== id);
      const removed = prev.find(a => a.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  return (
    <div className="p-6 bg-[#0a0a0f] border-t border-white/5 shrink-0 z-20">
      <AttachmentBar 
        attachments={attachments} 
        onRemove={handleRemoveAttachment} 
        showHint={attachments.length > 0 && input.trim() === ""}
      />
      
      {error && (
        <div className="max-w-4xl mx-auto mb-3 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <form 
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto relative flex items-center gap-4"
      >
        <button
          type="button"
          onClick={handleFileClick}
          disabled={disabled || attachments.length >= 3}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1a1a2e] border border-white/10 text-accent hover:border-accent/40 transition-all disabled:opacity-50"
        >
          <Paperclip size={20} />
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          multiple
          accept="image/*,.pdf,.txt,.py,.m,.c,.cpp"
        />

        <div className="flex-1 bg-[#1a1a2e] border border-white/10 rounded-2xl p-3 flex items-center shadow-inner group transition-all focus-within:border-accent/40 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.05)]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className={cn(
              "bg-transparent flex-1 resize-none border-none focus:ring-0 text-sm placeholder-[#64748b] px-2 py-1 leading-relaxed",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
          
          <div className="flex items-center gap-2 px-2">
            <button
              type="submit"
              disabled={!canSend}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all relative",
                canSend
                  ? "eng-gradient text-black shadow-lg shadow-accent/20 hover:scale-105 active:scale-95" 
                  : "bg-[#0a0a0f] text-[#64748b] border border-white/5 opacity-40 cursor-not-allowed"
              )}
            >
              {disabled ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  {attachments.length > 0 && input.trim() === "" ? (
                    <Paperclip size={18} strokeWidth={3} />
                  ) : (
                    <Send size={18} strokeWidth={3} className="-rotate-45 -mt-0.5" />
                  )}
                  {attachments.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[8px] font-bold rounded-full flex items-center justify-center shadow-md border border-black/5">
                      {attachments.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      <p className="text-center text-[9px] text-[#64748b] mt-3 font-semibold uppercase tracking-[0.2em] opacity-60">
        Professional Engineering Mode · Accuracy Recommended
      </p>
    </div>
  );
};
