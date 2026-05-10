import React, { useState, useContext } from "react";
import { Col, Container, Form, Row } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../AuthContext"; // Make sure to import the hook
import { jwtDecode } from "jwt-decode"; // Correct import
import { getAdminFrontendUrl, getBackendUrl } from "../utils/backend";

const Login = () => {
  // State for form fields and OTP message popup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Login, 2: OTP
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Use useContext to access AuthContext


  // Handle form submission for login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Send POST request to backend for login
      const response = await axios.post(`${getBackendUrl()}/auth/login`, {
        email,
        password,
      });
      console.log(response.data);

      // Check if token is received (direct login)
      if (response.data.token) {
        const token = response.data.token;
        
        // Store the token in localStorage
        localStorage.setItem("token", token);
        
        // Decode the token to get user data
        const decodedToken = jwtDecode(token);
        console.log(decodedToken);
        
        // Use the login function from context to store the token
        login(token);
        
        toast.success("Login successful!", {
          position: "top-right",
          autoClose: 3000,
        });
        
        // Check if the user is an Admin and redirect to the backoffice
        if (decodedToken.role === "Admin") {
          window.location.href = `${getAdminFrontendUrl()}/users`;
        } else {
          navigate("/");
        }
      } else {
        // OTP-based login (if still needed for some flows)
        toast.success(response.data.message, {
          position: "top-right",
          autoClose: 3000,
        });
        setStep(2); // Switch to OTP verification step
      }
    } catch (error) {
      // Handle error from backend
      console.error("Error during login:", error);
      toast.error(
        "Error: " +
          (error.response?.data?.error || error.response?.data?.message || "Connection problem"),
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    }
    setLoading(false); // Reset loading state after the login attempt
  };

  const handleFaceLogin = () => {
    navigate("/login/face");
  };
  // Handle OTP verification

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        `${getBackendUrl()}/api/login-verify-otp`,
        {
          email,
          otp,
        }
      );
  
      if (!response.data || !response.data.token) {
        throw new Error("Réponse invalide du serveur");
      }
  
      const token = response.data.token;
  
      // Stock the token in localStorage
      localStorage.setItem("token", token);
  
      // Decode the token to get user data
      const decodedToken = jwtDecode(token);
            console.log(decodedToken);
  
      // Use the login function from context to store the token
      login(token);
  
      toast.success("Connexion réussie !", {
        position: "top-right",
        autoClose: 3000,
      });
  
      // Check if the user is an Admin and redirect to the backoffice
      if (decodedToken.role === "Admin") {
        // Redirect to the backoffice with the token stored in localStorage
        window.location.href = `${getAdminFrontendUrl()}/users`;
      } else {
        // Redirect to the front-office homepage
        navigate("/");
      }
    } catch (error) {
      toast.error(
        "Erreur : " +
          (error.response?.data?.message || "Problème de vérification OTP"),
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <Container className="max-w-6xl mx-auto px-4">
        <Row className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <Col className="p-8 bg-Mblack text-white flex flex-col h-full" md={4}>
  {/* Header Section */}
  <div className="mb-8">
    <h2 className="text-4xl text-center font-bold mb-6">Welcome!</h2>
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
      <p className="text-gray-300 text-lg text-center">
        Please enter your credentials to access your account.
      </p>
    </div>
  </div>

  {/* Support Section */}
  <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm mb-8">
    <p className="text-gray-300 uppercase tracking-wider mb-2">
      Need assistance?
    </p>
    <div className="flex items-center space-x-3">
      <svg
        className="w-6 h-6 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <h5 className="text-xl font-bold">Support@parkEz.com</h5>
    </div>
  </div>

  {/* Authentication Buttons */}
  <div className="flex flex-col space-y-4 mb-8">
    <a
      href={`${getBackendUrl()}/auth/google`}
      className="flex items-center justify-center gap-3 bg-white text-black-700 py-3 px-6 rounded-xl hover:shadow-md transition-all duration-300"
    >
      <img src="./../images/google.png" alt="Google" className="w-6 h-6" />
      <span className="font-medium text-black">Continue with Google</span>
    </a>

    <button
      onClick={handleFaceLogin}
      className="flex items-center justify-center gap-3 bg-white text-Mblack py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors duration-300 group"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 text-Mblack group-hover:scale-110 transition-transform"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
        />
      </svg>
      <span className="font-medium">Face Recognition Login</span>
    </button>
  </div>

  {/* Social Media Section - Pushed to bottom */}
  <div className="mt-auto">
    <p className="text-gray-300 font-medium mb-4 flex items-center justify-center">
      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23 12a11 11 0 01-17.437 8.912L2 22l1.088-3.563A11 11 0 1123 12z" />
      </svg>
      Follow us on Social Media
    </p>
    <div className="flex space-x-4 bg-white/10 p-4 rounded-xl justify-center">
      {[1, 2, 3, 4, 5].map((num) => (
        <a
          key={num}
          href="#!"
          className="hover:opacity-90 transition-opacity bg-white p-2 rounded-lg"
        >
          <img src={`./../images/as (${num}).svg`} alt="" className="w-6 h-6" />
        </a>
      ))}
    </div>
  </div>
</Col>

          <Col md={8} className="p-8">
            {step === 1 ? (
              <Form onSubmit={handleLogin} className="max-w-md mx-auto space-y-6">
                <h3 className="text-2xl font-bold  text-center text-gray-800 mb-6">Login to your account</h3>
                
                <Form.Group>
                  <Form.Label className="text-gray-600 font-medium mb-2">Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-Mblack focus:ring-2 focus:ring-Mblack/20 transition-all duration-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label className="text-gray-600 font-medium mb-2">Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-Mblack focus:ring-2 focus:ring-Mblack/20 transition-all duration-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Form.Group>

                <div className="flex items-center justify-between mb-6">
                  <NavLink to="/forgot-password" className="text-Mblack hover:text-Mdarkblack transition-colors">
                    Forgot Password?
                  </NavLink>
                  <NavLink to="/sign-up" className="text-gray-600 hover:text-Mblack transition-colors">
                    Create account
                  </NavLink>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-Mblack text-white py-3 px-6 rounded-xl hover:bg-Mdarkblack transition-colors duration-300 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fas fa-spinner fa-spin"></i> Verifying...
                    </span>
                  ) : (
                    "Login"
                  )}
                </button>
              </Form>
            ) : (
              <Form onSubmit={handleVerifyOtp} className="max-w-md mx-auto space-y-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Verify OTP</h3>
                
                <div className="bg-black-50 p-4 rounded-xl mb-6">
                  <p className="text-black-600">Please enter the verification code sent to your email</p>
                </div>

                <Form.Group>
                  <Form.Label className="text-gray-600 font-medium mb-2">OTP Code</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-Mblack focus:ring-2 focus:ring-Mblack/20 transition-all duration-300 text-center text-2xl letter-spacing-wide"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength="6"
                  />
                </Form.Group>

                <button
                  type="submit"
                  className="w-full bg-Mblack text-white py-3 px-6 rounded-xl hover:bg-Mdarkblack transition-colors duration-300 font-medium"
                >
                  Verify OTP
                </button>
              </Form>
            )}
          </Col>
        </Row>
      </Container>
      <ToastContainer />
    </section>
  );
};

export default Login;
