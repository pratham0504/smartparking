import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OTPModal = ({ show, handleClose, email, password }) => {
  console.log("Received in OTPModal:", email, password);
  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleOTPChange = (e) => {
    setOtp(e.target.value);
    setErrorMessage("");
  };

  const loginAfterOTP = async (password) => {
    try {
      console.log("Password:", password);
      const response = await axios.post("http://localhost:3001/User/loginAfterSignUp", {

        email,
        password,
      });

      const { token } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        console.log("Token saved:", token);
        navigate("/");
        
        //const token = localStorage.getItem("token");
        //console.log("Token récupéré :", token);
      } else {
        toast.error("Authentication error.");
      }
      
    } catch (error) {
      console.error("Login error after OTP", error);
      toast.error("Unable to login.");
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();

    console.log("Sending request with:", { email, otp });

    try {
      const response = await axios.post(
        "http://localhost:3001/User/verify-otp",
        { email, otp: String(otp) },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log("Sending request with email and password:", { email, password });

      loginAfterOTP(password);
    } catch (error) {
      console.error("OTP Error", error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || "Incorrect or expired CODE.");
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title> Verification Code</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleOTPSubmit}>
          <Form.Group controlId="otp">
            <Form.Label>Enter the code sent via email</Form.Label>
            <Form.Control
              type="text"
              value={otp}
              onChange={handleOTPChange}
              placeholder="Enter Code"
            />
            {errorMessage && <p style={{ color: "red", fontSize: "0.9em" }}>{errorMessage}</p>}
          </Form.Group>
          <Button type="submit" className="btn text-white" style={{ backgroundColor: "#007bff" }}>
            Verify
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default OTPModal;
