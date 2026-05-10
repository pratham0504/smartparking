import React, { createContext, useState, useContext } from 'react';

// Create the context
const SearchContext = createContext();

// Custom hook to use the search context
export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

// Provider component
export const SearchProvider = ({ children }) => {
  // State for search form data
  const [searchData, setSearchData] = useState({
    toogleTab: "On time",
    address: '',
    location: null,
    vehicleType: null,
    startDate: null,
    endDate: null,
    startTime: "14:41",
    endTime: "15:41",
  });

  // Update search data function
  const updateSearchData = (newData) => {
    setSearchData(prevData => ({
      ...prevData,
      ...newData
    }));
  };

  // Reset search data function
  const resetSearchData = () => {
    setSearchData({
      toogleTab: "On time",
      address: '',
      location: null,
      vehicleType: null,
      startDate: null,
      endDate: null,
      startTime: "14:41",
      endTime: "15:41",
    });
  };

  // Value to be provided
  const value = {
    searchData,
    updateSearchData,
    resetSearchData
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
