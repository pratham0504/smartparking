/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-escape */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Col, Container, Form, Row, Button } from "react-bootstrap";
import axios from "axios";
import { getBackendUrl } from '../utils/backend';
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Select from "react-select";

const vehicleOptions = [
  {
    value: "2Wheeler",
    label: "Two Wheeler",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765730/moto_xdypx2.png",
  },
  {
    value: "Hatchback",
    label: "Hatchback",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-ville_ocwbob.png",
  },
  {
    value: "Sedan",
    label: "Sedan",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/wagon-salon_bj2j1s.png",
  },
  {
    value: "SUV",
    label: "SUV/MUV",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-familiale_rmgclg.png",
  },
  {
    value: "Commercial",
    label: "Commercial Vehicle",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-livraison_nodnzh.png",
  },
];

// Custom Option Component for react-select
const customOption = (props) => {
  const { data, innerRef, innerProps } = props;
  return (
    <div
      ref={innerRef}
      {...innerProps}
      style={{ display: "flex", alignItems: "center", padding: 10 }}
    >
      <img
        src={data.image}
        alt={data.label}
        style={{ width: 30, height: 20, marginRight: 10 }}
      />
      {data.label}
    </div>
  );
};

// Mise à jour du style du sélecteur de véhicules
const customStyles = {
  control: (base) => ({
    ...base,
    padding: '0.5rem',
    borderRadius: '0.75rem',
    border: '1px solid #e2e8f0',
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#000'
    }
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    borderRadius: '0.75rem',
    padding: '0.5rem'
  }),
  option: (base, state) => ({
    ...base,
    padding: '0.75rem',
    borderRadius: '0.5rem',
    backgroundColor: state.isSelected ? '#000' : state.isFocused ? '#f3f4f6' : 'white',
    '&:hover': {
      backgroundColor: '#f3f4f6'
    }
  })
};

