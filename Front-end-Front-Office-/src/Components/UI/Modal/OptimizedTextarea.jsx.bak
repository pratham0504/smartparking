import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Textarea optimisé qui maintient le focus et la position du curseur
 * lors des rendus successifs. Utilise une approche robuste sans useLayoutEffect.
 */
const OptimizedTextarea = React.memo(({ 
  value, 
  onChange, 
  placeholder = "Saisissez votre texte...", 
  maxLength = 500,
  rows = 4,
  label = "Message",
  labelOptional = "Optionnel",
  helpText = "",
}) => {
  // Référence au textarea
  const textareaRef = useRef(null);
  // Mémorisation de la position du curseur
  const cursorPositionRef = useRef(null);

  // Pour capturer la position actuelle du curseur avant le rendu
  const handleChange = (e) => {
    const textarea = e.target;
    cursorPositionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };
    onChange(e);
  };

  // Effet après le rendu pour restaurer la position du curseur
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Si on a une position de curseur mémorisée, la restaurer
      if (cursorPositionRef.current) {
        textarea.focus();
        const { start, end } = cursorPositionRef.current;
        // Vérifier que les positions sont valides
        if (start <= value.length && end <= value.length) {
          textarea.setSelectionRange(start, end);
        }
      }
    }
  });

  return (
    <div className="mt-6">
      <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
        <span>{label}</span>
        {labelOptional && <span className="text-gray-400 text-xs">{labelOptional}</span>}
      </label>
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 
                  focus:border-blue-500 placeholder-gray-400 resize-none transition-shadow
                  hover:border-gray-400"
        />
        
        {maxLength > 0 && (
          <div className="absolute bottom-3 right-3 text-xs text-gray-400">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
      
      {helpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Mémorisation personnalisée pour éviter les re-renders inutiles
  // Ne re-rendre que si la valeur ou le placeholder change
  return (
    prevProps.value === nextProps.value &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.maxLength === nextProps.maxLength
  );
});

OptimizedTextarea.displayName = 'OptimizedTextarea';

OptimizedTextarea.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  maxLength: PropTypes.number,
  rows: PropTypes.number,
  label: PropTypes.string,
  labelOptional: PropTypes.string,
  helpText: PropTypes.string
};

export default OptimizedTextarea;
