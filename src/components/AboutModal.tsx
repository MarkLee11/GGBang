import React, { useState, useEffect } from 'react';
import { X, Heart, Users, Calendar, MapPin, Sparkles, Star, Zap, Globe, Shield, ArrowRight, Play } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Handle mouse movement for interactive cursor effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.body.getBoundingClientRect();
      setMousePosition({ 
        x: ((e.clientX - rect.left) / window.innerWidth) * 100,
        y: ((e.clientY - rect.top) / window.innerHeight) * 100
      });
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isOpen]);

  // Auto-slide carousel with smooth transitions
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % 4);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Smooth close animation
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const features = [
    {
      icon: Calendar,
      title: "Join or Create Small Outings",
      description: "Find or organize small group activities (usually 2–12 people) to go out together. No big events — just personal, friendly gatherings.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Users,
      title: "Meet Gay Friends in Your City",
      description: "Connect with like-minded gay men, make new friends, and enjoy nights out with people you trust.",
      color: "from-pink-500 to-red-500"
    },
    {
      icon: Shield,
      title: "Safe & Respectful",
      description: "Our community is built on trust, respect, and privacy. Exact locations are shared only with confirmed participants.",
      color: "from-blue-500 to-purple-500"
    },
    {
      icon: Globe,
      title: "Local Focus",
      description: "We focus on your city — not global event listings — so you can quickly find outings you can actually join.",
      color: "from-green-500 to-blue-500"
    }
  ];

  const stats = [
    { number: "2-12", label: "People Per Outing", icon: Users, color: "text-purple-400" },
    { number: "1000+", label: "Monthly Outings", icon: Calendar, color: "text-pink-400" },
    { number: "50+", label: "Cities Active", icon: MapPin, color: "text-blue-400" },
    { number: "Safe", label: "& Trusted", icon: Heart, color: "text-red-400" }
  ];

  const testimonials = [
    {
      text: "I joined a group to go to a gay bar last Friday. Met three new friends and had the best night in ages!",
      author: "Mark T.",
      location: "Berlin"
    },
    {
      text: "I was new in town and found a sauna outing. Everyone was so welcoming.",
      author: "Ken L.",
      location: "Amsterdam"
    },
    {
      text: "Small groups are perfect - you actually get to know people instead of being lost in a crowd.",
      author: "David S.",
      location: "London"
    }
  ];

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/90 backdrop-blur-md' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dynamic gradient background */}
        <div 
          className="absolute inset-0 opacity-30 transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, #8b5cf6 0%, #ec4899 25%, #06b6d4 50%, transparent 70%)`
          }}
        />
        
        {/* Floating particles */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              background: `${
                i % 4 === 0 ? '#8b5cf6' : 
                i % 4 === 1 ? '#ec4899' : 
                i % 4 === 2 ? '#06b6d4' : '#10b981'
              }`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}

        {/* Animated geometric shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 border border-purple-500/30 rounded-full animate-spin-slow opacity-20" />
        <div className="absolute bottom-20 right-20 w-24 h-24 border border-pink-500/30 rotate-45 animate-pulse opacity-20" />
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full animate-bounce opacity-30" />
      </div>

      <div className={`relative w-full max-w-7xl max-h-[95vh] transition-all duration-500 transform ${
        isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'
      }`}>
        <div className="bg-gradient-to-br from-gray-900/95 via-purple-900/30 to-gray-900/95 rounded-3xl border border-purple-500/30 shadow-2xl overflow-hidden backdrop-blur-xl relative">
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 animate-gradient-x" />
          <div className="absolute inset-[2px] rounded-3xl bg-gray-900/90 backdrop-blur-xl" />
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 z-20 p-3 bg-gray-800/80 hover:bg-red-600/80 text-gray-400 hover:text-white rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 hover:scale-110 hover:shadow-lg hover:shadow-red-500/25 group"
            aria-label="Close modal"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <div className="relative overflow-y-auto max-h-[95vh] custom-scrollbar">
            {/* Hero Section */}
            <div className="relative px-8 py-16 text-center overflow-hidden">
              {/* Hero background image with overlay */}
              <div className="absolute inset-0 opacity-20">
                <img 
                  src="https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Pride celebration"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-pink-900/60 to-blue-900/80" />
              </div>
              
              {/* Animated logo with multiple effects */}
              <div className="relative mb-8 z-10">
                <div className="inline-block p-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 backdrop-blur-sm animate-pulse-glow hover:scale-110 transition-all duration-500">
                  <div className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient-x hover:animate-bounce">
                    GG<span className="text-pink-400 animate-pulse">Bang</span>
                  </div>
                </div>
              </div>

              {/* Animated title */}
              <h1 id="about-title" className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
                <span className="inline-block animate-slide-in-left">GGBang</span>{' '}
                <span className="inline-block animate-slide-in-up" style={{ animationDelay: '0.2s' }}>—</span>{' '}
                <span className="inline-block animate-slide-in-right bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" style={{ animationDelay: '0.4s' }}>
                  Small Gay Outings, Big Connections
                </span>
              </h1>
              
              <p className="text-2xl md:text-3xl text-gray-300 mb-12 max-w-5xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                Welcome to GGBang — the platform for creating and joining small gay group outings. Whether it's going to a bar, club, festival, sauna, or a casual social meetup, GGBang is where you find friends to go out together, safely and easily.
              </p>

              {/* Floating icons with staggered animations */}
              <div className="absolute inset-0 pointer-events-none">
                {[Heart, Users, Calendar, Sparkles, Star, Zap].map((Icon, index) => (
                  <Icon
                    key={index}
                    size={32}
                    className="absolute text-purple-400/60 animate-float-random"
                    style={{
                      left: `${15 + index * 12}%`,
                      top: `${20 + Math.sin(index) * 30}%`,
                      animationDelay: `${index * 0.5}s`,
                      animationDuration: `${4 + Math.random() * 3}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Stats Section with counter animations */}
            <div className="px-8 py-16 bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-blue-900/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-shimmer" />
              
              <h2 className="text-4xl font-bold text-center text-white mb-16 animate-fade-in-up">
                Community Highlights
              </h2>
              
              <p className="text-xl text-gray-300 text-center mb-12 max-w-4xl mx-auto">
                Thousands of small outings created and joined every month in cities worldwide.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="text-center group hover:scale-110 transition-all duration-500 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 mb-6 group-hover:shadow-2xl group-hover:shadow-purple-500/50 transition-all duration-500 group-hover:rotate-12">
                      <stat.icon size={32} className={`${stat.color} group-hover:scale-125 transition-all duration-300`} />
                    </div>
                    <div className="text-4xl md:text-5xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors duration-300 animate-counter">
                      {stat.number}
                    </div>
                    <div className="text-gray-400 text-lg group-hover:text-gray-300 transition-colors duration-300">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features Section with hover effects */}
            <div className="px-8 py-16">
              <h2 className="text-4xl font-bold text-center text-white mb-16 animate-fade-in-up">
                Why Choose <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">GGBang</span>?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="group p-8 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 hover:border-purple-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 animate-slide-in-up overflow-hidden relative"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    {/* Animated background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                    
                    <div className="relative z-10 flex items-start space-x-6">
                      <div className="flex-shrink-0 p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 group-hover:shadow-lg group-hover:shadow-purple-500/25 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                        <feature.icon size={32} className="text-purple-400 group-hover:text-pink-400 transition-colors duration-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-purple-400 transition-colors duration-300">
                          {feature.title}
                        </h3>
                        <p className="text-gray-400 leading-relaxed text-lg group-hover:text-gray-300 transition-colors duration-300">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Carousel with smooth transitions */}
            <div className="px-8 py-16 bg-gradient-to-r from-purple-900/20 via-pink-900/10 to-blue-900/20">
              <h2 className="text-4xl font-bold text-center text-white mb-16 animate-fade-in-up">
                Experience the <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Magic</span>
              </h2>
              
              <div className="relative max-w-6xl mx-auto">
                <div className="relative h-80 md:h-96 rounded-3xl overflow-hidden shadow-2xl">
                  {[
                    'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=1200',
                    'https://images.pexels.com/photos/3692748/pexels-photo-3692748.jpeg?auto=compress&cs=tinysrgb&w=1200',
                    'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1200',
                    'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=1200'
                  ].map((image, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-1000 ${
                        currentSlide === index ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`GGBang community ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 via-transparent to-pink-900/60" />
                    </div>
                  ))}
                </div>
                
                {/* Carousel indicators */}
                <div className="flex justify-center mt-8 space-x-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        currentSlide === index 
                          ? 'bg-purple-500 scale-125 shadow-lg shadow-purple-500/50' 
                          : 'bg-gray-600 hover:bg-gray-500 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Testimonials Section */}
            <div className="px-8 py-16">
              <h2 className="text-4xl font-bold text-center text-white mb-16 animate-fade-in-up">
                What Our <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Community Says</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 hover:border-purple-500/50 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <div className="text-gray-300 mb-4 text-lg leading-relaxed">
                      "{testimonial.text}"
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {testimonial.author.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{testimonial.author}</div>
                        <div className="text-gray-400 text-sm">{testimonial.location}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call to Action Footer */}
            <div className="px-8 py-16 bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-blue-900/30 text-center">
              <h2 className="text-4xl font-bold text-white mb-6 animate-fade-in-up">
                Join the <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Community</span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                GGBang is more than just an event listing — it's your safe space to create and join small gay outings, meet new friends, and make nights out even better.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes float-random {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          25% { transform: translateY(-15px) translateX(10px) rotate(90deg); }
          50% { transform: translateY(-30px) translateX(-5px) rotate(180deg); }
          75% { transform: translateY(-10px) translateX(-15px) rotate(270deg); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
          50% { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor; }
        }
        
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes counter {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-gradient-x { animation: gradient-x 3s ease infinite; background-size: 200% 200%; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-random { animation: float-random 8s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-slide-in-left { animation: slide-in-left 0.8s ease-out forwards; opacity: 0; }
        .animate-slide-in-right { animation: slide-in-right 0.8s ease-out forwards; opacity: 0; }
        .animate-slide-in-up { animation: slide-in-up 0.8s ease-out forwards; opacity: 0; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; opacity: 0; }
        .animate-bounce-in { animation: bounce-in 1s ease-out forwards; opacity: 0; }
        .animate-counter { animation: counter 0.8s ease-out forwards; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.8); }
      `}</style>
    </div>
  );
};

export default AboutModal;