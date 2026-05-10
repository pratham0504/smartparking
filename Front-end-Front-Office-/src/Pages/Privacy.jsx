/* eslint-disable no-unused-vars */
import React from 'react'
import { Fragment } from 'react'
import { Col, Container, Form, Pagination, Row } from 'react-bootstrap'

const Privacy = () => {
    return (
        <Fragment>
            <section className='pb-0'>
                <Container>
                    <div className="text-center">
                        <h2 className='font-bold text__48 mb-2'>Privacy Policy</h2>
                        <p className='text__16 text-[#525252]'>Effective Date: November 28, 2023</p>
                    </div>
                </Container>
            </section>

            <section>
                <Container>
                    <Row className='justify-center'>
                        <Col md={10}>
                            <h5 className='font-bold text__18 mb-3'>At parkEz, we understand the importance of your privacy while using our parking service platform. This Privacy Policy outlines how we collect, use, and protect your personal information when you use our parking reservation services. Please read this policy carefully to understand our practices regarding your data.</h5>

                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>Information We Collect</h5>
                                <p className='text__16'>We collect information necessary for parking reservations and account management, including: your name, email address, phone number, vehicle information (license plate, make, model), payment information, and parking preferences. We also collect usage data such as parking history, reservation details, and location data when you use our service.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>How We Use Your Information</h5>
                                <p className='text__16'>We use your information to: process your parking reservations, manage your account, send booking confirmations and updates, process payments, improve our parking services, and provide customer support. We may also use anonymized data to analyze parking patterns and optimize our service.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>Disclosure of Your Information</h5>
                                <p className='text__16'>We share your information with parking facility operators as needed to provide our service. We may also share data with payment processors, and other service providers who help us operate our platform. We never sell your personal information to third parties.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>Security of Your Information</h5>
                                <p className='text__16'>We implement industry-standard security measures to protect your parking and payment information. This includes encryption of sensitive data, secure servers, and regular security audits.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>Children's Privacy</h5>
                                <p className='text__16'>parkEz's services are not intended for users under 18 years of age. We do not knowingly collect information from minors.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>Changes to this Privacy Policy</h5>
                                <p className='text__16'>We may update this policy as our services evolve. Any significant changes will be notified through our app or email.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>Contact Us</h5>
                                <p className='text__16'>If you have questions about our privacy practices, please contact us at support@parkEz.com or through our customer service portal.</p>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>
        </Fragment>
    )
}

export default Privacy
