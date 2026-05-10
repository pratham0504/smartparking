import React, { useState } from "react";
import {
  Col,
  Form,
  Row,
  Button,
  ListGroup,
  Dropdown,
  DropdownButton,
} from "react-bootstrap";
import { Autocomplete } from "@react-google-maps/api";
import { useGoogleMaps } from "../../../context/GoogleMapsContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getBackendUrl } from '../../../utils/backend';
import {
  FaMapMarkerAlt,
  FaMoneyBillAlt,
  FaCar,
  FaBuilding,
  FaTrashAlt,
  FaFileAlt,
} from "react-icons/fa";

const OwnerAddPaking = () => {
  const { isLoaded } = useGoogleMaps();
  const [position, setPosition] = useState({ lat: undefined, lng: undefined });
  const [address, setAddress] = useState("");
  const [autocomplete, setAutocomplete] = useState(null);
  const [features, setFeatures] = useState([]);
  const [pricing, setPricing] = useState({
    hourly: "",
    daily: "",
    weekly: "",
    monthly: "",
  });
  const [tariffType, setTariffType] = useState("hourly");
  const [vehicleType, setVehicleType] = useState([]);
  const [currentRate, setCurrentRate] = useState("");
  const [totalSpots, setTotalSpots] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  const vehicleOptions = [
    {
      value: "Moto",
      label: "Motorcycle",
      image:
        "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765730/moto_xdypx2.png",
    },
    {
      value: "Citadine",
      label: "City Car",
      image:
        "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-ville_ocwbob.png",
    },
    {
      value: "Berline / Petit SUV",
      label: "Sedan / Small SUV",
      image:
        "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/wagon-salon_bj2j1s.png",
    },
    {
      value: "Familiale / Grand SUV",
      label: "Family / Large SUV",
      image:
        "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-familiale_rmgclg.png",
    },
    {
      value: "Utilitaire",
      label: "Utility Vehicle",
      image:
        "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-livraison_nodnzh.png",
    },
  ];

  const handleTotalSpotsChange = (e) => {
    setTotalSpots(e.target.value);
  };

  const handleVehicleChange = (event) => {
    const value = event.target.value;
    setVehicleType((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const handleAddRate = () => {
    if (!currentRate || isNaN(currentRate) || currentRate <= 0) {
      alert("Please enter a valid rate");
      return;
    }

    setPricing((prev) => ({
      ...prev,
      [tariffType]: parseFloat(currentRate),
    }));
    
    setCurrentRate("");
  };

  const handleRemoveRate = (type) => {
    setPricing((prev) => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  const onLoad = (autoComplete) => setAutocomplete(autoComplete);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        setPosition({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        setAddress(place.formatted_address);
      }
    }
  };
  
  const getTariffLabel = (key) => {
    switch(key) {
      case "hourly": return "Hour";
      case "daily": return "Day";
      case "weekly": return "Week";
      case "monthly": return "Month";
      default: return key;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!address || !position.lat || !position.lng) {
      alert("Please select a valid location.");
      return;
    }
    
    if (!pricing.hourly) {
      alert("Hourly rate is required.");
      return;
    }
    
    if (!name) {
      alert("Parking name is required.");
      return;
    }

    if (vehicleType.length === 0) {
      alert("Please select at least one vehicle type.");
      return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description || "");
    formData.append("position", JSON.stringify(position));
    formData.append("totalSpots", totalSpots);
    formData.append("pricing", JSON.stringify(pricing));
    formData.append("vehicleType", JSON.stringify(vehicleType));
    formData.append("features", JSON.stringify(features));

    try {
      const response = await axios.post(
        `${getBackendUrl()}/api/addParkingRequest`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const parkingId = response.data.parking._id;
      console.log("voila l'id", parkingId);
      console.log("Parking added successfully:", response.data);
      navigate(`/step2/${parkingId}`);
    } catch (error) {
      console.error("Error adding parking:", error);
      alert("Error adding parking. Please try again.");
    }
  };

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div
      className="container mx-auto my-10 p-6 bg-white rounded-lg shadow-xl"
      style={{ paddingLeft: "50px" }}
    >
      <h2 className="text-center text-2xl font-bold mb-6 text-blue-600">
        Add Your Parking Spot Request
      </h2>
      <p className="text-center mb-6 text-gray-600">
        Submit your parking request here!
      </p>
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-5">
          <Form.Label className="font-semibold d-flex align-items-center">
            <FaFileAlt className="mr-2 text-blue-500" />
            Parking Name <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter parking name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="p-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-3/4"
          />
        </Form.Group>

        <Form.Group className="mb-5">
          <Form.Label className="font-semibold d-flex align-items-center">
            <FaFileAlt className="mr-2 text-blue-500" />
            Description
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Enter parking description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-3/4"
          />
        </Form.Group>

        <Form.Group className="mb-5">
          <Form.Label className="font-semibold d-flex align-items-center">
            <FaMapMarkerAlt className="mr-2 text-blue-500" />
            Parking Location <span className="text-danger">*</span>
          </Form.Label>
          <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
            <Form.Control
              type="text"
              placeholder="Enter location"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="p-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-3/4"
            />
          </Autocomplete>
        </Form.Group>

        <Form.Group className="mb-5">
          <Form.Label className="font-semibold d-flex align-items-center">
            <FaBuilding className="mr-2 text-green-500" />
            Total Number of Spots <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="number"
            value={totalSpots}
            onChange={handleTotalSpotsChange}
            required
            className="p-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-3/4"
          />
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label className="font-semibold d-flex align-items-center">
            <FaMoneyBillAlt className="mr-2 text-yellow-500" />
            Rate for 1 {getTariffLabel(tariffType)} (INR){" "}
            <span className="text-danger">*</span>
          </Form.Label>
          <Row className="align-items-center">
            <Col xs={7}>
              <Form.Control
                type="number"
                placeholder="Rate"
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
                required={Object.keys(pricing).length === 0}
                className="p-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Col>
            <Col xs={2} className="d-flex justify-content-end">
              <Button
                variant="primary"
                onClick={handleAddRate}
                className="w-100 p-2 rounded-md"
              >
                Add Tariff
              </Button>
            </Col>
          </Row>
        </Form.Group>

        <DropdownButton
          title={`Add another tariff (${getTariffLabel(tariffType)})`}
          onSelect={(eventKey) => setTariffType(eventKey)}
          className="mb-3 w-3/4"
        >
          <Dropdown.Item eventKey="hourly">Tariff for an Hour</Dropdown.Item>
          <Dropdown.Item eventKey="daily">Tariff for a Day</Dropdown.Item>
          <Dropdown.Item eventKey="weekly">Tariff for a Week</Dropdown.Item>
          <Dropdown.Item eventKey="monthly">Tariff for a Month</Dropdown.Item>
        </DropdownButton>

        {Object.keys(pricing).length > 0 && (
          <ListGroup className="mb-5" style={{ maxWidth: "500px" }}>
            {Object.entries(pricing).map(([type, rate]) => (
              <ListGroup.Item
                key={type}
                className="d-flex justify-content-between align-items-center p-3 mb-2 bg-gray-100 rounded-md shadow-sm"
              >
                <div className="flex items-center">
                  <span className="font-semibold mr-2">{getTariffLabel(type)}</span>:{" "}
                  {rate} INR
                </div>
                <Button
                  variant="danger"
                  onClick={() => handleRemoveRate(type)}
                  className="p-1 rounded-circle"
                  style={{ color: "red" }}
                >
                  <FaTrashAlt />
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        <Form.Group className="mb-5">
          <Form.Label className="font-semibold d-flex align-items-center">
            <FaCar className="mr-2 text-blue-500" />
            Suitable Vehicle Types <span className="text-danger">*</span>
          </Form.Label>
          <Row>
            {vehicleOptions.map((option) => (
              <Col key={option.value} xs={6} md={4} lg={3}>
                <Form.Check
                  type="checkbox"
                  id={option.value}
                  label={
                    <div className="flex items-center">
                      <img
                        src={option.image}
                        alt={option.label}
                        width="40"
                        className="mr-2"
                      />
                      {option.label}
                    </div>
                  }
                  value={option.value}
                  checked={vehicleType.includes(option.value)}
                  onChange={handleVehicleChange}
                  className="max-w-full"
                />
              </Col>
            ))}
          </Row>
        </Form.Group>

        <Form.Group className="mb-5">
          <Form.Label className="font-semibold d-flex align-items-center">
            <FaBuilding className="mr-2 text-green-500" />
            Parking Features
          </Form.Label>
          {[
            "Indoor Parking",
            "Underground Parking",
            "Unlimited Entrances & Exits",
            "Extension Available",
          ].map((feature, index) => (
            <Form.Check
              key={index}
              type="checkbox"
              label={feature}
              value={feature}
              onChange={(e) => {
                const { checked, value } = e.target;
                setFeatures((prev) =>
                  checked
                    ? [...prev, value]
                    : prev.filter((item) => item !== value)
                );
              }}
              className="mb-2"
            />
          ))}
        </Form.Group>

        <div className="flex justify-end items-center space-x-3">
          <span className="text-gray-500 opacity-70">Go to Step 2</span>
          <Button
            variant="success"
            type="submit"
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 shadow-md"
          >
            Continue
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default OwnerAddPaking;