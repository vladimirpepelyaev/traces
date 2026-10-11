import React from 'react';

interface ItdLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const ItdLogo: React.FC<ItdLogoProps> = ({
  className = "text-[#1a1a1a]",
  width = 36,
  height = 18
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 36 18"
      fill="none"
      className={className}
      aria-label="Следы"
    >
      <path fill="currentColor" d="M12 3V0h12v3h-4v11h-4V3h-4Z" />
      <path fill="currentColor" d="M12 3V0h12v3h-4v11h-4V3h-4ZM9 0 3 9V0H0v14h3l6-9v9h3V0H9Z" />
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M34 11h2v7h-3v-4h-9v4h-3v-7c3 0 3-4 3-11h10v11Zm-7-8v8h4V3h-4Z"
      />
    </svg>
  );
};