const SignUp = () => {
  const [step, setStep] = useState(1); // Add this: 1 for signup, 2 for OTP
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    vehicleType: "",
    role: "Owner",
  });

  const [emailError, setEmailError] = useState("");
  const [isEmailUnique, setIsEmailUnique] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [passwordForOTPModal, setPasswordForOTPModal] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [otpCode, setOtpCode] = useState(""); // Add this for OTP input
  const navigate = useNavigate();

  const generatePassword = async () => {
    try {
      const response = await axios.get(
        "https://www.random.org/passwords/?num=1&len=16&format=plain&rnd=new"
      );

      if (response.status === 200) {
        const generatedPassword = response.data.trim();

        setUser({
          ...user,
          password: generatedPassword,
          confirmPassword: generatedPassword,
        });
      } else {
        toast.error("Failed to generate password.");
      }
    } catch (error) {
      console.error("Error generating password:", error);
      toast.error("An error occurred. Please try again later.");
    }
  };

  const validatePhoneNumber = (phone) => {
    // Indian phone number: optional +91 country code, then 10 digits starting with 6-9
    const indianPhoneRegex = /^(?:\+91[\-\s]?|0)?[6-9]\d{9}$/;

    if (!phone) return "Phone number is required.";
    if (!indianPhoneRegex.test(phone))
      return "Invalid phone number. Ex: +91 9876543210";

    return "";
  };
  useEffect(() => {
    if (user.phone) {
      setPhoneError(validatePhoneNumber(user.phone));
    } else {
      setPhoneError(""); // Effacer l'erreur si le champ est vide
    }
  }, [user.phone]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailExists = async (email) => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      setIsEmailValid(false); // Update email validity
      setIsEmailUnique(false); // If invalid, it can't be unique
      return;
    }
    setIsEmailValid(true); // Email format is valid, now check uniqueness
    setEmailError(""); // Clear any previous format error

    try {
      const response = await axios.post(
        `${getBackendUrl()}/api/check-email`,
        { email }
      );
      if (response.data.exists) {
        setEmailError("This email is already in use. Try logging in instead.");
        setIsEmailUnique(false);
      } else {
        setEmailError("");
        setIsEmailUnique(true);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de l'email", error);
    }
  };

  const validatePassword = (password) => {
    const minLength = /.{8,}/;
    const hasUpperCase = /[A-Z]/;
    const hasLowerCase = /[a-z]/;
    const hasNumber = /[0-9]/;

    if (!minLength.test(password)) {
      return "Password must be at least 8 characters long.";
    }
    if (!hasUpperCase.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }
    if (!hasLowerCase.test(password)) {
      return "Password must contain at least one lowercase letter.";
    }
    if (!hasNumber.test(password)) {
      return "Password must contain at least one number.";
    }

    return "";
  };

  useEffect(() => {
    // Vérification des critères du mot de passe
    if (user.password) {
      setPasswordError(validatePassword(user.password));
    } else {
      setPasswordError("");
    }

    // Vérification de la correspondance password == confirmPassword
    if (user.confirmPassword) {
      if (user.password !== user.confirmPassword) {
        setConfirmPasswordError("The passwords do not match!");
      } else {
        setConfirmPasswordError("");
      }
    } else {
      setConfirmPasswordError("");
    }
  }, [user.password, user.confirmPassword]);

  useEffect(() => {
    // Check email format immediately when it changes
    if (user.email) {
      checkEmailExists(user.email);
    } else {
      setEmailError(""); // Clear error if email is empty
      setIsEmailValid(false);
      setIsEmailUnique(true); // Consider it unique if empty (for initial state)
    }
  }, [user.email]);

  useEffect(() => {
    const isValid =
      user.firstName &&
      user.lastName &&
      user.email &&
      isEmailValid &&
      isEmailUnique &&
      user.password &&
      user.confirmPassword &&
      user.phone &&
      user.role &&
      (user.role !== "Driver" || user.vehicleType);

    setIsFormValid(isValid);
  }, [
    user.firstName,
    user.lastName,
    user.email,
    isEmailValid,
    isEmailUnique,
    user.password,
    user.confirmPassword,
    user.phone,
    user.role,
    user.vehicleType,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prevUser) => ({ ...prevUser, [name]: value }));

    if (name === "email") {
      setIsEmailValid(validateEmail(value)); // Vérification rapide
      setIsEmailUnique(true); // Réinitialisation temporaire avant l'appel au serveur
    }
  };

  const handleVehicleChange = (selectedOption) => {
    setSelectedVehicle(selectedOption);
    setUser({ ...user, vehicleType: selectedOption.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user.password !== user.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const dataToSend = {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      password: user.password,
      phone: user.phone,
      role: user.role,
    };

    if (user.role === "Driver") {
      dataToSend.vehicleType = user.vehicleType;
    }

    try {
      const response = await axios.post(
        `${getBackendUrl()}/api/signup`,
        dataToSend
      );
      if (response && response.status === 200) {
        setPasswordForOTPModal(user.password);
        setStep(2); // Change this: Set step to 2 instead of showing modal
        toast.success("Account created! Please verify your email with OTP code");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "An error occurred during registration."
      );
      console.error(error);
    }
  };

  const loginAfterOTP = async (password) => {
    try {
      const response = await axios.post(`${getBackendUrl()}/api/loginAfterSignUp`, {
        email: user.email,
        password: password
      });

      const { token } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        navigate("/");
      } else {
        toast.error("Authentication error.");
      }
    } catch (error) {
      console.error("Login error after OTP", error);
      toast.error("Unable to login.");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${getBackendUrl()}/api/verify-otp`,
        { 
          email: user.email, 
          otp: String(otpCode) 
        },
        { 
          headers: { "Content-Type": "application/json" } 
        }
      );

      // Si la vérification OTP réussit, procéder au login
      if (response.status === 200) {
        loginAfterOTP(user.password);
      }
    } catch (error) {
      console.error("OTP Error", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Incorrect or expired CODE.");
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <Container className="max-w-6xl mx-auto px-4">
        <Row className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Section de gauche */}
          <Col className="p-8 bg-Mblack text-white" md={4}>
          <div className="mb-8">

            <h2 className="text-4xl text-center font-bold mb-6">Welcome!</h2>
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
      <p className="text-gray-300 text-lg text-center">
        Please enter your credentials to create your account.
      </p>  
      </div>

      </div>
       {/* Sign In Button */}
  <div className="mb-8">
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
      <p className="text-gray-300 text-center mb-4">Already have an account? Login now!</p>
      <button
        onClick={() => navigate('/login')}
        className="w-full bg-white text-Mblack py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors duration-300 font-medium"
      >
        Login
      </button>
    </div>
  </div>
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm mb-8">
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm mb-8">
    <p className="text-gray-300 uppercase tracking-wider mb-2">
      Need help? Contact our support
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
    </div>
  
            {/* Réseaux sociaux */}
            <div className="mt-auto">

      <p className="text-gray-300 font-medium mb-4 flex items-center justify-center">
        <svg 
          className="w-5 h-5 mr-2" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M23 12a11 11 0 01-17.437 8.912L2 22l1.088-3.563A11 11 0 1123 12z" />
        </svg>
        Follow us on Social Media
      </p>
              <div className="flex space-x-4 bg-white/10 p-4 rounded-xl justify-center">
                {[1, 2, 3, 4, 5].map((num) => (
                  <a key={num} href="#!" className="hover:opacity-90 transition-opacity bg-white p-2 rounded-lg">
                    <img src={`./../images/as (${num}).svg`} alt="" className="w-6 h-6" />
                  </a>
                ))}
              </div>
            </div>
          </Col>
  
          {/* Section de droite - Formulaire */}
          <Col md={8} className="p-8">
            {step === 1 ? (
              // Registration Form
              <Form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
                <h3 className="text-2xl font-bold  text-center text-gray-800 mb-6">Create your account</h3>

                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-gray-600 font-medium mb-2">
                        First Name<span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={user.firstName}
                        onChange={handleChange}
                        placeholder="Enter your first name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-Mblack focus:ring-2 focus:ring-Mblack/20 transition-all duration-300"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-gray-600 font-medium mb-2">
                        Last Name<span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={user.lastName}
                        onChange={handleChange}
                        placeholder="Enter your surname"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-Mblack focus:ring-2 focus:ring-Mblack/20 transition-all duration-300"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Email */}
                <Form.Group className="mb-3">
                  <Form.Label>Email<span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={user.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    className="w-full"
                  />
                  {emailError && <p className="text-danger">{emailError}</p>}
                </Form.Group>
    
                {/* Mot de passe */}
                <Form.Group className="mb-3">
                  <Form.Label className="d-flex align-items-center">
                    Password<span className="text-danger ms-1">*</span>
                    <span
                      className="ms-2 cursor-pointer"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      {passwordVisible ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
                    </span>
                  </Form.Label>
                  <div className="input-group relative w-full">
                    <Form.Control
                      type={passwordVisible ? "text" : "password"}
                      name="password"
                      value={user.password}
                      onChange={handleChange}
                      placeholder="Password"
                      className="w-full"
                    />
                    <Button
                      variant="outline-secondary"
                      className="bg-black text-white px-3"
                      onClick={generatePassword}
                    >
                      Generate
                    </Button>
                  </div>
                  {passwordError && <p className="text-danger">{passwordError}</p>}
                </Form.Group>
    
                {/* Confirmation du mot de passe */}
                <Form.Group className="mb-3">
                  <Form.Label className="d-flex align-items-center">
                    Confirm Password<span className="text-danger ms-1">*</span>
                    <span
                      className="ms-2 cursor-pointer"
                      onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                    >
                      {confirmPasswordVisible ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
                    </span>
                  </Form.Label>
                  <div className="input-group relative w-full">
                    <Form.Control
                      type={confirmPasswordVisible ? "text" : "password"}
                      name="confirmPassword"
                      value={user.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm Password"
                      className="w-full"
                    />
                  </div>
                  {confirmPasswordError && <p className="text-danger">{confirmPasswordError}</p>}
                </Form.Group>
    
                {/* Téléphone */}
                <Form.Group className="mb-3">
                  <Form.Label>Phone<span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    name="phone"
                    value={user.phone}
                    onChange={handleChange}
                      placeholder="Phone number (e.g. +91 9876543210)"
                    className="w-full"
                  />
                  {phoneError && <p className="text-danger">{phoneError}</p>}
                </Form.Group>
    
                {/* Sélection du rôle */}
                <Form.Group className="mb-4">
                  <Form.Label className="text-gray-600 font-medium mb-2">
                    Role<span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="role"
                    value={user.role}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-Mblack focus:ring-2 focus:ring-Mblack/20 transition-all duration-300"
                  >
                    <option value="Vehicle_Owner">Vehicle Owner</option>
                    <option value="Space_Owner">Parking Space Owner</option>
                    <option value="Business">Business User</option>

                  </Form.Select>
                </Form.Group>

                {/* Sélection du véhicule si Driver */}
                {user.role === "Driver" && (
                  <Form.Group className="mb-4">
                    <Form.Label className="text-gray-600 font-medium mb-2">
                      Vehicle Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Select
                      options={vehicleOptions}
                      components={{ Option: customOption }}
                      styles={customStyles}
                      value={selectedVehicle}
                      onChange={handleVehicleChange}
                      menuPosition="fixed"
                      menuPlacement="auto"
                      className="vehicle-select"
                    />
                  </Form.Group>
                )}
    
                {/* Bouton de soumission */}
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="w-full bg-Mblack text-white py-3 px-6 rounded-xl hover:bg-Mdarkblack transition-colors duration-300 font-medium disabled:opacity-50"
                  >
                    Sign Up
                  </button>
                </div>
                
              </Form>
            ) : (
              // OTP Verification Form
              <Form onSubmit={handleVerifyOtp} className="max-w-md mx-auto space-y-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Verify Your Email</h3>
                
                <div className="bg-gray-50 p-4 rounded-xl mb-6">
                  <p className="text-gray-600">A verification code has been sent to:</p>
                  <p className="font-semibold text-black">{user.email}</p>
                </div>

                <Form.Group>
                  <Form.Label className="text-gray-600 font-medium mb-2">OTP Code</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-Mblack focus:ring-2 focus:ring-Mblack/20 transition-all duration-300 text-center text-2xl letter-spacing-wide"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
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
    </section>
  );
};

export default SignUp;
