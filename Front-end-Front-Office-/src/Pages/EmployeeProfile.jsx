/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { QrReader } from "react-qr-reader";
import { jwtDecode } from "jwt-decode";
import { getBackendUrl } from "../utils/backend";

const EmployeeParkingScanner = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scannerFacing, setScannerFacing] = useState("environment");
  const [isProcessing, setIsProcessing] = useState(false);
  const [employeeParkings, setEmployeeParkings] = useState([]);
  const [scannedData, setScannedData] = useState(null);
  const [parsedReservation, setParsedReservation] = useState(null);
  const [updatingSpots, setUpdatingSpots] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Create a ref to store video stream tracks
  const videoStreamRef = useRef(null);
  // Ref for modal to detect clicks outside
  const modalRef = useRef(null);

  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication token not found");

        const decodedToken = jwtDecode(token);
        const userId =
          decodedToken.id ||
          decodedToken._id ||
          decodedToken.userId ||
          decodedToken.sub;

        setUser({
          ...decodedToken,
          _id: userId,
        });

        if (
          decodedToken.role === "Employee" ||
          decodedToken.role === "Employe"
        ) {
          if (userId) {
            await fetchEmployeeParkings(userId, token);
          } else {
            setError("User ID not found in authentication token");
          }
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    authenticateUser();

    // Return a cleanup function to stop camera when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  // Add event listener for clicks outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal]);

  // Function to explicitly stop the camera
  const stopCamera = () => {
    setScannerActive(false);

    // Stop all video tracks
    if (videoStreamRef.current) {
      const tracks = videoStreamRef.current.getTracks();
      tracks.forEach((track) => track.stop());
      videoStreamRef.current = null;
    }

    // Additional cleanup for any video elements
    document.querySelectorAll("video").forEach((video) => {
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        video.srcObject = null;
      }
    });
  };

  const fetchEmployeeParkings = async (employeeId, token) => {
    try {
      // Update this URL to match your backend API endpoint structure
      const url = `${getBackendUrl()}/parkings/parkings-by-employee/${employeeId}`;
      // Or, if your API uses query parameters instead:
      // const url = `http://localhost:3001/parkings?id_employee=${employeeId}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(url, {
        method: "GET",
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Unknown error";

        try {
          // Try to parse as JSON, but handle text responses too
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Error code: ${response.status}`;
        } catch (e) {
          // If not valid JSON, use the text directly
          errorMessage =
            errorText ||
            `Error code: ${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setEmployeeParkings(data);
    } catch (err) {
      setError(`Fetch error: ${err.message}`);
    }
  };

  // Hook into QrReader to capture mediaStream
  const handleMediaStream = (mediaStream) => {
    if (mediaStream) {
      videoStreamRef.current = mediaStream.getVideoTracks()[0];
    }
  };

  const handleScan = async (result) => {
    if (result && !isProcessing) {
      setIsProcessing(true);
      try {
        setScannedData(result.text);

        // Try to parse the QR data as JSON
        try {
          const reservationData = JSON.parse(result.text);

          // Check if this is a confirmation QR code (from Confirmation component)
          if (
            reservationData.reservationId &&
            reservationData.startTime &&
            reservationData.endTime
          ) {
            // Handle QR code from Confirmation component
            const standardizedData = {
              reservationId: reservationData.reservationId,
              parkingId:
                reservationData.parkingId || reservationData.reservationId,
              parkingName: reservationData.parkingName || "Parking Space",
              startTime: reservationData.startTime,
              endTime: reservationData.endTime,
              vehicleType: reservationData.vehicleType,
              status: reservationData.status || "pending",
              paymentStatus: reservationData.paymentStatus || "pending",
              generatedAt: new Date().toISOString(),
            };

            // Format dates for display
            standardizedData.formattedStartTime = new Date(
              standardizedData.startTime
            ).toLocaleString();
            standardizedData.formattedEndTime = new Date(
              standardizedData.endTime
            ).toLocaleString();
            standardizedData.formattedGeneratedAt = new Date().toLocaleString();

            setParsedReservation(standardizedData);
            setShowModal(true);
          }
          // Handle old format QR code
          else if (reservationData.id && reservationData.parkingName) {
            const standardizedData = {
              reservationId: reservationData.id,
              parkingId: reservationData.id,
              parkingName: reservationData.parkingName,
              startTime: reservationData.startTime,
              endTime: reservationData.endTime,
              vehicleType: reservationData.vehicleType,
              totalPrice: reservationData.totalPrice,
              status: reservationData.status || "pending",
              generatedAt: new Date().toISOString(),
            };

            if (standardizedData.startTime) {
              standardizedData.formattedStartTime = new Date(
                standardizedData.startTime
              ).toLocaleString();
            }
            if (standardizedData.endTime) {
              standardizedData.formattedEndTime = new Date(
                standardizedData.endTime
              ).toLocaleString();
            }
            standardizedData.formattedGeneratedAt = new Date().toLocaleString();

            setParsedReservation(standardizedData);
            setShowModal(true);
          } else {
            setParsedReservation(null);
          }
        } catch (parseError) {
          console.error("Failed to parse QR data:", parseError);
          setParsedReservation(null);
        }

        stopCamera();
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const toggleCamera = () => {
    // First stop the current camera
    stopCamera();

    // Then set new facing mode and reactivate after a short delay
    const newFacing = scannerFacing === "environment" ? "user" : "environment";
    setScannerFacing(newFacing);

    setTimeout(() => {
      setScannerActive(true);
    }, 300);
  };

  const resetScanner = () => {
    setScannedData(null);
    setParsedReservation(null);
    closeModal();

    // Add a small delay before reactivating the scanner
    setTimeout(() => {
      setScannerActive(true);
    }, 300);
  };

  const closeModal = () => {
    setShowModal(false);
    // Only reset scanner if we're closing the modal
    // but not starting a new scan (resetScanner already does this)
    if (scannedData) {
      // Clear data and restart camera
      setScannedData(null);
      setParsedReservation(null);

      // Add a small delay before reactivating the scanner
      setTimeout(() => {
        setScannerActive(true);
      }, 300);
    }
  };

  const updateParkingSpots = async (parkingId, change) => {
    if (!user || updatingSpots) return;

    setUpdatingSpots(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      // Using the endpoint you provided
      const url = `${getBackendUrl()}/parkings/update-total-spots/${parkingId}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ change: change }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Invalid JSON in error response" }));
        throw new Error(
          errorData.message ||
            `Failed to update spots: ${response.status} ${response.statusText}`
        );
      }

      // Refresh parking data
      await fetchEmployeeParkings(user._id, token);
    } catch (err) {
      setError(`Update error: ${err.message}`);
    } finally {
      setUpdatingSpots(false);
    }
  };

  // Function to update reservation status
  const updateReservationStatus = async (reservationId, newStatus) => {
    if (!user || !reservationId) return;

    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      // Update both status and paymentStatus based on accept/reject decision
      const url = `${getBackendUrl()}/api/reservations/${reservationId}/statusPayment`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          paymentStatus: newStatus === "accepted" ? "completed" : "failed",
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Invalid JSON in error response" }));
        throw new Error(
          errorData.message ||
            `Failed to update reservation status: ${response.status} ${response.statusText}`
        );
      }

      const updatedReservation = await response.json();

      // Update the parsed reservation with new status and payment status
      setParsedReservation((prev) => ({
        ...prev,
        status: newStatus,
        paymentStatus: newStatus === "accepted" ? "completed" : "failed",
      }));

      // If accepted and it's for a parking we manage, update spots
      if (newStatus === "accepted" && parsedReservation?.parkingId) {
        const relevantParking = employeeParkings.find(
          (p) => p._id === parsedReservation.parkingId
        );
        if (relevantParking) {
          await updateParkingSpots(parsedReservation.parkingId, -1);
        }
      }

      setError(null);
    } catch (err) {
      setError(`Update error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Loading...</h2>
          <div className="w-16 h-16 border-t-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Get status color and icon
  const getStatusConfig = (paymentStatus) => {
    switch (paymentStatus) {
      case "accepted":
        return {
          bgColor: "bg-green-100",
          textColor: "text-green-800",
          borderColor: "border-green-300",
          icon: "✅",
        };
      case "rejected":
        return {
          bgColor: "bg-red-100",
          textColor: "text-red-800",
          borderColor: "border-red-300",
          icon: "❌",
        };
      default:
        return {
          bgColor: "bg-yellow-100",
          textColor: "text-yellow-800",
          borderColor: "border-yellow-300",
          icon: "⏳",
        };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 border text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Parking Scanner</h1>
        <p className="text-gray-600 text-lg">
          Scan QR codes | View assigned parking details
        </p>
        {user && (
          <div className="mt-2 text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-full inline-block">
            Logged in as: {user.name || user.email} ({user.role})
            {user._id && (
              <span className="ml-2 text-xs text-gray-500">ID: {user._id}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* QR Scanner Section */}
        <div className="md:w-1/2">
          <div className="bg-white rounded-xl shadow-md p-5 border">
            <h2 className="text-xl font-bold text-center mb-4">
              {scannedData && !showModal ? "Scan Result" : "📷 Scan QR Code"}
            </h2>

            {!scannedData || showModal ? (
              <>
                <div className="flex justify-center mb-4">
                  <button
                    onClick={toggleCamera}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-1 px-3 rounded-lg text-sm"
                    disabled={isProcessing || showModal}
                  >
                    Switch Camera (
                    {scannerFacing === "environment" ? "Back" : "Front"})
                  </button>
                </div>

                <div className="relative aspect-video">
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 rounded">
                      <div className="w-10 h-10 border-t-4 border-white rounded-full animate-spin"></div>
                    </div>
                  )}
                  {/* Only show scanner when active and modal is not showing */}
                  {scannerActive && !showModal && (
                    <QrReader
                      constraints={{ facingMode: scannerFacing }}
                      onResult={handleScan}
                      onError={(error) => {
                        setError(`Camera error: ${error.message}`);
                      }}
                      onLoad={(instance) => {
                        // This is a workaround to get the mediaStream
                        if (instance && instance.stream) {
                          handleMediaStream(instance.stream);
                        }
                      }}
                    />
                  )}

                  {/* Show a placeholder when modal is open */}
                  {showModal && (
                    <div className="aspect-video bg-gray-100 flex items-center justify-center rounded">
                      <p className="text-gray-500">
                        Camera paused while viewing details
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : !parsedReservation ? (
              // Generic QR Data Display (non-reservation data)
              <div className="text-center">
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="font-bold text-lg">Scanned Data:</p>
                  <p className="text-sm text-gray-600 break-all">
                    {scannedData}
                  </p>
                </div>
                <button
                  onClick={resetScanner}
                  className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-black font-bold py-2 px-4 rounded-lg"
                >
                  New Scan
                </button>
              </div>
            ) : (
              // Message when modal should be open but isn't
              <div className="text-center p-6">
                <button
                  onClick={() => setShowModal(true)}
                  className="mb-4 bg-blue-500 hover:bg-blue-600 text-black font-bold py-2 px-4 rounded-lg"
                >
                  Show Reservation Details
                </button>
                <button
                  onClick={resetScanner}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-black font-bold py-2 px-4 rounded-lg"
                >
                  New Scan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Parking Details Section */}
        <div className="md:w-1/2">
          <div className="bg-white rounded-xl shadow-md p-5 border h-full">
            <h2 className="text-xl font-bold text-center mb-4">
              🅿️ Assigned Parking Details
            </h2>

            {error && (
              <div className="mt-4 p-4 bg-red-100 rounded-lg text-red-700">
                <p className="font-medium">Error:</p>
                <p>{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                  }}
                  className="mt-2 text-sm bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded"
                >
                  Dismiss
                </button>
              </div>
            )}

            {employeeParkings.length > 0 ? (
              employeeParkings.map((parking) => (
                <div key={parking._id} className="mt-4 space-y-4 mb-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-bold">{parking.name}</h3>
                    <div className="flex gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                        Available spots: {parking.availableSpots || 0}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-sm ${
                          parking.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : parking.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {parking.status || "pending"}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700">{parking.description}</p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Updated to use position instead of location */}
                    <div>
                      <h4 className="font-semibold text-gray-700">Location</h4>
                      {parking.position && (
                        <p className="text-xs text-gray-500 mt-1">
                          Lat: {parking.position.lat?.toFixed(4) || "N/A"}, Lng:{" "}
                          {parking.position.lng?.toFixed(4) || "N/A"}
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-700">
                        Vehicle Types
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {parking.vehicleTypes?.map((type, index) => (
                          <span
                            key={index}
                            className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Added features display */}
                  {parking.features && parking.features.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700">Features</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parking.features.map((feature, index) => (
                          <span
                            key={index}
                            className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {parking.pricing && (
                    <div>
                      <h4 className="font-semibold text-gray-700">Pricing</h4>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {Object.entries(parking.pricing).map(
                          ([type, price]) => (
                            <div
                              key={type}
                              className="bg-yellow-50 p-2 rounded"
                            >
                              <span className="text-xs text-gray-500 capitalize">
                                {type}
                              </span>
                              <p className="font-bold">${price}/hour</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Parking images carousel/preview - if available */}
                  {parking.images && parking.images.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700">Images</h4>
                      <div className="flex overflow-x-auto gap-2 mt-1 pb-2">
                        {parking.images.map((image, index) => (
                          <div key={index} className="flex-shrink-0">
                            <img
                              src={image}
                              alt={`Parking ${index + 1}`}
                              className="h-20 w-32 object-cover rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spot management buttons */}
                  <div className="flex justify-center gap-4 mt-4">
                    <button
                      onClick={() => updateParkingSpots(parking._id, -1)}
                      className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 shadow-lg"
                      disabled={updatingSpots}
                    >
                      <span className="text-2xl">-</span>
                      <span className="text-base">Decrease Spots</span>
                    </button>

                    <button
                      onClick={() => updateParkingSpots(parking._id, 1)}
                      className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 shadow-lg"
                      disabled={updatingSpots}
                    >
                      <span className="text-2xl">+</span>
                      <span className="text-base">Increase Spots</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-center">
                <p className="text-gray-600">No assigned parkings found</p>
                <p className="text-sm text-gray-500 mt-2">
                  {user ? (
                    <>
                      User ID: {user._id || "Missing"} / Role:{" "}
                      {user.role || "Unknown"}
                    </>
                  ) : (
                    "Not authenticated"
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Reservation Details */}
      {showModal && parsedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            ref={modalRef}
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden relative animate-fadeIn"
          >
            {/* Header with status banner */}
            <div
              className={`w-full h-2 ${
                getStatusConfig(parsedReservation.status).bgColor
              }`}
            ></div>

            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-500">✕</span>
            </button>

            <div className="p-6">
              {/* Header with status */}
              <div className="flex items-center mb-6">
                <div
                  className={`w-12 h-12 rounded-full ${
                    getStatusConfig(parsedReservation.status).bgColor
                  } flex items-center justify-center mr-4`}
                >
                  <span className="text-2xl">
                    {getStatusConfig(parsedReservation.status).icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Reservation Details</h3>
                  <div
                    className={`mt-1 px-3 py-1 rounded-full text-sm font-medium inline-block ${
                      getStatusConfig(parsedReservation.status).bgColor
                    } ${getStatusConfig(parsedReservation.status).textColor}`}
                  >
                    {parsedReservation.status?.toUpperCase() || "PENDING"}
                  </div>
                </div>
              </div>

              {/* Reservation content */}
              <div className="space-y-4">
                {/* IDs section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Reservation ID</p>
                    <p
                      className="font-semibold text-sm truncate"
                      title={parsedReservation.reservationId}
                    >
                      {parsedReservation.reservationId}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Parking Name</p>
                    <p
                      className="font-semibold text-sm truncate"
                      title={parsedReservation.parkingName}
                    >
                      {parsedReservation.parkingName}
                    </p>
                  </div>
                </div>

                {/* Vehicle & Total Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Vehicle Type</p>
                    <p className="font-semibold">
                      {parsedReservation.vehicleType}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Total Price</p>
                    <p className="font-semibold text-sm">
                      ${parsedReservation.totalPrice}
                    </p>
                  </div>
                </div>

                {/* Time Range */}
                <div
                  className={`p-4 rounded-lg ${
                    getStatusConfig(parsedReservation.status).bgColor
                  } ${
                    getStatusConfig(parsedReservation.status).borderColor
                  } border`}
                >
                  <p className="text-xs text-center mb-2 font-medium">
                    Reservation Time
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Start</p>
                      <p className="font-bold text-sm">
                        {parsedReservation.formattedStartTime}
                      </p>
                    </div>
                    <div className="text-center">
                      <span className="text-xl">➡️</span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">End</p>
                      <p className="font-bold text-sm">
                        {parsedReservation.formattedEndTime}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons for pending reservations */}
                {parsedReservation.status === "pending" && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() =>
                        updateReservationStatus(
                          parsedReservation.reservationId,
                          "accepted"
                        )
                      }
                      className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-4 rounded-lg disabled:opacity-50 shadow flex items-center justify-center gap-2"
                      disabled={isProcessing}
                    >
                      <span>✓</span> Accept
                    </button>
                    <button
                      onClick={() =>
                        updateReservationStatus(
                          parsedReservation.reservationId,
                          "rejected"
                        )
                      }
                      className="bg-red-500 hover:bg-red-600 text-black font-bold py-3 px-4 rounded-lg disabled:opacity-50 shadow flex items-center justify-center gap-2"
                      disabled={isProcessing}
                    >
                      <span>✕</span> Reject
                    </button>
                  </div>
                )}

                <button
                  onClick={resetScanner}
                  className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-black font-bold py-3 px-4 rounded-lg"
                >
                  New Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeParkingScanner;
