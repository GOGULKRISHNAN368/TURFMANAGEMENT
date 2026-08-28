import React from 'react';

export default function TurfHubLogo({ size = 'md', className = '' }) {
  const iconSizeClass = 
    size === 'lg' 
      ? 'w-11 h-11 sm:w-12 sm:h-12' 
      : size === 'sm' 
        ? 'w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6' 
        : 'w-7 h-7 sm:w-8.5 sm:h-8.5 md:w-10 md:h-10';

  const textSizeClass = 
    size === 'lg' 
      ? 'text-2xl sm:text-3xl' 
      : size === 'sm' 
        ? 'text-[13px] xs:text-[14px] sm:text-base' 
        : 'text-lg sm:text-xl md:text-2xl';

  const taglineSizeClass = 
    size === 'lg' 
      ? 'text-[9px] sm:text-[10px]' 
      : size === 'sm' 
        ? 'text-[5.5px] xs:text-[6px] sm:text-[6.5px]' 
        : 'text-[7px] sm:text-[8px] md:text-[9px]';

  const gapClass =
    size === 'lg'
      ? 'gap-3'
      : size === 'sm'
        ? 'gap-1.5 xs:gap-2 sm:gap-2.5'
        : 'gap-2 sm:gap-2.5 md:gap-3';

  return (
    <div className={`flex items-center ${gapClass} select-none ${className}`}>
      {/* Dynamic Speed Soccer Ball SVG Icon */}
      <svg 
        className={`${iconSizeClass} text-emerald-500 flex-shrink-0`}
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Speed lines trailing to the left */}
        <path 
          d="M4 14H16M2 24H20M5 34H18" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Soccer ball outer circle */}
        <circle 
          cx="33" 
          cy="24" 
          r="11" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Soccer ball panel markings */}
        {/* Center Pentagon */}
        <path 
          d="M33 20L36 22L35 25.5H31L30 22L33 20Z" 
          fill="currentColor" 
        />
        
        {/* Radiating panel lines */}
        <path 
          d="M33 20V13M36 22L42.5 19.5M35 25.5L39.5 31M31 25.5L26.5 31M30 22L23.5 19.5" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>

      {/* Brand Text Column */}
      <div className="flex flex-col items-start leading-none">
        <div className={`flex items-center font-extrabold ${textSizeClass} tracking-tight font-sans`}>
          <span className="text-slate-800">TURF</span>
          <span className="text-emerald-500 ml-1">HUB</span>
        </div>
        <span className={`font-sports ${taglineSizeClass} font-bold tracking-[0.2em] sm:tracking-[0.22em] text-slate-400 mt-0.5 sm:mt-1 uppercase`}>
          Play • Book • Win
        </span>
      </div>
    </div>
  );
}
