import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <section className="min-h-[calc(100vh_-_88px)] flex items-center">
            <Container>
                <Row className="justify-content-center text-center">
                    <Col md={8} lg={6}>
                        <h1 className="font-bold text-[120px] leading-none mb-4 text-Mblue">404</h1>
                        <h2 className="font-bold text__32 mb-4">Page Not Found</h2>
                        <p className="text__16 text-[#525252] mb-8">
                            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                        </p>
                        <Link 
                            to="/" 
                            className="inline-block cursor-pointer text-center font-medium text__16 text-Mwhite py-[15px] px-[28px] bg-Mblue border-Mblue rounded-full transition-all duration-300 hover:opacity-90"
                        >
                            Back to Homepage
                        </Link>
                    </Col>
                </Row>
            </Container>
        </section>
    );
};

export default NotFound;
