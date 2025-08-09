import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authService } from '../lib/auth';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSwitchToSignIn }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
    
    // Reset states
    setSubmitError(null);
    setSubmitSuccess(false);
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
    }
    
    // Validate password length
    if (formData.password.length < 6) {
      setSubmitError('Password must be at least 6 characters long');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const { user, error } = await authService.signUp({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (error) {
        throw error;
      }

      if (user) {
        setSubmitSuccess(true);
        // Show success message briefly, then close modal
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsSubmitting(false);
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-title"
    >
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-modal-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 id="signup-title" className="text-2xl font-bold text-white">
            Join the GGBang
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
            <User size={20} className="text-purple-400" />
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Join thousands of community members discovering amazing Gay events. Create your account to get started!
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

          {/* Success Message */}
          {submitSuccess && (
            <div className="p-4 bg-green-900/50 border border-green-500/50 rounded-lg">
              <p className="text-green-400 text-sm">Account created successfully! Welcome to GGBang!</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label htmlFor="signup-name" className="flex items-center text-sm font-medium text-gray-300 mb-2">
              <User size={16} className="mr-2 text-purple-500" />
              Full Name *
            </label>
            <input
              type="text"
              id="signup-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="signup-email" className="flex items-center text-sm font-medium text-gray-300 mb-2">
              <Mail size={16} className="mr-2 text-purple-500" />
              Email Address *
            </label>
            <input
              type="email"
              id="signup-email"
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
            <label htmlFor="signup-password" className="flex items-center text-sm font-medium text-gray-300 mb-2">
              <Lock size={16} className="mr-2 text-purple-500" />
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="signup-password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Create a password"
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

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="signup-confirm-password" className="flex items-center text-sm font-medium text-gray-300 mb-2">
              <Lock size={16} className="mr-2 text-purple-500" />
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="signup-confirm-password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Terms and Privacy */}
          <div className="text-xs text-gray-400 leading-relaxed">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors duration-200">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors duration-200">
              Privacy Policy
            </a>
            .
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:transform-none disabled:shadow-none"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Login Link */}
          <div className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-purple-400 hover:text-purple-300 transition-colors duration-200 font-medium"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;