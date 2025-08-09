import React from 'react';
import SoundWave from './SoundWave';

interface HeroProps {
  onJoinClick: () => void;
}

const Hero: React.FC<HeroProps> = ({ onJoinClick }) => {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-transparent"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          <span className="text-white">Join or Create</span>
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            Small Gay Outings
          </span>
        </h1>
        
        <SoundWave />
        
        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
          Find friends to go together to gay bars, clubs, festivals and more.<br></br>
          Small group, safe, and fun.
        </p>
        
        <button 
          onClick={onJoinClick}
          className="inline-flex items-center px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-semibold rounded-full transition-all duration-200 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
        >
          Join the GGBang
        </button>
        
      </div>
    </section>
  );
};

export default Hero;