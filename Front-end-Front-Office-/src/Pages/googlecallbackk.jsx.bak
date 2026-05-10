import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../AuthContext";
const GoogleCallback = () => {
    const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      login(token);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Redirect after setting token
      setTimeout(() => navigate("/"), 1000); // Redirect after 1 sec
    } else {
      navigate("/"); // Redirect to login if no token
    }
  }, [login, navigate]);

  return <h2>Loading... Please wait</h2>;
};

export default GoogleCallback;
