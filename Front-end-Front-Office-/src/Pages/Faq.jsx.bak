/* eslint-disable eqeqeq */
/* eslint-disable array-callback-return */
import React, { useState } from 'react'
import { Fragment } from 'react'
import HeadTitle from '../Components/Pages/HeadTitle'
import { Container, Form } from 'react-bootstrap'
import { SearchIcon } from '../Components/Icon/Icon'

const Faq = () => {

  const dataAccordion = [
    {
      title: "How do I book a parking space?",
      desc: "To book a parking space, log into your account, select your preferred parking lot, choose the desired date and time, then confirm your reservation. You will receive a confirmation email.",
      category: "Booking"
    },
    {
      title: "What payment methods are accepted?",
      desc: "We accept credit/debit cards (Visa, MasterCard), mobile payments, and secure online payments. Payment is required at the time of booking.",
      category: "Payment"
    },
    {
      title: "How do I access the parking with my reservation?",
      desc: "Use the QR code received during your reservation at the parking entrance. Our system will automatically recognize your reservation and grant you access.",
      category: "Access"
    },
    {
      title: "What should I do in case of technical issues?",
      desc: "In case of technical issues, use the help button in our app or call our 24/7 customer service. An agent will be available to assist you immediately.",
      category: "Support"
    },
    {
      title: "Can I modify or cancel my reservation?",
      desc: "Yes, you can modify or cancel your reservation up to 2 hours before the scheduled time. Access the 'My Reservations' section to make changes.",
      category: "Booking"
    },
    {
      title: "How does pricing work?",
      desc: "Pricing is based on parking duration and varies by parking location. Rates are clearly displayed during booking, including all taxes.",
      category: "Payment"
    },
    {
      title: "Are there electric charging stations?",
      desc: "Yes, some of our parking lots are equipped with charging stations for electric vehicles. You can identify them during booking with the dedicated icon.",
      category: "Access"
    },
    {
      title: "How do I contact customer service?",
      desc: "Our customer service is available 24/7 by phone, email, or in-app chat. For emergencies, use the SOS button in the app.",
      category: "Support"
    }
  ]

  const [ToogleTab, setToogleTab] = useState("All")
  const [Search, setSearch] = useState("")
  const [ToogleAccordion, setToogleAccordion] = useState("How do I book a parking space?")

  const toogleAccFun = (e) => {
    if (ToogleAccordion == e) {
      setToogleAccordion("")
    } else {
      setToogleAccordion(e)
    }
  }

  const showData = () => {

    const filter = ToogleTab.toLocaleLowerCase() == "all" ? "" : ToogleTab.toLocaleLowerCase()

    if (ToogleTab.toLocaleLowerCase() == "all" && Search == "") {
      return dataAccordion
    }

    if (Search && ToogleTab.toLocaleLowerCase() != "all") {
      const data = dataAccordion.filter(item => item.title.toLocaleLowerCase().startsWith(Search.toLocaleLowerCase()) && item.category.toLocaleLowerCase() == filter)
      return data
    }

    if (Search != "") {
      const data = dataAccordion.filter(item => item.title.toLocaleLowerCase().startsWith(Search.toLocaleLowerCase()))
      return data
    }

    if (ToogleTab != "All") {
      const data = dataAccordion.filter(item => item.category.toLocaleLowerCase() == filter)
      return data
    }

    return dataAccordion
  }

  const AccordionWrap = (e) => {
    return <Fragment>
      <div className="w-full p-4 !pb-0 border border-solid border-[#E5E5E5]">
        <div onClick={() => toogleAccFun(e.title)} className="flex items-center justify-between cursor-pointer gap-2 pb-4">
          <h5 className='font-bold text__18'>{e.title}</h5>
          <div className={"arrowPlus relative w-[24px] h-[24px] " + (ToogleAccordion == e.title ? "active" : "")}>
            <span></span>
            <span></span>
          </div>
        </div>
        <div className={"pb-4 w-full " + (ToogleAccordion == e.title ? "" : "hidden")}>
          <p className='text__18'>{e.desc}</p>
        </div>
      </div>
    </Fragment>
  }


  return (
    <Fragment>
      <HeadTitle title={"Frequently Asked Questions <br /> about our Smart Parking"} sub={"FAQ"} />
      <section>
        <Container>

          <div className="flex flex-wrap lg:!flex-nowrap items-center justify-between mb-6 gap-y-4">

            <div className="flex items-center gap-3 w-full sm:w-auto text-center">
              <div onClick={() => setToogleTab("All")} className={'font-medium text__16 w-full sm:px-3 py-2 cursor-pointer ' + (ToogleTab == "All" ? "text-Mblue border-b border-solid border-Mblue" : "text-[#737373]")}>All</div>
              <div onClick={() => setToogleTab("Booking")} className={'font-medium text__16 w-full sm:px-3 py-2 cursor-pointer ' + (ToogleTab == "Booking" ? "text-Mblue border-b border-solid border-Mblue" : "text-[#737373]")}>Booking</div>
              <div onClick={() => setToogleTab("Payment")} className={'font-medium text__16 w-full sm:px-3 py-2 cursor-pointer ' + (ToogleTab == "Payment" ? "text-Mblue border-b border-solid border-Mblue" : "text-[#737373]")}>Payment</div>
              <div onClick={() => setToogleTab("Access")} className={'font-medium text__16 w-full sm:px-3 py-2 cursor-pointer ' + (ToogleTab == "Access" ? "text-Mblue border-b border-solid border-Mblue" : "text-[#737373]")}>Access</div>
              <div onClick={() => setToogleTab("Support")} className={'font-medium text__16 w-full sm:px-3 py-2 cursor-pointer ' + (ToogleTab == "Support" ? "text-Mblue border-b border-solid border-Mblue" : "text-[#737373]")}>Support</div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Form.Group className='mb-0 w-full'>
                <div className="flex items-center gap-2 bg-[#FAFAFA] border border-solid border-[#FAFAFA] px-3 rounded-[24px] w-full">
                  <SearchIcon width={20} height={20} color='#171717' />
                  <Form.Control onChange={(e) => setSearch(e.target.value)} value={Search} type="text" className='bg-transparent outline-none border-none shadow-none focus:shadow-none focus:bg-transparent focus:outline-none focus:border-none text__14 !text-Mblack placeholder-[#A3A3A3] h-[54px] px-0 w-full lg:w-auto sm:min-w-[300px]' placeholder="Search..." />
                </div>
              </Form.Group>
              <div className="w-[56px] h-[56px] bg-Mblue rounded-full flex items-center justify-center flex-shrink-0">
                <SearchIcon width={24} height={24} color='white' />
              </div>
            </div>

          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 grid-rows-1 gap-4">

            <div className="flex flex-wrap gap-4">
              {
                showData().map((obj, i) => {
                  let half = showData().length / 2;

                  if (i < half) {
                    return (
                      AccordionWrap(obj)
                    )
                  }
                })
              }
            </div>
            <div className="flex flex-wrap gap-4">
              {
                showData().map((obj, i) => {
                  let half = showData().length / 2;

                  if (i >= half) {
                    return (
                      AccordionWrap(obj)
                    )
                  }
                })
              }
            </div>

          </div>

        </Container>
      </section>
    </Fragment>
  )
}

export default Faq
