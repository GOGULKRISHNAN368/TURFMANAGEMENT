// Design references: Skiper UI, Animista, Zero UI, and MotionSite
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import TurfHubLogo from '../components/TurfHubLogo';
import InputField from '../components/InputField';
import GoogleButton from '../components/GoogleButton';
import AuthFooter from '../components/AuthFooter';
import turfHeroImage from '../assets/turf_hero.jpg';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authMessage, setAuthMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  const validate = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setAuthMessage(null);

    // Simulate authenticating against an API
    setTimeout(() => {
      setIsLoading(false);
      setAuthMessage({
        type: 'success',
        text: 'Welcome back to Turf Hub! Redirecting to dashboard...'
      });
    }, 1800);
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setAuthMessage(null);
    setTimeout(() => {
      setIsLoading(false);
      setAuthMessage({
        type: 'success',
        text: 'Successfully authenticated with Google account!'
      });
    }, 1500);
  };

  const handleForgotPassword = () => {
    setAuthMessage({
      type: 'success',
      text: 'Password reset link sent! Check your inbox for instructions.'
    });
  };

  const handleSignUpClick = () => {
    setAuthMessage({
      type: 'success',
      text: 'Account creation flow initiated! (This is a demo application)'
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-[#f8fafc] flex flex-col md:flex-row select-none overflow-x-hidden">
      
      {/* 1. DESKTOP HERO & LEFT SIDE PANEL (Visible on >= 768px md breakpoint) */}
      <div className="relative hidden md:flex md:flex-1 h-screen sticky top-0 overflow-hidden bg-white select-none">
        {/* Dynamic High-Resolution Turf Action Graphic */}
        <img 
          src={turfHeroImage} 
          alt="Turf Hub sports player on field" 
          className="absolute inset-0 w-full h-full object-cover object-left"
        />

        {/* Soft top-left gradient backing to guarantee 100% sharp contrast for the left logo */}
        <div className="absolute top-0 left-0 w-[460px] h-[260px] bg-gradient-to-br from-white/95 via-white/60 to-transparent pointer-events-none z-10" />

        {/* Right edge smooth blend gradient into #f8fafc background */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to right, transparent 55%, rgba(248, 250, 252, 0.75) 80%, #f8fafc 100%)'
          }}
        />

        {/* Tactical pitch markings overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] text-emerald-800 pointer-events-none z-10">
          <svg className="w-[120%] h-[120%] stroke-current" viewBox="0 0 600 600" fill="none" strokeWidth="1.5">
            <circle cx="300" cy="300" r="120" />
            <line x1="300" y1="0" x2="300" y2="600" />
            <rect x="0" y="100" width="120" height="400" />
            <rect x="480" y="100" width="120" height="400" />
          </svg>
        </div>

        {/* Dynamic green motion trails */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none z-10" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M-50,420 C180,520 380,260 880,360" stroke="url(#emerald-gradient)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M-10,480 C240,580 440,310 940,410" stroke="url(#emerald-gradient)" strokeWidth="1.2" strokeLinecap="round" />
          <defs>
            <linearGradient id="emerald-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>

        {/* LEFT PANEL BRANDING: High-Resolution TURF HUB Logo & Decorative Dot Grid */}
        <div className="absolute top-[36px] left-[40px] z-20 flex flex-col items-start pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <TurfHubLogo size="lg" />
          </motion.div>
          
          <div className="mt-6 opacity-[0.25] text-slate-400">
            <svg width="48" height="64" fill="currentColor">
              <pattern id="dot-pattern-desktop" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#dot-pattern-desktop)" />
            </svg>
          </div>
        </div>
      </div>

      {/* 2. MAIN LOGIN CARD CONTAINER (Centered on mobile below 768px, right-side on >= 768px) */}
      <div className="relative flex flex-col w-full md:w-[50%] lg:w-[44%] xl:w-[40%] 2xl:w-[38%] min-h-screen items-center justify-center px-4 py-8 xs:px-5 sm:px-6 sm:py-10 md:p-8 lg:p-10 xl:p-12 z-10 flex-1">
        
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          
          {/* Prominent White Login Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-[0_8px_30px_rgba(15,23,42,0.035)] sm:shadow-[0_12px_40px_rgba(15,23,42,0.045)] p-5 xs:p-6 sm:p-7 md:p-8 lg:p-10 flex flex-col gap-3.5 xs:gap-4 sm:gap-4.5 md:gap-6 relative overflow-hidden">
            
            {/* The TURF HUB Logo inside Login Card */}
            <div className="flex justify-center mb-0 sm:mb-0.5">
              <TurfHubLogo size="md" />
            </div>

            {/* Typography Header */}
            <div className="flex flex-col gap-1 sm:gap-1.5 text-center">
              <h1 className="text-[22px] xs:text-[24px] sm:text-[26px] md:text-[28px] lg:text-[30px] font-extrabold tracking-tight text-slate-800 leading-tight">
                Welcome back!
              </h1>
              <p className="text-xs xs:text-[13px] sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xs sm:max-w-sm mx-auto">
                Sign in to book turfs, find players and manage your games.
              </p>
            </div>

            {/* Dynamic Banner Alert messages */}
            <AnimatePresence mode="wait">
              {authMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className={`p-2.5 xs:p-3 sm:p-3.5 rounded-xl text-xs sm:text-sm border flex flex-col gap-0.5 overflow-hidden select-none ${
                    authMessage.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                      : 'bg-rose-50 border-rose-100 text-rose-800'
                  }`}
                >
                  <p className="font-semibold leading-relaxed">{authMessage.text}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Fields */}
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-2.5 xs:gap-3 sm:gap-3.5 md:gap-4">
              
              {/* Email address */}
              <InputField
                label="Email address"
                type="email"
                id="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                required
              />

              {/* Password */}
              <InputField
                label="Password"
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={passwordError}
                required
              />

              {/* Options: Remember me & Forgot password */}
              <div className="flex items-center justify-between gap-2 select-none py-0.5 font-bold">
                {/* Remember Me Checkbox */}
                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group text-slate-400 hover:text-slate-600 transition-colors">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    {/* Custom Checkbox Design */}
                    <div className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-[18px] sm:h-[18px] rounded-md border border-slate-200 bg-white group-focus-within:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center shadow-sm">
                      <svg
                        className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-white scale-0 peer-checked:scale-100 transition-transform duration-200"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-[11px] xs:text-xs sm:text-sm font-semibold text-slate-400 group-hover:text-slate-500">Remember me</span>
                </label>

                {/* Forgot Password Link */}
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] xs:text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded px-1 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary button: Sign In (Emerald green styling matching reference layout) */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="btn-shine w-full h-[42px] xs:h-[44px] sm:h-[48px] md:h-[52px] mt-0.5 flex items-center justify-center gap-2 bg-[#00a859] hover:bg-[#00924d] hover:-translate-y-0.5 text-white font-bold text-xs xs:text-sm sm:text-base rounded-xl cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-500/25 disabled:opacity-75 disabled:cursor-wait select-none transition-all duration-300 shadow-md shadow-emerald-500/20 group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="inline-flex items-center justify-center border border-white/30 rounded-full w-5 h-5 sm:w-5.5 sm:h-5.5 ml-0.5 transition-transform duration-300 group-hover:translate-x-0.5">
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
                    </span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Separator OR */}
            <div className="relative flex py-0 items-center select-none">
              <div className="flex-grow border-t border-slate-100" />
              <span className="flex-shrink mx-3 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                or
              </span>
              <div className="flex-grow border-t border-slate-100" />
            </div>

            {/* Google OAuth Login */}
            <GoogleButton onClick={handleGoogleSignIn} disabled={isLoading} />

            {/* Footer containing Link & Security Shield Badge */}
            <AuthFooter onSignUpClick={handleSignUpClick} />

          </div>
          
        </motion.div>
        
      </div>
      
    </div>
  );
}
