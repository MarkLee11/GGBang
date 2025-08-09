import React from 'react';

const SoundWave: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-1 my-8" role="img" aria-label="Pride celebration animation">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full animate-pulse ${
            i % 6 === 0 ? 'bg-red-500' :
            i % 6 === 1 ? 'bg-orange-500' :
            i % 6 === 2 ? 'bg-yellow-500' :
            i % 6 === 3 ? 'bg-green-500' :
            i % 6 === 4 ? 'bg-blue-500' :
            'bg-purple-500'
          }`}
          style={{
            width: '3px',
            height: `${Math.random() * 50 + 15}px`,
            animationDelay: `${i * 50}ms`,
            animationDuration: `${600 + Math.random() * 600}ms`,
          }}
        />
      ))}
    </div>
  );
};

export default SoundWave;