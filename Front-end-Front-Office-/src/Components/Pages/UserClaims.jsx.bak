import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { toast } from 'react-toastify';

const UserClaims = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [claimToDelete, setClaimToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        fetchClaims();
    }, []);

    const fetchClaims = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token not found');
            }

            const response = await axios.get(
                'http://localhost:3001/api/driver-claims',
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log("Claims data:", response.data);
            setClaims(response.data.claims || []);
        } catch (err) {
            console.error("Loading error:", err);
            setError(err.response?.data?.message || 'Error loading claims');
            toast.error('Failed to load claims');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClaim = async (claimId) => {
        setClaimToDelete(claimId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            setDeleteLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token not found');
            }

            await axios.delete(
                `http://localhost:3001/api/claims/${claimToDelete}`,
                {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            // Update UI by removing deleted claim
            setClaims(prevClaims => prevClaims.filter(claim => claim._id !== claimToDelete));
            toast.success('Claim deleted successfully');
            setShowDeleteConfirm(false);
            setClaimToDelete(null);
        } catch (err) {
            console.error("Error deleting claim:", err);
            toast.error(err.response?.data?.message || 'Failed to delete claim');
        } finally {
            setDeleteLoading(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setClaimToDelete(null);
    };

    const getStatusColor = (status) => {
        switch(status.toLowerCase()) {
            case 'resolved':
                return {
                    style: {
                        backgroundColor: '#d1fae5',
                        color: '#065f46'
                    },
                    label: 'Resolved'
                };
            case 'in_progress':
                return {
                    style: {
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1'
                    },
                    label: 'In Progress'
                };
            case 'rejected':
                return {
                    style: {
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c'
                    },
                    label: 'Rejected'
                };
            case 'pending':
            default:
                return {
                    style: {
                        backgroundColor: '#fef3c7',
                        color: '#92400e'
                    },
                    label: 'Pending'
                };
        }
    };

    const DeleteConfirmationModal = () => {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-fade-in-up">
                    <div className="text-center mb-6">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Claim</h3>
                        <p className="text-gray-600">Are you sure you want to delete this claim? This action cannot be undone.</p>
                    </div>
                    
                    <div className="flex space-x-3">
                        <button
                            onClick={cancelDelete}
                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out flex-1 flex items-center justify-center font-medium"
                            disabled={deleteLoading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out flex-1 flex items-center justify-center font-medium"
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                </>
                            ) : 'Delete Claim'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const ClaimDetailsModal = () => {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-8 max-w-2xl w-full shadow-2xl animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Claim Details</h2>
                        <button 
                            onClick={() => setSelectedClaim(null)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="mb-6">
                        
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500">Submitted:</span>
                            <span className="font-medium">{format(new Date(selectedClaim.createdAt), 'PPP, p', {locale: enUS})}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-500">Status:</span>
                            <span 
                                style={getStatusColor(selectedClaim.status).style} 
                                className="px-3 py-1 rounded-full text-sm font-semibold"
                            >
                                {getStatusColor(selectedClaim.status).label}
                            </span>
                        </div>
                        
                        {selectedClaim.plateNumber && (
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-500">License Plate:</span>
                                <span className="font-medium">{selectedClaim.plateNumber}</span>
                            </div>
                        )}
                        
                        {selectedClaim.reservationId?.parkingId && (
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-500">Parking:</span>
                                <span className="font-medium">{selectedClaim.reservationId.parkingId.name}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">Description</h3>
                        <div className="bg-gray-50 rounded-lg p-4 text-gray-700">
                            {selectedClaim.description}
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 text-gray-700">Image</h3>
                        <div className="overflow-hidden rounded-lg max-h-80 flex justify-center bg-gray-100 p-2">
                            <img 
                                src={selectedClaim.imageUrl} 
                                alt="Claim evidence" 
                                className="object-contain max-h-full"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center space-x-4">
                        <button
                            onClick={() => {
                                setSelectedClaim(null);
                                handleDeleteClaim(selectedClaim._id);
                            }}
                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out flex-1 flex items-center justify-center font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                        
                        <button
                            onClick={() => setSelectedClaim(null)}
                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out flex-1 flex items-center justify-center font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const ClaimCard = ({ claim }) => {
        const statusInfo = getStatusColor(claim.status);
        
        return (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 relative">
                    <div className="absolute top-0 right-0 mt-2 mr-2">
                        <span style={statusInfo.style} className="text-xs px-3 py-1 rounded-full font-semibold">
                            {statusInfo.label}
                        </span>
                    </div>
                    <h3 className="text-black text-xl font-semibold">
                        {claim.reservationId && claim.reservationId.parkingId 
                            ? claim.reservationId.parkingId.name 
                            : "General Claim"}
                    </h3>
                  
                </div>
                
                <div className="p-6">
                    <div className="mb-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500 mb-1">Submitted on</p>
                            <p className="text-sm font-medium text-gray-700">
                                {format(new Date(claim.createdAt), 'PPP', {locale: enUS})}
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 mb-5">
                        {claim.plateNumber && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <div className="flex items-center text-gray-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                    </svg>
                                    <span className="text-sm">License Plate</span>
                                </div>
                                <span className="font-medium text-gray-900">{claim.plateNumber}</span>
                            </div>
                        )}
                        
                        <div className="py-2 border-b border-gray-100">
                            <p className="text-gray-500 text-sm mb-1">Description</p>
                            <p className="text-gray-800 line-clamp-2">
                                {claim.description}
                            </p>
                        </div>
                        
                        <div className="flex justify-center py-4">
                            <img 
                                src={claim.imageUrl} 
                                alt="Claim evidence" 
                                className="h-40 rounded-md object-cover shadow-sm hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => setSelectedClaim(claim)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center space-x-4">
                        <button
                            onClick={() => handleDeleteClaim(claim._id)}
                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out flex-1 flex items-center justify-center font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                        
                        <button
                            onClick={() => setSelectedClaim(claim)}
                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out flex-1 flex items-center justify-center font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Loading animation
    if (loading) return (   
        <div className="flex flex-col justify-center items-center min-h-[500px]">   
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your claims...</p>
        </div>   
    );

    // Improved error message
    if (error) return (  
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto my-8">
            <div className="flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-red-800">Loading Error</h3>
            </div>
            <p className="text-red-600">{error}</p>
            <button
                onClick={() => fetchClaims()}
                className="mt-4 bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors inline-flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
            </button>
        </div>  
    );

    // No claims
    if (claims.length === 0) return (    
        <div className="container mx-auto px-4 py-12">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-700 mb-2">No claims found</h3>
                <p className="text-gray-500 mb-6">You haven't submitted any claims yet.</p>
                <a href="/contact" className="inline-block bg-blue-600 text-black py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                    Submit a claim
                </a>
            </div>
        </div>    
    );

    return (    
        <div className="container mx-auto px-4 py-10 max-w-6xl">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h2 className="text-3xl font-bold text-gray-800">My Claims</h2>
                <a 
                                                            href="/contact"
                                                            className="bg-black text-white px-4 py-2 rounded-lg cursor-pointer inline-block"
                                                        >
                                                            New Claim
                                                        </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {claims.map(claim => (
                    <ClaimCard 
                        key={claim._id} 
                        claim={claim}
                    />
                ))}
            </div>
            
            {selectedClaim && <ClaimDetailsModal />}
            {showDeleteConfirm && <DeleteConfirmationModal />}
            
            <style>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out forwards;
                }
                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>    
    );
};

export default UserClaims;
