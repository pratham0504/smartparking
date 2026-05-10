/* eslint-disable no-unused-vars */
import React from 'react'
import { Fragment } from 'react'
import { Col, Container, Form, Row } from 'react-bootstrap'
import SecHowItWorks from '../Components/Pages/HowItWorks'
import JoinCarent from '../Components/Pages/JoinCarent'

const HowItworks = () => {
    return (
        <Fragment>
            <SecHowItWorks />

            <section>
                <Container>
                    <div className="text-center mb-14">
                        <p className='mb-2 text__16'>OUR VALUES</p>
                        <h2 className='font-bold text__48'>The world's highest rated car <br className='hidden sm:block' /> rental experience</h2>
                    </div>

                    <Row className='gap-y-10'>
                        <Col md={6}>
                            <div className="md:flex text-center md:!text-left items-start gap-3">
                                <img src="./../images/mb (3).svg" className='mb-3 md:mb-0 mx-auto' alt="" />
                                <div>
                                    <h5 className='font-bold text__20 mb-2'>All-electric. Charging Included.</h5>
                                    <p className='text__18 text-[#525252]'>With thousands of integrated chargers incl. Tesla Superchargers, our unique technology, and award-winning support team– you never have .</p>
                                </div>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="md:flex text-center md:!text-left items-start gap-3">
                                <img src="./../images/mb (1).svg" className='mb-3 md:mb-0 mx-auto' alt="" />
                                <div>
                                    <h5 className='font-bold text__20 mb-2'>Book, Arrive & Drive in 2 Minutes</h5>
                                    <p className='text__18 text-[#525252]'>Beat the usual rental queues and hassle via your smartphone. Rent for a day, a week, a month, or subscribe for longer.</p>
                                </div>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="md:flex text-center md:!text-left items-start gap-3">
                                <img src="./../images/mb (2).svg" className='mb-3 md:mb-0 mx-auto' alt="" />
                                <div>
                                    <h5 className='font-bold text__20 mb-2'>You pick up or we deliver</h5>
                                    <p className='text__18 text-[#525252]'>We do things smarter, not harder, with grace and gratitude. When we fail and make mistakes, we take accountability for it, and become better through it.</p>
                                </div>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="md:flex text-center md:!text-left items-start gap-3">
                                <img src="./../images/mb (4).svg" className='mb-3 md:mb-0 mx-auto' alt="" />
                                <div>
                                    <h5 className='font-bold text__20 mb-2'>World-class, Highest Rated</h5>
                                    <p className='text__18 text-[#525252]'>We take pride in opportunities to share our beliefs, failures, strengths and decisions. For example, this exact sentence was first seen on the overview.</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>


           <JoinCarent />
        </Fragment>
    )
}

export default HowItworks
