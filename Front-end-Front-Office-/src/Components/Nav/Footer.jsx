import React, { Fragment } from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import { NavLink } from 'react-router-dom'

const Footer = () => {
    return (
        <Fragment>
            <section className='pb-6 bg-Mblack'>
                <Container>
                    <Row className='mb-10 gap-y-8'>
                        <Col md={3}>
                            <img src="./../images/ParkEz.png" className='mb-2' alt="ParkEz logo" style={{width:"50%"}} />
                            <p className='text__16 text-[#D4D4D4]'>Find Convenient and Affordable Parking.</p>
                        </Col>
                        <Col className='col-6' md={{ span: 2, offset: 1 }}>
                            <h5 className='font-medium text-[#A3A3A3] text__16 mb-3'>Explore</h5>
                            <div className="flex flex-wrap gap-3 font-medium text__16">
                                <NavLink to="/blog" className='inline-block w-full text-Mwhite'>Blog</NavLink>
                                <NavLink to="/about" className='inline-block w-full text-Mwhite'>About  Us</NavLink>
                                <NavLink to="/careers" className='inline-block w-full text-Mwhite'>Careers</NavLink>
                                <NavLink to="/contact" className='inline-block w-full text-Mwhite'>Contact Us</NavLink>
                            </div>
                        </Col>
                        <Col className='col-6' md={2}>
                            <h5 className='font-medium text-[#A3A3A3] text__16 mb-3'>Link</h5>
                            <div className="flex flex-wrap gap-3 font-medium text__16">
                                <NavLink to="/privacy" className='inline-block w-full text-Mwhite'>Privacy Policy</NavLink>
                                <NavLink to="/terms" className='inline-block w-full text-Mwhite'>Term & Conditioner</NavLink>
                                <NavLink to="/faq" className='inline-block w-full text-Mwhite'>FAQs</NavLink>
                            </div>
                        </Col>
                        <Col md={4}>
                            <h5 className='font-medium text-[#A3A3A3] text__16 mb-3'>Link</h5>
                            <div className="flex items-center gap-3">
                                <a href="#!"><img src="./../images/ss (1).svg" alt="" /></a>
                                <a href="#!"><img src="./../images/ss (2).svg" alt="" /></a>
                                <a href="#!"><img src="./../images/ss (3).svg" alt="" /></a>
                                <a href="#!"><img src="./../images/ss (4).svg" alt="" /></a>
                                <a href="#!"><img src="./../images/ss (5).svg" alt="" /></a>
                            </div>
                        </Col>
                    </Row>
                    <div className="flex flex-wrap sm:flex-nowrap justify-center sm:justify-between gap-y-2 items-center px-4 py-2 bg-[#262626] rounded-full">
                        <p className="text-center text__14 text-[#A3A3A3] sm:!order-1 order-2">© 2022 Company Name® Global Inc.</p>
                        <div className="flex items-center justify-center sm:justify-end gap-6 order-1 sm:!order-2">
                            <NavLink to="/privacy" className='inline-block text__16 text-Mwhite flex-shrink-0'>Privacy Policy</NavLink>
                            <NavLink to="/terms" className='inline-block text__16 text-Mwhite flex-shrink-0'>Term & Conditioner</NavLink>
                        </div>
                    </div>
                </Container>
            </section>
        </Fragment>
    )
}

export default Footer
