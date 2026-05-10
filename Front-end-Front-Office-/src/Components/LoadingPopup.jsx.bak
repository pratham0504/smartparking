import React from 'react';

const LoadingPopup = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Overlay with blur effect */}
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"></div>
      
      {/* Popup */}
      <div className="bg-[#121212] rounded-xl shadow-2xl p-8 max-w-md mx-4 relative z-10 transform transition-all border border-[#333] overflow-hidden">
        {/* Green gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-Mgreen to-Mblue"></div>
        
        <div className="flex flex-col items-center">
          {/* Custom spinner animation */}
          <div className="relative">
            {/* Outer circle */}
            <div className="w-20 h-20 border-4 border-[#2e2e2e] rounded-full"></div>
            {/* Inner spinning circle with gradient */}
            <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-Mgreen rounded-full animate-spin"></div>
            {/* Car icon in the middle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl">
              🅿️
            </div>
          </div>
          
          {/* Message */}
          <p className="text-white text-xl font-medium mt-6 mb-2">{message || "Loading..."}</p>
          
          {/* Loading dots animation */}
          <div className="flex space-x-2 mt-2">
            <div className="w-2 h-2 bg-Mgreen rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
            <div className="w-2 h-2 bg-Mgreen rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-Mgreen rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
          
          {/* Subtle additional text */}
          <p className="text-gray-400 text-sm mt-4">Searching for the best parking spots...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingPopup;
