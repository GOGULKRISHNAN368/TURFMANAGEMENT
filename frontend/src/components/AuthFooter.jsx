// Design reference: Zero UI & Skiper UI clean interactive footer
import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AuthFooter({ onSignUpClick }) {
  return (
    <div className="w-full flex flex-col items-center gap-1.5 xs:gap-2 sm:gap-3.5 mt-0 pt-2.5 xs:pt-3 sm:pt-4 border-t border-slate-100">
      {/* Sign Up Link */}
      <p className="text-[11.5px] xs:text-xs sm:text-sm md:text-[15px] text-slate-500 text-center">
        Don’t have an account?{' '}
        <button
          type="button"
          onClick={onSignUpClick}
          className="text-emerald-600 font-bold hover:text-emerald-500 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500/20 rounded px-1 transition-all cursor-pointer"
        >
          Sign up
        </button>
      </p>

      {/* Security Message badge with ShieldCheck icon */}
      <div className="flex items-center justify-center gap-1.5 text-slate-400 select-none text-center px-1">
        <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" strokeWidth={2} />
        <span className="text-[9.5px] xs:text-[10px] sm:text-[11.5px] font-semibold text-slate-400 tracking-wide text-center">
          Your account is protected with secure authentication.
        </span>
      </div>
    </div>
  );
}
