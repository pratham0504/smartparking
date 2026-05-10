import Papa from 'papaparse';
import { parseParkingData } from './parkingLocations';

export const loadParkingLocations = async () => {
  try {
    const response = await fetch('/assets/MCGM_26_v1.0.csv');
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          const parkingLocations = parseParkingData(results.data);
          resolve(parkingLocations);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error loading parking locations:', error);
    throw error;
  }
};