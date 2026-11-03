import React, { useState } from 'react';

export const DEFAULT_IFLEX_LOGO_URL = 'https://i.ibb.co/gnKfwcq/1000320493.png';

interface IFlexLogoProps {
  variant?: 'dark-on-light' | 'light-on-dark';
  customLogoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const IFlexLogo: React.FC<IFlexLogoProps> = ({
  variant = 'dark-on-light',
  customLogoUrl = DEFAULT_IFLEX_LOGO_URL,
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  const dimensions = {
    sm: { box: 'h-8 w-auto max-w-[120px]', svgBox: 'w-7 h-7', text: 'text-lg' },
    md: { box: 'h-9 w-auto max-w-[140px]', svgBox: 'w-9 h-9', text: 'text-xl' },
    lg: { box: 'h-12 w-auto max-w-[170px]', svgBox: 'w-11 h-11', text: 'text-2xl' },
  }[size];

  const isLightOnDark = variant === 'light-on-dark';
  const activeLogoUrl = customLogoUrl || DEFAULT_IFLEX_LOGO_URL;

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      {!imgError && activeLogoUrl ? (
        <img
          src={activeLogoUrl}
          alt="IFlex Logo"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${dimensions.box} object-contain rounded-md`}
        />
      ) : (
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${dimensions.svgBox} shrink-0`}
          aria-hidden="true"
        >
          <rect
            width="40"
            height="40"
            rx="10"
            fill={isLightOnDark ? '#1D4ED8' : '#090D16'}
          />
          <path
            d="M8 10C8 8.89543 8.89543 8 10 8H14C15.1046 8 16 8.89543 16 10V30C16 31.1046 15.1046 32 14 32H10C8.89543 32 8 31.1046 8 30V10Z"
            fill="#FFFFFF"
          />
          <path
            d="M20 9.5C20 8.67157 20.8954 8.16325 21.6154 8.57465L33.1154 15.1461C33.8547 15.5685 33.8547 16.6345 33.1154 17.0569L21.6154 23.6283C20.8954 24.0397 20 23.5314 20 22.703V9.5Z"
            fill={isLightOnDark ? '#FFFFFF' : '#2563EB'}
          />
          <path
            d="M20 26.5C20 25.6716 20.6716 25 21.5 25H28.5C29.3284 25 30 25.6716 30 26.5V30.5C30 31.3284 29.3284 32 28.5 32H21.5C20.6716 32 20 31.3284 20 30.5V26.5Z"
            fill="#3B82F6"
          />
        </svg>
      )}
      <span
        className={`font-display font-extrabold tracking-tight ${dimensions.text} ${
          isLightOnDark ? 'text-white' : 'text-[#090D16]'
        }`}
      >
        I<span className="text-[#2563EB]">Flex</span>
      </span>
    </span>
  );
};
