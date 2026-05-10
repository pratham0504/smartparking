/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";

export default function SmartParkingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPricing, setCurrentPricing] = useState(null);
  const [pricingSchedule, setPricingSchedule] = useState({});
  const [peakHours, setPeakHours] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeTab, setActiveTab] = useState("current");

  // Helper function to get color based on pricing tier
  const getTierColor = (tier) => {
    switch (tier) {
      case "Low":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-blue-100 text-blue-800";
      case "High":
        return "bg-orange-100 text-orange-800";
      case "Premium":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format price as currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // API base URL - use explicit URL to bypass proxy issues
  const API_BASE_URL = "http://localhost:5000";

  // Add debugging for API responses
  const fetchWithErrorHandling = async (url) => {
    try {
      const fullUrl = `${API_BASE_URL}${url}`;
      console.log(`Fetching from: ${fullUrl}`);

      const response = await fetch(fullUrl);

      // Log response details for debugging
      console.log(`Response status: ${response.status}`);

      // Check if response is ok
      if (!response.ok) {
        // Try to get response text for debugging
        const errorText = await response.text();
        console.error(`Error response: ${errorText.substring(0, 100)}...`);
        throw new Error(`API request failed with status ${response.status}`);
      }

      // Parse JSON
      const data = await response.json();
      return data;
    } catch (err) {
      console.error(`Fetch error for ${url}:`, err);
      throw err;
    }
  };

  // Fetch current pricing data
  useEffect(() => {
    const fetchCurrentPricing = async () => {
      try {
        const data = await fetchWithErrorHandling("/api/pricing/current");
        setCurrentPricing(data);
      } catch (err) {
        console.error("Error fetching current pricing:", err);
        setError("Could not load current pricing information.");
      }
    };

    fetchCurrentPricing();
  }, []);

  // Fetch pricing schedule
  useEffect(() => {
    const fetchPricingSchedule = async () => {
      try {
        setLoading(true);
        const data = await fetchWithErrorHandling("/api/pricing/schedule");
        setPricingSchedule(data);

        // Set default selected day to current day
        const today = new Date().toLocaleDateString("en-US", {
          weekday: "long",
        });
        setSelectedDay(today);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching pricing schedule:", err);
        setError("Could not load pricing schedule.");
        setLoading(false);
      }
    };

    fetchPricingSchedule();
  }, []);

  // Fetch peak hours data
  useEffect(() => {
    const fetchPeakHours = async () => {
      try {
        const data = await fetchWithErrorHandling("/api/peaks");
        setPeakHours(data);
      } catch (err) {
        console.error("Error fetching peak hours:", err);
        // Not setting error state here as this is supplementary data
      }
    };

    fetchPeakHours();
  }, []);

  // Get days of the week in order starting with today
  const getDaysOfWeek = () => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const today = new Date().getDay();

    // Reorder days to start with today
    const reorderedDays = [...days.slice(today), ...days.slice(0, today)];

    return reorderedDays;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading parking data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg shadow-md">
        <div className="flex items-center">
          <AlertCircle className="text-red-500 mr-2" size={24} />
          <h2 className="text-lg font-semibold text-red-700">
            Error Loading Data
          </h2>
        </div>
        <p className="mt-2 text-red-600">{error}</p>
        <p className="mt-2">
          Please check your API connection and try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Today's parkEz Prediction
      </h1>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "current"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("current")}
        >
          Pricing Prediction
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "schedule"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("schedule")}
        >
          Weekly Schedule Prediction
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "peaks"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("peaks")}
        >
          Peak Hours Prediction
        </button>
      </div>

      {/* Current Pricing */}
      {activeTab === "current" && currentPricing && (
        <div className="mb-8">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <Clock className="text-blue-500 mr-2" size={24} />
              <h2 className="text-xl font-semibold">Current Pricing</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Day & Time</div>
                <div className="font-medium">
                  {currentPricing.day}, {currentPricing.hour_formatted}
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Current Price</div>
                <div className="font-medium text-lg text-green-600">
                  {formatPrice(currentPricing.price)}/hour
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Pricing Tier</div>
                <div
                  className={`inline-block px-2 py-1 rounded text-sm font-medium ${getTierColor(
                    currentPricing.pricing_tier
                  )}`}
                >
                  {currentPricing.pricing_tier}
                </div>
              </div>
            </div>

            <div className="mt-4 bg-white p-4 rounded shadow-sm border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">
                Predicted Occupancy
              </div>
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div
                    style={{
                      width: `${Math.min(
                        currentPricing.predicted_occupancy,
                        100
                      )}%`,
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  ></div>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {currentPricing.predicted_occupancy}% capacity
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      {activeTab === "schedule" && (
        <div>
          <div className="flex items-center mb-4">
            <Calendar className="text-blue-500 mr-2" size={24} />
            <h2 className="text-xl font-semibold">Weekly Pricing Schedule</h2>
          </div>

          {/* Day selection */}
          <div className="flex overflow-x-auto mb-6 pb-2">
            {getDaysOfWeek().map((day) => (
              <button
                key={day}
                className={`px-4 py-2 mr-2 rounded-full whitespace-nowrap ${
                  selectedDay === day
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Day schedule */}
          {selectedDay && pricingSchedule[selectedDay] && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hour
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predicted Occupancy
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pricingSchedule[selectedDay].map((hour) => (
                      <tr key={hour.hour} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hour.hour_formatted}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {formatPrice(hour.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getTierColor(
                              hour.tier
                            )}`}
                          >
                            {hour.tier}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{
                                  width: `${Math.min(
                                    hour.predicted_occupancy,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-500">
                              {hour.predicted_occupancy}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Peak Hours */}
      {activeTab === "peaks" && (
        <div>
          <div className="flex items-center mb-4">
            <TrendingUp className="text-blue-500 mr-2" size={24} />
            <h2 className="text-xl font-semibold">Peak Hours Analysis</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(peakHours).map((day) => (
              <div
                key={day}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <h3 className="font-medium text-lg mb-3 text-gray-800">
                  {day}
                </h3>
                <ul className="space-y-2">
                  {peakHours[day].map((peak, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center">
                        <Clock className="text-gray-400 mr-2" size={16} />
                        <span>{peak.hour}:00</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-1">
                          {Math.round(peak.yhat)}%
                        </span>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            index === 0
                              ? "bg-red-500"
                              : index === 1
                              ? "bg-orange-500"
                              : "bg-yellow-500"
                          }`}
                        ></div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
