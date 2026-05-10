// notificationContext.js
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

// Create the context
const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Provider component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef();

  // Load unread count initially
  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(
        `http://localhost:3001/api/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUnreadCount(response.data.count);
    } catch (err) {
      console.error('Error loading unread notifications count:', err);
      setError('Failed to load notification count');
    }
  };

  // Load notifications with pagination
  const loadNotifications = async (page = 1, limit = 9) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('You must be logged in to view notifications');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: page,
        limit: limit,
      });

      const response = await axios.get(
        `http://localhost:3001/api/notifications/all?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { notifications: newNotifications, hasNextPage, total } = response.data;

      if (page === 1) {
        setNotifications(newNotifications);
      } else {
        setNotifications((prev) => [...prev, ...newNotifications]);
      }

      setUnreadCount(total);
      setError(null);
      return { hasNextPage };
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Error loading notifications');
    } finally {
      setLoading(false);
    }
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:3001/api/notifications/${notificationId}/read`,
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
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('You must be logged in to mark notifications as read');
        return;
      }

      await axios.patch(
        'http://localhost:3001/api/notifications/read-all',
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
      console.error('Error marking all notifications as read:', err);
      setError('Error marking all notifications as read');
    }
  };

  // Handle reservation responses (accept/reject)
  const handleReservationResponse = async (notificationId, response) => {
    try {
      const token = localStorage.getItem('token');
      const notification = notifications.find(n => n._id === notificationId);
      
      if (!notification || !notification.reservationId) {
        console.error('Invalid notification or missing reservation ID');
        return;
      }

      // Update reservation status
      await axios.put(
        `http://localhost:3001/api/reservations/${notification.reservationId._id}/status`,
        { status: response },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Mark notification as read
      await markAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => {
          if (n._id === notificationId) {
            return {
              ...n,
              isRead: true,
              status: response === 'accepted' ? 'acceptée' : 'refusée',
              reservationId: {
                ...n.reservationId,
                status: response,
              },
            };
          }
          return n;
        })
      );

      // Update parking spot if accepted
      if (response === 'accepted' && notification.reservationId.spotId) {
        await axios.patch(
          `http://localhost:3001/parkings/${notification.reservationId.parkingId}/spots/${notification.reservationId.spotId}`,
          { status: 'reserved' },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (err) {
      console.error('Error handling reservation response:', err);
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Load initial data
    loadUnreadCount();
    
    // Initialize socket
    socketRef.current = io('http://localhost:3001');
    socketRef.current.emit('authenticate', token);

    // Listen for new notifications
    socketRef.current.on('newNotification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Listen for notification updates
    socketRef.current.on('notificationUpdate', (updatedNotification) => {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === updatedNotification._id ? updatedNotification : notif
        )
      );
      
      if (!updatedNotification.isRead && updatedNotification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Value object that will be passed to consumers
  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    handleReservationResponse,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;