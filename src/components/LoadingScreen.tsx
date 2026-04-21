import React from 'react';
import { motion } from 'motion/react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        {/* EngiAI Logo */}
        <div className="w-20 h-20 rounded-2xl eng-gradient flex items-center justify-center font-bold text-black text-3xl shadow-2xl shadow-accent/20">
          E
        </div>

        {/* Loading Text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[#e2e8f0] text-lg font-medium"
        >
          Loading your workspace...
        </motion.p>

        {/* Loading Dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: i * 0.2,
                repeat: Infinity,
                repeatType: "reverse",
                duration: 1.2,
              }}
              className="w-2 h-2 bg-[#00d4ff] rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
