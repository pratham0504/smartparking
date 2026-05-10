/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback, memo, useMemo, useLayoutEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import enIN from 'date-fns/locale/en-IN';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import UpdateClaimModal from '../UI/Modal/UpdateClaimModal';


// Import the CSS module
import styles from '../../styles/OwnerClaims.module.css';

// Composant pour afficher l'image en plein écran
const ImageViewer = ({ imageUrl, onClose }) => (
  <div 
    className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
      <img 
        src={imageUrl} 
        alt="Claim evidence" 
        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200 transition-all"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
);

// SearchBar component - moved outside OwnerClaims to fix the hooks error
const SearchBar = memo(({ searchQuery, setSearchQuery, setCurrentPage }) => {
  const searchInputRef = useRef(null);
  
  // Use useEffect to maintain focus after state update
  useEffect(() => {
      if (searchInputRef.current) {
          const cursorPosition = searchInputRef.current.selectionStart;
          searchInputRef.current.focus();
          // Restore cursor position
          setTimeout(() => {
              if (searchInputRef.current) {
                  searchInputRef.current.selectionStart = cursorPosition;
                  searchInputRef.current.selectionEnd = cursorPosition;
              }
          }, 0);
      }
  }, [searchQuery]);
  
  return (
      <div className="relative w-full mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
          </div>
          <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset pagination when searching
              }}
              placeholder="Search by description, name, email, license plate..."
              className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
          {searchQuery && (
              <button
                  onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              </button>
          )}
      </div>
  );
});

SearchBar.displayName = 'SearchBar';

