/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from 'react';
import { Col, Container, Form, Row, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

// Contact page with manual license plate entry support

const CameraModal = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            videoRef.current.srcObject = mediaStream;
            setStream(mediaStream);
        } catch (err) {
            console.error('Camera error:', err);
        }
    };

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-4">
                <div className="relative">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg"
                    />
                    <div className="absolute top-2 right-2">
                        <div className="animate-pulse flex items-center bg-black bg-opacity-50 rounded-full px-3 py-1">
                            <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
                            <span className="text-white text-sm">Recording</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-center space-x-4">
                    <button
                        onClick={handleCapture}
                        className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors duration-300"
                    >
                        Capture
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors duration-300"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const Contact = () => {
    const [image, setImage] = useState(null);
    const [description, setDescription] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [manualPlateNumber, setManualPlateNumber] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(true);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef(null);
    const { user, token } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!user || !token) {
            navigate('/login', { state: { from: '/contact' } });
        }
    }, [user, token, navigate]);

    const startCamera = async () => {
        try {
            // Vérifier si le navigateur supporte getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            // Demander la permission explicitement d'abord
            const permission = await navigator.permissions.query({ name: 'camera' });
            console.log('Camera permission status:', permission.state);

            if (permission.state === 'denied') {
                throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
            }

            // Configuration de la caméra avec préférence pour la caméra arrière
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            console.log('Requesting camera access...');
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera access granted, setting up video stream...');

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                
                // Attendre que la vidéo soit prête
                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = () => {
                        resolve();
                    };
                });

                await videoRef.current.play();
                console.log('Video stream started successfully');
                setIsCapturing(true);
            }
        } catch (err) {
            console.error('Camera access error:', err);
            let errorMessage = 'Unable to access camera. ';
            
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage += 'Please grant camera permission and try again.';
            } else if (err.name === 'NotFoundError') {
                errorMessage += 'No camera found on your device.';
            } else if (err.name === 'NotReadableError') {
                errorMessage += 'Camera is already in use by another application.';
            } else {
                errorMessage += err.message || 'Please check your camera settings and try again.';
            }
            
            setError(errorMessage);
            setIsCapturing(false);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        try {
            // Créer un canvas de la même taille que la vidéo
            const canvas = document.createElement('canvas');
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;

            canvas.width = videoWidth;
            canvas.height = videoHeight;

            // Dessiner l'image de la vidéo sur le canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

            // Convertir en fichier
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], `capture-${Date.now()}.jpg`, { 
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });

                    setImage(file);
                    setImagePreview(canvas.toDataURL('image/jpeg'));
                    
                    // Arrêter la caméra après la capture
                    stopCamera();
                }
            }, 'image/jpeg', 0.8);
        } catch (err) {
            console.error('Capture error:', err);
            setError('Failed to capture photo. Please try again.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsCapturing(false);
        }
    };

    // Nettoyage lors du démontage du composant
    useEffect(() => {
        return () => {
            stopCamera(); // S'assurer que la caméra est arrêtée
        };
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        if (!token) {
            setError('Please login to submit a claim');
            setLoading(false);
            return;
        }

        if (!image || !description) {
            setError('Please provide both an image and description');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('image', image);
        formData.append('description', description);
        
        // Include manual plate number if provided
        if (manualPlateNumber && manualPlateNumber.trim()) {
            formData.append('manualPlateNumber', manualPlateNumber.trim().toUpperCase());
            formData.append('plateNumber', manualPlateNumber.trim().toUpperCase());
        }

        try {
            const response = await axios.post(
                'http://localhost:3001/api/claims',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (response.data.success) {
                setSuccess(true);
                setDescription('');
                setImage(null);
                setImagePreview(null);
                setManualPlateNumber('');
                setShowManualEntry(false);
                
                if (response.data.claim.plateNumber) {
                    const plateSourceLabel = response.data.plateSource === 'manual' 
                        ? '📝 Manually entered' 
                        : '🤖 Auto-detected';
                    
                    const successMessage = (
                        <div>
                            <p>Claim submitted successfully!</p>
                            <p>{plateSourceLabel} license plate: <strong>{response.data.claim.plateNumber}</strong></p>
                            {response.data.reservationFound ? (
                                <div>
                                    <p>✅ Associated reservation found:</p>
                                    <ul className="list-disc pl-5 mt-2">
                                        <li>Parking: {response.data.reservationDetails.parkingName}</li>
                                        <li>Location: {response.data.reservationDetails.location}</li>
                                        <li>From: {new Date(response.data.reservationDetails.startTime).toLocaleString()}</li>
                                        <li>To: {new Date(response.data.reservationDetails.endTime).toLocaleString()}</li>
                                    </ul>
                                </div>
                            ) : response.data.registeredVehicleFound ? (
                                <div>
                                    <p>✅ Registered vehicle found:</p>
                                    <ul className="list-disc pl-5 mt-2">
                                        <li>Owner: {response.data.vehicleOwnerDetails?.name || 'Unknown'}</li>
                                        <li>Plate: {response.data.vehicleOwnerDetails?.vehiclePlate || response.data.claim.plateNumber}</li>
                                    </ul>
                                </div>
                            ) : (
                                <p>ℹ️ No matching reservation found for this plate.</p>
                            )}
                        </div>
                    );
                    setSuccess(successMessage);

                    // Ajouter un délai avant le refresh
                    setTimeout(() => {
                        setSuccess((prevSuccess) => (
                            <div>
                                {prevSuccess}
                                <div className="mt-4 text-center">
                                    <p className="text-gray-600">Refreshing page in 5 seconds...</p>
                                    <div className="w-full bg-gray-200 h-1 mt-2 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full animate-[progress_3s_linear]"></div>
                                    </div>
                                </div>
                            </div>
                        ));

                        // Refresh après 3 secondes
                        setTimeout(() => {
                            window.location.reload();
                        }, 5000);
                    }, 3000); // Attendre 2 secondes avant d'afficher le message de refresh
                } else {
                    const noPlateMessage = (
                        <div>
                            <p>Claim submitted successfully!</p>
                            <p className="text-yellow-600 mt-2">⚠️ No license plate was detected automatically.</p>
                            <p className="text-sm mt-1">You can click "Enter Manually" above to add the plate number.</p>
                        </div>
                    );
                    setSuccess(noPlateMessage);
                }
            }
        } catch (err) {
            console.error('Error submitting claim:', err);
            setError(err.response?.data?.message || 'Failed to submit claim. Please try again.');
            
            // Handle authentication errors
            if (err.response?.status === 401) {
                navigate('/login', { state: { from: '/contact' } });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user || !token) {
        return null; // Component will redirect via useEffect
    }

    const handleCameraCapture = (file) => {
        setImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const renderCameraView = () => (
        <div className="relative">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="mx-auto max-h-48 object-contain mb-2 rounded-lg"
                style={{ 
                    transform: 'scaleX(-1)',
                    backgroundColor: '#000' // Fond noir pour mieux voir quand la caméra charge
                }}
            />
            {isCapturing && (
                <div className="absolute top-2 left-2">
                    <div className="animate-pulse flex">
                        <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                        <span className="ml-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                            Recording
                        </span>
                    </div>
                </div>
            )}
            <div className="mt-2 flex justify-center space-x-4">
                <button
                    type="button"
                    onClick={capturePhoto}
                    className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                >
                    Take Photo
                </button>
                <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                >
                    Cancel
                </button>
            </div>
        </div>
    );

    return (
        <section className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
            <Container className="max-w-6xl mx-auto px-4">
                <Row className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Left Column - Info Section */}
                    <Col className="p-8 bg-Mblack text-white flex flex-col h-full" md={4}>
                        <div className="mb-8">
                            <h2 className="text-4xl text-center font-bold mb-6">Report an Issue</h2>
                            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
                                <p className="text-gray-300 text-lg text-center">
                                    Help us maintain a safe parking environment. Submit your claim with photo evidence.
                                </p>
                                
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm mb-8">
                            <h4 className="text-xl font-semibold mb-4">Why Report?</h4>
                            <ul className="space-y-3">
                                <li className="flex items-center space-x-3">
                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Automatic plate detection</span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Quick reservation matching</span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Fast response time</span>
                                </li>
                            </ul>
                        </div>

                        {/* Contact Support */}
                        <div className="mt-auto">
                            <div className="bg-white/5 rounded-xl p-6">
                                <h5 className="text-xl font-bold mb-4">Need Help?</h5>
                                <div className="flex items-center space-x-3">
                                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-gray-300">support@parkEz.com</span>
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* Right Column - Form Section */}
                    <Col md={8} className="p-8">
                        {error && (
                            <Alert variant="danger" className="rounded-xl mb-6 bg-red-50 border-red-100">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {error}
                                </div>
                            </Alert>
                        )}

                        {success && (
                            <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-xl shadow-sm border border-green-100 mb-6">
                                {success}
                            </div>
                        )}

                        <Form onSubmit={handleSubmit} className="space-y-6">
                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Vehicle Evidence</h3>
                                <p className="text-gray-600 mb-4">
                                    Please provide clear photos of the vehicle, ensuring the license plate is visible.
                                </p>

                                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all hover:border-Mblack/50">
                                    {isCapturing ? (
                                        renderCameraView()
                                    ) : (
                                        <>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                                id="image-upload"
                                            />
                                            {imagePreview ? (
                                                <div className="relative">
                                                    <img 
                                                        src={imagePreview} 
                                                        alt="Preview" 
                                                        className="mx-auto max-h-48 object-contain mb-2"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setImage(null);
                                                            setImagePreview(null);
                                                        }}
                                                        className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                                                    >
                                                        Remove Photo
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="text-gray-500">
                                                        <i className="fas fa-camera mb-2 text-3xl"></i>
                                                        <p>Take a photo or upload an image</p>
                                                    </div>
                                                    <div className="space-x-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCamera(true)}
                                                            className="bg-black text-white px-4 py-2 rounded-lg"
                                                        >
                                                            Open Camera
                                                        </button>
                                                        <label 
                                                            htmlFor="image-upload"
                                                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                                                        >
                                                            Upload Image
                                                        </label>
                                                        <a 
                                                            href="/UserClaims"
                                                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                                                        >
                                                            My Claims
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Manual License Plate Entry */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xl font-bold text-gray-800">License Plate Number</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowManualEntry(!showManualEntry)}
                                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                                    >
                                        {showManualEntry ? 'Close Manual Entry' : 'Enter Manually'}
                                    </button>
                                </div>
                                
                                {showManualEntry && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <p className="text-sm text-gray-600 mb-3">
                                            If automatic detection fails, please enter the license plate number manually
                                        </p>
                                        <Form.Group>
                                            <Form.Control
                                                type="text"
                                                value={manualPlateNumber}
                                                onChange={(e) => {
                                                    const value = e.target.value.toUpperCase();
                                                    // Only allow letters, numbers, and hyphens
                                                    const filtered = value.replace(/[^A-Z0-9-]/g, '');
                                                    setManualPlateNumber(filtered);
                                                }}
                                                placeholder="e.g., MH-14-F-2071"
                                                className="w-full px-4 py-3 rounded-lg border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 font-mono text-lg"
                                                maxLength="15"
                                            />
                                            <Form.Text className="text-gray-500 text-xs mt-1">
                                                Format: XX-00-XX-0000 (e.g., MH-14-F-2071)
                                            </Form.Text>
                                        </Form.Group>
                                    </div>
                                )}
                            </div>

                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Claim Details</h3>
                                <p className="text-gray-600 mb-4">
                                    Provide a detailed description of the situation.
                                </p>

                                <Form.Group>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Please describe what happened..."
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-Mblack focus:ring-2 focus:ring-Mblack/20 transition-all duration-300"
                                        required
                                    />
                                </Form.Group>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-Mblack text-white py-3 px-6 rounded-xl hover:bg-Mdarkblack transition-colors duration-300 font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Submit Claim</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </Form>
                    </Col>
                </Row>
            </Container>
            <CameraModal
                isOpen={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={handleCameraCapture}
            />
        </section>
    );
};

export default Contact;
