// Design reference: Skiper UI & Zero UI input field style
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InputField({ 
  label, 
  type = 'text', 
  id, 
  placeholder, 
  value, 
  onChange, 
  required = false,
  error = ''
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const currentType = isPassword ? (showPassword ? 'text' : 'password') : type;

  // Determine leading left icon
  const renderLeftIcon = () => {
    const iconClass = "w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 text-slate-400 transition-colors duration-300 group-focus-within:text-emerald-500";
    if (isPassword) {
      return <Lock className={iconClass} strokeWidth={2} />;
    }
    return <Mail className={iconClass} strokeWidth={2} />;
  };

  return (
    <div className="w-full flex flex-col gap-1 xs:gap-1.5 sm:gap-2 text-left">
      {/* Label */}
      <label 
        htmlFor={id} 
        className="text-[10px] xs:text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-500 select-none pl-0.5 transition-colors duration-300 group-focus-within:text-emerald-600"
      >
        {label}
      </label>
      
      <div className="relative group flex items-center">
        {/* Left Side Icon */}
        <div className="absolute left-3 xs:left-3.5 sm:left-4 pointer-events-none flex items-center justify-center">
          {renderLeftIcon()}
        </div>

        {/* Input box: Height 42px on small mobile, 44px on xs/sm, 48px on sm, 52px on desktop */}
        <input
          id={id}
          type={currentType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full h-[42px] xs:h-[44px] sm:h-[48px] md:h-[52px] pl-9 xs:pl-10 sm:pl-12 pr-9 xs:pr-10 sm:pr-12 bg-slate-50/60 hover:bg-slate-50 border ${
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10'
          } text-slate-800 placeholder:text-slate-400 text-[13px] xs:text-[13.5px] sm:text-base rounded-xl focus:bg-white focus:outline-none focus:ring-4 transition-all duration-300 shadow-sm`}
        />

        {/* Right Side Password Visibility Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-1.5 xs:right-2 sm:right-2.5 flex items-center justify-center w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-lg text-slate-400 hover:text-slate-600 focus:text-emerald-500 focus:outline-none hover:bg-slate-100 transition-all duration-200 cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={showPassword ? 'eye-off' : 'eye'}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.12 }}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5" strokeWidth={1.8} />
                ) : (
                  <Eye className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5" strokeWidth={1.8} />
                )}
              </motion.div>
            </AnimatePresence>
          </button>
        )}
      </div>

      {/* Input validation error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-rose-500 mt-0.5 pl-1 font-semibold"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
