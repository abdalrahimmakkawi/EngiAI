import { supabase } from './supabase';
import { streamChat } from './nvidia';

export const saveMessage = async (userId: string, sessionId: string, role: 'user' | 'assistant', content: string, topicTags: string[] = [], hasAttachments = false) => {
  try {
    await supabase.from('messages').insert({ user_id: userId, session_id: sessionId, role, content, topic_tags: topicTags, has_attachments: hasAttachments });
  } catch (err) { console.warn('[memory] saveMessage failed:', err); }
};

export const loadRecentMessages = async (userId: string, sessionId: string, limit = 20) => {
  try {
    const { data } = await supabase.from('messages').select('id, role, content, topic_tags, created_at')
      .eq('user_id', userId).eq('session_id', sessionId).order('created_at', { ascending: false }).limit(limit);
    return (data ?? []).reverse();
  } catch { return []; }
};

export const getMemorySummary = async (userId: string): Promise<string> => {
  try {
    const { data } = await supabase.from('memory_summaries').select('summary')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
    return data?.[0]?.summary ?? '';
  } catch { return ''; }
};

export const summarizeIfNeeded = async (userId: string) => {
  try {
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    if (!count || count < 30) return;
    const recent = await loadRecentMessages(userId, '', 30);
    const historyText = recent.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    let summary = '';
    const summaryMessages = [{ role: 'user' as const, content: `Summarize this student's engineering learning history in 200 words. Focus on: topics covered, recurring struggles, concepts mastered, and learning patterns.\n\n${historyText}` }];
    for await (const chunk of streamChat(summaryMessages)) { summary += chunk; }
    await supabase.from('memory_summaries').insert({ user_id: userId, summary, message_count_at_summary: count });
  } catch (err) { console.warn('[memory] summarization failed:', err); }
};

export const updateTopicScore = async (userId: string, topics: string[], wasHelpful: boolean) => {
  for (const topic of topics) {
    try {
      const { data } = await supabase.from('topic_scores').select('*')
        .eq('user_id', userId).eq('topic', topic).single();
      if (data) {
        await supabase.from('topic_scores').update({
          attempts: data.attempts + 1,
          struggles: wasHelpful ? data.struggles : data.struggles + 1,
          score: wasHelpful ? Math.min(1, data.score + 0.1) : Math.max(0, data.score - 0.2),
          updated_at: new Date().toISOString(),
        }).eq('id', data.id);
      } else {
        await supabase.from('topic_scores').insert({
          user_id: userId, topic, attempts: 1, struggles: wasHelpful ? 0 : 1, score: wasHelpful ? 1.0 : 0.8,
        });
      }
    } catch (err) { console.warn('[memory] updateTopicScore failed:', err); }
  }
};

export const getStruggleTopics = async (userId: string): Promise<string[]> => {
  try {
    const { data } = await supabase.from('topic_scores').select('topic, score')
      .eq('user_id', userId).lt('score', 0.6).order('score', { ascending: true }).limit(3);
    return (data ?? []).map(d => d.topic);
  } catch { return []; }
};

export const getUserProfile = async (userId: string) => {
  try {
    const { data } = await supabase.from('profiles').select('email, total_questions')
      .eq('id', userId).single();
    return data ?? { email: '', total_questions: 0 };
  } catch { return { email: '', total_questions: 0 }; }
};

export const updateUserProfile = async (userId: string, email: string) => {
  try {
    const { data: existing } = await supabase.from('profiles').select('total_questions')
      .eq('id', userId).single();
    if (existing) {
      await supabase.from('profiles').update({
        total_questions: existing.total_questions + 1,
        last_active: new Date().toISOString(),
      }).eq('id', userId);
    } else {
      await supabase.from('profiles').insert({
        id: userId, email, total_questions: 1, last_active: new Date().toISOString(),
      });
    }
  } catch (err) { console.warn('[memory] updateUserProfile failed:', err); }
};

export const getTopicScores = async (userId: string) => {
  try {
    const { data } = await supabase.from('topic_scores').select('topic, score, attempts')
      .eq('user_id', userId).order('score', { ascending: false }).limit(10);
    return data ?? [];
  } catch { return []; }
};

export const getDynamicSuggestions = async (userId: string, currentTopics: string[]) => {
  try {
    const topicScores = await getTopicScores(userId);
    const struggleTopics = await getStruggleTopics(userId);
    const summary = await getMemorySummary(userId);
    const userProfile = await getUserProfile(userId);
    
    const context = {
      summary: summary.slice(0, 300),
      struggleTopics,
      userProfile: {
        email: userProfile.email,
        totalQuestions: userProfile.total_questions
      },
      topicScores: topicScores.slice(0, 5).map(t => ({
        topic: t.topic,
        score: t.score
      })),
    };
    
    const prompt = `Based on this student's learning context, suggest 3 specific engineering problems or concepts they should practice next. Format as a numbered list. Keep each suggestion under 15 words.\n\nCurrent topics: ${currentTopics.join(', ')}\nRecent struggles: ${struggleTopics.join(', ')}`;
    
    let suggestions = '';
    const messages = [{ role: 'user' as const, content: prompt }];
    for await (const chunk of streamChat(messages, context)) { suggestions += chunk; }
    
    const lines = suggestions.split('\n').filter(line => /^\d+\./.test(line.trim()));
    return lines.slice(0, 3).map(line => line.replace(/^\d+\.\s*/, '').trim());
  } catch { return []; }
};
