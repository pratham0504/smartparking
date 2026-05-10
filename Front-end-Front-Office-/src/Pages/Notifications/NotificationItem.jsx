/* eslint-disable no-unused-vars */
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IoCheckmarkCircle,
  IoAlertCircle,
  IoInformationCircle,
  IoNotifications,
} from "react-icons/io5";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { getBackendUrl } from "../../utils/backend";

const ParkingReservationNotification = ({ notification, onMarkAsRead }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [overlappingReservations, setOverlappingReservations] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);
  const driver = notification.driverId || {};
  const parking = notification.parkingId || {};
  const reservation = notification.reservationId || {};

  if (!driver.email || !parking.name || !reservation.startTime) {
    return (
      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
        Incomplete reservation data
      </div>
    );
  }

  const checkOverlappingReservations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${getBackendUrl()}/api/reservations/by-spot?parkingId=${parking._id}&spotId=${reservation.spotId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const overlapping = response.data.filter((res) => {
        if (res._id === reservation._id) return false;
        const resStart = new Date(res.startTime);
        const resEnd = new Date(res.endTime);
        const currentStart = new Date(reservation.startTime);
        const currentEnd = new Date(reservation.endTime);

        return (
          (resStart < currentEnd && resEnd > currentStart) ||
          (currentStart < resEnd && currentEnd > resStart)
        );
      });

      return overlapping;
    } catch (error) {
      console.error("Error checking reservations:", error);
      return [];
    }
  };

  const handleResponse = async (response) => {
    if (response === "accepted") {
      const overlapping = await checkOverlappingReservations();
      if (overlapping.length > 0) {
        setOverlappingReservations(overlapping);
        setShowConfirmModal(true);
        return;
      }
    }
    processResponse(response);
  };

  const processResponse = async (response) => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem("token");

      await axios.put(
        `${getBackendUrl()}/api/reservations/${reservation._id}/status`,
        { status: response },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      onMarkAsRead(notification._id, response);

      if (response === "accepted") {
        await axios.patch(
          `${getBackendUrl()}/parkings/${reservation.parkingId}/spots/${reservation.spotId}`,
          { status: "reserved" },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (err) {
      console.error("Error processing response:", err);
    } finally {
      setShowConfirmModal(false);
      setIsProcessing(false);
      window.location.reload(true);
    }
  };

  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-red-600">⚠️ Warning</h3>
        <p className="mb-4 text-gray-700">
          By accepting this reservation, {overlappingReservations.length}{" "}
          overlapping reservation(s) will be automatically rejected.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowConfirmModal(false)}
            disabled={isConfirmProcessing}
            className={`px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100 ${
              isConfirmProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setIsConfirmProcessing(true);
              processResponse("accepted");
            }}
            disabled={isConfirmProcessing}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-black rounded hover:bg-green-700 font-semibold shadow-md min-w-[160px] ${
              isConfirmProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isConfirmProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                Processing...
              </>
            ) : (
              "Confirm Acceptance"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const formattedStartDate = format(
    new Date(reservation.startTime),
    "dd MMMM yyyy 'at' HH:mm",
    { locale: fr }
  );
  const formattedEndDate = format(
    new Date(reservation.endTime),
    "dd MMMM yyyy 'at' HH:mm",
    { locale: fr }
  );

  const startTime = new Date(reservation.startTime);
  const endTime = new Date(reservation.endTime);
  const durationHours = Math.round((endTime - startTime) / (1000 * 60 * 60));

  const renderActionButtons = () => {
    if (isProcessing) {
      return (
        <div className="flex items-center justify-center p-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4b3f7a]"></div>
          <span className="ml-2 text-[#4b3f7a]">Processing...</span>
        </div>
      );
    }

    if (reservation.status === "canceled") {
      return (
        <div className="p-2 bg-[#4b3f7a] border border-green-200 rounded-md hover:bg-red-600 text-white text-center transition-colors shadow-sm">
          <IoCheckmarkCircle className="inline-block mr-2" />
          Reservation Canceled
        </div>
      );
    } else if (
      reservation.status === "accepted" ||
      notification.status === "acceptée"
    ) {
      return (
        <div className="p-2 bg-[#338a15] border border-green-200 rounded-md hover:bg-red-600 text-white text-center transition-colors shadow-sm">
          <IoCheckmarkCircle className="inline-block mr-2" />
          Reservation Accepted
        </div>
      );
    } else if (
      reservation.status === "rejected" ||
      notification.status === "refusée"
    ) {
      return (
        <div className="p-2 bg-[#e13105] border border-green-200 rounded-md hover:bg-red-600 text-white text-center transition-colors shadow-sm">
          <IoAlertCircle className="inline-block mr-2 text-red-500" />
          Reservation Rejected
        </div>
      );
    } else {
      return (
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => handleResponse("rejected")}
            disabled={isProcessing}
            className={`px-4 py-2 text-sm font-medium bg-[#fe1d27] text-white rounded-md hover:bg-red-600 transition-colors shadow-sm ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Reject
          </button>

          <button
            onClick={() => handleResponse("accepted")}
            disabled={isProcessing}
            className={`px-4 py-2 text-sm font-medium bg-[#3fd30c] text-white rounded-md hover:bg-green-600 transition-colors shadow-sm ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Accept
          </button>
        </div>
      );
    }
  };

  return (
    <div
      className={`p-4 mb-3 rounded-lg border ${
        notification.isRead
          ? "bg-white border-gray-200"
          : "bg-[#d4d6e5] border-blue-300 shadow-md"
      } transition-all duration-200 w-full`}
    >
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-gray-800 text-lg">
            Reservation Request for {parking.name}
          </h3>
        </div>

        <div className="mb-3">
          <div className="font-medium">Driver: {driver.name}</div>
          <div className="font-medium">Spot ID: {reservation.spotId}</div>
          <div className="font-medium">
            Price:{" "}
            <span className="text-gray-500 text-sm">
              {reservation.totalPrice !== undefined &&
              reservation.totalPrice !== null
                ? `₹${reservation.totalPrice}`
                : `₹${parking.pricing.hourly}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <div className="p-2 bg-white rounded border border-gray-200">
            <div className="text-xs text-gray-500">From</div>
            <div className="font-medium">{formattedStartDate}</div>
          </div>

          <div className="p-2 bg-white rounded border border-gray-200">
            <div className="text-xs text-gray-500">To</div>
            <div className="font-medium">{formattedEndDate}</div>
          </div>

          <div className="p-2 bg-white rounded border border-gray-200">
            <div className="text-xs text-gray-500">Duration</div>
            <div className="font-medium">{durationHours} Hours</div>
          </div>
        </div>

        {renderActionButtons()}
      </div>
      {showConfirmModal && <ConfirmationModal />}
    </div>
  );
};

const NotificationItem = ({
  notification,
  onResponse,
  onNotificationClick,
}) => {
  const handleClick = () => {
    if (!notification.isRead) {
      onNotificationClick(notification._id);
    }
  };

  // Handle Parking Reservation Notifications
  if (
    notification.parkingId &&
    notification.driverId &&
    notification.reservationId &&
    notification.type !== 'claim_against_vehicle'
  ) {
    return (
      <div onClick={handleClick}>
        <ParkingReservationNotification
          notification={notification}
          onMarkAsRead={onResponse}
        />
      </div>
    );
  }

  // Handle Claim Notifications
  if (notification.type === 'claim_against_vehicle' && notification.claimId) {
    const claimant = notification.driverId || {};
    
    return (
      <div
        onClick={handleClick}
        className={`p-4 mb-3 rounded-lg border ${
          notification.isRead
            ? "bg-white border-gray-200"
            : "bg-red-50 border-l-4 border-red-500 shadow-md"
        } transition-all duration-200 w-full`}
      >
        <div className="flex items-start">
          <div className="mr-3 mt-1">
            <IoAlertCircle className="text-red-500 text-3xl" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-800 text-lg">
                {notification.title || "Claim Against Your Vehicle"}
              </h3>
              <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                {format(new Date(notification.createdAt), "dd MMM yyyy 'at' HH:mm", {
                  locale: fr,
                })}
              </span>
            </div>
            
            {notification.plateNumber && (
              <div className="mb-2">
                <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md font-mono font-bold text-sm border border-yellow-300">
                  🚗 {notification.plateNumber}
                </span>
              </div>
            )}
            
            <p className="text-gray-700 mb-2">
              {notification.message}
            </p>
            
            {claimant.name && (
              <div className="text-sm text-gray-600 mb-2">
                <strong>Filed by:</strong> {claimant.name}
                {claimant.email && ` (${claimant.email})`}
              </div>
            )}
            
            {notification.evidenceUrl && (
              <div className="mt-2">
                <img 
                  src={notification.evidenceUrl} 
                  alt="Claim Evidence" 
                  className="max-w-xs rounded-lg border border-gray-300 shadow-sm"
                />
              </div>
            )}
            
            <div className="mt-3 flex gap-2">
              <a
                href="/UserClaims"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View My Claims
              </a>
              <a
                href="/contact"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generic notifications
  return (
    <div
      onClick={handleClick}
      className={`p-4 mb-2 rounded-lg flex items-start cursor-pointer ${
        notification.isRead
          ? "bg-white border-gray-200"
          : "bg-blue-50 border-l-4 border-blue-500 shadow-md"
      }`}
    >
      <div className="mr-3 mt-1">
        {notification.importance === "high" ? (
          <IoAlertCircle className="text-red-500 text-2xl" />
        ) : notification.type === "reservation" ? (
          <IoCheckmarkCircle className="text-green-500 text-2xl" />
        ) : (
          <IoInformationCircle className="text-blue-500 text-2xl" />
        )}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-gray-800">
            {notification.title || "Notification"}
          </h3>
          <span className="text-xs text-gray-500">
            {format(new Date(notification.createdAt), "dd MMMM yyyy 'at' HH:mm", {
              locale: fr,
            })}
          </span>
        </div>
        <p className="text-gray-600 mb-2">
          {notification.message ||
            notification.messageRequested ||
            "No message"}
        </p>
      </div>
    </div>
  );
};

const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef();
  const observerRef = useRef();
  const lastNotificationRef = useRef();

  const loadNotifications = async (pageNum = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("You must be logged in to view your notifications");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: pageNum,
        limit: 9,
      });

      const response = await axios.get(
        `${getBackendUrl()}/api/notifications/all?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { notifications: newNotifications, hasNextPage } = response.data;

      if (pageNum === 1) {
        setNotifications(newNotifications);
      } else {
        setNotifications((prev) => [...prev, ...newNotifications]);
      }

      setHasMore(hasNextPage);
      setUnreadCount(response.data.total);
      setError(null);
    } catch (err) {
      console.error("Error loading notifications:", err);
      setError("Error loading notifications");
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${getBackendUrl()}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    observerRef.current = observer;

    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    const observer = observerRef.current;
    const lastElement = lastNotificationRef.current;

    if (lastElement) {
      observer.observe(lastElement);
    }

    return () => {
      if (lastElement) {
        observer.unobserve(lastElement);
      }
    };
  }, [notifications]);

  useEffect(() => {
    loadNotifications(page);
  }, [page]);

  useEffect(() => {
    socketRef.current = io(getBackendUrl());
    const token = localStorage.getItem("token");

    if (token) {
      socketRef.current.emit("authenticate", token);
    }

    socketRef.current.on("newNotification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socketRef.current.on("notificationUpdate", (updatedNotification) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === updatedNotification._id ? updatedNotification : notif
        )
      );
      if (updatedNotification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const notificationId = entry.target.dataset.notificationId;
            const notification = notifications.find(
              (n) => n._id === notificationId
            );
            if (notification && !notification.isRead) {
              markNotificationAsRead(notificationId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll(".notification-item");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [notifications]);

  const handleResponse = async (notificationId, response) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => {
          if (n._id === notificationId) {
            return {
              ...n,
              isRead: true,
              status: response === "accepted" ? "acceptée" : "refusée",
              reservationId: {
                ...n.reservationId,
                status: response,
              },
            };
          }
          return n;
        })
      );
    } catch (err) {
      console.error("Error responding to notification:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("You must be logged in to mark notifications as read");
        return;
      }

      await axios.patch(
        `${getBackendUrl()}/api/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking notifications as read:", err);
      setError("Error marking notifications as read");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-w-2xl mx-auto overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <IoNotifications className="mr-2 text-blue-500" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {unreadCount}
            </span>
          )}
        </h2>
      </div>

      {error && (
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4"
          role="alert"
        >
          <p>{error}</p>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No notifications to display</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {notifications.map((notification, index) => (
            <div
              key={notification._id}
              ref={
                index === notifications.length - 1 ? lastNotificationRef : null
              }
              className="notification-item"
              data-notification-id={notification._id}
            >
              <NotificationItem
                notification={notification}
                onResponse={handleResponse}
                onNotificationClick={handleNotificationClick}
              />
            </div>
          ))}

          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const NotificationBadge = ({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef();

  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${getBackendUrl()}/api/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUnreadCount(response.data.count);
    } catch (err) {
      console.error(
        "Error loading unread notifications count:",
        err
      );
    }
  };

  useEffect(() => {
    socketRef.current = io(getBackendUrl());
    const token = localStorage.getItem("token");

    if (token) {
      socketRef.current.emit("authenticate", token);
      loadUnreadCount();

      socketRef.current.on("newNotification", () => {
        setUnreadCount((prev) => prev + 1);
      });

      socketRef.current.on("notificationUpdate", (updatedNotification) => {
        if (updatedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, []);

  return (
    <button
      onClick={() => {
        onClick();
        loadUnreadCount();
      }}
      className="relative p-2 rounded-full hover:bg-[#eef2ff] dark:hover:bg-[#2e3251]"
    >
      <IoNotifications className="text-xl text-[#4338ca] dark:text-[#818cf8]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center bg-red-500 text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export { NotificationList, NotificationItem, NotificationBadge };
