import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Col, Container, Form, Row, Alert } from 'react-bootstrap';
import axios from 'axios';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Email validation function
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Input validation
        if (!email.trim()) {
            setError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            await axios.post('http://localhost:3001/api/forget-password', { email });
            setMessage('Check your email for the reset link.');
            setError('');
            // Redirect to home page after 2 seconds
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            setError('User Not Found.');
            setMessage('');
        }
    };

    return (
        <section className="min-h-[calc(100vh_-_88px)] flex items-center">
            <Container>
                <Row className='justify-content-center'>
                    <Col md={6} lg={5} xl={4}>
                        <div className="bg-white p-4 rounded-[20px] shadow-sm">
                            <h2 className='font-bold text__32 mb-3'>Forgot Password</h2>
                            <p className='text__16 text-[#525252] mb-4'>Enter your email to reset your password.</p>
                            {message && <Alert variant="success" className="mb-4">{message}</Alert>}
                            {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-4" controlId="formBasicEmail">
                                    <Form.Label className="font-normal text__14 text-[#A3A3A3]">Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="Enter email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="font-medium text__14 bg-[#FAFAFA] h-[54px] rounded-[20px] px-3 outline-none shadow-none focus:outline-none focus:shadow-none border-[#F5F5F5] focus:border-[#F5F5F5] focus:bg-[#FAFAFA]"
                                    />
                                </Form.Group>
                                <button type="submit" className="inline-block w-full cursor-pointer text-center font-medium text__16 text-Mwhite !py-[15px] !px-[28px] bg-Mblack !border-Mblack btnClass transition-all duration-300 hover:opacity-90">
                                    Send Reset Link
                                </button>
                            </Form>
                        </div>
                    </Col>
                </Row>
            </Container>
        </section>
    );
};

export default ForgotPassword;