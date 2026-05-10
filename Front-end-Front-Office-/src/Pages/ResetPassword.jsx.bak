/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Col, Container, Form, Row, Alert, InputGroup } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tokenChecked, setTokenChecked] = useState(false);
    
    // Check basic token format on component mount
    useEffect(() => {
        // Simple validation for token format - adjust based on your actual token format
        const isValidTokenFormat = /^[a-f0-9]{40}$/.test(token); // Assumes a 40-char hex token
        
        if (!isValidTokenFormat) {
            console.log("Invalid token format detected");
            navigate('/404');
        } else {
            setTokenChecked(true);
        }
    }, [token, navigate]);

    // Password validation function
    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return 'Password must be at least 8 characters long';
        }
        if (!hasUpperCase) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!hasLowerCase) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!hasNumbers) {
            return 'Password must contain at least one number';
        }
        if (!hasSpecialChar) {
            return 'Password must contain at least one special character';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Input validation
        if (!password.trim() || !confirmPassword.trim()) {
            setError('All fields are required');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setIsLoading(true);
            const response = await axios.post(`http://localhost:3001/api/reset-password/${token}`, { password });
            
            setIsLoading(false);
            setMessage('Password has been reset successfully');
            setError('');
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setIsLoading(false);
            console.error("Reset password error:", err);
            
            // If the server responds with a 404 or invalid token error
            if (err.response && (err.response.status === 404 || 
                (err.response.data && err.response.data.error === 'invalid_token'))) {
                setError('Password reset link is invalid or expired');
                setTimeout(() => {
                    navigate('/404');
                }, 2000);
            } else {
                setError('Error resetting password. Please try again.');
            }
            setMessage('');
        }
    };

    // If token format check is still running or token is invalid, don't render the form
    if (!tokenChecked) {
        return (
            <section className="min-h-[calc(100vh_-_88px)] flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Validating...</span>
                    </div>
                    <p className="mt-3">Validating reset link...</p>
                </div>
            </section>
        );
    }

    // The user will see the form if token format is valid
    return (
        <section className="min-h-[calc(100vh_-_88px)] flex items-center">
            <Container>
                <Row className='justify-content-center'>
                    <Col md={6} lg={5} xl={4}>
                        <div className="bg-white p-4 rounded-[20px] shadow-sm">
                            <h2 className='font-bold text__32 mb-3'>Reset Password</h2>
                            <p className='text__16 text-[#525252] mb-4'>Enter your new password.</p>
                            {message && <Alert variant="success" className="mb-4">{message}</Alert>}
                            {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-4" controlId="formBasicPassword">
                                    <Form.Label className="font-normal text__14 text-[#A3A3A3]">New Password</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter new password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="font-medium text__14 bg-[#FAFAFA] h-[54px] rounded-[20px] px-3 outline-none shadow-none focus:outline-none focus:shadow-none border-[#F5F5F5] focus:border-[#F5F5F5] focus:bg-[#FAFAFA]"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 bg-transparent border-0 text-gray-500"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                                        </button>
                                    </InputGroup>
                                </Form.Group>
                                <Form.Group className="mb-4" controlId="formBasicConfirmPassword">
                                    <Form.Label className="font-normal text__14 text-[#A3A3A3]">Confirm Password</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="font-medium text__14 bg-[#FAFAFA] h-[54px] rounded-[20px] px-3 outline-none shadow-none focus:outline-none focus:shadow-none border-[#F5F5F5] focus:border-[#F5F5F5] focus:bg-[#FAFAFA]"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10 bg-transparent border-0 text-gray-500"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                                        </button>
                                    </InputGroup>
                                </Form.Group>
                                <button 
                                    type="submit" 
                                    className="inline-block w-full cursor-pointer text-center font-medium text__16 text-Mwhite !py-[15px] !px-[28px] bg-Mblue !border-Mblue btnClass transition-all duration-300 hover:opacity-90"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Processing...
                                        </span>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </Form>
                        </div>
                    </Col>
                </Row>
            </Container>
        </section>
    );
};

export default ResetPassword;