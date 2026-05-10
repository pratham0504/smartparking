/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from "react";
import { Button, Row, Col, Card, Spinner, Modal, Toast } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaShareAlt } from "react-icons/fa";
import { getBackendUrl } from '../../../utils/backend';

const Step2UploadImages = () => {
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
  const [isUploading, setIsUploading] = useState(false); // État pour l'upload
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRefs = {
    face1: useRef(null),
    face2: useRef(null),
    face3: useRef(null),
    face4: useRef(null),
  };
  const [videoStream, setVideoStream] = useState(null);
  const { parkingId } = useParams();
  const navigate = useNavigate();
  const [showMessage, setShowMessage] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMessage(false); // Cacher le message après 5 secondes
    }, 5000); // Le message disparait après 5 secondes
    return () => clearTimeout(timer); // Nettoyage du timer
  }, []);

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

  // Gestion du fichier sélectionné
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

      setLoading((prev) => ({ ...prev, [face]: false }));
    }
  };

  // Fonction pour envoyer les images au backend
  const handleSaveImages = async () => {
    if (!parkingId) {
      console.error("ID du parking manquant");
      return;
    }

    setIsUploading(true); // Démarrer le spinner

    const formData = new FormData();
    Object.entries(images).forEach(([face, imgData]) => {
      if (imgData) {
        if (imgData.startsWith("data:image")) {
          // Convertir base64 en fichier
          const byteString = atob(imgData.split(",")[1]);
          const mimeString = imgData.split(",")[0].split(":")[1].split(";")[0];
          const arrayBuffer = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            arrayBuffer[i] = byteString.charCodeAt(i);
          }
          const imageFile = new Blob([arrayBuffer], { type: mimeString });
          formData.append("images", imageFile, `${face}.png`);
        } else {
          // Ajouter l'URL de l'image
          formData.append("imageUrls", imgData);
        }
      }
    });

    try {
      const res = await axios.put(
        `${getBackendUrl()}/api/update/${parkingId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      console.log("Images mises à jour :", res.data);

      // Une fois l'upload terminé, arrêter le spinner et rediriger
      setIsUploading(false);
      navigate("/"); // Redirection vers la page d'accueil
    } catch (error) {
      console.error("Erreur lors de l'upload des images", error);
      setIsUploading(false); // Stop spinner en cas d'erreur
    }
  };

  return (
    <div className="step2-upload-container">
      {/* Message animé en haut */}
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
                    <span className="text-muted">Aucune image</span>
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
          onClick={handleSaveImages}
          className="px-6 py-3 rounded-lg bg-dark text-white font-medium border-0 hover:bg-gray-800 transition-all"
        >
          Save Parking
        </Button>
      </div>

      {/* Affichage du spinner de chargement pendant l'upload */}
      {isUploading && (
        <div className="loading-overlay">
          <Spinner animation="border" variant="light" size="lg" />
          <p className="text-white mt-2">Uploading...</p>
        </div>
      )}

      {/* Modal Camera */}
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

      {/* CSS */}
      <style>
        {`
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
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          z-index: 9999;
        }
        .loading-overlay p {
          color: white;
          font-size: 20px;
          margin-top: 10px;
        }
        .step2-upload-container {
          margin-top: 150px;
          margin-left: 60px;
          margin-right: 60px;
          margin-bottom: 60px;
        }
          .message-toast {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
  width: 100%;
  max-width: 600px;
}

.animated-message {
  animation: slideInFromTop 1s ease-out;
}

@keyframes slideInFromTop {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(0);
  }
}

/* Toast Body styling */
.toast-body {
  background-color: #28a745;
  color: white;
  font-size: 1.1rem;
}

.toast-body svg {
  font-size: 1.3rem;
}
      `}
      </style>
    </div>
  );
};

export default Step2UploadImages;
