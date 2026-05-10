import React, { useRef, useEffect } from 'react';

/**
 * Composant qui maintient le focus à l'intérieur de ses enfants.
 * Utile pour les modals et les popups pour des raisons d'accessibilité et UX.
 */
const FocusLock = ({ children }) => {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);
  
  useEffect(() => {
    // Mémoriser l'élément qui avait le focus avant l'ouverture
    previousFocusRef.current = document.activeElement;

    // Trouver tous les éléments focusables dans le conteneur
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements && focusableElements.length > 0) {
      // Mettre le focus sur le premier élément focusable
      focusableElements[0].focus();
    }

    // Fonction pour détecter les touches Tab et maintenir le focus dans le modal
    const handleTabKey = (e) => {
      if (!containerRef.current || !e || e.key !== 'Tab') return;
      
      const focusable = Array.from(containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )).filter(el => !el.disabled && el.offsetParent !== null);
      
      if (!focusable.length) return;
      
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    };

    // Ajouter l'écouteur d'événement pour Tab
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        handleTabKey(e);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restaurer le focus à l'élément qui l'avait avant
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  return <div ref={containerRef}>{children}</div>;
};

export default FocusLock;
