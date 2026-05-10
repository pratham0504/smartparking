/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import axios from "axios";

const UserSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserSubscriptions = async () => {
      try {
        // Get the JWT token from localStorage
        const token = localStorage.getItem("token");

        if (!token) {
          setError("No authentication token found. Please log in.");
          setLoading(false);
          return;
        }

        // Decode the JWT token to get the user ID
        const decodedToken = decodeJWT(token);

        // Check for id (not _id)
        if (!decodedToken || (!decodedToken.id && !decodedToken._id)) {
          setError("Invalid token or user ID not found in token.");
          setLoading(false);
          return;
        }

        // Use id instead of _id
        const extractedUserId = decodedToken.id || decodedToken._id;
        setUserId(extractedUserId);

        // Make API request to get user subscriptions
        const response = await axios.get(
          `http://localhost:3001/api/subscriptions/user/${extractedUserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setSubscriptions(response.data);
        setLoading(false);
      } catch (err) {
        setError(`Failed to load subscriptions: ${err.message}`);
        setLoading(false);
      }
    };

    fetchUserSubscriptions();
  }, []);

  // Function to decode JWT token
  const decodeJWT = (token) => {
    try {
      // JWT tokens are split into three parts: header.payload.signature
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch (err) {
      return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate days remaining for a subscription
  const calculateDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Get appropriate status badge styling
  const getStatusBadge = (status) => {
    if (status === "Active") {
      return "bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold";
    } else {
      return "bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold";
    }
  };

  if (loading) {
    return (
      <section className="py-10">
        <Container>
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="flex justify-center mt-8 space-x-4">
                <div className="h-40 bg-gray-200 rounded w-1/3"></div>
                <div className="h-40 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-10">
        <Container>
          <div className="text-center max-w-lg mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => (window.location.href = "/login")}
                className="inline-block cursor-pointer font-medium text__16 text-Mwhite !rounded-[24px] !border-Mblue bg-Mblue btnClass px-6 py-2"
              >
                Go to Login
              </button>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-10">
      <Container>
        <div className="text-center mb-12">
          <p className="text__18 mb-2 text-Mblue font-medium">
            YOUR SUBSCRIPTIONS
          </p>
          <h3 className="font-bold text__48 mb-2">Active Parking Plans</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage all your parking subscriptions in one place. View details,
            status, and expiration dates for each subscription.
          </p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center max-w-lg mx-auto bg-gray-50 border border-gray-100 rounded-lg p-8">
            <img
              src="./../images/mb (1).svg"
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              alt="No subscriptions"
            />
            <h4 className="font-bold text-xl mb-3">No Active Subscriptions</h4>
            <p className="text__18 mb-8 text-gray-600">
              You don't have any active parking subscriptions at the moment.
            </p>
            <a
              href="/plans"
              className="inline-block cursor-pointer font-medium text__16 text-Mwhite !rounded-[24px] !border-Mblue bg-Mblue btnClass px-6 py-2"
            >
              Browse Plans
            </a>
          </div>
        ) : (
          <Row className="gap-y-6">
            {subscriptions.map((subscription, index) => {
              const daysRemaining = calculateDaysRemaining(
                subscription.endDate
              );
              return (
                <Col
                  lg={6}
                  key={subscription._id || subscription.subscriptionId || index}
                >
                  <div className="h-full border border-solid border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-Mblue p-2 rounded-full">
                          <img
                            src="./../images/mb (1).svg"
                            className="w-6 h-6 text-white"
                            alt="Subscription icon"
                          />
                        </div>
                        <h5 className="font-bold text__20 m-0">
                          Subscription #
                          {subscription.subscriptionId?.slice(-4) || index + 1}
                        </h5>
                      </div>
                      <span className={getStatusBadge(subscription.status)}>
                        {subscription.status}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-gray-500 text-sm mb-1">
                            Start Date
                          </p>
                          <p className="font-medium">
                            {subscription.startDate
                              ? formatDate(subscription.startDate)
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm mb-1">End Date</p>
                          <p className="font-medium">
                            {subscription.endDate
                              ? formatDate(subscription.endDate)
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm mb-1">Price</p>
                          <p className="font-medium text-lg">
                            ${subscription.price?.toFixed(2) || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm mb-1">
                            Days Remaining
                          </p>
                          <p
                            className={`font-medium ${
                              daysRemaining < 7
                                ? "text-orange-500"
                                : "text-green-600"
                            }`}
                          >
                            {daysRemaining} days
                          </p>
                        </div>
                      </div>

                      {subscription.status === "Active" && (
                        <div className="mt-6">
                          <button
                            className="w-full text-center cursor-pointer font-medium text__16 text-red-600 !rounded-[24px] border border-red-600 hover:bg-red-50 transition-colors duration-300 px-4 py-2"
                            onClick={() => {
                              // Placeholder for actual cancellation logic
                              alert(
                                "This would cancel your subscription. Feature not implemented yet."
                              );
                            }}
                          >
                            Cancel Subscription
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </section>
  );
};

export default UserSubscriptions;
