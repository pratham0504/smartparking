/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { getBackendUrl } from '../../utils/backend';

const OwnerReservations = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedParkingFilter, setSelectedParkingFilter] = useState('all');
    const [parkingsList, setParkingsList] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [totalRevenue, setTotalRevenue] = useState(0);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { 
                staggerChildren: 0.08,
                delayChildren: 0.2
            } 
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: { type: "spring", stiffness: 100 } 
        }
    };

    const cardHoverEffect = {
        rest: { scale: 1 },
        hover: { 
            scale: 1.03, 
            boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)", 
            transition: { duration: 0.3, ease: "easeOut" } 
        }
    };

    const fetchOwnerReservations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token not found. Please log in again.');
            }

            const response = await axios.get(
                `${getBackendUrl()}/api/owner-reservations`,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            setReservations(response.data);

            // Calculate total revenue from accepted reservations
            const revenue = response.data
                .filter(res => res.status === 'accepted' || res.status === 'completed')
                .reduce((total, res) => total + (parseFloat(res.totalPrice) || 0), 0);
            
            setTotalRevenue(revenue);

            // Extract unique parking locations for the filter
            const uniqueParkings = [...new Set(response.data
                .filter(res => res.parkingId)
                .map(res => JSON.stringify({
                    id: res.parkingId._id,
                    name: res.parkingId.name
                })))].map(str => JSON.parse(str));
            
            setParkingsList(uniqueParkings);
        } catch (err) {
            console.error("Loading error:", err);
            setError(err.response?.data?.message || 'Error loading reservations');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOwnerReservations();
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchOwnerReservations();
    };

    const handleUpdateStatus = async (reservationId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Session expired. Please log in again.');
                return;
            }

            await axios.put(
                `${getBackendUrl()}/api/owner-reservations/${reservationId}/status`,
                { status: newStatus },
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update local state
            setReservations(prevReservations => 
                prevReservations.map(res => 
                    res._id === reservationId ? { ...res, status: newStatus } : res
                )
            );

            // Different toast based on status
            if (newStatus === 'accepted') {
                toast.success('✅ Reservation accepted successfully');
            } else if (newStatus === 'rejected') {
                toast.info('❌ Reservation rejected');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Error updating status');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'accepted':
                return (
                    <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-black text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approved
                    </span>
                );
            case 'rejected':
                return (
                    <span className="bg-gradient-to-r from-rose-500 to-pink-600 text-black text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rejected
                    </span>
                );
            case 'pending':
                return (
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-md">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Pending
                    </span>
                );
            case 'completed':
                return (
                    <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-black text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Completed
                    </span>
                );
            default:
                return (
                    <span className="bg-gradient-to-r from-gray-400 to-gray-500 text-black text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {status}
                    </span>
                );
        }
    };

    // Filter reservations based on selected filters
    const filteredReservations = reservations.filter(reservation => {
        const matchesParkingFilter = selectedParkingFilter === 'all' || 
            (reservation.parkingId && reservation.parkingId._id === selectedParkingFilter);
        
        const matchesStatusFilter = statusFilter === 'all' || 
            reservation.status === statusFilter;

        return matchesParkingFilter && matchesStatusFilter;
    });

    // Enhanced loading spinner
    if (loading) return (
        <div className="flex flex-col justify-center items-center min-h-[500px]">
            <div className="relative h-24 w-24">
                <div className="absolute top-0 left-0 right-0 bottom-0 rounded-full border-4 border-t-transparent border-indigo-600 animate-spin"></div>
                <div className="absolute top-3 left-3 right-3 bottom-3 rounded-full border-4 border-t-transparent border-blue-500 animate-spin animate-duration-1500"></div>
                <div className="absolute top-6 left-6 right-6 bottom-6 rounded-full border-4 border-t-transparent border-sky-400 animate-spin animate-duration-1000 animate-direction-reverse"></div>
            </div>
            <p className="text-gray-700 font-medium mt-8 animate-pulse text-lg">Loading reservations...</p>
        </div>
    );

    // Enhanced error display
    if (error) return (
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-8 max-w-2xl mx-auto my-8 shadow-xl">
            <div className="flex items-center mb-6">
                <div className="bg-rose-100 p-3 rounded-full mr-4 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-rose-800">Loading Error</h3>
            </div>
            <p className="text-rose-700 font-medium mb-6 bg-rose-100 p-4 rounded-lg shadow-inner">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-gradient-to-r from-rose-500 to-pink-600 text-black py-3 px-6 rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all duration-300 inline-flex items-center shadow-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
            </button>
        </div>
    );

    // "No reservations" component
    const NoReservationsFound = ({ withFilters = false }) => (
        <div className="container mx-auto px-4 py-10 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-indigo-700">
                        My Parking Reservations
                    </h2>
                    <p className="text-indigo-500 mt-1">Manage your parking reservations with ease</p>
                </div>
                
                <button 
                    onClick={handleRefresh}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-gradient-to-r from-indigo-500 to-blue-600 text-black hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 shadow-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>
            
            {withFilters && (
                <div className="flex flex-wrap gap-4 mb-8 bg-white p-5 rounded-xl shadow-lg">
                    <div className="w-full md:w-auto flex-1">
                        <label className="block text-sm font-medium text-indigo-700 mb-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Filter by Location
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedParkingFilter} 
                                onChange={(e) => setSelectedParkingFilter(e.target.value)}
                                className="w-full rounded-lg border border-indigo-300 pl-10 pr-10 py-2.5 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:outline-none appearance-none bg-white transition-all"
                            >
                                <option value="all">All Locations</option>
                                {parkingsList.map(parking => (
                                    <option key={parking.id} value={parking.id}>{parking.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-auto flex-1">
                        <label className="block text-sm font-medium text-indigo-700 mb-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Filter by Status
                        </label>
                        <div className="relative">
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full rounded-lg border border-indigo-300 pl-10 pr-10 py-2.5 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:outline-none appearance-none bg-white transition-all"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="accepted">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="completed">Completed</option>
                            </select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white border border-indigo-100 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-xl"
            >
                <div className="bg-indigo-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-3">No Reservations Found</h3>
                
                {withFilters ? (
                    <>
                        <p className="text-indigo-600 mb-6">No reservations match your selected filters.</p>
                        <button 
                            onClick={() => {
                                setSelectedParkingFilter('all');
                                setStatusFilter('all');
                            }}
                            className="mt-2 inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Reset Filters</span>
                        </button>
                    </>
                ) : (
                    <p className="text-indigo-600 mb-6">You haven't received any parking reservations yet.</p>
                )}
            </motion.div>
        </div>
    );

    // No reservations with filters
    if (filteredReservations.length === 0) {
        if (selectedParkingFilter !== 'all' || statusFilter !== 'all') {
            return <NoReservationsFound withFilters={true} />;
        } else {
            return <NoReservationsFound withFilters={false} />;
        }
    }

    return (    
        <div className="container mx-auto px-4 py-10 max-w-7xl">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4"
            >
                <div>
                    <h2 className="text-3xl font-bold text-indigo-700">
                        My Parking Reservations
                    </h2>
                    <p className="text-indigo-500 mt-1">Manage your parking reservations with ease</p>
                </div>
                
                <button 
                    onClick={handleRefresh}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 text-black hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 shadow-md w-full md:w-auto"
                    disabled={isRefreshing}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </motion.div>
            
            {/* Modern Statistics Cards */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8"
            >
                <motion.div 
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl p-5 shadow-lg border border-blue-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-indigo-700 font-semibold">Total Reservations</p>
                            <p className="text-2xl font-bold text-indigo-900 mt-1">{reservations.length}</p>
                        </div>
                        <div className="bg-white p-3 rounded-full shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                        </div>
                    </div>
                </motion.div>
                
                <motion.div 
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl p-5 shadow-lg border border-emerald-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-emerald-700 font-semibold">Total Revenue</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">₹{totalRevenue.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-3 rounded-full shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </motion.div>
                
                <motion.div 
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-5 shadow-lg border border-amber-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-amber-700 font-semibold">Pending</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">
                                {reservations.filter(r => r.status === 'pending').length}
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-full shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </motion.div>
                
                <motion.div 
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-5 shadow-lg border border-green-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-700 font-semibold">Approved</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">
                                {reservations.filter(r => r.status === 'accepted').length}
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-full shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                </motion.div>
                
                <motion.div 
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-rose-50 to-pink-100 rounded-xl p-5 shadow-lg border border-rose-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-rose-700 font-semibold">Rejected</p>
                            <p className="text-2xl font-bold text-rose-900 mt-1">
                                {reservations.filter(r => r.status === 'rejected').length}
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-full shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
            
            {/* Modern Filters */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-indigo-100"
            >
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-auto flex-1">
                        <label className="block text-sm font-medium text-indigo-700 mb-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Filter by Location
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedParkingFilter} 
                                onChange={(e) => setSelectedParkingFilter(e.target.value)}
                                className="w-full rounded-lg border border-indigo-300 pl-10 pr-10 py-3 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 focus:outline-none appearance-none bg-white transition-all duration-200"
                            >
                                <option value="all">All Locations</option>
                                {parkingsList.map(parking => (
                                    <option key={parking.id} value={parking.id}>{parking.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-auto flex-1">
                        <label className="block text-sm font-medium text-indigo-700 mb-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Filter by Status
                        </label>
                        <div className="relative">
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full rounded-lg border border-indigo-300 pl-10 pr-10 py-3 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 focus:outline-none appearance-none bg-white transition-all duration-200"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="accepted">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="completed">Completed</option>
                            </select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-auto flex items-end justify-center md:justify-start">
                        <button 
                            onClick={() => {
                                setSelectedParkingFilter('all');
                                setStatusFilter('all');
                            }}
                            className="w-full md:w-auto inline-flex items-center justify-center bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-6 py-3 rounded-lg transition-colors font-medium shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reset
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Modern Table */}
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="overflow-hidden bg-white rounded-xl shadow-xl border border-indigo-100 mb-8"
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-indigo-200">
                            <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                        Parking Location
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                        Reservation Dates
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                        Vehicle
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-indigo-50">
                                {filteredReservations.map((reservation, index) => (
                                    <motion.tr 
                                        key={reservation._id} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        whileHover={{ backgroundColor: "#f5f7ff" }}
                                        className="transition-colors duration-150"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-black font-bold text-lg shadow-md">
                                                        {(reservation.userId?.name || 'C')[0].toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-800">
                                                        {reservation.userId?.name || 'Customer'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {reservation.userId?.email || 'Email not available'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-9 w-9 flex-shrink-0 bg-indigo-100 rounded-lg flex items-center justify-center shadow-md">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3 text-sm font-medium text-gray-800">
                                                    {reservation.parkingId?.name || 'Unknown location'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="flex items-center text-sm text-gray-800 space-x-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="font-medium">
                                                        {format(new Date(reservation.startTime), 'MMM d, yyyy', { locale: enUS })}
                                                    </span>
                                                    <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md shadow-sm">
                                                        {format(new Date(reservation.startTime), 'h:mm a', { locale: enUS })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600 mt-1.5 space-x-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="font-medium">
                                                        {format(new Date(reservation.endTime), 'MMM d, yyyy', { locale: enUS })}
                                                    </span>
                                                    <span className="text-xs font-medium bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md shadow-sm">
                                                        {format(new Date(reservation.endTime), 'h:mm a', { locale: enUS })}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-9 w-9 flex-shrink-0 bg-sky-100 rounded-lg flex items-center justify-center shadow-md">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3 text-sm font-medium text-gray-800">
                                                    {reservation.vehicleType || 'Not specified'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-black text-sm font-bold px-4 py-1.5 rounded-lg shadow-md">
                                                ₹{reservation.totalPrice}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(reservation.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex space-x-2">
                                                {reservation.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(reservation._id, 'accepted')}
                                                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-black px-3 py-1.5 rounded-md text-xs flex items-center transition-all duration-200 shadow-md"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(reservation._id, 'rejected')}
                                                            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-black px-3 py-1.5 rounded-md text-xs flex items-center transition-all duration-200 shadow-md"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {reservation.status !== 'pending' && (
                                                    <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-md flex items-center font-medium shadow-sm">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Processed
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>    
    );
};

export default OwnerReservations;