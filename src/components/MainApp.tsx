import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { ChatWindow } from './ChatWindow';
import { InputBar } from './InputBar';
import Sidebar from './Sidebar';
import { Message, streamChat } from '../lib/nvidia';
import { Attachment } from '../lib/fileProcessor';
import { supabase, SupabaseUser } from '../lib/supabase';
import { saveMessage, getMemorySummary, getStruggleTopics, summarizeIfNeeded } from '../lib/memory';
import { extractTopics } from '../lib/topicExtractor';

interface Session {
  id: string;
  topic: string;
  last_active: string;
  message_count: number;
  created_at: string;
}

interface MainAppProps {
  user: SupabaseUser;
}

export const MainApp: React.FC<MainAppProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Load all sessions for this user on mount
  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, topic, last_active, message_count, created_at")
      .eq("user_id", user.id) // SECURITY: never load other users sessions
      .order("last_active", { ascending: false })
      .limit(50);
  
    console.log("Loaded sessions:", data?.length, "Error:", error);
    if (data) setSessions(data);
  };

  useEffect(() => {
    loadSessions();
  }, [user?.id]);

  // Create new session if none exists and no current session
  useEffect(() => {
    if (sessions.length === 0 && user?.id && !currentSessionId) {
      handleNewChat();
    }
  }, [sessions.length, user?.id, currentSessionId]);

  const handleSignOut = async () => {
  // Clear all local state before signing out
  setMessages([]);
  setSessions([]);
  setCurrentSessionId("");
  setAttachments([]);
  // Then sign out
  await supabase.auth.signOut();
};

  const handleNewChat = async () => {
  console.log("New chat clicked, user:", user.id);
  
  const { data, error } = await supabase
    .from("sessions")
    .insert({ 
      user_id: user.id, 
      topic: "New Engineering Chat",
      message_count: 0,
      last_active: new Date().toISOString()
    })
    .select("id")
    .single();
  
  console.log("Session created:", data, "Error:", error);
  
  if (error) {
    console.error("Failed to create session:", error.message);
    return;
  }
  
  if (data) {
    console.log("Switching to session:", data.id);
    setCurrentSessionId(data.id);
    setMessages([]);
    setSessions(prev => [{
      id: data.id,
      topic: "New Engineering Chat",
      last_active: new Date().toISOString(),
      message_count: 0,
      created_at: new Date().toISOString(),
    }, ...prev]);
  }
};

  const handleSelectSession = async (sessionId: string) => {
  console.log("Selecting session:", sessionId);
  
  if (sessionId === currentSessionId) return;
  
  setCurrentSessionId(sessionId);
  setMessages([]);
  setIsStreaming(true);
  
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("role, content, topic_tags, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", user.id) // SECURITY: always filter by user_id
      .order("created_at", { ascending: true });
    
    console.log("Loaded messages:", data?.length, "Error:", error);
    
    if (data) {
      setMessages(data.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })));
    }
  } finally {
    setIsStreaming(false);
  }
};

  const handleDeleteSession = async (sessionId: string) => {
    if (!supabase) return;
    await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);
    
    // If deleted current session, start new one
    if (sessionId === currentSessionId) {
      await handleNewChat();
    } else {
      await loadSessions();
    }
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
      currentSessionId!,
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
        currentSessionId!,
        "assistant",
        accumulatedContent,
        topics
      );

      // Auto-update session topic after first message
      const isFirstMessage = messages.length === 0;

      // After assistant response is fully saved:
      if (isFirstMessage) {
        const topic = messageText.slice(0, 60) + 
          (messageText.length > 60 ? "..." : "");
        
        await supabase
          .from("sessions")
          .update({ 
            topic,
            last_active: new Date().toISOString()
          })
          .eq("id", currentSessionId)
          .eq("user_id", user.id); // SECURITY
      
        // Update sidebar immediately without refetch
        setSessions(prev => prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, topic, last_active: new Date().toISOString() }
            : s
        ));
      }

      // Always update last_active after every message
      await supabase
        .from("sessions")
        .update({ last_active: new Date().toISOString() })
        .eq("id", currentSessionId)
        .eq("user_id", user.id);

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
      await loadSessions(); // Refresh sidebar after every send
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Main content */}
      <div className={`flex flex-col flex-1 transition-all duration-300 overflow-hidden ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <Header
          onToggle={() => setSidebarOpen(prev => !prev)}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 flex overflow-hidden p-4 md:p-6">
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

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
