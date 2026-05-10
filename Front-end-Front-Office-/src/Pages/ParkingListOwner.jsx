import React, { useEffect, useState } from "react";
import axios from "axios";
import { getBackendUrl } from '../utils/backend';
import ParkingRequestForm from "./ParkingForm";
import ParkingEditForm from "./ParkingEditForm";
import { useNavigate } from "react-router-dom";
import { showToast } from "../utils/toast";

const ParkingListOwner = () => {
  const [myParkings, setMyParkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingParking, setEditingParking] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingRequestParkings, setPendingRequestParkings] = useState({});
  const [selectedParking, setSelectedParking] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assigningParkingId, setAssigningParkingId] = useState(null);

  // 🔹 Function to fetch Owner's parkings
  const fetchMyParkings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("❌ No token found!");
        setError("User not authenticated!");
        return;
      }

      console.log("Sending request to fetch parkings..."); 
      const response = await axios.get(
        `${getBackendUrl()}/parkings/my-parkings`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Response received:", response.data); 
      setMyParkings(response.data);

      // Check pending requests for all parkings after fetching
      checkAllPendingRequests(response.data);
    } catch (err) {
      console.error("API Error:", err); 
      setError(
        err.response?.data?.message || "Error loading parkings"
      );
    } finally {
      setLoading(false);
    }
  };

  // Check pending requests for all parkings
  const checkAllPendingRequests = async (parkings) => {
    const pendingStatus = {};

    // Check each parking in parallel
    const promises = parkings.map(async (parking) => {
      try {
        await axios.get(
          `${getBackendUrl()}/parkings/check-pending/${parking._id}`
        );
        // If request succeeds, there is no pending request
        pendingStatus[parking._id] = false;
      } catch (error) {
        // If status 400, there is a pending request
        pendingStatus[parking._id] = error.response?.status === 400;
      }
    });

    await Promise.all(promises);
    setPendingRequestParkings(pendingStatus);
  };

  // 🔹 Fetch parkings and employees on component mount
  useEffect(() => {
    fetchMyParkings();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("🔑 Token retrieved:", token); 

      if (!token) {
        console.error("❌ No token found");
        return;
      }

      const response = await axios.get(`${getBackendUrl()}/User/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Employees retrieved:", response.data);
      setEmployees(response.data);
    } catch (error) {
      console.error("💥 Error fetching employees", error);
      if (error.response) {
        console.error("🛑 Server response:", error.response.data);
      }
    }
  };

  const handleAssignEmployee = async (parkingId) => {
    if (!selectedEmployee) {
      alert("Please select an employee!");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${getBackendUrl()}/parkings/assign-employee/${parkingId}/${selectedEmployee}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast.success("Employee assigned successfully!");
      setAssigningParkingId(null);
      fetchMyParkings(); // Refresh the parking list
    } catch (error) {
      showToast.error("Error assigning employee");
    }
  };

  const handleEdit = async (parking) => {
    try {
      // Check if there is already a pending request
      const response = await axios.get(
        `${getBackendUrl()}/parkings/check-pending/${parking._id}`
      );

      if (response.status === 200) {
        // ✅ No pending request, editing is allowed
        setEditingParking(parking);
        setIsAdding(false); 
      }
    } catch (error) {
      // ❌ A pending request exists, display error message
      showToast.alert(
        error.response?.data?.message || "Error during verification."
      );
    }
  };

  // 🔹 Function to add a parking
  const handleAdd = () => {
    setEditingParking(null);
    setIsAdding(true); 
  };

  const handleDelete = async (id) => {
    if (window.confirm("Do you really want to remove this parking lot?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${getBackendUrl()}/parkings/parkings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Update parking list after deletion
        setMyParkings((prevParkings) =>
          prevParkings.filter((parking) => parking._id !== id)
        );

        showToast.success("🚀 Parking deleted successfully!");
      } catch (err) {
        showToast.error("❌ Error during deletion!");
      }
    }
  };

  const handleShowDetails = (parking, e) => {
    if (e) e.stopPropagation();
    setSelectedParking(parking);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedParking(null);
  };

  // Improved Popup with increased width and clear header
  const ParkingDetailsPopup = ({
    parking,
    onClose,
  }) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
      setIsOpen(true);
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "auto";
      };
    }, []);

    const closeWithAnimation = () => {
      setIsOpen(false);
      setTimeout(() => {
        onClose();
      }, 300); 
    };

    const handleOutsideClick = (e) => {
      if (e.target === e.currentTarget) {
        closeWithAnimation();
      }
    };

    useEffect(() => {
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          closeWithAnimation();
        }
      };

      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formattedPrice = parking.pricing?.hourly
      ? `₹${parking.pricing.hourly}/hr`
      : "Price not defined";

    const availability = parking.availableSpots / parking.totalSpots;

    const getStatusInfo = () => {
      if (availability >= 0.5) {
        return {
          text: "Available",
          color: "text-green-600",
          bgColor: "bg-green-100",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      } else if (availability > 0.2) {
        return {
          text: "Limited",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ),
        };
      } else {
        return {
          text: "Almost Full",
          color: "text-red-600",
          bgColor: "bg-red-100",
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      }
    };

    const statusInfo = getStatusInfo();
    const occupancyRate =
      ((parking.totalSpots - parking.availableSpots) / parking.totalSpots) *
      100;

    return (
      <div
        className={`fixed inset-0 z-[1000] flex items-start justify-center pt-24 transition-opacity duration-300`}
        style={{
          backgroundColor: isOpen ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)",
          backdropFilter: "blur(2px)",
        }}
        onClick={handleOutsideClick}
        aria-modal="true"
        role="dialog"
      >
        <div
          className={`bg-white rounded-lg shadow-2xl w-full max-w-2xl p-0 relative transform transition-all duration-300 max-h-[80vh] overflow-y-auto ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4"
          }`}
        >
          <div className="relative bg-white border-b border-gray-200 p-6 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="bg-blue-600 p-3 rounded-lg shadow-md">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5h14a2 2 0 012 2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11v4.5a2.5 2.5 0 01-5 0V11"
                    />
                  </svg>
                </div>
                <h2 className="ml-4 mr-10 text-2xl font-bold text-gray-800">
                  Parking Details
                </h2>
                <div className="mt-6 flex gap-2 justify-end">
                  <button
                    onClick={() => navigate(`/parkingPlan/${parking._id}`)}
                    className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium py-1.5 px-3 rounded-md transition-all shadow-xs text-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </button>

                  <button
                    onClick={() => navigate(`/parkingLiveView/${parking._id}`)}
                    className="flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 font-medium py-1.5 px-3 rounded-md transition-all shadow-xs text-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Visualize
                  </button>
                </div>
              </div>
              <button
                onClick={closeWithAnimation}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 transition-transform hover:scale-110"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 pt-6 pb-6">
            <div className="bg-white rounded-lg shadow-lg p-4 mb-4 relative border border-gray-100">
              <div
                className={`absolute -top-3 -right-3 ${statusInfo.bgColor} ${statusInfo.color} px-3 py-1 rounded-full text-xs font-semibold flex items-center shadow-md`}
              >
                {statusInfo.icon}
                {statusInfo.text}
              </div>

              <h2 className="text-2xl font-bold text-gray-800">
                {parking.name}
              </h2>
            </div>

            <div className="mt-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-medium text-gray-700">
                  Occupancy Rate
                </span>
                <span className="text-gray-600">
                  {Math.round(occupancyRate)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${occupancyRate}%`,
                    backgroundColor:
                      occupancyRate > 80
                        ? "#dc2626"
                        : occupancyRate > 50
                        ? "#eab308"
                        : "#16a34a",
                  }}
                ></div>
              </div>
            </div>

            <div className="mt-4 bg-gray-50 p-4 rounded-lg shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Total Spots
                  </p>
                  <p className="text-lg font-semibold text-gray-800 flex items-center mt-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                      />
                    </svg>
                    {parking.totalSpots}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Available Spots
                  </p>
                  <p className="text-lg font-semibold text-gray-800 flex items-center mt-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {parking.availableSpots}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Pricing
                  </p>
                  <p
                    className="text-lg font-semibold flex items-center mt-1 text-blue-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formattedPrice}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Opening Hours
                  </p>
                  <p className="text-lg font-semibold text-gray-800 flex items-center mt-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1 text-purple-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    24/7
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Description
              </h3>
              <p className="text-gray-600 mt-1 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                {parking.description ||
                  "Secure parking spot with 24h access and video surveillance."}
              </p>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Features
              </h3>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-2 py-1 rounded-md text-xs flex items-center transition-transform hover:scale-105 bg-blue-100 text-blue-800">
                  Secure
                </span>
                <span className="px-2 py-1 rounded-md text-xs flex items-center transition-transform hover:scale-105 bg-blue-100 text-blue-800">
                  24/7 Access
                </span>
                <span className="px-2 py-1 rounded-md text-xs flex items-center transition-transform hover:scale-105 bg-blue-100 text-blue-800">
                  Indoor
                </span>
                <span className="px-2 py-1 rounded-md text-xs flex items-center transition-transform hover:scale-105 bg-blue-100 text-blue-800">
                  CCTV
                </span>
                <span className="px-2 py-1 rounded-md text-xs flex items-center transition-transform hover:scale-105 bg-blue-100 text-blue-800">
                  Lighting
                </span>
                <span className="px-2 py-1 rounded-md text-xs flex items-center transition-transform hover:scale-105 bg-blue-100 text-blue-800">
                  Guard service
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {showPopup && selectedParking && (
        <ParkingDetailsPopup
          parking={selectedParking}
          onClose={handleClosePopup}
        />
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">
            🚗 Parking Management
          </h2>

          <button
            onClick={handleAdd}
            className="bg-green-600 hover:bg-green-700 text-black font-medium rounded-lg py-2 px-4 transition-colors flex items-center justify-center shadow-sm"
          >
            Add new Parking
          </button>
        </div>

        {isAdding && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold mb-4">Add New Parking</h3>
            <ParkingRequestForm
              onSuccess={() => {
                setIsAdding(false);
                fetchMyParkings();
              }}
            />
          </div>
        )}

        {editingParking && !isAdding && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold mb-4">Update Parking</h3>
            <ParkingEditForm
              editingParking={editingParking}
              setEditingParking={setEditingParking}
              refreshParkings={fetchMyParkings}
            />
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4 border-b pb-2">My Parkings</h3>

          {loading ? (
            <div className="flex justify-center items-center p-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center bg-red-50 rounded-lg border border-red-200">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          ) : myParkings.length === 0 ? (
            <div className="text-gray-500 p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium">No parking added</h3>
              <p className="mt-2">Click on "Add New Parking" to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myParkings.map((parking) => (
                <div
                  key={parking._id}
                  className="rounded-lg shadow-md bg-white border border-gray-200 hover:shadow-lg transition-all overflow-hidden flex flex-col"
                >
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {parking.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {parking.location}
                      </p>
                    </div>
                    <button
                      className="bg-gray-600 text-black py-1 px-3 rounded-md hover:bg-gray-700 transition text-sm font-medium whitespace-nowrap"
                      onClick={(e) => handleShowDetails(parking, e)}
                    >
                      View Details
                    </button>
                  </div>

                  <div className="p-4 flex-grow flex flex-col">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                        <p className="text-xs text-gray-600 font-medium">
                          Total Spots
                        </p>
                        <p className="font-bold text-blue-700 text-lg">
                          {parking.totalSpots}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-md border border-green-100">
                        <p className="text-xs text-gray-600 font-medium">
                          Available Spots
                        </p>
                        <p className="font-bold text-green-700 text-lg">
                          {parking.availableSpots}
                        </p>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 mb-4">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">
                          Assigned Employee:
                        </p>
                        <p className="font-semibold text-gray-800">
                          {parking.id_employee
                            ? parking.id_employee.name
                            : "No Employee Assigned"}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-2 mb-4">
                      {!pendingRequestParkings[parking._id] && (
                        <button
                          className="bg-blue-600 text-black py-2 px-4 rounded-md hover:bg-blue-700 transition text-sm font-medium flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(parking);
                          }}
                        >
                          Update
                        </button>
                      )}

                      <button
                        className="bg-red-600 text-black py-2 px-4 rounded-md hover:bg-red-700 transition text-sm font-medium flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(parking._id);
                        }}
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-auto">
                      <button
                        className="w-full bg-yellow-500 text-black py-2 px-3 rounded-md hover:bg-yellow-600 transition text-sm font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigningParkingId(parking._id);
                        }}
                      >
                        Assign an Employee
                      </button>

                      {assigningParkingId === parking._id && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md border">
                          <select
                            className="w-full border rounded-md p-2 mb-2 bg-white"
                            onChange={(e) =>
                              setSelectedEmployee(e.target.value)
                            }
                          >
                            <option value="">Select an Employee</option>
                            {employees.map((employee) => (
                              <option key={employee._id} value={employee._id}>
                                {employee.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex justify-between gap-2">
                            <button
                              className="flex-1 bg-green-500 text-black py-2 px-3 rounded-md hover:bg-green-600 transition text-sm font-medium"
                              onClick={() => handleAssignEmployee(parking._id)}
                            >
                              Confirm
                            </button>
                            <button
                              className="flex-1 bg-gray-400 text-black py-2 px-3 rounded-md hover:bg-gray-500 transition text-sm font-medium"
                              onClick={() => setAssigningParkingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParkingListOwner;