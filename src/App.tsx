import React, { useState } from 'react';
import { MainApp } from './components/MainApp';
import { SupabaseUser } from './lib/supabase';
import { ThreeBackground } from './components/ThreeBackground';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  return (
    <div className="relative min-h-screen">
      <ThreeBackground />
      {user ? <MainApp user={user} /> : <LoginScreen onLogin={setUser} />}
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

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-3xl font-bold text-white mb-2">EngiAI</h1>
          <p className="text-gray-400">Your AI engineering co-pilot</p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">

          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:bg-white/15 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/60 focus:bg-white/15 focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-40"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <p
            className="text-center text-gray-400 text-sm cursor-pointer hover:text-cyan-400 transition-colors"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </p>
        </form>
      </div>
    </div>
  );
}
