const axios = require('axios').default;
const CryptoJS = require('crypto-js');
const moment = require('moment-timezone');
const sql = require('mssql');
const bodyParser = require('body-parser');
const qs = require('qs');
const { connectToDB } = require('../config/db');
const express = require('express');

const config = {
  app_id: '2553',
  key1: 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
  key2: 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
  endpoint: 'https://sb-openapi.zalopay.vn/v2/create',
  query_endpoint: 'https://sb-openapi.zalopay.vn/v2/query', // Endpoint để kiểm tra trạng thái đơn hàng
};

function initPaymentRoutes(app) {
  app.use(bodyParser.json());

  // Route để tạo đơn hàng thanh toán
  app.post('/payment', async (req, res) => {
    const { tour_id, user_id, adults, children, total_price, service_date } =
      req.body;

    const embed_data = {
      redirecturl: 'http://localhost:5173/tours',
      service_date,
      tour_id,
      user_id,
      adults,
      children,
      total_price,
    };

    const items = [];
    const transID = Math.floor(Math.random() * 1000000);

    const order = {
      app_id: config.app_id,
      app_trans_id: `${moment().format('YYMMDD')}_${transID}`,
      app_user: 'user123',
      app_time: Date.now(),
      item: JSON.stringify(items),
      embed_data: JSON.stringify(embed_data),
      amount: parseInt(total_price),
      callback_url: 'https://6396-2402-800-6205-1e6b-9069-c805-4e0a-ab5e.ngrok-free.app/callback',
      description: `Payment for tour #${tour_id}`,
      bank_code: '',
    };
    console.log("Dữ liệu order:", order);

    const data = `${config.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    try {
      const result = await axios.post(config.endpoint, null, { params: order });
      console.log('ZaloPay response:', result.data);

      if (result.data.return_code === 1) {
        res.status(200).json(result.data);
      } else {
        console.log('Error from ZaloPay:', result.data);
        res
          .status(400)
          .json({ message: 'ZaloPay API error', details: result.data });
      }
    } catch (error) {
      console.log('Error creating payment:', error.message);
      res
        .status(500)
        .json({ message: 'Error creating payment', error: error.message });
    }
  });

  // Route callback để xử lý kết quả thanh toán từ ZaloPay
  async function checkOrderStatus(app_trans_id) {
    const postData = {
      app_id: config.app_id,
      app_trans_id,
    };

    const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    try {
      const result = await axios.post(
        config.query_endpoint,
        qs.stringify(postData),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      console.log('Order status from ZaloPay:', result.data); // Log chi tiết để kiểm tra `return_code`
      return result.data;
    } catch (error) {
      console.log('Error checking order status:', error.message);
      return { return_code: -1, return_message: error.message };
    }
  }

  app.post('/callback', async (req, res) => {
    let result = {};
    console.log('Callback received:', req.body);

    try {
      const dataStr = req.body.data;
      const reqMac = req.body.mac;
      const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

      if (reqMac !== mac) {
        result.return_code = -1;
        result.return_message = 'MAC không khớp';
        console.log('MAC validation failed');
      } else {
        const dataJson = JSON.parse(dataStr);
        const appTransId = dataJson['app_trans_id'];

        // Gọi hàm checkOrderStatus để lấy trạng thái thực tế từ ZaloPay
        const statusResult = await checkOrderStatus(appTransId);

        // Thêm log chi tiết cho từng trạng thái
        let status;
        if (statusResult.return_code === 1) {
          status = 'success';
        } else if (statusResult.return_code === 2) {
          status = 'failed';
        } else {
          status = 'processing';
        }

        console.log(
          'Determined transaction status from checkOrderStatus:',
          status
        );

        // Cập nhật thông tin giao dịch vào cơ sở dữ liệu
        const pool = await connectToDB();
        const serviceDateStr = JSON.parse(dataJson.embed_data).service_date;
        const serviceDate = new Date(serviceDateStr); // Dùng trực tiếp ngày từ callback

        const tourId = JSON.parse(dataJson.embed_data).tour_id;
        const userId = JSON.parse(dataJson.embed_data).user_id;
        const adults = JSON.parse(dataJson.embed_data).adults;
        const children = JSON.parse(dataJson.embed_data).children;
        const totalPrice = JSON.parse(dataJson.embed_data).total_price;

        const insertBookingQuery = `
          INSERT INTO TOUR_BOOKINGS (TOUR_ID, USER_ID, DATE, ADULT_COUNT, CHILD_COUNT, TOTAL_PRICE, STATUS, CREATED_AT, DESCRIPTION)
          VALUES (@tourID, @userID, @bookingDate, @adultCount, @childCount, @totalPrice, @status, GETDATE(), @description)
        `;

        await pool
          .request()
          .input('tourID', sql.Int, tourId)
          .input('userID', sql.Int, userId)
          .input('bookingDate', sql.DateTime, serviceDate)
          .input('adultCount', sql.Int, adults)
          .input('childCount', sql.Int, children)
          .input('totalPrice', sql.Decimal(18, 2), totalPrice)
          .input('status', sql.NVarChar, status)
          .input(
            'description',
            sql.NVarChar,
            `Payment for order TourID #${tourId}`
          )
          .query(insertBookingQuery);

        console.log('Booking successfully updated with status:', status);

        result.return_code = 1;
        result.return_message = 'Callback processed successfully';
      }
    } catch (ex) {
      console.log('Error processing callback:', ex.message);
      result.return_code = 0;
      result.return_message = ex.message;
    }

    console.log('Callback response sent to ZaloPay:', result);
    res.json(result);
  });

  // Route kiểm tra trạng thái đơn hàng
  app.post('/check-status-order', async (req, res) => {
    const { app_trans_id } = req.body;

    const postData = {
      app_id: config.app_id,
      app_trans_id,
    };

    const data = `${postData.app_id}|${postData.app_trans_id}|${config.key1}`;
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    try {
      const result = await axios.post(
        config.query_endpoint,
        qs.stringify(postData),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      console.log('Order status:', result.data);

      if (result.data.return_code === 1) {
        res.status(200).json({ status: 'success', data: result.data });
      } else if (result.data.return_code === 2) {
        res.status(200).json({ status: 'failed', data: result.data });
      } else {
        res.status(200).json({ status: 'processing', data: result.data });
      }
    } catch (error) {
      console.log('Error checking order status:', error.message);
      res
        .status(500)
        .json({ message: 'Error checking order status', error: error.message });
    }
  });
}

module.exports = initPaymentRoutes;
