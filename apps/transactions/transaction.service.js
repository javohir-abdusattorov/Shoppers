const crypto = require('crypto');
const ErrorResponse = require('../../utils/errorResponse')
const asyncHandler = require('../../middleware/async')

const User = require('../auth/user.model')
const Order = require('../orders/order.model')
const Transaction = require('../transactions/transaction.model')


module.exports = class TransactionService {

  checkPerformTransaction = async (body) => {
    const orderID = body.params.account["order_id"]
    if (!orderID || typeof(orderID) !== "string" || orderID.length !== 24) return {
      "result": null,
      "error": {
        "code": -31050,
        "message": {
          "ru": "Заказ не найден",
          "uz": "Zakaz mavjud emas",
          "en": "Order not found"
        },
        "data": "orderNotFound"
      },
      "id": body.id
    }
    const order = await Order.findById(orderID) 
    const transaction = await Transaction.findOne({order_id: orderID})

    if(!order) {
      return {
        "result": null,
        "error": {
          "code": -31050,
          "message": {
            "ru": "Заказ не найден",
            "uz": "Zakaz mavjud emas",
            "en": "Order not found"
          },
          "data": "orderNotFound"
        },
        "id": body.id
      }
    }

    if(order.payment.payme.paystate === 1){
      return {
        "result": null,
        "error": {
          "code": -31060,
          "message": {
            "ru": "Another",
            "uz": "Zakaz to'lab bo'lingan",
            "en": "Order not accepted"
          },
          "data": "another"
        },
        "id": body.id
      }
    }

    if(order.payment.payme.paystate !== 0){
      return {
        "result": null,
        "error": {
          "code": -31050,
          "message": {
            "ru": "Заказ не доступен для оплаты",
            "uz": "Zakaz to'lab bo'lingan",
            "en": "Order not accepted"
          },
          "data": "payedorcanceled"
        },
        "id": body.id
      }
    }

    if(order.totalPrice !== Math.floor(body.params.amount / 100)) {
      return {
        "result": null,
        "error": {
          "code": -31001,
          "message": {
            "ru": "Суммы не совпадают",
            "uz": "Narxlar mos tushmayapti",
            "en": "Prices are not equal"
          },
          "data": "amount"
        },
        "id": body.id
      }
    }

    return {
      "error": null,
      "result": {
        "allow" : true
      }
    }
  }

  // @desc      Endpoint for Payme
	// @route     POST /api/v1/payme
	// @access    Public
  payme = asyncHandler(async (req, res, next) => {
    if(!req.headers.authorization){
      return res.status(200).send({
        "result": null,
        "error": {
          "code": -32504,
          "message": {
            "ru": "Неверная авторизация",
            "uz": "Avtorizatsiyada xatolik",
            "en": "Wrong Authorization",
          },
          "data": req.body.id,
          "id": req.body.id,
        }
      });
    }
    const hdr = Buffer.from(`${req.headers.authorization.split(' ')[1]}`,'base64').toString('ascii').split(':')[1]
    if(process.env.PAYME_MERCHANT_KEY !== hdr){
      return res.status(200).send({
        "result": null,
        "error": {
          "code": -32504,
          "message": {
            "ru": "Неверная авторизация",
            "uz": "Avtorizatsiyada xatolik",
            "en": "Wrong Authorization",
          },
          "data": req.body.id,
          "id": req.body.id,
        }
      });
    }

    const method = req.body.method
    if(method === 'CheckPerformTransaction') {
      const result = await this.checkPerformTransaction(req.body)
      return res.status(200).send(result)
    } else if(method === 'CreateTransaction'){
      let transaction = await Transaction.findOne({ paycom_id: req.body.params.id })
      let order = await Order.findById(req.body.params.account.order_id)
      const addTime = new Date().getTime()

      if(transaction){
        if(transaction.paycom_state === '1' && order.payment.payme.paystate === 1){
          if( (parseInt(new Date().getTime()) - parseInt(transaction.paycom_create_time)) / 1000 / 3600 < 12 ){
            return res.status(200).send({
              "error": null,
              "result": {
                "create_time": parseInt(transaction.paycom_create_time),
                "transaction": transaction.order_id,
                "state": 1
              },
              "id": req.body.id
            })
          }
          transaction.paycom_state = '-1'
          transaction.paycom_reason = 4
          await transaction.save()
          return res.status(200).send({
            "result": null,
            "error": {
              "code": -31008,
              "message": {
                "ru": "Состояния транзакции не соответствует",
                "uz": "Tranzaksiya holati mos emas",
                "en": "Unexpected transaction state"
              },
              "data": "unexpectedtrstate"
            },
            "id": req.body.id
          })
        }
        return res.status(200).send({
          "result": null,
          "error": {
            "code": -31008,
            "message": {
              "ru": "Состояния транзакции не соответствует",
              "uz": "Tranzaksiya holati mos emas",
              "en": "Unexpected transaction state"
            },
            "data": "unexpectedtrstate"
          },
          "id": req.body.id
        })
      }

      const result = await this.checkPerformTransaction(req.body)
      if(result.result){
        order.payment.payme.paystate = 1
        order.payment.payme.create_time = req.body.params.time
        await order.save()
        const newTrans = await Transaction.create({
          order_id: req.body.params.account.order_id,
          status: "waiting",
          pay_method: "payme",
          date_add: addTime,
          paycom_state: "1",
          paycom_create_time: req.body.params.time,
          paycom_id: req.body.params.id,
          amount: Math.floor(req.body.params.amount / 100)
        })
        return res.status(200).send({
          "error": null,
          "result": {
            "create_time": parseInt(newTrans.paycom_create_time),
            "transaction": newTrans.order_id,
            "state": 1
          },
          "id": req.body.id
        })
      }else{
        return res.status(200).send(result)
      }
      
    } else if(method === 'PerformTransaction'){
      const time = new Date().getTime()
      let transaction = await Transaction.findOne({ paycom_id: req.body.params.id })
      if(!transaction){
        return res.status(200).send({
          "error": {
            "code": -31003,
            "message": {
              "ru": 'Транзакция не найдена',
              "uz": 'Tranzaktsiya topilmadi',
              "en": 'Transaction not found'
            },
            "data": null
          },
          "result": null,
          "id": req.body.id
        })
      }else {
        if(transaction.paycom_state !== '1'){
          if(transaction.paycom_state !== '2'){
            return res.status(200).send({
              "result": null,
              "error": {
                "code": -31008,
                "message": {
                  "ru": "Невозможно выполнить данную операцию",
                  "uz": "Bu operatsiyani amalga oshirib bo'lmaydi",
                  "en": "Can not process this operation"
                }
              }
            })
          } else{
            return res.status(200).send({
              "error": null,
              "result": {
                "perform_time": parseInt(transaction.paycom_perform_time),
                "transaction": transaction.order_id,
                "state": 2
              },
              'id': req.body.id
            })
          }
        }else{
          if( ((time - transaction.paycom_create_time) / 1000 / 3600) > 12){
            transaction.paycom_reason = 4;
            transaction.paycom_state = -1;
            await transaction.save()
            return res.status(200).send({
              "result": null,
              "error": {
                "code": -31008,
                "message": {
                  "ru": "Невозможно выполнить данную операцию",
                  "uz": "Bu operatsiyani amalga oshirib bo'lmaydi",
                  "en": "Can not process this operation"
                }
              }
            })
          }else{
            transaction.status = 2
            transaction.paycom_state = 2
            transaction.paycom_perform_time = time
            await transaction.save()
            const order = await Order.findById(transaction.order_id)
            order.payment.isPaid = true
            order.payment.payme.paystate = 2
            order.status = 'confirm'
            await order.save()
            return res.status(200).send({
              "error": null,
              "result": {
                "perform_time": parseInt(transaction.paycom_perform_time),
                "transaction": transaction.order_id,
                "state": 2
              },
              "id": req.body.id
            })
          }
        }
      }
    } else if(method === 'CancelTransaction'){
      let transaction = await Transaction.findOne({ paycom_id: req.body.params.id })
      if(!transaction){
        return res.status(200).send({
          "error": {
            "code": -31003,
            "message": {
              "ru": 'Транзакция не найдена',
              "uz": 'Tranzaktsiya topilmadi',
              "en": 'Transaction not found'
            }
          },
          "result": null,
          "id": req.body.id
        })
      }else {
        let cancelTime = parseInt(new Date().getTime())
        if(transaction.paycom_state === '1'){
          transaction.paycom_state = -1
          transaction.paycom_reason = req.body.params.reason
          transaction.paycom_cancel_time  = cancelTime
          await transaction.save()
          console.log(transaction.paycom_cancel_time)
          return res.status(200).send({
            "error": null,
            "result": {
              "cancel_time": parseInt(transaction.paycom_cancel_time),
              "transaction": transaction.order_id,
              "state": -1,
            },
            "id": req.body.id
          })
        }else {
          if(transaction.paycom_state === '2'){
            transaction.paycom_state = -2
            transaction.paycom_reason = req.body.params.reason
            transaction.paycom_cancel_time  = cancelTime
            await transaction.save()
            let order = await Order.findById(transaction.order_id)
            order.status = 'canceled'
            await order.save()
            return res.status(200).send({
              "error": null,
              "result": {
                "cancel_time": parseInt(transaction.paycom_cancel_time),
                "transaction": transaction.order_id,
                "state": -2,
              },
              "id": req.body.id
            })
          }else{
            return res.status(200).send({
              "error": null,
              "result": {
                "cancel_time": parseInt(transaction.paycom_cancel_time),
                "transaction": transaction.order_id,
                "state": parseInt(transaction.paycom_state),
              },
              "id": req.body.id
            })
          }
        }
      }
    } else if(method === 'CheckTransaction'){
      let transaction = await Transaction.findOne({paycom_id: req.body.params.id})
      if(!transaction){
        return res.status(200).send({
          "error": {
            "code": -31003,
            "message": {
              "ru": 'Транзакция не найдена',
              "uz": 'Tranzaktsiya topilmadi',
              "en": 'Transaction not found'
            }
          },
          "result": null,
          "id": req.body.id
        })
      }else{
        let canceltime
        if(transaction.paycom_cancel_time){
          canceltime = parseInt(transaction.paycom_cancel_time)
        }else{
          canceltime = 0
        }
        return res.status(200).send({
          "error": null,
          "result": {
            'create_time': Math.floor(parseInt(transaction.paycom_create_time)),
            'perform_time': Math.floor(parseInt(transaction.paycom_perform_time)),
            'cancel_time': canceltime,
            'transaction': transaction.order_id,
            'state': parseInt(transaction.paycom_state),
            'reason': parseInt(transaction.paycom_reason)
          },
          "id": req.body.id
        })
      }
    } else if(method === 'GetStatement'){
      let transactions = await Transaction.find({
        paycom_create_time: {
          $gte: req.body.params.from,
          $lte: req.body.params.to
        }
      })
      return res.status(200).send({
        "result" : {
          "transactions": transactions
        }
      })
    }
  })


  // @desc      Endpoint for Click
	// @route     POST /api/v1/transaction/click/prepare
  // @access    Public
  clickPrepare = asyncHandler(async (req, res, next)=>{
    console.log(req.body);
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      amount,
      action,
      error,
      sign_time,
      sign_string
    } = req.body
    if(!merchant_trans_id || typeof(merchant_trans_id) !== "string" || merchant_trans_id.length !== 24){
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -5,
        error_note: 'Заказ не найден'
      })
    }
    const order = await Order.findById(merchant_trans_id)
    const orderArr = await Order.find({_id: merchant_trans_id})
    const signature = `${click_trans_id}${service_id}${process.env.CLICK_SECRET_KEY}${merchant_trans_id}${amount}${action}${sign_time}`
    const check_signat = crypto.createHash('md5').update(signature).digest("hex") === sign_string;
    const time = new Date().getTime()

    if(action !== '0'){
      console.log({
        error: '-3',
        error_note: 'Запрашиваемое действие не найдено'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: '-3',
        error_note: 'Запрашиваемое действие не найдено'
      })
    }

    if(!check_signat){
      console.log({
        error: -1,
        error_note: 'Ошибка проверки подписи'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -1,
        error_note: 'Ошибка проверки подписи'
      })
    }

    if(orderArr.length === 0){
      console.log({
        error: -5,
        error_note: 'Заказ не найден'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -5,
        error_note: 'Заказ не найден'
      })
    }

    if(amount.toString() !== order.totalPrice.toString()){
      console.log({
        error: -2,
        error_note: 'Неверная сумма оплаты'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -2,
        error_note: 'Неверная сумма оплаты'
      })
    }

    if(order.payment.click.paystate === 0){
      const newTransaction = await Transaction.create({
        paycom_id: click_trans_id,
        order_id: order._id,
        pay_method: 'click',
        paycom_state: '1',
        status: 'waiting',
        paycom_create_time: time,
        amount,
        click_prepare_confirm: time
      })
      order.payment.click.paystate = 1
      await order.save()
      console.log({
        click_trans_id: newTransaction.paycom_id,
        merchant_trans_id: order._id,
        merchant_prepare_id: newTransaction.click_prepare_confirm,
        error: 0,
        error_note: 'Success'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        click_trans_id: newTransaction.paycom_id,
        merchant_trans_id: order._id,
        merchant_prepare_id: newTransaction.click_prepare_confirm,
        error: 0,
        error_note: 'Success'
      });
    }
  })

  // @desc      Endpoint for Click
	// @route     POST /api/v1/transaction/click/complete
  // @access    Public
  clickComplete = asyncHandler(async (req, res, next)=>{
    console.log(req.body);
    const {
      click_trans_id,
      service_id,
      click_paydoc_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      error,
      sign_time,
      sign_string
    } = req.body
    // if(!merchant_trans_id || typeof(merchant_trans_id) !== "string" || merchant_trans_id.length !== 24){
    //   console.log({
    //     error: -6,
    //     error_note: 'Не найдена транзакция'
    //   })
    //   return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
    //     error: -6,
    //     error_note: 'Не найдена транзакция'
    //   })
    // }
    const order = await Order.findById(merchant_trans_id)
    const transaction = await Transaction.findOne({click_prepare_confirm: merchant_prepare_id})
    const signature = `${click_trans_id}${service_id}${process.env.CLICK_SECRET_KEY}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`
    const check_signat = crypto.createHash('md5').update(signature).digest("hex") === sign_string ;

    if(action !== '1'){
      console.log({
        error: -3,
        error_note: 'Запрашиваемое действие не найдено'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -3,
        error_note: 'Запрашиваемое действие не найдено'
      })
    }
    
    if(!check_signat){
      console.log({
        error: -1,
        error_note: 'Ошибка проверки подписи'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -1,
        error_note: 'Ошибка проверки подписи'
      })
    }

    if(!transaction){
      console.log({
        error: -6,
        error_note: 'Не найдена транзакция'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -6,
        error_note: 'Не найдена транзакция'
      })
    }

    if(amount.toString() !== transaction.amount.toString()){
      console.log({
        error: -2,
        error_note: 'Неверная сумма оплаты'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -2,
        error_note: 'Неверная сумма оплаты'
      })
    }

    if(transaction.paycom_state === '2'){
      console.log({
        error: -4,
        error_note: 'Транзакция ранее была подтверждена'
      })
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -4,
        error_note: 'Транзакция ранее была подтверждена'
      })
    }

    if(error === '-5017'){
      transaction.paycom_state = '-2'
      transaction.status = 'canceled'
      await transaction.save()
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -9,
        error_note: 'Нехватка средств'
      })
    }

    if(transaction.paycom_state === '-2'){
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        error: -9,
        error_note: 'Транзакция ранее была отменена'
      })
    }

    if(error === '0'){
      transaction.paycom_state = '2'
      transaction.paycom_perform_time = new Date().getTime()
      transaction.status = 'payed'
      order.payment.isPaid = true
      order.payment.click.paystate = 2
      order.status = 'confirm'
      await order.save()
      await transaction.save()
      return res.set({"headers":{ "Content-Type" : "application/x-www-form-urlencoded; charset=UTF-8" }}).send({
        click_trans_id: transaction.paycom_id,
        merchant_trans_id: order._id,
        merchant_confirm_id: transaction.click_prepare_confirm,
        error: 0,
        error_note: 'Success'
      });
    }
  })
}
