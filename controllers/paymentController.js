const striptModel = require('../models/stripeModel')
const sellerModel = require('../models/sellerModel')
const withdrowRequest = require('../models/withdrowModel')
const sellerWallet = require('../models/sellerWallet')
const { responseReturn } = require('../utiles/response')
const { v4: uuidv4 } = require('uuid')
const { mongo: { ObjectId } } = require('mongoose')

const stripe = require("stripe")(
    "sk_test_g3oAMh5GjPJ1Wei4kWcx2U6R"
);

class paymentController {
    create_stripe_connect_account = async (req, res) => {
        const { id } = req
        const uid = uuidv4()

        try {
            const stripInfo = await striptModel.findOne({ sellerId: id })

            if (stripInfo) {
                await striptModel.deleteOne({ sellerId: id })
                const account = await stripe.accounts.create({ type: 'express' })

                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: 'http://localhost:3000/refresh',
                    return_url: `http://localhost:3000/success?activeCode=${uid}`,
                    type: 'account_onboarding'
                })
                await striptModel.create({
                    sellerId: id,
                    stripeId: account.id,
                    code: uid
                })
                responseReturn(res, 201, { url: accountLink.url })
            } else {
                const account = await stripe.accounts.create({ type: 'express' })

                const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url: 'http://localhost:3000/refresh',
                    return_url: `http://localhost:3000/success?activeCode=${uid}`,
                    type: 'account_onboarding'
                })
                await striptModel.create({
                    sellerId: id,
                    stripeId: account.id,
                    code: uid
                })
                responseReturn(res, 201, { url: accountLink.url })
            }
        } catch (error) {
            console.log('stripe connect account create error ' + error.message)
        }
    }

    active_stripe_connect_account = async (req, res) => {
        const { activeCode } = req.params
        const { id } = req
        try {
            const userStripeInfo = await striptModel.findOne({ code: activeCode })
            if (userStripeInfo) {
                await sellerModel.findByIdAndUpdate(id, {
                    payment: 'active'
                })
                responseReturn(res, 200, { message: 'payment active' })
            } else {
                responseReturn(res, 404, { message: 'payment active failed' })
            }
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal server error' })
        }
    }

    // sunAmount = (data) => {
    //     let sum = 0;

    //     for (let i = 0; i < data.length; i++) {
    //         sum = sum + data[i].amount
    //     }
    //     return sum
    // }
    sumAmount = (data) => {
        return data.reduce((sum, item) => sum + item.amount, 0);
    }

    get_seller_payemt_details = async (req, res) => {
        const { sellerId } = req.params
        try {
            const payments = await sellerWallet.find({ sellerId })

            const pendingWithdrows = await withdrowRequest.find({
                $and: [
                    {
                        sellerId: {
                            $eq: sellerId
                        }
                    }, {
                        status: {
                            $eq: 'pending'
                        }
                    }
                ]
            })

            const successWithdrows = await withdrowRequest.find({
                $and: [
                    {
                        sellerId: {
                            $eq: sellerId
                        }
                    }, {
                        status: {
                            $eq: 'success'
                        }
                    }
                ]
            })

            const pendingAmount = this.sunAmount(pendingWithdrows)
            const withdrowAmount = this.sunAmount(successWithdrows)
            const totalAmount = this.sunAmount(payments)

            let availableAmount = 0;

            if (totalAmount > 0) {
                availableAmount = totalAmount - (pendingAmount + withdrowAmount)
            }
            responseReturn(res, 200, {
                totalAmount,
                pendingAmount,
                withdrowAmount,
                availableAmount,
                successWithdrows,
                pendingWithdrows
            })

        } catch (error) {
            console.log(error.message)
        }
    }

    withdrowal_request = async (req, res) => {
        const { amount, sellerId } = req.body
        console.log(req.body)
        try {
            const withdrowal = await withdrowRequest.create({
                sellerId,
                amount: parseInt(amount)
            })
            responseReturn(res, 200, { withdrowal, message: 'withdrowal request send' })
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal server error' })
        }
    }

    get_payment_request = async (req, res) => {

        try {
            const withdrowalRequest = await withdrowRequest.find({ status: 'pending' })
            responseReturn(res, 200, { withdrowalRequest })
        } catch (error) {
            responseReturn(res, 500, { message: 'Internal server error' })
        }
    }

    payment_request_confirm = async (req, res) => {
        const { paymentId } = req.body

        try {
            const payment = await withdrowRequest.findById(paymentId)
            const { stripeId } = await striptModel.findOne({
                sellerId: new ObjectId(payment.sellerId)
            })

            await stripe.transfers.create({
                amount: payment.amount * 100,
                currency: 'usd',
                destination: stripeId
            })
            await withdrowRequest.findByIdAndUpdate(paymentId, { status: 'success' })
            responseReturn(res, 200, { payment, message: 'request confirm success' })
        } catch (error) {
            console.log(error.message)
            responseReturn(res, 500, { message: 'Internal server error or Account Not Connected' })
        }

    }

}

module.exports = new paymentController()