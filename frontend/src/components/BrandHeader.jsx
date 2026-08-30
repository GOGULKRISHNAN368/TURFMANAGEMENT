// Design reference: Ziro (minimal modern brand pill) & Animista (tracking-in-expand logo animation)
import React from 'react';
import { motion } from 'framer-motion';

export default function BrandHeader() {
  return (
    <div className="flex flex-col items-center text-center">

      {/* Brand Logo & Glowing Glass Badge */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl font-bold text-white font-sports select-none tracking-widest animate-tracking-in-expand">
          TURFORA
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 shadow-sm backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          <span className="text-[9px] font-extrabold text-zinc-400 tracking-wider uppercase">BOOKING</span>
        </span>
      </div>

      {/* Heading "Welcome Back": extrabold, tracking-tight */}
      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        Welcome Back
      </h1>

      {/* Subtitle: clean premium sans-serif */}
      <p className="mt-3 text-sm text-zinc-400 max-w-sm sm:text-base leading-relaxed">
        Sign in to manage your turf bookings and schedule.
      </p>

    </div>
  );
}
