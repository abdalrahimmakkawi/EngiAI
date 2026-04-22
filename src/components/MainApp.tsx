import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { ChatWindow } from './ChatWindow';
import { InputBar } from './InputBar';
import { RecentTopics } from './RecentTopics';
import { Message, streamChat } from '../lib/nvidia';
import { Attachment } from '../lib/fileProcessor';
import { supabase, SupabaseUser } from '../lib/supabase';
import { saveMessage, getMemorySummary, getStruggleTopics, summarizeIfNeeded } from '../lib/memory';
import { extractTopics } from '../lib/topicExtractor';

interface MainAppProps {
  user: SupabaseUser;
}

export const MainApp: React.FC<MainAppProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sessionId, setSessionId] = useState<string>('');

  // Initialize Supabase session
  useEffect(() => {
    const initSession = async () => {
      if (!supabase || !user?.id) return;
      try {
        const { data, error } = await supabase
          .from('sessions')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        if (data) setSessionId(data.id);
      } catch (err) {
        console.warn('Supabase initialization failed (Graceful degradation active):', err);
      }
    };

    initSession();
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSendMessage = async (content: string) => {
    if (isStreaming) return;

    if (!content.trim() && attachments.length === 0) return;
    if (isStreaming || !supabase || !user?.id) return;

    // Extract topics from message
    const topics = extractTopics(content);

    // Get memory context for this user
    const [summary, struggleTopics] = await Promise.all([
      getMemorySummary(user.id),
      getStruggleTopics(user.id),
    ]);

    // If no text but has attachments, use a smart default
    const messageText = content.trim() || 
      (attachments.some(a => a.type.startsWith("image/")) 
        ? "Please analyze this image and explain what you see from an engineering perspective."
        : "Please analyze this file and provide engineering insights.");

    const userMessage: Message = { 
      role: 'user', 
      content: messageText,
      attachments: attachments.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        base64: a.base64,
        textContent: a.textContent,
        preview: a.preview
      }))
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);

    const hasAttachments = attachments.length > 0;
    setAttachments([]); // Clear immediately for UI

    // Save user message to Supabase
    await saveMessage(
      user.id!,
      sessionId,
      "user",
      messageText,
      topics,
      hasAttachments
    );

    try {
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages([...newMessages, assistantMessage]);

      let accumulatedContent = '';
      for await (const chunk of streamChat(
        newMessages,
        { summary, struggleTopics }
      )) {
        accumulatedContent += chunk;
        setMessages([...newMessages, { role: 'assistant', content: accumulatedContent }]);
      }
      
      // Save assistant response
      await saveMessage(
        user.id!,
        sessionId,
        "assistant",
        accumulatedContent,
        topics
      );

      // Summarize if needed (non-blocking)
      summarizeIfNeeded(user.id!).catch(console.warn);
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
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-[#e2e8f0] grid-bg overflow-hidden">
      <Header user={user} onSignOut={handleSignOut} />
      
      <main className="flex-1 flex overflow-hidden p-4 md:p-6 gap-6">
        {/* Sidebar - Desktop Only */}
        <aside className="hidden lg:flex w-72 flex-col gap-4 shrink-0">
          <div className="eng-card rounded-2xl p-5 flex flex-col shadow-2xl">
            <h2 className="text-[11px] font-bold uppercase text-[#64748b] mb-4 tracking-[0.2em]">
              Recent Topics
            </h2>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-[#1a1a2e]/50 border border-[#00d4ff]/10 cursor-pointer hover:border-accent/40 transition-all group">
                <p className="text-xs font-semibold truncate group-hover:text-accent transition-colors">Bernoulli Equation Derivation</p>
                <p className="text-[10px] text-[#64748b] mt-1 font-medium italic">Fluid Mechanics &bull; 2m ago</p>
              </div>
              <div className="p-3 rounded-xl hover:bg-white/5 border border-transparent transition-all cursor-pointer group">
                <p className="text-xs font-semibold truncate text-[#64748b] group-hover:text-slate-300">3-Phase Power Analysis</p>
                <p className="text-[10px] text-[#64748b] mt-1 font-medium italic">Electrical Eng &bull; 1h ago</p>
              </div>
              <div className="p-3 rounded-xl hover:bg-white/5 border border-transparent transition-all cursor-pointer group">
                <p className="text-xs font-semibold truncate text-[#64748b] group-hover:text-slate-300">Euler-Bernoulli Beam Theory</p>
                <p className="text-[10px] text-[#64748b] mt-1 font-medium italic">Civil Eng &bull; 4h ago</p>
              </div>
            </div>
          </div>

          <RecentTopics />
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
  );
};
