import React, { createContext, useState, useEffect, useContext } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage with token validation
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      try {
        const decoded = jwtDecode(savedToken);
        // Check if token is expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.log("⏰ Token expired, clearing localStorage");
          localStorage.removeItem("token");
          return null;
        }
        return savedToken;
      } catch (error) {
        console.error("❌ Invalid token, clearing localStorage");
        localStorage.removeItem("token");
        return null;
      }
    }
    return null;
  });
  
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      try {
        const decoded = jwtDecode(savedToken);
        // Check if token is expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.log("⏰ Token expired on load");
          localStorage.removeItem("token");
          return null;
        }
        console.log("🔐 User loaded from localStorage:", decoded);
        return decoded;
      } catch (error) {
        console.error("❌ Error decoding saved token:", error);
        localStorage.removeItem("token");
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check if token is expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          console.log("⏰ Token expired in useEffect, logging out");
          logout();
          return;
        }
        console.log("🔐 Token decoded in useEffect:", decoded);
        setUser(decoded);
      } catch (error) {
        console.error("❌ Invalid token in useEffect:", error);
        logout();
      }
    }
  }, [token]);

  const login = (newToken) => {
    if (newToken === token) return; // ✅ Prevent infinite re-renders

    try {
      const decoded = jwtDecode(newToken);
      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.log("⏰ Cannot login with expired token");
        logout();
        return;
      }
      console.log("✅ Login successful! User:", decoded);
      console.log("📅 Token expires at:", new Date(decoded.exp * 1000).toLocaleString());
      setToken(newToken);
      setUser(decoded);
      localStorage.setItem("token", newToken);
      localStorage.setItem("userId", decoded.id || decoded._id);
    } catch (error) {
      console.error("❌ Error during login:", error);
      logout();
    }
  };

  const logout = () => {
    console.log("🚪 Logging out...");
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
