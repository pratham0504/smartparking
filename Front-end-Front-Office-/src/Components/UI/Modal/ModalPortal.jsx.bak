import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * Composant de portail modal réutilisable.
 * Utilise React.createPortal pour rendre le modal en dehors de la hiérarchie DOM
 * de son parent, évitant ainsi les problèmes de z-index et de styles.
 */
const ModalPortal = ({ 
  isOpen, 
  onClose, 
  children, 
  closeOnOverlayClick = true,
  topOffset = '6rem', 
  maxWidth = '2xl',
  preventScroll = true
}) => {
  // Gestion de l'événement clavier pour fermer le modal avec Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Empêcher le défilement du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen && preventScroll) {
      document.body.style.overflow = 'hidden';
      
      // Ajouter l'écouteur d'événement clavier
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown, preventScroll]);

  // Si le modal n'est pas ouvert, ne rien rendre
  if (!isOpen) return null;

  // Créer le portail vers un élément en dehors de la hiérarchie DOM
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Overlay avec effet de flou */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
            aria-hidden="true"
          />
          
          {/* Conteneur du modal avec animation */}
          <div 
            className="fixed inset-0 z-50 overflow-y-auto"
            style={{ paddingTop: topOffset }}
          >
            <div className="flex min-h-full items-start justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`bg-white rounded-xl p-6 shadow-xl relative max-h-[80vh] overflow-y-auto max-w-${maxWidth} w-full`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                {children}
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body // Rendre dans le body pour éviter les problèmes de contexte
  );
};

ModalPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  closeOnOverlayClick: PropTypes.bool,
  topOffset: PropTypes.string,
  maxWidth: PropTypes.string,
  preventScroll: PropTypes.bool
};

export default ModalPortal;