// ReservationUserInfo component - moved outside OwnerClaims to be accessible from ClaimsTable
const ReservationUserInfo = memo(({ reservation }) => {
  if (!reservation || !reservation.userId) {
    return <span className="text-gray-500 text-sm italic">Not assigned</span>;
  }

  // Format the dates properly
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error("Date formatting error:", e);
        return "Invalid date";
    }
  };

  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow transition-all">
      <div className="mb-2 pb-2 border-b border-gray-100">
        <p className="font-medium text-blue-700">User</p>
        <p className="font-semibold text-black">{reservation.userId.name}</p>
        <p className="text-sm text-gray-600">{reservation.userId.email}</p>
      </div>
      
      {reservation.startTime && reservation.endTime && (
        <div className="space-y-1 text-sm">
          <div className="flex itemsCenter">
            <span className="text-gray-500 mr-2">From:</span>
            <span className="text-gray-800">
              {formatDate(reservation.startTime)}
            </span>
          </div>
          <div className="flex itemsCenter">
            <span className="text-gray-500 mr-2">To:</span>
            <span className="text-gray-800">
              {formatDate(reservation.endTime)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

ReservationUserInfo.displayName = 'ReservationUserInfo';

// Utility function for formatting dates - moved outside components to be globally accessible
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error("Date formatting error:", e);
    return "Invalid date";
  }
};

// Simplify the ClaimsDashboard component to not rely on recharts if not installed
const ClaimsDashboard = memo(({ claims }) => {
  // Calculer les statistiques
  const stats = useMemo(() => {
    const pending = claims.filter(c => c.status === 'pending').length;
    const resolved = claims.filter(c => c.status === 'resolved').length;
    const rejected = claims.filter(c => c.status === 'rejected').length;
    const inProgress = claims.filter(c => c.status === 'in_progress').length;
    
    return [
      { name: 'Pending', value: pending, color: '#FBBF24' },
      { name: 'Resolved', value: resolved, color: '#10B981' },
      { name: 'Rejected', value: rejected, color: '#EF4444' },
      { name: 'In Progress', value: inProgress, color: '#3B82F6' },
    ];
  }, [claims]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-md p-6 mb-8"
    >
      <h3 className="text-xl font-bold text-gray-800 mb-4">Claims Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graphique - simplified version */}
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-800">Claims Statistics</p>
           
            <div className="mt-4">
              {stats.map((stat) => (
                <div key={stat.name} className="flex items-center mb-2">
                  <div className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: stat.color }}></div>
                  <span className="text-sm">{stat.name}: {stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <motion.div 
              key={stat.name}
              whileHover={{ scale: 1.03 }}
              className={`${styles.claimCard} bg-white rounded-lg p-4 border shadow-sm`}
              style={{ borderLeftColor: stat.color, borderLeftWidth: '4px' }}
            >
              <p className="text-gray-500 text-sm">{stat.name}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stat.value > 0 
                  ? `${Math.round((stat.value / claims.length) * 100)}% of total` 
                  : 'No claims'}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

ClaimsDashboard.displayName = 'ClaimsDashboard';

// New component for advanced filters
const AdvancedFilters = memo(({ 
  parkingsList, 
  selectedParkingFilter, 
  setSelectedParkingFilter,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  dateRangeFilter, 
  setDateRangeFilter
}) => {
  const [expandedFilters, setExpandedFilters] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-md mb-6 overflow-hidden"
    >
      <div className="flex justify-between items-center px-6 py-4 border-b">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters and Sorting
        </h3>
        <button 
          onClick={() => setExpandedFilters(!expandedFilters)}
          className="text-blue-600 text-sm font-medium flex items-center"
        >
          {expandedFilters ? 'Collapse' : 'More Filters'}
          <svg 
            className={`w-4 h-4 ml-1 transition-transform ${expandedFilters ? 'rotate-180' : ''}`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Filter by parking location */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Parking Location</label>
            <select
              value={selectedParkingFilter}
              onChange={(e) => setSelectedParkingFilter(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Parking Locations</option>
              {parkingsList.map((parking) => (
                <option key={parking.id} value={parking.id}>{parking.name}</option>
              ))}
            </select>
          </div>

          {/* Filtre par statut */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Tri */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Sort By</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Filtres supplémentaires */}
        <AnimatePresence>
          {expandedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 pt-4 border-t border-gray-100 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Période */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Period</label>
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => setDateRangeFilter('week')}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        dateRangeFilter === 'week' 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      7 days
                    </button>
                    <button 
                      onClick={() => setDateRangeFilter('month')}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        dateRangeFilter === 'month' 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      30 days
                    </button>
                    <button 
                      onClick={() => setDateRangeFilter('all')}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${
                        dateRangeFilter === 'all' 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

// Tableau de réclamations amélioré
const ClaimsTable = memo(({ 
  claims, 
  renderActions, 
  getStatusBadge, 
  formatDate,
  isLoading,
  setSelectedClaim,
  setUpdateModalOpen,
  setFullscreenImage
}) => {
  // État pour le tri des colonnes
  const [sortedField, setSortedField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Fonction pour trier les données
  const sortData = useCallback((field) => {
    if (sortedField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortedField(field);
      setSortDirection('asc');
    }
  }, [sortedField, sortDirection]);

  // En-tête de colonne avec tri
  const SortableHeader = ({ field, children }) => (
    <th 
      onClick={() => sortData(field)}
      className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <span className="text-gray-400">
          {sortedField === field ? (
            sortDirection === 'asc' ? '▲' : '▼'
          ) : '●'}
        </span>
      </div>
    </th>
  );

  // Affichage d'un état de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading claims...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <SortableHeader field="userId.name">Claimant</SortableHeader>
              <SortableHeader field="plateNumber">License Plate</SortableHeader>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Reservation
              </th>
              <SortableHeader field="description">Description</SortableHeader>
              <SortableHeader field="createdAt">Date</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-5 py-10 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
                  </svg>
                  <p>No claims match the selected criteria</p>
                  <button className="mt-2 text-blue-600 hover:underline text-sm">Modify Filters</button>
                </td>
              </tr>
            ) : (
              claims.map((claim) => (
                <motion.tr 
                  key={claim._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="hover:bg-gray-50 group cursor-pointer"
                  onClick={() => {
                    setSelectedClaim(claim);
                    setUpdateModalOpen(true);
                  }}
                >
                  <td className="px-5 py-5 border-b border-gray-200">
                    <div className="flex flex-col space-y-4">
                      {/* Claim Author */}
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-gray-900 whitespace-no-wrap font-medium">
                            {claim.userId?.name || 'Unknown User'}
                          </p>
                          <p className="text-gray-600 text-xs mt-1">
                            {claim.userId?.email || 'Email not available'}
                          </p>
                          <span className="inline-block bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded mt-1">
                            Claimant
                          </span>
                        </div>
                      </div>

                      {/* Reservation User */}
                      {claim.reservationId?.userId && (
                        <div className="flex items-center mt-2 pt-2 border-t border-gray-100">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-full w-full rounded-full bg-blue-100 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-gray-900 whitespace-no-wrap font-medium">
                              {claim.reservationId.userId.name || 'Unknown User'}
                            </p>
                            <p className="text-gray-600 text-xs mt-1">
                              {claim.reservationId.userId.email || 'Email not available'}
                            </p>
                            <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded mt-1">
                              Reservation User
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Plaque d'immatriculation */}
                  <td className="px-5 py-5 border-b border-gray-200">
                    <div className="bg-gray-100 border border-gray-300 text-gray-800 text-sm px-3 py-2 rounded">
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                        </svg>
                        <div className="text-center font-mono font-medium">
                          {claim.plateNumber || 'Not detected'}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Informations sur la réservation */}
                  <td className="px-5 py-5 border-b border-gray-200">
                    {claim.reservationId && claim.reservationId.userId ? (
                      <ReservationUserInfo reservation={claim.reservationId} />
                    ) : (
                      <div className="bg-gray-100 rounded-lg p-3 text-center">
                        <svg className="h-5 w-5 text-gray-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-500 text-sm">Not associated</span>
                      </div>
                    )}
                  </td>
                  
                  {/* Description */}
                  <td className="px-5 py-5 border-b border-gray-200">
                    <div className="max-w-xs overflow-hidden">
                      <p className="text-gray-700 line-clamp-2 text-sm">
                        {claim.description}
                      </p>
                      {claim.description && claim.description.length > 60 && (
                        <button 
                          className="text-blue-600 text-xs mt-1 hover:text-blue-800"
                          onClick={() => {
                            setSelectedClaim(claim);
                            setUpdateModalOpen(true);
                          }}
                        >
                          See more
                        </button>
                      )}
                    </div>
                  </td>
                  
                  {/* Date */}
                  <td className="px-5 py-5 border-b border-gray-200">
                    <p className="text-gray-600 whitespace-no-wrap text-sm">
                      {formatDate(claim.createdAt).split(' ')[0]}
                    </p>
                  </td>
                  
                  {/* Status */}
                  <td className="px-5 py-5 border-b border-gray-200">
                    {getStatusBadge(claim.status)}
                  </td>
                  
                  {/* Actions */}
                  <td className="px-5 py-5 border-b border-gray-200">
                    {renderActions(claim)}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// Pagination améliorée avec optimisations de performance
const paginate = (pageNumber, currentPage, totalPages, setCurrentPage) => {
  if (pageNumber > 0 && pageNumber <= totalPages) {
    setCurrentPage(pageNumber);
  }
};

// Correction complète du composant OptimizedTextarea
const OptimizedTextarea = memo(({ value, onChange, inputRef }) => {
    // Utiliser useLayoutEffect pour gérer le focus et la position du curseur
    useLayoutEffect(() => {
        const textarea = inputRef.current;
        if (!textarea) return;
        
        // Sauvegarder la position du curseur avant chaque re-render
        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        
        // Attendre le cycle de rendu suivant pour redonner le focus et restaurer la position
        requestAnimationFrame(() => {
            textarea.focus();
            
            // Restaurer la position exacte du curseur
            if (typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
                textarea.setSelectionRange(selectionStart, selectionEnd);
            }
        });
    });
    
    return (
        <div className="mt-6">
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Message to User</span>
                <span className="text-gray-400 text-xs">Optional</span>
            </label>
            <div className="relative">
                <textarea
                    ref={inputRef}
                    value={value}
                    onChange={onChange}
                    placeholder="Explain the reason for your decision..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 
                            focus:border-blue-500 placeholder-gray-400 resize-none transition-shadow
                            hover:border-gray-400"
                    rows="4"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {value.length}/500
                </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
                This message will be sent by email to the user with the status update.
            </p>
        </div>
    );
});

OptimizedTextarea.displayName = 'OptimizedTextarea';



// Composant principal amélioré
const OwnerClaims = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedParkingFilter, setSelectedParkingFilter] = useState('all');
    const [parkingsList, setParkingsList] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [claimsPerPage, setClaimsPerPage] = useState(8); // Augmenté pour une meilleure expérience
    
    // Créer une seule référence pour le textarea
    const textareaRef = useRef(null);
    
    // Nouveaux états pour les filtres avancés
    const [sortOrder, setSortOrder] = useState('newest');
    const [dateRangeFilter, setDateRangeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    
    // Références pour améliorer le défilement
    const tableContainerRef = useRef(null);
    const contentRef = useRef(null);

    const fetchOwnerClaims = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token not found');
            }

            const response = await axios.get(
                'http://localhost:3001/api/owner-claims',
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Correction ici : s'assurer que nous accédons au bon chemin dans la réponse
            const claimsData = response.data.claims || [];
            setClaims(claimsData);

            // Extraire la liste unique des parkings pour le filtre
            const uniqueParkings = [...new Set(claimsData
                .filter(claim => claim.reservationId?.parkingId)
                .map(claim => JSON.stringify({
                    id: claim.reservationId.parkingId._id,
                    name: claim.reservationId.parkingId.name
                })))].map(str => JSON.parse(str));

            setParkingsList(uniqueParkings);
        } catch (err) {
            console.error("Loading error:", err);
            setError(err.response?.data?.message || 'Error loading claims');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOwnerClaims();
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchOwnerClaims();
    };

    const handleStatusUpdate = async (claim, newStatus) => {
        if (!claim || !claim._id) {
            toast.error('Invalid claim data');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Session expired. Please login again.');
                return;
            }

            console.log('Updating claim:', claim._id, 'to status:', newStatus);

            const response = await axios({
                method: 'put',
                url: `http://localhost:3001/api/owner-claims/${claim._id}/status`,
                data: {
                    status: newStatus,
                    message: statusMessage || `Claim has been marked as ${newStatus}`
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                toast.success(`Claim status updated to ${newStatus}`);
                // Mise à jour locale de l'état
                setClaims(prevClaims => 
                    prevClaims.map(c => 
                        c._id === claim._id 
                            ? { ...c, status: newStatus } 
                            : c
                    )
                );
                setUpdateModalOpen(false);
                setSelectedClaim(null);
                setStatusMessage('');
                await fetchOwnerClaims(); // Rafraîchir les données
            }
        } catch (error) {
            console.error('Error updating claim:', error);
            const errorMessage = error.response?.data?.message || 'Failed to update claim status';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleMessageChange = useCallback((e) => {
        const value = e.target.value;
        setStatusMessage(prev => {
            if (prev !== value) {
                return value;
            }
            return prev;
        });
    }, []);

    // Créons une référence stable pour le textarea
    

    const getStatusBadge = (status) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1 animate-pulse">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pending
                    </span>
                );
            case 'resolved':
                return (
                    <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Resolved
                    </span>
                );
            case 'in_progress':
                return (
                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        In Progress
                    </span>
                );
            case 'rejected':
                return (
                    <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rejected
                    </span>
                );
            default:
                return (
                    <span className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-semibold">
                        {status}
                    </span>
                );
        }
    };

    const renderActions = (claim) => (
        <div className="flex space-x-2">
            <button
                onClick={() => {
                    setSelectedClaim(claim);
                    setUpdateModalOpen(true);
                }}
                className="bg-black text-white px-3 py-1 rounded text-xs flex items-center gap-1 hover:bg-gray-800 transition-colors"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
            </button>
            <button
                onClick={() => setFullscreenImage(claim.imageUrl)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 hover:bg-blue-700 transition-colors"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Image
            </button>
        </div>
    );

    const UpdateModal = () => {
        // Référence pour le textarea optimisée et créée une seule fois
        const textareaRef = useRef(null);
        
        // Effet pour désactiver le scroll du body
        useLayoutEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }, []);
        
        // Fonction de gestion du changement STABLE avec useCallback
        const handleTextareaChange = useCallback((e) => {
            setStatusMessage(e.target.value);
        }, []);
        
        return (
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50 backdrop-blur-sm"
                style={{ paddingTop: '6rem' }} // Augmenter l'espace en haut pour éviter la navbar
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setUpdateModalOpen(false);
                        setSelectedClaim(null);
                        setStatusMessage('');
                    }
                }}
            >
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[80vh] overflow-y-auto relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header avec bouton de fermeture */}
                    <div className="sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Update Claim</h3>
                            <button
                                onClick={() => {
                                    setUpdateModalOpen(false);
                                    setSelectedClaim(null);
                                    setStatusMessage('');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {selectedClaim && (
                        <div className="mt-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                {/* Informations de la réclamation */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Claimant</p>
                                        <p className="font-semibold text-gray-900">{selectedClaim.userId?.name || 'Unknown'}</p>
                                        <p className="text-sm text-gray-600">{selectedClaim.userId?.email || 'Email not available'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">License Plate</p>
                                        <p className="font-mono font-medium text-gray-900">{selectedClaim.plateNumber || 'Not detected'}</p>
                                    </div>
                                </div>
                                
                                {/* Description de la réclamation */}
                                <div className="mb-4">
                                    <p className="text-sm text-gray-500 mb-1">Description</p>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <p className="text-gray-700">{selectedClaim.description}</p>
                                    </div>
                                </div>

                                {/* Image de la réclamation */}
                                {selectedClaim.imageUrl && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-500 mb-1">Image</p>
                                        <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                                            <img 
                                                src={selectedClaim.imageUrl} 
                                                alt="Claim Evidence"
                                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                                                onClick={() => setFullscreenImage(selectedClaim.imageUrl)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section de mise à jour du statut */}
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Update Status
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[ 
                                        { id: 'in_progress', label: 'In Progress', icon: '🔄', color: 'bg-blue-100 hover:bg-blue-200 text-blue-800' },
                                        { id: 'resolved', label: 'Resolve', icon: '✅', color: 'bg-green-100 hover:bg-green-200 text-green-800' },
                                        { id: 'rejected', label: 'Reject', icon: '❌', color: 'bg-red-100 hover:bg-red-200 text-red-800' },
                                        { id: 'pending', label: 'Pending', icon: '⏳', color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' }
                                    ].map(({ id, label, icon, color }) => (
                                        <button
                                            key={id}
                                            onClick={() => handleStatusUpdate(selectedClaim, id)}
                                            className={`${color} px-4 py-3 rounded-lg text-sm font-medium 
                                              transition-all duration-200 hover:shadow transform hover:-translate-y-0.5
                                              flex items-center justify-center gap-2`}
                                        >
                                            <span className="text-lg">{icon}</span>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            
                        </div>
                    )}
                    <OptimizedTextarea 
                        value={statusMessage}
                        onChange={handleTextareaChange}
                        inputRef={textareaRef}
                    />
                </motion.div>
            </div>
        );
    };

    // Fonction améliorée pour filtrer et trier les réclamations
    const getFilteredAndSortedClaims = useCallback(() => {
        let filtered = [...claims];
        
        // Filtrage par parking
        if (selectedParkingFilter !== 'all') {
            filtered = filtered.filter(claim => 
                claim.reservationId?.parkingId?._id === selectedParkingFilter
            );
        }
        
        // Filtrage par statut
        if (statusFilter !== 'all') {
            filtered = filtered.filter(claim => 
                claim.status?.toLowerCase() === statusFilter.toLowerCase()
            );
        }
        
        // Filtrage par période
        if (dateRangeFilter !== 'all') {
            const now = new Date();
            const timeLimit = new Date();
            
            if (dateRangeFilter === 'week') {
                timeLimit.setDate(now.getDate() - 7);
            } else if (dateRangeFilter === 'month') {
                timeLimit.setMonth(now.getMonth() - 1);
            }
            
            filtered = filtered.filter(claim => 
                new Date(claim.createdAt) >= timeLimit
            );
        }
        
        // Recherche textuelle
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(claim => 
                (claim.description && claim.description.toLowerCase().includes(query)) ||
                (claim.userId?.name && claim.userId.name.toLowerCase().includes(query)) ||
                (claim.userId?.email && claim.userId.email.toLowerCase().includes(query)) ||
                (claim.plateNumber && claim.plateNumber.toLowerCase().includes(query))
            );
        }
        
        // Tri
        switch (sortOrder) {
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'priority':
                // Ordre personnalisé : pending > in_progress > resolved > rejected
                const priorityOrder = { 'pending': 0, 'in_progress': 1, 'resolved': 2, 'rejected': 3 };
                filtered.sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status]);
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }
        
        return filtered;
    }, [claims, selectedParkingFilter, statusFilter, dateRangeFilter, searchQuery, sortOrder]);
    
    // Réclamations filtrées et triées
    const filteredAndSortedClaims = useMemo(() => getFilteredAndSortedClaims(), 
        [getFilteredAndSortedClaims]);
    
    // Pagination
    const indexOfLastClaim = currentPage * claimsPerPage;
    const indexOfFirstClaim = indexOfLastClaim - claimsPerPage;
    const currentClaims = filteredAndSortedClaims.slice(indexOfFirstClaim, indexOfLastClaim);
    const totalPages = Math.ceil(filteredAndSortedClaims.length / claimsPerPage);

    // Pagination améliorée avec optimisations de performance
    const Pagination = useCallback(() => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-center items-center my-6 bg-white py-3 px-4 rounded-lg shadow-sm">
                <button
                    onClick={() => paginate(1, currentPage, totalPages, setCurrentPage)}
                    disabled={currentPage === 1}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg mr-2 ${
                        currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                </button>
                
                <button
                    onClick={() => paginate(currentPage - 1, currentPage, totalPages, setCurrentPage)}
                    disabled={currentPage === 1}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg mr-2 ${
                        currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                
                <div className="flex items-center">
                    <input
                        type="number"
                        value={currentPage}
                        onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value > 0 && value <= totalPages) {
                                paginate(value, currentPage, totalPages, setCurrentPage);
                            }
                        }}
                        className="w-12 h-9 text-center border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="mx-2 text-gray-600">of {totalPages}</span>
                </div>
                
                <button
                    onClick={() => paginate(currentPage + 1, currentPage, totalPages, setCurrentPage)}
                    disabled={currentPage === totalPages}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg ml-2 ${
                        currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
                
                <button
                    onClick={() => paginate(totalPages, currentPage, totalPages, setCurrentPage)}
                    disabled={currentPage === totalPages}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg ml-2 ${
                        currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        );
    }, [currentPage, totalPages]);

    // Handler pour fermer le modal
    const handleCloseUpdateModal = useCallback(() => {
        setUpdateModalOpen(false);
        setSelectedClaim(null);
        setStatusMessage('');
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-10 max-w-7xl" ref={contentRef}>
                {/* Header avec statistiques */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">
                            <span className="border-b-4 border-blue-500 pb-1">Received Claims</span>
                        </h2>
                        <p className="text-gray-600 mt-2">
                            Manage and respond to your customers' claims
                        </p>
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex space-x-2">
                        <button 
                            onClick={handleRefresh}
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-gray-300 shadow-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={isRefreshing}
                        >
                            <svg className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        
                        {/* Bouton d'aide */}
                        <button
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
                            onClick={() => toast.info("User guide coming soon")}
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Help
                        </button>
                        
                        {/* Filtre mobile */}
                        <button 
                            className="md:hidden inline-flex items-center px-4 py-2 rounded-lg bg-white border border-gray-300 shadow-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Filters
                        </button>
                    </div>
                </div>
                
                {/* Dashboard */}
                {!loading && claims.length > 0 && (
                    <ClaimsDashboard claims={claims} />
                )}
                
                {/* Barre de recherche */}
                <SearchBar 
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    setCurrentPage={setCurrentPage}
                />
                
                {/* Filtres */}
                <div className={`md:block ${isMobileFiltersOpen ? 'block' : 'hidden'}`}>
                    <AdvancedFilters
                        parkingsList={parkingsList}
                        selectedParkingFilter={selectedParkingFilter}
                        setSelectedParkingFilter={setSelectedParkingFilter}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        sortOrder={sortOrder}
                        setSortOrder={setSortOrder}
                        dateRangeFilter={dateRangeFilter}
                        setDateRangeFilter={setDateRangeFilter}
                    />
                </div>
                
                {/* Contenu principal */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-lg text-center">
                        <svg className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-medium mb-2">An error occurred</h3>
                        <p>{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : filteredAndSortedClaims.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <svg className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No claims found</h3>
                        <p className="text-gray-500 mb-4">
                            {searchQuery 
                                ? "No claims match your search."
                                : "You have not received any claims yet."}
                        </p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-blue-600 hover:underline"
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Résumé des filtres appliqués */}
                        <div className="flex flex-wrap items-center mb-4 text-sm text-gray-600">
                            <span className="mr-2">Active Filters:</span>
                            {selectedParkingFilter !== 'all' && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-2">
                                    Parking: {parkingsList.find(p => p.id === selectedParkingFilter)?.name || selectedParkingFilter}
                                </span>
                            )}
                            {statusFilter !== 'all' && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-2">
                                    Status: {statusFilter}
                                </span>
                            )}
                            {dateRangeFilter !== 'all' && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-2">
                                    Period: {dateRangeFilter === 'week' ? 'Last 7 days' : 'Last 30 days'}
                                </span>
                            )}
                            {searchQuery && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-2">
                                    Search: "{searchQuery}"
                                </span>
                            )}
                        </div>
                        
                        {/* Affichage du total des résultats */}
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-gray-600">
                                Showing <span className="font-medium">{indexOfFirstClaim + 1}</span> to{' '}
                                <span className="font-medium">
                                    {Math.min(indexOfLastClaim, filteredAndSortedClaims.length)}
                                </span>{' '}
                                of <span className="font-medium">{filteredAndSortedClaims.length}</span> claims
                            </p>
                            
                            {/* Options par page */}
                            <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-600">Show:</span>
                                <select
                                    value={claimsPerPage}
                                    onChange={(e) => {
                                        setClaimsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border border-gray-300 rounded px-2 py-1 text-gray-700"
                                >
                                    <option value={5}>5</option>
                                    <option value={8}>8</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Tableau des réclamations */}
                        <ClaimsTable 
                            claims={currentClaims}
                            renderActions={renderActions}
                            getStatusBadge={getStatusBadge}
                            formatDate={formatDate}
                            isLoading={loading}
                            setSelectedClaim={setSelectedClaim}
                            setUpdateModalOpen={setUpdateModalOpen}
                            setFullscreenImage={setFullscreenImage}
                        />
                        
                        {/* Pagination */}
                        <Pagination />
                    </>
                )}
                
                {/* Ajouter une nouvelle section d'aide contextuelle */}
                {!loading && !error && claims.length > 0 && (
                    <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-medium text-blue-800 mb-3">How to Manage Claims Effectively</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="flex items-center mb-3">
                                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-blue-700 font-medium">1</span>
                                    </div>
                                    <h4 className="text-gray-800 font-medium">Sort by Priority</h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Start by addressing the most recent claims and those with a "Pending" status.
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="flex items-center mb-3">
                                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-blue-700 font-medium">2</span>
                                    </div>
                                    <h4 className="text-gray-800 font-medium">Quick Response</h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Change the status to "In Progress" to inform the customer that their claim is being addressed.
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="flex items-center mb-3">
                                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-blue-700 font-medium">3</span>
                                    </div>
                                    <h4 className="text-gray-800 font-medium">Clear Communication</h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Use the message field to clearly explain your decision, whether positive or negative.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Modals et popups */}
            {fullscreenImage && (
                <ImageViewer 
                    imageUrl={fullscreenImage} 
                    onClose={() => setFullscreenImage(null)} 
                />
            )}
            
            {/* Utilisation du nouveau modal optimisé */}
            <UpdateClaimModal
                isOpen={updateModalOpen}
                onClose={handleCloseUpdateModal}
                claim={selectedClaim}
                statusMessage={statusMessage}
                onStatusMessageChange={handleMessageChange}
                onStatusUpdate={handleStatusUpdate}
                setFullscreenImage={setFullscreenImage}
            />
            
            {/* Bouton d'aide flottant */}
            <button
                className="fixed right-6 bottom-6 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => toast.info("Support available during business hours")}
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
        </div>
    );
};

export default memo(OwnerClaims);
