/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import {
  Form,
  Row,
  Col,
  Button,
  ListGroup,
  Dropdown,
  DropdownButton,
  Card,
  Spinner,
  Modal
} from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { showToast } from "../utils/toast";
import ParkingLocationMap from "../Components/Map/ParkingLocationMap";

import {
  FaMapMarkerAlt,
  FaMoneyBillAlt,
  FaCar,
  FaBuilding,
  FaTrashAlt,
  FaFileAlt,
  FaArrowRight,
  FaArrowLeft,
  FaCamera,
  FaUpload,
  FaCheckCircle,
  FaPlus
} from "react-icons/fa";

const ParkingRequestForm = () => {
  const navigate = useNavigate();
  
  // State for managing steps
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Parking details state
  const [position, setPosition] = useState({ lat: undefined, lng: undefined });
  const [address, setAddress] = useState("");
  const [features, setFeatures] = useState([]);
  const [pricing, setPricing] = useState({
    hourly: "",
    daily: "",
    weekly: "",
    monthly: ""
  });
  const [tariffType, setTariffType] = useState("hourly");
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [currentRate, setCurrentRate] = useState("");
  const [totalSpots, setTotalSpots] = useState("");
  const [availableSpots, setAvailableSpots] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // Image state
  const [images, setImages] = useState({
    face1: null,
    face2: null,
    face3: null,
    face4: null
  });
  const [loading, setLoading] = useState({
    face1: false,
    face2: false,
    face3: false,
    face4: false
  });
  const [currentFace, setCurrentFace] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [showMessage, setShowMessage] = useState(true);

  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRefs = {
    face1: useRef(null),
    face2: useRef(null),
    face3: useRef(null),
    face4: useRef(null)
  };
  const [videoStream, setVideoStream] = useState(null);

  const vehicleOptions = [
    {
      value: "Moto",
      label: "Motorcycle",
      image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765730/moto_xdypx2.png"
    },
    {
      value: "Citadine",
      label: "City Car",
      image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-ville_ocwbob.png"
    },
    {
      value: "Berline / Petit SUV",
      label: "Sedan / Small SUV",
      image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/wagon-salon_bj2j1s.png"
    },
    {
      value: "Familiale / Grand SUV",
      label: "Family / Large SUV",
      image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-familiale_rmgclg.png"
    },
    {
      value: "Utilitaire",
      label: "Utility Vehicle",
      image: "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-livraison_nodnzh.png"
    }
  ];

  // Load saved form data from localStorage if available
  useEffect(() => {
    const savedForm = JSON.parse(localStorage.getItem("parkingFormData"));
    if (savedForm) {
      setName(savedForm.name || "");
      setDescription(savedForm.description || "");
      if (savedForm.position && savedForm.position.lat !== undefined && savedForm.position.lng !== undefined) {
        const lat = Number(savedForm.position.lat);
        const lng = Number(savedForm.position.lng);
        setPosition({
          lat: Number.isFinite(lat) ? lat : undefined,
          lng: Number.isFinite(lng) ? lng : undefined,
        });
      } else {
        setPosition({ lat: undefined, lng: undefined });
      }
      setAddress(savedForm.address || "");
      setTotalSpots(savedForm.totalSpots || "");
      setAvailableSpots(savedForm.availableSpots || "");
      setPricing(savedForm.pricing || { hourly: "", daily: "", weekly: "", monthly: "" });
      setVehicleTypes(savedForm.vehicleTypes || []);
      setFeatures(savedForm.features || []);
    }
    
    // Load saved images if available
    const savedImages = JSON.parse(localStorage.getItem("parkingFormImages"));
    if (savedImages) {
      setImages(savedImages);
    }
  }, []);

  // Save form data to localStorage when it changes
  useEffect(() => {
    const formData = {
      name,
      description,
      position,
      address,
      totalSpots,
      availableSpots,
      pricing,
      vehicleTypes,
      features
    };
    localStorage.setItem("parkingFormData", JSON.stringify(formData));
  }, [name, description, position, address, totalSpots, availableSpots, pricing, vehicleTypes, features]);

  // Save images to localStorage when they change
  useEffect(() => {
    localStorage.setItem("parkingFormImages", JSON.stringify(images));
  }, [images]);

  // Handle total spots change
  const handleTotalSpotsChange = (e) => {
    const value = e.target.value;
    setTotalSpots(value);
    // Default available spots to total spots if not set
    if (!availableSpots) {
      setAvailableSpots(value);
    }
  };

  // Handle available spots change
  const handleAvailableSpotsChange = (e) => {
    setAvailableSpots(e.target.value);
  };

  // Handle vehicle type changes
  const handleVehicleChange = (event) => {
    const value = event.target.value;
    setVehicleTypes((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  // Add pricing rate
  const handleAddRate = () => {
    if (!currentRate || isNaN(currentRate) || currentRate <= 0) {
      setValidationError("Please enter a valid rate");
      setTimeout(() => setValidationError(""), 3000);
      return;
    }

    setPricing((prev) => ({
      ...prev,
      [tariffType]: parseFloat(currentRate)
    }));
    
    setCurrentRate("");
    setValidationError("");
  };

  // Remove pricing rate
  const handleRemoveRate = (type) => {
    setPricing((prev) => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  const handleLocationChange = (coordinates) => {
    if (coordinates?.lat === undefined || coordinates?.lng === undefined) return;
    const nextLat = Number(coordinates.lat);
    const nextLng = Number(coordinates.lng);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) return;
    setPosition({ lat: nextLat, lng: nextLng });
  };

  // Format tariff labels
  const getTariffLabel = (key) => {
    switch(key) {
      case "hourly": return "Hour";
      case "daily": return "Day";
      case "weekly": return "Week";
      case "monthly": return "Month";
      default: return key;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMessage(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Camera functions
  const startCamera = async (face) => {
    setCurrentFace(face);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access error:", error);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL("image/png");
    setImages((prev) => ({ ...prev, [currentFace]: imageUrl }));

    stopCamera();
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setShowCamera(false);
  };

  // File handling
  const handleFileChange = async (event, face) => {
    const file = event.target.files[0];
    if (file) {
      setLoading((prev) => ({ ...prev, [face]: true }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => ({ ...prev, [face]: reader.result }));
      };
      reader.readAsDataURL(file);

      setLoading((prev) => ({ ...prev, [face]: false }));
    }
  };
// Modify the validateForm function to handle different validations for each step
const validateForm = () => {
    if (currentStep === 1) {
      if (!name) {
        setValidationError("Parking name is required");
        return false;
      }
      
      if (!address || position.lat === undefined || position.lng === undefined) {
        setValidationError("Please select a valid location");
        return false;
      }
      
      if (!totalSpots || totalSpots <= 0) {
        setValidationError("Total spots must be a positive number");
        return false;
      }
      
      if ( availableSpots > totalSpots) {
        setValidationError("Available spots must be a positive number not exceeding total spots");
        return false;
      }
      
      if (!pricing.hourly) {
        setValidationError("Hourly rate is required");
        return false;
      }
  
      if (vehicleTypes.length === 0) {
        setValidationError("Please select at least one vehicle type");
        return false;
      }
      
      return true;
    }
  
    if (currentStep === 2) {
      // Check if we have at least one image only when submitting the form
      const imageCount = Object.values(images).filter(img => img !== null).length;
      if (imageCount === 0) {
        setValidationError("Please upload at least one image of your parking");
        return false;
      }
      return true;
    }
  
    return true;
  };

  // Move to next step
  const handleNextStep = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setCurrentStep(2);
      window.scrollTo(0, 0);
    } else {
      setTimeout(() => setValidationError(""), 3000);
    }
  };

  // Go back to previous step
  const handlePrevStep = () => {
    setCurrentStep(1);
    window.scrollTo(0, 0);
  };

  // Submit the form
  const handleSubmit = async () => {
    if (!validateForm()) {
      setTimeout(() => setValidationError(""), 3000);
      showToast.error("Please fill in all required fields correctly.");
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      // Prepare form data
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description || "");
      formData.append("position", JSON.stringify(position));
      formData.append("totalSpots", totalSpots);
      formData.append("availableSpots", availableSpots);
      formData.append("pricing", JSON.stringify(pricing));
      formData.append("vehicleTypes", JSON.stringify(vehicleTypes));
      formData.append("features", JSON.stringify(features));
  
      // Add images
      Object.entries(images).forEach(([face, imgData]) => {
        if (imgData) {
          if (imgData.startsWith("data:image")) {
            const byteString = atob(imgData.split(",")[1]);
            const mimeString = imgData.split(",")[0].split(":")[1].split(";")[0];
            const arrayBuffer = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
              arrayBuffer[i] = byteString.charCodeAt(i);
            }
            const imageFile = new Blob([arrayBuffer], { type: mimeString });
            formData.append("images", imageFile, `${face}.png`);
          }
        }
      });
  
      // Submit to API
      const response = await axios.post(
        "http://localhost:3001/parkings/submit",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );
  
      console.log("Parking request submitted:", response.data);
  
      // Clear localStorage
      localStorage.removeItem("parkingFormData");
      localStorage.removeItem("parkingFormImages");
  
      // Show success message and redirect
      showToast.success("Your parking request has been submitted successfully!");
      setIsSubmitting(false);
      navigate("/");
    } catch (error) {
      console.error("Error submitting parking request:", error);
      setIsSubmitting(false);
      setValidationError(error.response?.data?.message || "Error submitting request. Please try again.");
      
      // Afficher une erreur avec `showToast`
      showToast.error(error.response?.data?.message || "Error submitting request. Please try again.");
      
      setTimeout(() => setValidationError(""), 5000);
    }
  };
  return (
    <div className="container mx-auto my-10 p-6 bg-white rounded-lg shadow-xl">
      {/* Progress indicator */}
      <div className="step-progress mb-8">
        <div className="flex justify-between items-center">
          <div className={`step-circle ${currentStep >= 1 ? 'active' : ''}`}></div>
          <div className="step-line"></div>
          <div className={`step-circle ${currentStep >= 2 ? 'active' : ''}`}></div>
        </div>
        <div className="flex justify-between mt-2">
        
        </div>
      </div>
      
      {/* Error message display */}
      {validationError && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {validationError}
        </div>
      )}
      
      {currentStep === 1 && (
        <div>
          <h2 className="text-center text-2xl font-bold mb-6 text-blue-600">
            Add Your Parking Spot Request
          </h2>
          <p className="text-center mb-6 text-gray-600">
            Submit your parking request here!
          </p>
          
          <Form onSubmit={handleNextStep}>
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
              <ParkingLocationMap
                position={position}
                address={address}
                onPositionChange={handleLocationChange}
                onAddressChange={setAddress}
              />
            </Form.Group>
  
            <Row className="mb-5">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="font-semibold d-flex align-items-center">
                    <FaBuilding className="mr-2 text-green-500" />
                    Total Number of Spots <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={totalSpots}
                    onChange={handleTotalSpotsChange}
                    required
                    className="p-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="font-semibold d-flex align-items-center">
                    <FaBuilding className="mr-2 text-green-500" />
                    Available Spots <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    value={availableSpots}
                    onChange={handleAvailableSpotsChange}
                    required
                    className="p-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Form.Group>
              </Col>
            </Row>
  
            {/* Improved Tariff Section */}
            <Form.Group className="mb-4">
              <Form.Label className="font-semibold d-flex align-items-center">
                <FaMoneyBillAlt className="mr-2 text-yellow-500" />
                Rate for 1 {getTariffLabel(tariffType)} (INR){" "}
                <span className="text-danger">*</span>
              </Form.Label>
              <Row className="align-items-center">
                <Col md={5} sm={12} className="mb-2 mb-md-0">
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter rate"
                    value={currentRate}
                    onChange={(e) => setCurrentRate(e.target.value)}
                    required={Object.keys(pricing).length === 0}
                    className="p-2 border-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Col>
                <Col md={4} sm={12} className="mb-2 mb-md-0">
                  <Dropdown>
                    <Dropdown.Toggle 
                      variant="outline-secondary" 
                      className="w-100 text-left d-flex justify-content-between align-items-center p-2 border-2 border-gray-300 rounded-md shadow-sm"
                    >
                      <span>Tariff for a {getTariffLabel(tariffType)}</span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="w-100">
                      <Dropdown.Item eventKey="hourly" active={tariffType === 'hourly'} onClick={() => setTariffType('hourly')}>
                        Tariff for an Hour
                      </Dropdown.Item>
                      <Dropdown.Item eventKey="daily" active={tariffType === 'daily'} onClick={() => setTariffType('daily')}>
                        Tariff for a Day
                      </Dropdown.Item>
                      <Dropdown.Item eventKey="weekly" active={tariffType === 'weekly'} onClick={() => setTariffType('weekly')}>
                        Tariff for a Week
                      </Dropdown.Item>
                      <Dropdown.Item eventKey="monthly" active={tariffType === 'monthly'} onClick={() => setTariffType('monthly')}>
                        Tariff for a Month
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>
                <Col md={3} sm={12}>
                  <Button
                    variant="primary"
                    onClick={handleAddRate}
                    className="w-100 p-2 rounded-md bg-blue-500 hover:bg-blue-600 transition-all flex items-center justify-center"
                    disabled={!currentRate || isNaN(currentRate) || Number(currentRate) <= 0}
                  >
                    <FaPlus className="mr-2" /> Add Tariff
                  </Button>
                </Col>
              </Row>
            </Form.Group>
  
            {Object.keys(pricing).length > 0 && (
              <div className="mb-5">
                <h5 className="mb-3 font-weight-medium text-gray-700">Configured Tariffs</h5>
                <ListGroup style={{ maxWidth: "100%" }}>
                  {Object.entries(pricing).map(([type, rate]) => (
                    <ListGroup.Item
                      key={type}
                      className="d-flex justify-content-between align-items-center p-3 mb-2 bg-gray-100 rounded-md shadow-sm border border-gray-200"
                    >
                      <div className="d-flex align-items-center">
                        <FaMoneyBillAlt className="text-yellow-500 mr-3" />
                        <div>
                          <span className="font-semibold">{getTariffLabel(type)}</span>
                          <span className="mx-2">-</span>
                          <span className="text-blue-600 font-semibold">{rate} INR</span>
                        </div>
                      </div>
                      <Button
                        variant="outline-danger"
                        onClick={() => handleRemoveRate(type)}
                        className="rounded-full p-2 hover:bg-red-50 transition-all border-0"
                      >
                        <FaTrashAlt className="text-red-500" />
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
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
                      checked={vehicleTypes.includes(option.value)}
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

  {/* ✅ Affichage en ligne avec flexbox */}
  <div className="d-flex flex-wrap gap-3">
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
        checked={features.includes(feature)}
        onChange={(e) => {
          const { checked, value } = e.target;
          setFeatures((prev) =>
            checked ? [...prev, value] : prev.filter((item) => item !== value)
          );
        }}
        className="mb-2"
      />
    ))}
  </div>
</Form.Group>

  
            <div className="flex justify-end items-center space-x-3">
              <span className="text-gray-500 opacity-70">Go to Step 2</span>
               
            {/* Bouton Cancel */}
            <button
                onClick={() => navigate("/my-parkings")}
                className="px-6 py-3 rounded-lg bg-dark text-white font-medium border-0 hover:bg-gray-800 transition-all flex items-center"
            >
                Cancel
            </button>

            {/* Bouton Continue */}
            <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-dark text-white font-medium border-0 hover:bg-gray-800 transition-all flex items-center"
            >
                Continue <FaArrowRight className="ml-2" />
            </button>
        </div>
          </Form>
        </div>
      )}
      
      {currentStep === 2 && (
        <div className="step2-upload-container">
          <div className="message-container">
            <h2 className="animated-message">
              Share your parking with your customers!
            </h2>
          </div>
          
          <Row className="g-4 mt-3 mx-50 mb-50">
            {["face1", "face2", "face3", "face4"].map((face, index) => (
              <Col key={face} xs={6} md={3}>
                <Card className="shadow-lg rounded-lg text-center p-3">
                  <Card.Body>
                    <h5 className="text-dark">Face {index + 1}</h5>
                    <div className="image-preview mb-3 animate-preview">
                      {loading[face] ? (
                        <Spinner animation="border" variant="primary" />
                      ) : images[face] ? (
                        <img
                          src={images[face]}
                          alt={`Face ${index + 1}`}
                          className="preview-img rounded-lg"
                        />
                      ) : (
                        <span className="text-muted">No image</span>
                      )}
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <Button
                        className="w-100"
                        variant="outline-primary"
                        onClick={() => startCamera(face)}
                      >
                        Take a Picture
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRefs[face]}
                        hidden
                        onChange={(e) => handleFileChange(e, face)}
                      />
                      <Button
                        className="w-100"
                        variant="outline-success"
                        onClick={() => fileInputRefs[face].current.click()}
                      >
                        Upload a Photo
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
      
          <div className="mt-6 text-center">
            <Button
              onClick={handleSubmit}
              className="px-6 py-3 rounded-lg bg-dark text-white font-medium border-0 hover:bg-gray-800 transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="mr-2" />
                  Uploading...
                </>
              ) : (
                'Save Parking'
              )}
            </Button>
          </div>
      
          <Modal show={showCamera} onHide={stopCamera} centered>
            <Modal.Body className="text-center">
              <video
                ref={videoRef}
                autoPlay
                className="w-100 rounded-lg shadow-lg"
              ></video>
              <canvas ref={canvasRef} hidden></canvas>
              <Button
                className="mt-3 w-100"
                variant="primary"
                onClick={captureImage}
              >
                Screenshot
              </Button>
            </Modal.Body>
          </Modal>
      
          <style jsx>{`
            .animate-preview {
              height: 150px;
              border: 2px dashed #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease-in-out;
            }
            .preview-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              animation: fadeIn 0.5s ease-in-out;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
            .step2-upload-container {
              margin-top: 150px;
              margin-left: 60px;
              margin-right: 60px;
              margin-bottom: 60px;
            }
            .animated-message {
              animation: slideInFromTop 1s ease-out;
            }
            @keyframes slideInFromTop {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default ParkingRequestForm;
