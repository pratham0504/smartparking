import React from 'react';
import PropTypes from 'prop-types';

const ClaimStatusBadge = ({ status, size = 'md', animated = false }) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          label: 'En attente',
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: (
            <svg className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          animation: animated ? 'animate-pulse' : ''
        };
      case 'resolved':
        return {
          label: 'Résolu',
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: (
            <svg className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        };
      case 'in_progress':
        return {
          label: 'En cours',
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: (
            <svg className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        };
      case 'rejected':
        return {
          label: 'Rejeté',
          bg: 'bg-red-100',
          text: 'text-red-800',
          icon: (
            <svg className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        };
      default:
        return {
          label: status || 'Non défini',
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: (
            <svg className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  const { label, bg, text, icon, animation } = getStatusConfig();
  
  return (
    <span className={`${bg} ${text} ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1'} rounded-full font-semibold flex items-center gap-1 ${animation}`}>
      {icon}
      {label}
    </span>
  );
};

ClaimStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  animated: PropTypes.bool
};

export default React.memo(ClaimStatusBadge);
