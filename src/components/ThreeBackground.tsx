import React from 'react';

export const ThreeBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        background: 'linear-gradient(to bottom, #0a0a0f 0%, #12121f 50%, #0a0a0f 100%)',
        zIndex: 0,
      }}
    />
  );
};