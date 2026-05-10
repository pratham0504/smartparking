import React from "react";
import { useNavigate } from "react-router-dom";
import HeadTitle from "../Components/Pages/HeadTitle";
import { motion } from "framer-motion";

const SubscriptionPlans = () => {
  const navigate = useNavigate();

  const plans = [
    {
      id: "free",
      name: "parkEz Free",
      price: "0",
      features: [
        "Basic parking spot search",
        "Parking lot visualization on map",
        "Hourly reservations only",
        "Access to basic information",
        "1 active reservation at a time",
      ],
      color: "bg-gray-100",
    },
    {
      id: "standard",
      name: "parkEz Standard",
      price: "29.99",
      features: [
        "All parkEz Free features +",
        "Hourly/daily/weekly reservations",
        "Up to 3 simultaneous reservations",
        "Preferred pricing (-5%)",
        "Free cancellation (2h prior)",
        "Access to Indoor and Underground parking",
        "Real-time notifications",
      ],
      color: "bg-blue-50",
      popular: true,
    },
    {
      id: "premium",
      name: "parkEz Premium",
      price: "49.99",
      features: [
        "All parkEz Standard features +",
        "Monthly reservations available",
        "Unlimited reservations",
        "Preferred pricing (-15%)",
        "Free cancellation (30min prior)",
        "Priority access to premium spots",
        "Flexible duration extension",
        "24/7 priority customer service",
        "Unlimited entries/exits",
        "Guaranteed spots with partners",
        "Loyalty points",
      ],
      color: "bg-purple-50",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <>
      <HeadTitle title="Choose Your Plan" sub="parkEz SUBSCRIPTIONS" />

      <div className="py-16 bg-gradient-to-b from-white to-gray-50">
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                whileHover={{ y: -5 }}
                className={`relative flex flex-col rounded-xl shadow-xl overflow-hidden ${plan.color} border border-gray-200 transition-all duration-300 hover:shadow-2xl`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 mt-4 mr-4 animate-pulse">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-black uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="px-6 py-8">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-5xl font-extrabold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="ml-2 text-lg font-medium text-gray-500">
                      /month
                    </span>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="ml-3 text-sm text-gray-700">{feature}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => navigate(`/subscription-details/${plan.id}`)}
                  className={`w-full flex items-center justify-center px-5 py-3 text-base font-medium rounded-md transition-all duration-300 ${
                    plan.popular
                      ? "bg-blue-600 text-black hover:bg-blue-700 shadow-lg !important"
                      : "bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-600 hover:text-white !important"
                  }`}
                  style={{
                    boxShadow: plan.popular
                      ? "0 4px 14px rgba(0, 118, 255, 0.39)"
                      : "none",
                  }}
                >
                  Learn More
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default SubscriptionPlans;
