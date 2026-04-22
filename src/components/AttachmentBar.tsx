import React, { useRef } from 'react';
import { X, FileText, FileCode, FileIcon, Eye, Camera } from 'lucide-react';
import { Attachment, imageToBase64 } from '../lib/fileProcessor';
import { motion, AnimatePresence } from 'motion/react';

interface AttachmentBarProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  showHint?: boolean;
}

export const AttachmentBar: React.FC<AttachmentBarProps> = ({ attachments, onRemove, showHint }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (attachments.length === 0) return null;

  const getFileIcon = (type: string, name: string) => {
    if (type === 'application/pdf') return <FileIcon className="text-red-500" size={16} />;
    if (type.startsWith('image/')) return null;
    const ext = name.split('.').pop()?.toLowerCase();
    if (['py', 'c', 'cpp', 'm'].includes(ext || '')) return <FileCode className="text-green-500" size={16} />;
    return <FileText className="text-blue-500" size={16} />;
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Validate size
  if (file.size > 10 * 1024 * 1024) {
    alert("Image too large. Maximum 10MB.");
    return;
  }
  
  // Process same as regular image attachment
  const base64 = await imageToBase64(file);
  const preview = URL.createObjectURL(file);
  
  const attachment: Attachment = {
    id: crypto.randomUUID(),
    name: `photo_${Date.now()}.jpg`,
    type: file.type || "image/jpeg",
    size: file.size,
    base64,
    preview,
  };
  
  // This would need to be passed as a prop in a real implementation
  console.log("Camera captured:", attachment);
  
  // Reset input so same photo can be taken again
  e.target.value = "";
};

  return (
    <div className="px-4 pb-3 flex flex-col gap-3">
      {/* Hidden camera input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"  // opens rear camera on mobile
        className="hidden"
        onChange={handleCameraCapture}
      />
      
      <div className="flex flex-wrap gap-2">
        {/* Camera button */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 
                     hover:bg-cyan-400/10 transition-colors"
          title="Take a photo"
        >
          <Camera size={18} />
        </button>
        
        <AnimatePresence>
          {attachments.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.9, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 5 }}
              className="flex items-center gap-2 bg-[#1a1a2e] border border-white/10 rounded-full px-2 py-1 pr-1 group shadow-sm hover:border-accent/30 transition-colors"
            >
              {file.type.startsWith('image/') ? (
                <div className="relative">
                  <img 
                    src={file.preview} 
                    alt={file.name} 
                    className="w-8 h-8 rounded-full object-cover border border-white/5" 
                  />
                  <div className="absolute -top-1 -right-1 bg-green-500/90 text-white text-[6px] px-1 rounded-full font-bold uppercase tracking-tighter flex items-center gap-0.5">
                    <Eye size={6} /> 📷 Photo
                  </div>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center border border-white/5">
                  {getFileIcon(file.type, file.name)}
                </div>
              )}
              
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-[10px] font-bold text-slate-200 truncate max-w-[120px]">
                  {file.name}
                </span>
                <span className="text-[8px] text-[#64748b] font-medium uppercase tracking-wider">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="w-5 h-5 rounded-full hover:bg-red-500/20 text-[#64748b] hover:text-red-400 flex items-center justify-center transition-colors"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showHint && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-[10px] text-[#64748b] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <span className="text-accent">↑</span> Files ready · type a message or press send
        </motion.p>
      )}
    </div>
  );
};
