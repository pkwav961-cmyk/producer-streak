import React from 'react';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 16, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 select-none ${className}`}
      style={{ verticalAlign: 'middle' }}
    >
      {/* Premium Instagram Blue Scalloped Badge Background */}
      <path
        d="M12 22.75c-.2 0-.39-.08-.53-.22l-2.29-2.29-3.18.42c-.2.03-.4-.03-.55-.17a.78.78 0 0 1-.22-.52l-.12-3.2-2.27-2.26a.72.72 0 0 1 0-1.06l2.27-2.27.12-3.19c0-.2.08-.39.22-.53s.35-.2.55-.17l3.18.42 2.29-2.29c.29-.3.77-.3 1.06 0l2.29 2.29 3.18-.42c.2-.03.4.03.55.17s.22.34.22.53l.12 3.19 2.27 2.27c.29.3.29.77 0 1.06l-2.27 2.26-.12 3.2c0 .2-.08.39-.22.52a.79.79 0 0 1-.55.17l-3.18-.42-2.29 2.29c-.14.14-.33.22-.53.22z"
        fill="#0095f6"
      />
      {/* Official White Checkmark */}
      <path
        d="M9.5 15.5l-2.5-2.5a.75.75 0 0 1 1.06-1.06L9.5 13.38l5.44-5.44a.75.75 0 1 1 1.06 1.06l-6 6a.75.75 0 0 1-1.06 0z"
        fill="#ffffff"
      />
    </svg>
  );
};
