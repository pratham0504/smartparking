// Function to parse MCGM parking data from CSV
export function parseParkingData(data) {
  return data.map(row => ({
    id: row.id || row.Id || row.ID,
    name: row.name || row.Name || row.LocationName || 'Unnamed Location',
    position: {
      lat: parseFloat(row.Latitude || row.latitude || row.lat || row.LAT),
      lng: parseFloat(row.Longitude || row.longitude || row.lng || row.LNG)
    },
    address: row.Address || row.address || row.LOCATION || '',
    ward: row.Ward || row.ward || row.WARD || '',
    capacity: parseInt(row.Capacity || row.capacity || row.CAPACITY || '0', 10),
    type: row.Type || row.type || row.PARKING_TYPE || 'General',
    status: row.Status || row.status || row.OPERATIONAL_STATUS || 'Available',
    price: parseFloat(row.Price || row.price || row.RATE || '0'),
    operatingHours: row.OperatingHours || row.operatingHours || row.TIMING || '24x7'
  })).filter(loc => 
    !isNaN(loc.position.lat) && 
    !isNaN(loc.position.lng) && 
    loc.position.lat !== 0 && 
    loc.position.lng !== 0
  );
}