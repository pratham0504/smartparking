import React, { useState } from 'react';

const ParkingSidebar = () => {
  const [activeTab, setActiveTab] = useState('models');
  const [isDragging, setIsDragging] = useState(false);
  
  // Maquettes des images pour les modèles
  const streetModel = (
    <div className="bg-gray-200 h-16 rounded-md flex items-center justify-center">
      <div className="bg-gray-400 h-4 w-32 rounded-sm"></div>
    </div>
  );
  
  const parkingSpotModel = (
    <div className="bg-gray-200 h-16 rounded-md flex items-center justify-center">
      <div className="bg-gray-400 h-10 w-10 rounded-md"></div>
    </div>
  );

  const handleDragStart = (e, itemType) => {
    e.dataTransfer.setData('itemType', itemType);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64 shadow-sm">
      {/* En-tête de la sidebar */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800">Éléments</h2>
      </div>
      
      {/* Onglets */}
      <div className="flex border-b border-gray-200">
        <button 
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'models' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('models')}
        >
          Modèles
        </button>
      </div>
      
      {/* Contenu de la sidebar */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Section Rues */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Rues</h3>
            <div 
              className="cursor-move" 
              draggable 
              onDragStart={(e) => handleDragStart(e, 'street')}
              onDragEnd={handleDragEnd}
            >
              {streetModel}
              <p className="text-xs text-gray-600 mt-1 text-center">Rue</p>
            </div>
          </div>
          
          {/* Section Places de parking */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Places de parking</h3>
            <div 
              className="cursor-move" 
              draggable 
              onDragStart={(e) => handleDragStart(e, 'parkingSpot')}
              onDragEnd={handleDragEnd}
            >
              {parkingSpotModel}
              <p className="text-xs text-gray-600 mt-1 text-center">Place standard</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Boutons d'action en bas */}
      <div className="p-4 border-t border-gray-200">
        <button
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Enregistrer le plan
        </button>
      </div>
    </div>
  );
};

export default ParkingSidebar;