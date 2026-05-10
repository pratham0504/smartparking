import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

// Importer les composants de notre nouvelle architecture
import ModalPortal from './ModalPortal';
import ModalHeader from './ModalHeader';
import OptimizedTextarea from './OptimizedTextarea';
import FocusLock from './FocusLock';

/**
 * Modal spécialisé pour la mise à jour des réclamations.
 * Utilise notre architecture de modals optimisée.
 */
const UpdateClaimModal = ({
  isOpen,
  onClose,
  claim,
  statusMessage,
  onStatusMessageChange,
  onStatusUpdate,
  setFullscreenImage
}) => {
  // Éviter de re-créer cette fonction à chaque rendu
  const handleCloseModal = useCallback(() => {
    onClose();
  }, [onClose]);
  
  // Pas besoin de re-créer cette fonction non plus
  const statusButtons = [
    { id: 'in_progress', label: 'in_progress', icon: '🔄', color: 'bg-blue-100 hover:bg-blue-200 text-blue-800' },
    { id: 'resolved', label: 'resolved', icon: '✅', color: 'bg-green-100 hover:bg-green-200 text-green-800' },
    { id: 'rejected', label: 'rejected', icon: '❌', color: 'bg-red-100 hover:bg-red-200 text-red-800' },
    { id: 'pending', label: 'pending', icon: '⏳', color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' }
  ];

  return (
    <ModalPortal isOpen={isOpen} onClose={handleCloseModal}>
      <FocusLock>
        <ModalHeader 
          title="Update Claim" 
          onClose={handleCloseModal} 
        />

        {claim && (
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-4">
              {/* Informations de la réclamation */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Claimant</p>
                  <p className="font-semibold text-gray-900">{claim.userId?.name || 'Inconnu'}</p>
                  <p className="text-sm text-gray-600">{claim.userId?.email || 'Email non disponible'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Plate Number</p>
                  <p className="font-mono font-medium text-gray-900">{claim.plateNumber || 'Non détectée'}</p>
                </div>
              </div>
                
              {/* Description de la réclamation */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-gray-700">{claim.description}</p>
                </div>
              </div>

              {/* Image de la réclamation */}
              {claim.imageUrl && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Image</p>
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src={claim.imageUrl} 
                      alt="Claim evidence"
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => setFullscreenImage(claim.imageUrl)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section de mise à jour du statut */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Update Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                {statusButtons.map(({ id, label, icon, color }) => (
                  <motion.button
                    key={id}
                    onClick={() => onStatusUpdate(claim, id)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`${color} px-4 py-3 rounded-lg text-sm font-medium 
                      transition-all duration-200 hover:shadow flex items-center justify-center gap-2`}
                  >
                    <span className="text-lg">{icon}</span>
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Textarea optimisé avec maintien du focus */}
        <OptimizedTextarea 
          value={statusMessage}
          onChange={onStatusMessageChange}
          placeholder = "Explain the reason for your decision..."
          label = "Message to the user"
          labelOptional="Optionnel"
          helpText = "This message will be sent by email to the user along with the status update."

          maxLength={500}
          rows={4}
        />
      </FocusLock>
    </ModalPortal>
  );
};

UpdateClaimModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  claim: PropTypes.object,
  statusMessage: PropTypes.string.isRequired,
  onStatusMessageChange: PropTypes.func.isRequired,
  onStatusUpdate: PropTypes.func.isRequired,
  setFullscreenImage: PropTypes.func.isRequired
};

// Utiliser React.memo pour éviter des rendus inutiles
export default React.memo(UpdateClaimModal);
