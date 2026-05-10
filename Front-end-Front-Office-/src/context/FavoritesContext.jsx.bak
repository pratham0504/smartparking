import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  
  // Optimized isLoggedIn with useCallback
  const isLoggedIn = useCallback(() => {
    return !!localStorage.getItem('token');
  }, []);

  // Fetch favorites with better error handling
  const fetchFavorites = useCallback(async () => {
    if (!isLoggedIn()) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const response = await axios.get('http://localhost:3001/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const favoritesList = response.data?.favorites || [];
      setFavorites(Array.isArray(favoritesList) ? favoritesList : []);
      setIsApiAvailable(true);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setIsApiAvailable(false);
      
      try {
        const localFavorites = localStorage.getItem('localFavorites');
        setFavorites(localFavorites ? JSON.parse(localFavorites) : []);
      } catch (localError) {
        console.error('Error loading local favorites:', localError);
        setFavorites([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Safer isFavorite check
  const isFavorite = useCallback((parkingId) => {
    if (!parkingId) return false;
    return favorites.some(fav => fav?.parking?._id === parkingId);
  }, [favorites]);

  // Toggle favorite status of a parking
  const toggleFavorite = async (parkingId) => {
    if (!isLoggedIn()) {
      return { success: false, requiresAuth: true };
    }

    try {
      const token = localStorage.getItem('token');
      const isFav = isFavorite(parkingId);
      
      if (isApiAvailable) {
        try {
          const endpoint = isFav 
            ? `http://localhost:3001/favorites/remove/${parkingId}`
            : `http://localhost:3001/favorites/add/${parkingId}`;
          
          const method = isFav ? 'delete' : 'post';
          
          const response = await axios({
            method,
            url: endpoint,
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success) {
            updateFavoritesList(parkingId, !isFav);
            return { success: true };
          }
        } catch (apiError) {
          console.error('Error with endpoint:', apiError);
          throw apiError;
        }
      } else {
        updateFavoritesList(parkingId, !isFav);
        return { success: true };
      }
      
      return { success: false, message: "Unknown response format" };
    } catch (error) {
      console.error('Error toggling favorite:', error);
      
      if (!isApiAvailable) {
        const isFav = isFavorite(parkingId);
        updateFavoritesList(parkingId, !isFav);
        return { success: true, usingFallback: true };
      }
      
      if (error.response) {
        if (error.response.status === 404) {
          toast.error("Favorite feature is not available on the server. Using local storage instead.");
          setIsApiAvailable(false);
          const isFav = isFavorite(parkingId);
          updateFavoritesList(parkingId, !isFav);
          return { success: true, usingFallback: true };
        }
      }
      
      return { 
        success: false, 
        error: error.message,
        details: error.response?.data?.message || "Server error"
      };
    }
  };
  
  // Optimized updateFavoritesList
  const updateFavoritesList = useCallback((parkingId, isAdding) => {
    if (!parkingId) return;

    const newFavorites = isAdding
      ? [...favorites, { parking: { _id: parkingId }, createdAt: new Date().toISOString() }]
      : favorites.filter(fav => fav?.parking?._id !== parkingId);
    
    setFavorites(newFavorites);
    
    if (!isApiAvailable) {
      try {
        localStorage.setItem('localFavorites', JSON.stringify(newFavorites));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [favorites, isApiAvailable]);

  // Effect with dependency array
  useEffect(() => {
    if (isLoggedIn()) {
      fetchFavorites();
    }
  }, [isLoggedIn, fetchFavorites]);

  return (
    <FavoritesContext.Provider value={{ 
      favorites, 
      isFavorite, 
      toggleFavorite, 
      isLoading, 
      isLoggedIn, 
      isApiAvailable,
      fetchFavorites // Add this to allow manual refresh
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

// Add default context value
const defaultContext = {
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: async () => ({ success: false }),
  isLoading: false,
  isLoggedIn: () => false,
  isApiAvailable: true,
  fetchFavorites: () => Promise.resolve()
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    console.warn('useFavorites must be used within a FavoritesProvider');
    return defaultContext;
  }
  return context;
};
