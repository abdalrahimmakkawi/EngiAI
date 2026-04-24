import React, { useState } from 'react';
import { MainApp } from './components/MainApp';
import { SupabaseUser } from './lib/supabase';
import { ThreeBackground } from './components/ThreeBackground';

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  return (
    <div className="relative min-h-screen">
      <ThreeBackground />
      {user ? <MainApp user={user} /> : <LoginScreen onLogin={setUser} />}
    </div>
  );
}

import { supabase } from './lib/supabase';

function LoginScreen({ onLogin }: { onLogin: (u: SupabaseUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { data } = await supabase.auth.signUp({ email, password });
        if (data.user) onLogin({ id: data.user.id, email: data.user.email });
      } else {
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        if (data.user) onLogin({ id: data.user.id, email: data.user.email });
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-3xl font-bold text-white mb-2">EngiAI</h1>
          <p className="text-[#64748b]">Your AI engineering co-pilot</p>
        </div>
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[#64748b] focus:border-cyan-500/50 outline-none" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-[#64748b] focus:border-cyan-500/50 outline-none" />
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50">
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          <p className="text-center text-[#64748b] text-sm cursor-pointer hover:text-cyan-400" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </p>
        </form>
      </div>
    </div>
  );
}
