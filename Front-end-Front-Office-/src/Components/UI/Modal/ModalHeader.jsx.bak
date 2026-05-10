import React from 'react';
import PropTypes from 'prop-types';

/**
 * Composant d'en-tête standard pour les modals
 * avec titre et bouton de fermeture.
 */
const ModalHeader = React.memo(({ title, onClose, sticky = true }) => {
  return (
    <div 
      className={`${sticky ? 'sticky top-0 z-10 bg-white' : ''} pb-4 border-b border-gray-100`}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          aria-label="Fermer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
});

ModalHeader.displayName = 'ModalHeader';

ModalHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  sticky: PropTypes.bool
};

export default ModalHeader;
