// Mumbai MCGM Parking Locations Data
export const mumbaiParkingLocations = [
  {
    id: "D001",
    name: "LODHA ALTAMOUNT ROAD",
    coordinates: [72.810399, 18.968285],
    address: "LODHA ALTAMOUNT, ALTAMOUNT ROAD (WASHINGTON HOUSE, DAHANUKAR MARG) IN D WARD",
    type: "MULTISTOREY",
    access: "RAMP",
    capacity: {
      twoWheeler: "ALLOWED",
      fourWheeler: 204,
      lcv: "ALLOWED",
      hmv: 0
    },
    pricing: "A",
    timing: {
      start: "00:00:00",
      end: "23:59:59"
    },
    paymentMode: "CASH",
    operator: "SS MULTI SERVICES"
  },
  {
    id: "D003",
    name: "RUNWAL CUMBALLA HILL",
    coordinates: [72.79680337, 18.95130043],
    address: "THE RUNWAL BUILDING, CUMBALLA HILL DIVISION AT NEAPENSEA ROAD, OPP RUIA BUNGALOW IN D WARD",
    type: "MULTISTOREY",
    access: "RAMP",
    capacity: {
      twoWheeler: "ALLOWED",
      fourWheeler: 57,
      lcv: "ALLOWED",
      hmv: 0
    },
    pricing: "A",
    timing: {
      start: "00:00:00",
      end: "23:59:59"
    },
    paymentMode: "CASH",
    operator: "PRIME TOLL AND METAL PVT. LTD."
  }
];

// Default center coordinates for Mumbai (Chhatrapati Shivaji Terminus as center point)
export const MUMBAI_CENTER = [72.835163, 18.940080];

// Parking Categories based on pricing
export const PRICE_CATEGORIES = {
  A: "Premium",
  B: "Standard",
  C: "Economy"
};

// Vehicle types mapping
export const VEHICLE_TYPES = {
  "2Wheeler": "Two Wheeler",
  "4W_LMV": "Four Wheeler",
  "4W_LCV": "Light Commercial Vehicle",
  "HMV": "Heavy Motor Vehicle"
};

// Parse CSV data into parking locations
export const parseParkingData = (csvData) => {
  return csvData.map(row => ({
    id: row.gis_id,
    name: row.name,
    coordinates: [parseFloat(row.geo_long), parseFloat(row.geo_lat)],
    address: row.address,
    type: row.structure_type,
    access: row.access_type,
    capacity: {
      twoWheeler: row.capacity_2W,
      fourWheeler: parseInt(row.capacity_4W_LMV) || 0,
      lcv: row.capacity_4W_LCV,
      hmv: parseInt(row.capacity_HMV) || 0
    },
    pricing: row.price_category,
    timing: {
      start: row.start_time,
      end: row.end_time
    },
    paymentMode: row.payment_mode,
    operator: row.operator,
    ward: row.ward,
    status: row.status,
    freeParking: row.free_parking === "Y"
  }));
};