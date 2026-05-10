import React, { useState, useRef,useEffect } from 'react';
import axios from 'axios';
import { getBackendUrl } from '../utils/backend';
import { useNavigate } from 'react-router-dom';
import { Col, Container, Form, Row, Button, ListGroup, Dropdown, DropdownButton, Card, Spinner, Modal } from 'react-bootstrap';
import "react-datepicker/dist/react-datepicker.css";
import { Autocomplete } from "@react-google-maps/api";
import { useGoogleMaps } from "../context/GoogleMapsContext";



const Parking =({ formData, setFormData }) =>{
  const [parkings, setParkings] = useState([]);
  const [newParking, setNewParking] = useState({
    nameP: '',
    location: '',
    totalSpots: '',
    availableSpots: '',
    pricing: {
      perHour: '',
      perDay: '',
      perWeek: ''
    },
    vehicleTypes: [],
    images: [],
  });
  const [step, setStep] = useState(1);
  const { isLoaded } = useGoogleMaps();
  const [address, setAddress] = useState("");
   const [location, setLocation] = useState({
    lat: 19.0760,
    lng: 72.8777,
  });
  const [markers, setMarkers] = useState([
    {
      position: { lat: 19.0760, lng: 72.8777 },
      title: "Pickup Location",
    },
  ]);
  const [selectedvehicules, setSelectedvehicules] = useState([]);
  const [selectedParking, setSelectedParking] = useState(null);
  const navigate = useNavigate();
  const [autocomplete, setAutocomplete] = useState(null);
  const vehiculeOptions = [
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
      label: "Utility vehicule",
      image:
        "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-livraison_nodnzh.png",
    },
  ];
  const [images, setImages] = useState({
    face1: null,
    face2: null,
    face3: null,
    face4: null,
  });
  const [loading, setLoading] = useState({
    face1: false,
    face2: false,
    face3: false,
    face4: false,
  });
  
  const [currentFace, setCurrentFace] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRefs = {
    face1: useRef(null),
    face2: useRef(null),
    face3: useRef(null),
    face4: useRef(null),
  };
  const [videoStream, setVideoStream] = useState(null);
  

  // Démarrer la caméra
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
      console.error("Erreur d'accès à la caméra :", error);
    }
  };

  // Capturer une image
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // S'assurer que la vidéo est bien chargée
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("Vidéo non encore chargée !");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL("image/png");
    setImages((prev) => ({ ...prev, [currentFace]: imageUrl }));

    stopCamera();
  };

  // Arrêter la caméra
  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setShowCamera(false);
  };

  useEffect(() => {
    const savedImages = JSON.parse(sessionStorage.getItem("savedImages"));
    if (savedImages) {
      setImages(savedImages);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("savedImages", JSON.stringify(images));
  }, [images]);

  // Fetch parking list from the API
  useEffect(() => {
    setLoading(true); // Set loading state to true
    axios.get(`${getBackendUrl()}/parkings/parkings`, {
      headers: {

        'Authorization': `Bearer ${getToken()}`
      }
    })
      .then(response => {
        setParkings(response.data);
      })
      .catch(error => {
        console.error('Error fetching parkings:', error);
      })
      .finally(() => {
        setLoading(false); // Reset loading state
      });
  }, []);

  // Helper function to get token from localStorage


  
  
  const onLoad = (autoComplete) => {
    setAutocomplete(autoComplete);
  };
  const handlevehiculeChange = (event) => {
    const value = event.target.value;
  
    setSelectedvehicules((prevSelected) => {
      let updatedVehicules;
      
      if (prevSelected.includes(value)) {
        updatedVehicules = prevSelected.filter((item) => item !== value); // Remove if already selected
      } else {
        updatedVehicules = [...prevSelected, value]; // Add if not selected
      }
  
      // Mettre à jour newParking
      setNewParking((prev) => ({
        ...prev,
        vehicleTypes: updatedVehicules,
      }));
  
      return updatedVehicules;
    });
  };
  
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      if (place.geometry) {
        const newAddress = place.formatted_address || place.name;
        const newLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
  
        setAddress(newAddress); // Met à jour le champ input
        setLocation(newLocation); // Met à jour la position
        setNewParking((prev) => ({ ...prev, location: newAddress })); // Stocke dans l'état
      }
    }
  };

  const handlePricingChange = (e) => {
    const { name, value } = e.target;
    setNewParking({
      ...newParking,
      pricing: {
        ...newParking.pricing,
        [name]: value
      }
    });
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewParking(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
 
  
  

  const isFormValid = Object.values(images).every((img) => img !== null);

  const getToken = () => localStorage.getItem("token");
  const handleSubmit = (e) => {
    e.preventDefault();
  
    if (!newParking.nameP.trim() || !newParking.location.trim() || !newParking.totalSpots) {
      alert('Please fill all required fields.');
      return;
    }
  
    const formData = new FormData();
  
    Object.keys(newParking).forEach(key => {
      if (key === 'pricing' || key === 'vehicleTypes') {
        formData.append(key, JSON.stringify(newParking[key]));
      } else if (key === 'images') {
        if (newParking.images instanceof FileList || Array.isArray(newParking.images)) {
          Array.from(newParking.images).forEach(image => {
            formData.append('images', image);
          });
        } else {
          console.warn('Images field is not a valid FileList or array.', newParking.images);
        }
      } else {
        formData.append(key, newParking[key]);
      }
    });
  
    setLoading(true);
    axios.post(`${getBackendUrl()}/parkings/submit`, formData, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(() => {
      alert('Parking request submitted!');
      setNewParking({
        nameP: '', location: '', totalSpots: '', availableSpots: '',
        pricing: { perHour: '', perDay: '', perWeek: '' },
        vehicleTypes: [], images: []
      });
      setStep(1);
    })
    .catch(error => {
      console.error('Error submitting:', error.response ? error.response.data : error.message);
      alert('An error occurred while submitting. Please try again.');
    })
    .finally(() => setLoading(false));
  };
  

  

  const handleFileChange = async (event, face) => {
    const file = event.target.files[0];
    if (file) {
      setLoading((prev) => ({ ...prev, [face]: true }));

      // Affichage temporaire
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => ({ ...prev, [face]: reader.result }));
      };
      reader.readAsDataURL(file);

      // Envoi de l'image au backend
      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await axios.post(
          "http://localhost:5000/api/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        // Stocker l'URL de l'image retournée par le backend
        setImages((prev) => ({ ...prev, [face]: res.data.imageUrl }));
      } catch (error) {
        console.error("Erreur lors de l'upload sur le backend", error);
      } finally {
        setLoading((prev) => ({ ...prev, [face]: false }));
      }
    }
  };
  
  

  // Handle image file selection
  const handleImageChange = (e) => {
    setNewParking({
      ...newParking,
      images: e.target.files // Store the selected files in the state
    });
  };


  // View parking details
  const viewParkingDetails = (id) => {
    navigate(`/parkings/parkings/${id}`);
  };

  // Delete parking request
  const deleteParking = (id) => {
    if (window.confirm("Are you sure you want to delete this parking?")) {
      setLoading(true); // Set loading state while deleting
      axios.delete(`/parkings/parkings/${id}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      })
        .then(response => {
          alert('Parking deleted!');
          setParkings(parkings.filter(parking => parking._id !== id)); // Update list
        })
        .catch(error => {
          console.error('Error deleting parking:', error);
        })
        .finally(() => {
          setLoading(false); // Reset loading state after deletion
        });
    }
  };

  // Handle selection of a parking spot
  const handleParkingSelect = (parking) => {
    setSelectedParking(parking); // Update selected parking
  };

  return (
    <Container>
      {/* Submit a new parking request */}
      <section className="my-5">
        <h2 className="font-bold text-3xl mb-4">Submit a New Parking Request</h2>
        <Form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="bg-white p-6 rounded-[20px]">
              <Row className="justify-content-center">
                <Col lg={8} md={10}>
                  <Form.Group className="mb-4">
                    <Form.Label>Parking Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      name="nameP" 
                      value={newParking.nameP} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </Form.Group>
  
                  <Form.Group className="mb-4">
                    <Form.Label>Pickup Location</Form.Label>
                    <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
                      <Form.Control 
                        type="text" 
                        name="location" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        required 
                      />
                    </Autocomplete>
                  </Form.Group>
  
                  <Form.Group className="mb-4">
                    <Form.Label>Total Spots</Form.Label>
                    <Form.Control 
                      type="number" 
                      name="totalSpots" 
                      value={newParking.totalSpots} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </Form.Group>
  
                  <Form.Group className="mb-4">
                    <Form.Label>Available Spots</Form.Label>
                    <Form.Control 
                      type="number" 
                      name="availableSpots" 
                      value={newParking.availableSpots} 
                      onChange={handleInputChange} 
                      required 
                    />
                  </Form.Group>
  
                  <h3 className="mt-4">Pricing</h3>
                  <Form.Group className="mb-4">
                    <Form.Label>Per Hour</Form.Label>
                    <Form.Control 
                      type="number" 
                      name="perHour" 
                      value={newParking.pricing.perHour} 
                      onChange={handlePricingChange} 
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Per Day</Form.Label>
                    <Form.Control 
                      type="number" 
                      name="perDay" 
                      value={newParking.pricing.perDay} 
                      onChange={handlePricingChange} 
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Per Week</Form.Label>
                    <Form.Control 
                      type="number" 
                      name="perWeek" 
                      value={newParking.pricing.perWeek} 
                      onChange={handlePricingChange} 
                    />
                  </Form.Group>
  
                  <Form.Group className="mt-4">
  <Form.Label>Vehicle Types</Form.Label>
  <div className="d-flex flex-wrap gap-3">
    {vehiculeOptions.map((option) => (
      <div key={option.value} className="d-flex flex-column align-items-center">
        <Form.Check 
          type="checkbox"
          id={option.value}
          value={option.value}
          checked={selectedvehicules.includes(option.value)}
          onChange={handlevehiculeChange}
          className="mb-2"
        />
        <img 
          src={option.image} 
          alt={option.label} 
          style={{ width: "50px", height: "50px" }} 
        />
        <span className="text-center">{option.label}</span>
      </div>
    ))}
  </div>
</Form.Group>

                  <Button onClick={() => setStep(2)} className="btn btn-primary w-100">Next</Button>
                </Col>
              </Row>
            </div>
          )}
          
          {step === 2 && (
            <>
              <Form.Group className="mb-4">
                <Form.Label>Upload Images</Form.Label>
                <Form.Control type="file" multiple onChange={handleImageChange} />
              </Form.Group>
              <Button onClick={() => setStep(1)} className="btn btn-secondary mr-2">Back</Button>
              <Button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </>
          )}
        </Form>
      </section>
    </Container>
  );
}

export default Parking;