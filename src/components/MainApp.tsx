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

interface Session { id: string; topic: string; last_active: string; message_count: number; created_at: string; }

interface MainAppProps { user: SupabaseUser; }

export const MainApp: React.FC<MainAppProps> = ({ user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);

  const loadSessions = async () => {
    const { data } = await supabase.from('sessions').select('id, topic, last_active, message_count, created_at').eq('user_id', user.id).order('last_active', { ascending: false }).limit(50);
    if (data) setSessions(data);
  };

  useEffect(() => { loadSessions(); }, [user?.id]);

  useEffect(() => {
    if (sessions.length === 0 && user?.id && !currentSessionId) handleNewChat();
  }, [sessions.length, user?.id, currentSessionId]);

  const handleSignOut = async () => {
    setMessages([]); setSessions([]); setCurrentSessionId(''); setAttachments([]);
    await supabase.auth.signOut();
  };

  const handleNewChat = async () => {
    const { data, error } = await supabase.from('sessions').insert({ user_id: user.id, topic: 'New Engineering Chat', message_count: 0, last_active: new Date().toISOString() }).select('id').single();
    if (error || !data) return;
    setCurrentSessionId(data.id);
    setMessages([]);
    setSessions(prev => [{ id: data.id, topic: 'New Engineering Chat', last_active: new Date().toISOString(), message_count: 0, created_at: new Date().toISOString() }, ...prev]);
  };

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    setCurrentSessionId(sessionId);
    setMessages([]);
    setIsStreaming(true);
    const { data } = await supabase.from('messages').select('role, content, topic_tags, created_at').eq('session_id', sessionId).eq('user_id', user.id).order('created_at', { ascending: true });
    if (data) setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    setIsStreaming(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await supabase.from('sessions').delete().eq('id', sessionId);
    if (sessionId === currentSessionId) await handleNewChat();
    else await loadSessions();
  };

  const handleSendMessage = async (content: string) => {
    if (isStreaming || !supabase || !user?.id) return;
    if (!content.trim() && attachments.length === 0) return;

    const topics = extractTopics(content);
    const [summary, struggleTopics] = await Promise.all([getMemorySummary(user.id), getStruggleTopics(user.id)]);

    const messageText = content.trim() || (attachments.some(a => a.type.startsWith('image/')) ? 'Please analyze this image and explain what you see from an engineering perspective.' : 'Please analyze this file and provide engineering insights.');

    const userMessage: Message = { role: 'user', content: messageText, attachments: attachments.map(a => ({ id: a.id, name: a.name, type: a.type, size: a.size, base64: a.base64, textContent: a.textContent, preview: a.preview })) };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);
    const hasAttachments = attachments.length > 0;
    setAttachments([]);

    await saveMessage(user.id, currentSessionId, 'user', messageText, topics, hasAttachments);

    try {
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages([...newMessages, assistantMessage]);

      let accumulatedContent = '';
      for await (const chunk of streamChat(newMessages, { summary, struggleTopics })) {
        accumulatedContent += chunk;
        setMessages([...newMessages, { role: 'assistant', content: accumulatedContent }]);
      }

      await saveMessage(user.id, currentSessionId, 'assistant', accumulatedContent, topics);

      if (messages.length === 0) {
        const topic = messageText.slice(0, 60) + (messageText.length > 60 ? '...' : '');
        await supabase.from('sessions').update({ topic, last_active: new Date().toISOString() }).eq('id', currentSessionId).eq('user_id', user.id);
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, topic, last_active: new Date().toISOString() } : s));
      }

      await summarizeIfNeeded(user.id);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        user={user}
        onSignOut={handleSignOut}
      />
      <div className="flex-1 flex flex-col">
        <Header onToggle={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
        <ChatWindow messages={messages} isStreaming={isStreaming} onSelectPrompt={handleSendMessage} />
        <InputBar 
          onSendMessage={handleSendMessage}
          disabled={isStreaming}
          attachments={attachments}
          setAttachments={setAttachments}
        />
      </div>
    </div>
  );
};
                   
                    
