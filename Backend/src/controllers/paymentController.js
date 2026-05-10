const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Reservation = require('../models/reservationModel');
const Payment = require('../models/paymentModel');
const User = require('../models/userModel');
const crypto = require('crypto');

// Initialize Razorpay for Indian payments
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment controller object
const paymentController = {
  // Create Stripe payment intent for international payments
  createStripePaymentIntent: async (req, res) => {
    try {
      const { reservationId } = req.body;
      const reservation = await Reservation.findById(reservationId);

      if (!reservation) {
        return res.status(404).json({ message: 'Reservation not found' });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(reservation.totalPrice * 100), // Convert to smallest currency unit (paise)
        currency: 'inr',
        metadata: {
          reservationId: reservationId,
          userId: req.user.id
        }
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      console.error('Payment Intent Creation Error:', error);
      res.status(500).json({ message: 'Error creating payment intent' });
    }
  },

  // Create Razorpay order for Indian payments
  createRazorpayOrder: async (req, res) => {
    try {
      const { reservationId } = req.body;
      const reservation = await Reservation.findById(reservationId);

      if (!reservation) {
        return res.status(404).json({ message: 'Reservation not found' });
      }

      const options = {
        amount: Math.round(reservation.totalPrice * 100), // Convert to paise
        currency: 'INR',
        receipt: `reservation_${reservationId}`,
        notes: {
          reservationId: reservationId,
          userId: req.user.id
        }
      };

      const order = await razorpay.orders.create(options);

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } catch (error) {
      console.error('Razorpay Order Creation Error:', error);
      res.status(500).json({ message: 'Error creating payment order' });
    }
  },

  // Verify Razorpay payment
  verifyRazorpayPayment: async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      
      // Verify signature
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generated_signature === razorpay_signature) {
        // Save payment details
        const payment = await Payment.create({
          reservationId: req.body.reservationId,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          amount: req.body.amount,
          status: 'completed',
          paymentMethod: 'razorpay'
        });

        // Update reservation status
        await Reservation.findByIdAndUpdate(req.body.reservationId, {
          paymentStatus: 'paid',
          paymentId: payment._id
        });

        res.json({
          success: true,
          message: 'Payment verified successfully'
        });
      } else {
        res.status(400).json({ message: 'Invalid payment signature' });
      }
    } catch (error) {
      console.error('Payment Verification Error:', error);
      res.status(500).json({ message: 'Error verifying payment' });
    }
  },

  // Handle UPI payments
  createUPIPayment: async (req, res) => {
    try {
      const { reservationId, upiId } = req.body;
      const reservation = await Reservation.findById(reservationId);

      if (!reservation) {
        return res.status(404).json({ message: 'Reservation not found' });
      }

      const options = {
        amount: Math.round(reservation.totalPrice * 100),
        currency: 'INR',
        payment_capture: 1,
        payment_method: {
          type: 'upi',
          vpa: upiId
        }
      };

      const order = await razorpay.orders.create(options);

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } catch (error) {
      console.error('UPI Payment Creation Error:', error);
      res.status(500).json({ message: 'Error creating UPI payment' });
    }
  },

  // Get payment status
  getPaymentStatus: async (req, res) => {
    try {
      const { paymentId } = req.params;
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      res.json({
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.createdAt,
        paymentMethod: payment.paymentMethod
      });
    } catch (error) {
      console.error('Payment Status Error:', error);
      res.status(500).json({ message: 'Error getting payment status' });
    }
  }
,

  // Confirm Stripe payment and update reservation (used after client confirms card payment)
  confirmStripePayment: async (req, res) => {
    try {
      const { reservationId, paymentIntentId } = req.body;

      const reservation = await Reservation.findById(reservationId);
      if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

      // Create payment record
      const payment = await Payment.create({
        reservationId: reservation._id,
        amount: reservation.totalPrice,
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'card',
        transactionId: paymentIntentId,
        paidAt: new Date()
      });

      // Update reservation
      reservation.paymentStatus = 'completed';
      reservation.paymentMethod = 'online';
      reservation.paymentId = payment._id;
      await reservation.save();

      res.json({ success: true, message: 'Payment confirmed', payment, reservation });
    } catch (error) {
      console.error('Confirm Stripe Payment Error:', error);
      res.status(500).json({ message: 'Error confirming payment' });
    }
  },

  // Pay with internal wallet balance
  payWithWallet: async (req, res) => {
    try {
      const { reservationId } = req.body;
      const reservation = await Reservation.findById(reservationId);

      if (!reservation) {
        return res.status(404).json({ message: 'Reservation not found' });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const amount = Number(reservation.totalPrice || 0);
      if (user.walletBalance < amount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }

      // Deduct balance
      user.walletBalance = Number((user.walletBalance - amount).toFixed(2));
      await user.save();

      // Create payment record
      const payment = await Payment.create({
        reservationId: reservation._id,
        amount,
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'wallet',
        transactionId: `wallet_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        paidAt: new Date()
      });

      // Update reservation
      reservation.paymentStatus = 'completed';
      reservation.paymentMethod = 'wallet';
      reservation.paymentId = payment._id;
      await reservation.save();

      res.json({ success: true, message: 'Payment completed using wallet', payment, reservation });
    } catch (error) {
      console.error('Wallet Payment Error:', error);
      res.status(500).json({ message: 'Error processing wallet payment' });
    }
  }
};

module.exports = paymentController;