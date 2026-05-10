import React from 'react'
import { Fragment } from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import { CardBlog } from '../Components/Card/Card'

const BlogDetail = () => {
    const dataBlog = [
        {
            img: "./../images/blg (4).jpg",
            date: "22/06/2023",
            title: 'Hit the Road with Ease: Rent a Car for Hassle-Free Travel'
        },
        {
            img: "./../images/blg (5).jpg",
            date: "22/06/2023",
            title: 'Road Trip Ready: Get Behind the Wheel with Our Car Rental Service'
        },
        {
            img: "./../images/blg (6).jpg",
            date: "22/06/2023",
            title: 'Freedom on Wheels: The Convenience of Renting a Car'
        },
    ]
    return (
        <Fragment>
            <section>
                <Container>
                    <img src="./../images/Image.jpg" className='w-full h-[200px] sm:h-[300px] md:h-[400px] lg:h-[500px] object-cover mb-10' alt="" />


                    <Row className='justify-center'>
                        <Col md={10}>
                            <p className='text__16 text-[#525252] mb-2'>22/06/2023</p>
                            <h2 className='font-medium text__48 mb-3'>Hit the Road with Ease: Rent a Car for Hassle-Free Travel</h2>

                            <p className='font-bold text__18 mb-3'>Traveling to new destinations is an exciting experience, but it often comes with the challenge of transportation. Whether you're planning a family vacation, a business trip, or a spontaneous adventure, renting a car can be the key to hassle-free travel. With the freedom and convenience it offers, renting a car allows you to explore at your own pace, discover hidden gems, and make the most of your journey. In this article, we'll delve into the many benefits of renting a car and how it can enhance your travel experience.</p>

                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>1. Freedom to Explore</h5>
                                <p className='text__18'>Conducting market research is crucial to understand the demand for your product or service in the target market. Identify the target audience, evaluate the competition, and assess the overall market conditions.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>Freedom to Explore:</h5>
                                <p className='text__18'>Renting a car provides unmatched convenience and flexibility during your travels. You can arrive at the airport or train station and have a vehicle waiting for you, eliminating the need to rely on taxis or public transport. With a rental car, you have the flexibility to stop wherever and whenever you want, whether it's to take breathtaking photos, sample local cuisine, or explore hidden attractions. You're in control of your travel schedule, allowing you to make the most of your precious time.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>2. Comfort and Privacy</h5>
                                <p className='text__18'>Traveling with comfort and privacy is important, especially on long journeys. Rental cars offer comfortable seating, ample space for luggage, and modern amenities, ensuring a pleasant and enjoyable trip. Unlike crowded buses or trains, you have your own private space to relax, unwind, and enjoy the scenic views. Whether you're traveling solo, with a partner, or as a group, renting a car provides a comfortable and intimate travel experience.</p>
                            </div>
                            <div className="mb-3">
                                <h5 className='font-bold text__18 mb-2'>3. Cost-Effectiveness</h5>
                                <p className='text__18'>Contrary to popular belief, renting a car can often be a cost-effective option, especially for longer trips or when traveling with a group. The cost of renting a car can be comparable to or even lower than the expenses of public transportation, especially when you consider the convenience and time saved. Additionally, rental car companies often offer various discounts, deals, and packages, allowing you to find the best option that suits your budget.</p>
                            </div>

                            <p className='font-bold text__18 mb-3'>Renting a car opens up a world of possibilities for hassle-free travel. It gives you the freedom, convenience, and flexibility to explore your destination at your own pace and on your own terms. From discovering hidden gems to embarking on epic road trips, renting a car enhances your travel experience in countless ways. So, the next time you plan a trip, consider renting a car and unlock the full potential of your journey. Hit the road with ease and make unforgettable memories along the way.</p>
                        </Col>
                    </Row>
                </Container>
            </section>

            <section>
                <Container>
                    <h2 className='font-bold text__48 mb-6'>Related Posts</h2>

                    <Row className='gap-y-6'>
                        {
                            dataBlog.map((obj, i) => {
                                return <Col md={4} key={i}>
                                    <CardBlog data={obj} />
                                </Col>
                            })
                        }

                    </Row>
                </Container>
            </section>
        </Fragment>
    )
}

export default BlogDetail
