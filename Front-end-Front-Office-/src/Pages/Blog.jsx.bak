/* eslint-disable array-callback-return */
import React from 'react'
import { Fragment } from 'react'
import { Col, Container, Form, Pagination, Row } from 'react-bootstrap'
import HeadTitle from '../Components/Pages/HeadTitle'
import JoinCarent from '../Components/Pages/JoinCarent'
import { CardBlog } from '../Components/Card/Card'
import { SearchIcon } from '../Components/Icon/Icon'

const Blog = () => {

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
        {
            img: "./../images/blg (1).jpg",
            date: "22/06/2023",
            title: 'A Wide Selection of Rental Cars for Every Journey'
        },
        {
            img: "./../images/blg (2).jpg",
            date: "22/06/2023",
            title: 'Luxury Car Rental for Unforgettable Experiences'
        },
        {
            img: "./../images/blg (3).jpg",
            date: "22/06/2023",
            title: 'Get Behind the Wheel with Our Car Rental Service'
        },
    ]


    const dataCategory = [
        {
            title: "Team",
            count: "8"
        },
        {
            title: "Ambassadors",
            count: "2"
        },
        {
            title: "Travel",
            count: "24"
        },
        {
            title: "Location",
            count: "12"
        },
        {
            title: "Tesla, Inc.",
            count: "4"
        },
    ]

    const dataTag = [
        "Autopilot",
        "Campaign",
        "Charging",
        "Tesla",
        "Trip",
        "Electric car",
        "Road trip",
        "Booking",
    ]

    return (
        <Fragment>
            <HeadTitle title={"On the Blog"} sub={"BLOG"} />

            <section>
                <Container>
                    <Row>
                        <Col className='mb-10 md:mb-0' md={8}>
                            <Row className='gap-y-6'>
                                {
                                    dataBlog.map((obj, i) => {
                                        return <Col md={6} key={i}>
                                            <CardBlog data={obj} />
                                        </Col>
                                    })
                                }

                            </Row>

                            <div className="mt-6 text-center">
                                <Pagination className='justify-center paginationnCustom'>
                                    <Pagination.First />
                                    <Pagination.Prev />
                                    <Pagination.Item>{1}</Pagination.Item>
                                    <Pagination.Ellipsis />

                                    <Pagination.Item>{10}</Pagination.Item>
                                    <Pagination.Item>{11}</Pagination.Item>
                                    <Pagination.Item active>{12}</Pagination.Item>
                                    <Pagination.Item>{13}</Pagination.Item>
                                    <Pagination.Item>{14}</Pagination.Item>

                                    <Pagination.Ellipsis />
                                    <Pagination.Item>{20}</Pagination.Item>
                                    <Pagination.Next />
                                    <Pagination.Last />
                                </Pagination>
                            </div>
                        </Col>
                        <Col md={4}>
                            <div className="flex items-center gap-3 mb-4">
                                <Form.Group className='mb-0 w-full'>
                                    <div className="flex items-center gap-2 bg-[#FAFAFA] border border-solid border-[#FAFAFA] px-3 rounded-[24px] w-full">
                                        <SearchIcon width={20} height={20} color='#171717' />
                                        <Form.Control type="text" className='bg-transparent outline-none border-none shadow-none focus:shadow-none focus:bg-transparent focus:outline-none focus:border-none text__14 !text-Mblack placeholder-[#A3A3A3] h-[54px] px-0 w-full' placeholder="Search..." />
                                    </div>
                                </Form.Group>
                                <div className="w-[56px] h-[56px] bg-Mblue rounded-full flex items-center justify-center flex-shrink-0">
                                    <SearchIcon width={24} height={24} color='white' />
                                </div>
                            </div>

                            <div className="mb-4">
                                <h4 className='font-bold text__20 mb-3'>Recent Posts</h4>

                                <div className="flex flex-wrap gap-3">
                                    {
                                        dataBlog.map((obj, i) => {
                                            if (i < 3) {
                                                return <>
                                                    <div className="w-full">
                                                        <p className='text__16 mb-2'>{obj.date}</p>
                                                        <h5 className='font-medium text__18'>{obj.title}</h5>
                                                    </div>
                                                    <hr className='border-[#E5E5E5] w-full' />
                                                </>
                                            }
                                        })
                                    }
                                </div>
                            </div>


                            <div className="mb-4">
                                <h4 className='font-bold text__20 mb-3'>Categories</h4>

                                <div className="flex flex-wrap gap-3">
                                    <hr className='border-[#E5E5E5] w-full' />
                                    {
                                        dataCategory.map((obj, i) => {
                                            return <>
                                                <div className="w-full flex items-center justify-between">
                                                    <p className='text__16 font-medium'>{obj.title}</p>
                                                    <p className='font-medium text__16 text-[#A3A3A3]'>{'(' + obj.count + ')'}</p>
                                                </div>
                                                <hr className='border-[#E5E5E5] w-full' />
                                            </>
                                        })
                                    }
                                </div>
                            </div>


                            <div className="mb-4">
                                <h4 className='font-bold text__20 mb-3'>Tags</h4>

                                <div className="flex gap-3 flex-wrap">
                                    {
                                        dataTag.map((obj, i) => {
                                            return <>
                                                <div className="text__14 px-[16px] py-[6px] rounded-full border border-solid border-[#E5E5E5] text-[#737373]">
                                                    {obj}
                                                </div>
                                            </>
                                        })
                                    }
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

export default Blog
