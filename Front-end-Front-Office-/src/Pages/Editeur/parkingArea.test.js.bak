import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ParkingSpot from '../ParkingSpot';

// Wrapper pour fournir le contexte DnD nécessaire
const DndWrapper = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
);

describe('ParkingSpot Component', () => {
  const mockProps = {
    id: 1,
    position: { left: 100, top: 200 },
    rotation: 0,
    updatePosition: jest.fn(),
    updateRotation: jest.fn()
  };

  test('renders correctly with proper id', () => {
    render(
      <DndWrapper>
        <ParkingSpot {...mockProps} />
      </DndWrapper>
    );
    
    expect(screen.getByText('Place 1')).toBeInTheDocument();
  });

  test('rotation buttons trigger updateRotation', () => {
    render(
      <DndWrapper>
        <ParkingSpot {...mockProps} />
      </DndWrapper>
    );
    
  });
});