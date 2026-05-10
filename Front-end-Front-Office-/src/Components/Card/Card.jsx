/* eslint-disable eqeqeq */
import React from 'react'
import { Fragment } from 'react'
import { NavLink } from 'react-router-dom'

export const CardCar = (props) => {
    return (
        <div className={'w-full p-3 lg:p-4 border border-solid ' + (
            props.type == "price" ? props.selectCar == props.data.name ? "!border-Mblue" : "border-[#E5E5E5]" : "border-[#E5E5E5]"
        )}>
            <img src={props.data.img} className='w-full h-[130px] sm:h-[200px] lg:h-[250px] object-cover mb-3' alt="" />
            <h4 className='font-bold text__20 mb-2'>{props.data.name}</h4>
            <p className='text__16 text-[#525252] mb-2'>{props.data.desc}</p>
            {
                props.type == "price" ? <div className="flex items-center justify-between">
                    <div className='font-bold text__18'>${props.data.price}<span className='font-normal text__12'>/Day</span></div>
                    <div onClick={() => props.setselectCar(props.data.name)} className={"inline-block  font-medium text__14 btnClass  !rounded-[24px] " + (props.selectCar == props.data.name ? "text-[#A3A3A3] !border-[#F5F5F5] bg-[#F5F5F5]" : "text-Mblue !border-Mblue hover:bg-Mblue hover:text-Mwhite cursor-pointer")}>{props.selectCar == props.data.name ? "Sellected" : "Sellect"}</div>
                </div> : <ul className='text__16 list-disc pl-4'>
                    {props.data.detail.map((obj) => {
                        return <li>{obj}</li>
                    })}
                </ul>
            }

        </div>
    )
}

export const CardCarPersonalize = (props) => {
    return (
        <div className={'w-full p-4 border border-solid border-[#E5E5E5]'}>
            <img src="./../images/car (2).png" className='w-full h-[250px] object-cover mb-3' alt="" />
            <h4 className='font-bold text__20 mb-2 flex items-center gap-2'>Luxury Model Y <img src="./../images/info-circle.svg" alt="" /></h4>
            <p className='text__16 text-[#525252] mb-2'>Wed 19 Jul 12:00 - Thu 20 Jul 13:00</p>
            <p className='text__16 text-[#525252] mb-2'>Amsterdam City Centre</p>

            {
                props.type == "confirmation" ? <Fragment>
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center justify-between w-full">
                            <p className='text__14 text-[#525252]'>Total Price</p>
                            <h5 className='font-bold text__18'>₹102</h5>
                        </div>
                        <div className="flex items-center justify-between w-full">
                            <p className='text__14 text-[#525252]'>Tax Platform</p>
                            <h5 className='font-bold text__18 text-Mblue'>Free</h5>
                        </div>
                        <div className="border-t border-solid border-[#E5E5E5] inline-block w-full"></div>
                        <div className="flex items-center justify-between w-full">
                            <p className='text__14 text-[#525252]'>Total Price</p>
                            <h5 className='font-bold text__18'>₹102</h5>
                        </div>
                    </div>
                </Fragment> : <h5 className='font-bold text__18'>₹102<span className='font-normal text__12'>/Day</span></h5>
            }

        </div>
    )
}

export const CardBlog = (props) => {
    return (
        <NavLink to="/blog/detail" className="w-full">
            <img src={props.data.img} className='w-full h-[240px] object-cover mb-3' alt="" />
            <p className='text__14 text-[#737373] mb-2'>{props.data.date}</p>
            <h5 className='font-bold text__20'>{props.data.title}</h5>
        </NavLink>
    )
}

