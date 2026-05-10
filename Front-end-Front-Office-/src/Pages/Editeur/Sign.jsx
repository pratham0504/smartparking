import React, { useState } from 'react';
import { useDrag } from 'react-dnd';

const Sign = ({ 
  id, 
  type, 
  position, 
  width, 
  height, 
  rotation, 
  text, 
  color, 
  updatePosition, 
  onRemove 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const [{ isDragging: isBeingDragged }, drag] = useDrag({
    type: 'SIGN',
    item: { 
      id, 
      type: 'SIGN', 
      signType: type 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handleMouseDown = (e) => {
    setIsDragging(true);
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      const rect = e.target.closest('[data-parking-area="true"]').getBoundingClientRect();
      updatePosition(id, {
        left: e.clientX - rect.left,
        top: e.clientY - rect.top
      });
      setIsDragging(false);
    }
  };

  const renderSignContent = () => {
    switch(type) {
      case 'parkingSign':
        return <div style={{ color: 'white' }}>P</div>;
      case 'directionalArrow':
        return (
          <div style={{ 
            width: '0', 
            height: '0', 
            borderLeft: '20px solid transparent',
            borderRight: '20px solid transparent',
            borderBottom: '40px solid white' 
          }} />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={drag}
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        width: width,
        height: height,
        backgroundColor: color,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'move',
        transform: `rotate(${rotation}deg)`,
        opacity: isBeingDragged ? 0.5 : 1,
        zIndex: isDragging ? 100 : 10
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {renderSignContent()}
      <button 
        onClick={() => onRemove(id)}
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          backgroundColor: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default Sign;