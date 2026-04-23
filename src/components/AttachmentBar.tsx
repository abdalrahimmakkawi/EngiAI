import React from 'react';
import { X, FileText, FileCode, Image, File } from 'lucide-react';
import { Attachment } from '../lib/fileProcessor';

interface AttachmentBarProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

const FileIcon = ({ type, name }: { type: string; name: string }) => {
  if (type.startsWith('image/')) return <Image size={12} className="text-green-400" />;
  if (type === 'application/pdf') return <FileText size={12} className="text-red-400" />;
  const ext = name.split('.').pop()?.toLowerCase();
  if (['py', 'c', 'cpp', 'm'].includes(ext || '')) return <FileCode size={12} className="text-blue-400" />;
  return <File size={12} className="text-gray-400" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AttachmentBar: React.FC<AttachmentBarProps> = ({ attachments, onRemove }) => {
  return (
    <div className="flex flex-wrap gap-2 px-4 pt-3">
      {attachments.map(att => (
        <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-white/10 text-xs group">
          {att.preview ? (
            <img src={att.preview} alt={att.name} className="w-6 h-6 rounded object-cover" />
          ) : (
            <FileIcon type={att.type} name={att.name} />
          )}
          <span className="text-gray-300 max-w-[120px] truncate">{att.name}</span>
          <span className="text-[#64748b]">{formatSize(att.size)}</span>
          <button onClick={() => onRemove(att.id)} className="ml-1 opacity-0 group-hover:opacity-100 text-[#64748b] hover:text-red-400 transition-all">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
