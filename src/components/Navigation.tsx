import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, User, Calendar, Plus, LogIn, LogOut } from 'lucide-react';
import { authService } from '../lib/auth';

interface NavigationProps {
  onCreateEventClick: () => void;
  onSignInClick: () => void;
  onJoinClick: () => void;
  onCommunityClick: () => void;
  onAboutClick: () => void;
  onEditProfileClick: () => void;
  user?: any;
}

const Navigation: React.FC<NavigationProps> = ({ onCreateEventClick, onSignInClick, onJoinClick, onCommunityClick, onAboutClick, onEditProfileClick, user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      navigate('/'); // Redirect to home after sign out
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleEventsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If we're already on the homepage, just scroll to events
    if (location.pathname === '/') {
      document.getElementById('events')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      // If we're on another page, navigate to homepage first, then scroll
      navigate('/');
      // Small delay to ensure page loads before scrolling
      setTimeout(() => {
        document.getElementById('events')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  };
  return (
    <nav className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <button 
                onClick={onAboutClick}
                className="text-2xl font-bold text-white hover:text-purple-400 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black rounded-lg px-2 py-1"
              >
                GG<span className="text-purple-500">Bang</span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={handleEventsClick}
              className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2"
            >
              <Calendar size={18} />
              <span>Events</span>
            </button>
            <button
              onClick={onCreateEventClick}
              className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 px-4 py-2 rounded-lg border border-purple-500/30 hover:border-purple-500/50"
            >
              <Plus size={18} />
              <span>Create Event</span>
            </button>
            <button
              onClick={onCommunityClick}
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              Community
            </button>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={onEditProfileClick}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-200 bg-gray-800/50 hover:bg-gray-700/50 px-3 py-2 rounded-lg border border-gray-700 hover:border-purple-500/30"
                >
                  <User size={18} />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors duration-200 bg-gray-800/50 hover:bg-red-900/20 px-3 py-2 rounded-lg border border-gray-700 hover:border-red-500/30"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={onSignInClick}
                  className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2"
                >
                  <LogIn size={18} />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={onJoinClick}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Join Now
                </button>
              </div>
            )}
            
            <button 
              onClick={onCommunityClick}
              className="md:hidden text-gray-300 hover:text-white transition-colors duration-200 p-2 rounded-lg hover:bg-gray-800"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;