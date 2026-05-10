import React from 'react'
import { Container } from 'react-bootstrap'
import { NavLink } from 'react-router-dom'

const JoinCarent = () => {
    return (
        <section className='bg-Mgreen relative overflow-hidden'>
            <img src="./../images/patern.svg" className='absolute left-0 top-0 w-full h-full object-cover' alt="" />
            <img src="./../images/sasa (1).png" className='absolute w-[50vw] sm:w-[16rem] lg:w-auto left-0 bottom-0 z-[2]' alt="" />
            <img src="./../images/sasa (2).png" className='absolute w-[50vw] sm:w-[16rem] lg:w-auto right-0 bottom-0 z-[2]' alt="" />
            <Container className='text-center relative z-[3] pb-[5rem]'>
                <p className='text__18 mb-2'>JOIN parkEz</p>
                <h2 className='font-bold text__48 mb-8'>Find Your Perfect Parking Spot</h2>
                <NavLink to="/booking" className="inline-block cursor-pointer font-medium text__16 text-Mwhite !rounded-[24px] !border-Mblue bg-Mblue btnClass !py-[14px]">Book Now</NavLink>
            </Container>
        </section>
    )
}

export default JoinCarent
