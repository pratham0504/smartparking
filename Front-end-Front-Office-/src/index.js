import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Style/font.css";
import "./index.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import reportWebVitals from "./reportWebVitals";

const getBackendUrl = () => {
  const runtimeConfig = typeof window !== "undefined" ? window.RUNTIME_CONFIG : undefined;

  // Detect if we are running locally or in production
  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
  const defaultUrl = isLocalhost ? "http://localhost:3001" : "https://smartparking-f86d.onrender.com";

  return (
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    runtimeConfig?.BACKEND_URL ||
    defaultUrl
  ).replace(/\/$/, "");
};

const rewriteBackendUrl = (value) => {
  if (typeof value !== "string") return value;
  return value.replace(/^https?:\/\/localhost:3001(?=\/|$)/, getBackendUrl());
};

axios.interceptors.request.use((config) => {
  if (config?.url) {
    config.url = rewriteBackendUrl(config.url);
  }
  if (typeof config?.baseURL === "string") {
    config.baseURL = rewriteBackendUrl(config.baseURL);
  }
  return config;
});

if (typeof window !== "undefined" && typeof window.fetch === "function") {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string") {
      return originalFetch(rewriteBackendUrl(input), init);
    }

    if (typeof Request !== "undefined" && input instanceof Request) {
      const rewrittenRequest = new Request(rewriteBackendUrl(input.url), input);
      return originalFetch(rewrittenRequest, init);
    }

    return originalFetch(input, init);
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
