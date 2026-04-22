import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const RecentTopics: React.FC = () => {
  const [topics, setTopics] = useState<any[]>([]);

  const fetchTopics = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('sessions')
      .select('id, topic, last_active, message_count')
      .order('last_active', { ascending: false })
      .limit(5);
    if (data) setTopics(data);
  };

  useEffect(() => {
    fetchTopics();
    if (!supabase) return;
    const channel = supabase.channel('updates').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'sessions' }, () => fetchTopics()
    ).subscribe();
    return () => { if (supabase) supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="eng-card rounded-2xl p-5 flex flex-col shadow-2xl flex-1 overflow-hidden">
      <h2 className="text-[11px] font-bold uppercase text-[#64748b] mb-4 tracking-[0.2em] flex items-center gap-2">
        <Clock size={12} className="text-accent" /> Recent Topics
      </h2>
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {topics.map((topic) => (
          <div key={topic.id} className="p-3 rounded-xl bg-[#1a1a2e]/30 border border-white/5 cursor-pointer hover:border-accent/40 transition-all group">
            <p className="text-xs font-semibold truncate text-slate-200 group-hover:text-accent">{topic.topic}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-[#64748b] italic">{new Date(topic.last_active).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              <div className="flex items-center gap-1 text-[9px] text-[#64748b]"><MessageSquare size={10} />{topic.message_count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
