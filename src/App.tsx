import React, { useState } from 'react';
import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import EventGrid from './components/EventGrid';
import UserProfile from './components/UserProfile';
import CreateEventModal from './components/CreateEventModal';
import SignupModal from './components/SignupModal';
import SignInModal from './components/SignInModal';
import CommunityModal from './components/CommunityModal';
import AboutModal from './components/AboutModal';
import { useRef } from 'react';
import { authService } from './lib/auth';

function App() {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const eventGridRef = useRef<{ refetch: () => void } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing user session on app load
  useEffect(() => {
    const checkUser = async () => {
      const { user } = await authService.getCurrentUser();
      setUser(user);
      setIsLoading(false);
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate, isLoading]);

  const handleCreateEventClick = () => {
    setIsCreateEventModalOpen(true);
  };

  const handleCloseCreateEventModal = () => {
    setIsCreateEventModalOpen(false);
  };

  const handleJoinClick = () => {
    setIsSignupModalOpen(true);
  };

  const handleCommunityClick = () => {
    setIsCommunityModalOpen(true);
  };

  const handleCloseCommunityModal = () => {
    setIsCommunityModalOpen(false);
  };

  const handleAboutClick = () => {
    setIsAboutModalOpen(true);
  };

  const handleCloseAboutModal = () => {
    setIsAboutModalOpen(false);
  };

  const handleCloseSignupModal = () => {
    setIsSignupModalOpen(false);
  };

  const handleSignInClick = () => {
    setIsSignInModalOpen(true);
  };

  const handleCloseSignInModal = () => {
    setIsSignInModalOpen(false);
  };

  const handleEventCreated = () => {
    // Refresh the events list when a new event is created
    if (eventGridRef.current) {
      eventGridRef.current.refetch();
    }
    
    // Force a page refresh to update all components
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleClearFilters = () => {
    // This function can be used to coordinate filter clearing across components
    // Currently handled within EventGrid, but available for future enhancements
  };

  const handleSwitchToSignIn = () => {
    setIsSignupModalOpen(false);
    setIsSignInModalOpen(true);
  };

  const handleSwitchToSignUp = () => {
    setIsSignInModalOpen(false);
    setIsSignupModalOpen(true);
  };

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation 
        onCreateEventClick={handleCreateEventClick} 
        onSignInClick={handleSignInClick} 
        onJoinClick={handleJoinClick} 
        onCommunityClick={handleCommunityClick}
        onAboutClick={handleAboutClick}
        user={user} 
      />
      
      <Routes>
        <Route path="/" element={
          <>
            <main>
              <Hero onJoinClick={handleJoinClick} />
              <EventGrid 
                ref={eventGridRef} 
                user={user} 
                onJoinClick={handleJoinClick}
                onClearFilters={handleClearFilters}
              />
            </main>
            
            {/* Footer */}
            <footer className="bg-gray-900 border-t border-gray-800 py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-4">
                      GG<span className="text-purple-500">Bang</span>
                    </h3>
                    <p className="text-gray-400 mb-4 max-w-md mx-auto">
                      Your safe space to meet friends and go out together.
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400">
                      Contact us: <a href="mailto:Aa1439422778@gmail.com" className="text-purple-400 hover:text-purple-300 transition-colors">Aa1439422778@gmail.com</a>
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                  <p>&copy; 2025 GGBang. Made with ❤️ for the Gay community.</p>
                </div>
              </div>
            </footer>
          </>
        } />
        <Route path="/profile" element={<UserProfile user={user} onCreateEventClick={handleCreateEventClick} />} />
        <Route path="/profile" element={<UserProfile user={user} onCreateEventClick={handleCreateEventClick} />} />
        <Route path="/debug" element={
          <div className="min-h-screen bg-black text-white p-8">
            <h1>Debug Info</h1>
            <p>handleCreateEventClick function: {typeof handleCreateEventClick}</p>
            <button 
              onClick={() => {
                console.log('Direct test of handleCreateEventClick');
                handleCreateEventClick();
              }}
              className="bg-purple-600 px-4 py-2 rounded"
            >
              Test handleCreateEventClick directly
            </button>
          </div>
        } />
      </Routes>
      
      <CreateEventModal 
        isOpen={isCreateEventModalOpen}
        onClose={handleCloseCreateEventModal}
        onEventCreated={handleEventCreated}
      />
      
      <SignupModal 
        isOpen={isSignupModalOpen}
        onClose={handleCloseSignupModal}
        onSwitchToSignIn={handleSwitchToSignIn}
      />
      
      <SignInModal 
        isOpen={isSignInModalOpen}
        onClose={handleCloseSignInModal}
        onSwitchToSignUp={handleSwitchToSignUp}
      />
      
      <CommunityModal 
        isOpen={isCommunityModalOpen}
        onClose={handleCloseCommunityModal}
        user={user}
        onJoinClick={handleJoinClick}
      />
      
      <AboutModal 
        isOpen={isAboutModalOpen}
        onClose={handleCloseAboutModal}
      />
    </div>
  );
}

export default App;