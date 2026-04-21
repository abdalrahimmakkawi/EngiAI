import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
import { Message, streamChat } from './lib/nvidia';
import { Attachment } from './lib/fileProcessor';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize Supabase session
  useEffect(() => {
    const initSession = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('sessions')
          .insert({})
          .select()
          .single();

        if (error) throw error;
        if (data) setSessionId(data.id);
      } catch (err) {
        console.warn('Supabase initialization failed (Graceful degradation active):', err);
      }
    };

    initSession();
  }, []);

  const saveMessageToSupabase = async (role: 'user' | 'assistant', content: string, hasAttachments: boolean = false) => {
    if (!supabase || !sessionId) return;
    try {
      await supabase.from('messages').insert({
        session_id: sessionId,
        role,
        content,
        has_attachments: hasAttachments
      });

      // Update session last_active and message_count
      await supabase.rpc('increment_session_messages', { session_id_param: sessionId });
    } catch (err) {
      console.warn('Failed to save message to Supabase:', err);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (isStreaming) return;

    // Allow send if there's text OR attachments
    if (!content.trim() && attachments.length === 0) return;

    // If no text but has attachments, use a smart default
    const messageText = content.trim() || 
      (attachments.some(a => a.type.startsWith("image/")) 
        ? "Please analyze this image and explain what you see from an engineering perspective."
        : "Please analyze this file and provide engineering insights.");

    const userMessage: Message = { 
      role: 'user', 
      content: messageText,
      attachments: attachments.map(a => ({
        name: a.name,
        type: a.type,
        preview: a.preview
      }))
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);

    const hasAttachments = attachments.length > 0;
    const currentAttachments = [...attachments];
    setAttachments([]); // Clear immediately for UI

    // Background save user message
    saveMessageToSupabase('user', messageText, hasAttachments);

    try {
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages([...newMessages, assistantMessage]);

      let accumulatedContent = '';
      for await (const chunk of streamChat(newMessages, currentAttachments)) {
        accumulatedContent += chunk;
        setMessages([...newMessages, { role: 'assistant', content: accumulatedContent }]);
      }
      
      // Save assistant response once complete
      saveMessageToSupabase('assistant', accumulatedContent);
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `**Error:** ${error instanceof Error ? error.message : 'Failed to connect to the assistant. Please check your API key.'}` }
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-screen bg-[#0a0a0f] text-[#e2e8f0] grid-bg overflow-hidden">
        <Header />
        
        <main className="flex-1 flex overflow-hidden p-4 md:p-6 gap-6">
          {/* Sidebar - Desktop Only */}
          <aside className="hidden lg:flex w-72 flex-col gap-4 shrink-0">
            {/* ... existing sidebar ... */}
            <div className="eng-card rounded-2xl p-5 flex flex-col shadow-2xl">
              <h2 className="text-[11px] font-bold uppercase text-[#64748b] mb-4 tracking-[0.2em]">
                Recent Topics
              </h2>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <div className="p-3 rounded-xl bg-[#1a1a2e]/50 border border-[#00d4ff]/10 cursor-pointer hover:border-accent/40 transition-all group">
                  <p className="text-xs font-semibold truncate group-hover:text-accent transition-colors">Bernoulli Equation Derivation</p>
                  <p className="text-[10px] text-[#64748b] mt-1 font-medium italic">Fluid Mechanics • 2m ago</p>
                </div>
                <div className="p-3 rounded-xl hover:bg-white/5 border border-transparent transition-all cursor-pointer group">
                  <p className="text-xs font-semibold truncate text-[#64748b] group-hover:text-slate-300">3-Phase Power Analysis</p>
                  <p className="text-[10px] text-[#64748b] mt-1 font-medium italic">Electrical Eng • 1h ago</p>
                </div>
                <div className="p-3 rounded-xl hover:bg-white/5 border border-transparent transition-all cursor-pointer group">
                  <p className="text-xs font-semibold truncate text-[#64748b] group-hover:text-slate-300">Euler-Bernoulli Beam Theory</p>
                  <p className="text-[10px] text-[#64748b] mt-1 font-medium italic">Civil Eng • 4h ago</p>
                </div>
              </div>
            </div>

            <div className="bg-[#00d4ff]/2 border border-[#00d4ff]/10 rounded-2xl p-5 shadow-inner">
              <h3 className="text-[10px] font-bold text-[#00d4ff] mb-3 uppercase tracking-widest">
                Formula of the Day
              </h3>
              <div className="math-font text-base text-center py-4 bg-black/20 rounded-xl border border-white/5 mb-2">
                {"$ \\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t} $"}
              </div>
              <p className="text-[11px] text-center text-[#64748b] font-medium">
                Faraday's Law of Induction
              </p>
            </div>
          </aside>

          {/* Chat Section */}
          <section className="flex-1 flex flex-col eng-card rounded-[2rem] overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/5">
            <ChatWindow 
              messages={messages} 
              isStreaming={isStreaming} 
              onSelectPrompt={handleSendMessage} 
            />
            
            <InputBar 
              onSendMessage={handleSendMessage} 
              disabled={isStreaming} 
              attachments={attachments}
              setAttachments={setAttachments}
            />
          </section>
        </main>
      </div>
      <Analytics />
    </>
  );
};

export default App;
