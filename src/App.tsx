import React, { useState } from 'react';
import { MainApp } from './components/MainApp';
import { SupabaseUser } from './lib/supabase';
import { ThreeBackground } from './components/ThreeBackground';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0">
        <ThreeBackground />
      </div>
      <div className="relative z-10">
        {user ? <MainApp user={user} /> : <LoginScreen onLogin={setUser} />}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (u: SupabaseUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
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
          <p className="text-gray-400">Your AI engineering co-pilot</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-5" style={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.15)' }}>
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
              style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0' }}
              className="w-full px-4 py-3 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-400/70 focus:ring-1 focus:ring-cyan-400/30 transition-all" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0' }}
              className="w-full px-4 py-3 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-400/70 focus:ring-1 focus:ring-cyan-400/30 transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-40">
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          <p className="text-center text-gray-400 text-sm cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </p>
        </form>
      </div>
    </div>
  );
}