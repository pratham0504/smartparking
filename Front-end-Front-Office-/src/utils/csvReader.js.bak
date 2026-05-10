export const readParkingLocationsCSV = async () => {
  try {
    const response = await fetch('/src/data/parking-locations.csv');
    const csvText = await response.text();
    
    // Split into lines and remove header
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const data = lines.slice(1);
    
    return data.map(line => {
      const values = line.split(',');
      return {
        name: values[0],
        position: {
          lat: parseFloat(values[1]),
          lng: parseFloat(values[2])
        },
        totalSpots: parseInt(values[3]),
        availableSpots: parseInt(values[4]),
        pricePerHour: parseInt(values[5]),
        address: values[6],
      };
    });
  } catch (error) {
    console.error('Error reading parking locations CSV:', error);
    return [];
  }
};