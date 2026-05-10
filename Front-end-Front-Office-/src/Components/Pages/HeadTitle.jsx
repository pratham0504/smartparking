import React from 'react'
import { Container } from 'react-bootstrap'

const HeadTitle = ({ title, sub }) => {
    return (
        <section className='relative min-h-[300px] lg:min-h-[500px] flex justify-center items-center'>
            <img src="./../images/img.png" className='absolute left-0 top-0 w-full h-full object-cover' alt="" />
            <div className="absolute left-0 top-0 w-full h-full bgWrapHead"></div>
            <Container className='text-center relative z-2 w-full'>
                <p className='text-Mgreen mb-2' dangerouslySetInnerHTML={{ __html: sub }} />
                <h2 className='font-bold text__48 text-Mwhite' dangerouslySetInnerHTML={{ __html: title }} />
            </Container>
        </section>
    )
}

export default HeadTitle
