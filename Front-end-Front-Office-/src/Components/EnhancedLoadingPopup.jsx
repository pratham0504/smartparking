import React from 'react';

const EnhancedLoadingPopup = ({ isVisible, message }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Overlay with blur effect */}
      <div className="absolute inset-0 bg-[#000000] bg-opacity-70 backdrop-blur-sm"></div>
      
      {/* Popup Card */}
      <div className="bg-[#121212] rounded-2xl shadow-2xl relative z-10 transform transition-all overflow-hidden max-w-md w-full mx-4">
        {/* Header with gradient */}
        <div className="h-2 bg-gradient-to-r from-Mgreen via-Mblue to-Mgreen"></div>
        
        <div className="px-8 pt-8 pb-10">
          {/* Car animation */}
          <div className="flex justify-center mb-6">
            <div className="relative w-60 h-20">
              {/* Road */}
              <div className="absolute bottom-0 w-full h-1 bg-gray-600">
                {/* Animated dash lines on road */}
                <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-0.5">
                  <div className="animate-marquee flex">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="h-0.5 w-5 bg-gray-400 mr-3"></div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Car icon with shadow */}
              <div className="absolute bottom-3 animate-car-move">
                {/* Car with shadow */}
                <div className="text-4xl relative">
                  🚗
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-black bg-opacity-30 rounded-full filter blur-sm"></div>
                </div>
              </div>
              
              {/* Parking icon at the end */}
              <div className="absolute right-0 bottom-3 text-3xl">
                🅿️
              </div>
            </div>
          </div>
          
          {/* Message */}
          <h3 className="text-white text-xl font-medium text-center mb-3">{message}</h3>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-6 overflow-hidden">
            <div className="bg-Mgreen h-full rounded-full animate-loading-progress"></div>
          </div>
          
          {/* Additional info */}
          <p className="text-gray-400 text-sm text-center">
            We're finding the perfect spot for you.<br />This won't take long.
          </p>
        </div>
      </div>
    </div>
  );
};

// Add these animation classes to your global CSS or tailwind config
const style = `
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes car-move {
  0% { transform: translateX(0); }
  10% { transform: translateX(10%); }
  90% { transform: translateX(80%); }
  100% { transform: translateX(80%); }
}
@keyframes loading-progress {
  0% { width: 0%; }
  50% { width: 70%; }
  90% { width: 90%; }
  100% { width: 100%; }
}
.animate-marquee {
  animation: marquee 2s linear infinite;
}
.animate-car-move {
  animation: car-move 3s ease-in-out infinite;
}
.animate-loading-progress {
  animation: loading-progress 2s ease-out forwards;
}
`;

// Inject styles when component mounts
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = style;
  document.head.appendChild(styleElement);
}

export default EnhancedLoadingPopup;
