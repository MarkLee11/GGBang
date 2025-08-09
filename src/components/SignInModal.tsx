import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { authService } from '../lib/auth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignUp: () => void;
}

const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSwitchToSignUp }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { user, error } = await authService.signIn({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        throw error;
      }

      if (user) {
        // Success - close modal
        onClose();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: '',
        password: ''
      });
      setShowPassword(false);
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-modal-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 id="signin-title" className="text-2xl font-bold text-white">
            Welcome Back
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Welcome Message */}
        <div className="p-6 pb-4 text-center">
          <div className="w-12 h-12 bg-purple-500/20 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn size={20} className="text-purple-400" />
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Sign in to your account to discover and create amazing Gay events in your community.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
          {/* Error Message */}
          {submitError && (
            <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{submitError}</p>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="signin-email" className="flex items-center text-sm font-medium text-gray-300 mb-2">
              <Mail size={16} className="mr-2 text-purple-500" />
              Email Address *
            </label>
            <input
              type="email"
              id="signin-email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your email address"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="signin-password" className="flex items-center text-sm font-medium text-gray-300 mb-2">
              <Lock size={16} className="mr-2 text-purple-500" />
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="signin-password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200"
            >
              Forgot your password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:transform-none disabled:shadow-none"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>

          {/* Sign Up Link */}
          <div className="text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignInModal;