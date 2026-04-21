import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {}

export const AuthScreen: React.FC<AuthScreenProps> = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (error) {
        setError(error.message);
      } else {
        setError('Check your email to confirm your account');
        setIsSignUp(false);
      }
    } catch (err) {
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      await supabase.auth.resetPasswordForEmail(email);
      setError('Password reset email sent');
    } catch (err) {
      setError('Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-xl eng-gradient flex items-center justify-center font-bold text-black text-2xl shadow-lg shadow-accent/20">
              E
            </div>
          </div>

          {/* Tagline */}
          <p className="text-center text-[#64748b] text-sm mb-8">
            Your AI-powered engineering study partner
          </p>

          {/* Tab Switcher */}
          <div className="flex mb-6 bg-[#1a1a2e] rounded-lg p-1">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 text-sm font-medium transition-colors rounded-md ${
                !isSignUp 
                  ? 'bg-[#00d4ff] text-black' 
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 text-sm font-medium transition-colors rounded-md ${
                isSignUp 
                  ? 'text-[#64748b] hover:text-white' 
                  : 'bg-[#00d4ff] text-black'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Forms */}
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-[#e2e8f0] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent"
                  placeholder="Enter your full name"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#e2e8f0] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e2e8f0] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-[#1a1a2e] border border-white/10 rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#64748b] hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-[#e2e8f0] mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 eng-gradient text-black font-medium rounded-lg shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Processing...
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Forgot Password */}
          {!isSignUp && (
            <div className="mt-6 text-center">
              <button
                onClick={handleForgotPassword}
                className="text-[#00d4ff] hover:text-[#00d4ff]/80 text-sm font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
