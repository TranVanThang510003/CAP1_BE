const express = require("express");
const sql = require("mssql");
const { connectToDB } = require("../../config/db");

const cancelOrder = async (req, res) => {
    const { bookingId } = req.params;

    if (!bookingId) {
        return res.status(400).json({ message: "Missing bookingId." });
    }

    let transaction;

    try {
        const pool = await connectToDB();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Kiểm tra đơn hàng tồn tại
        const checkOrderQuery = `
            SELECT Date, status 
            FROM TOUR_BOOKINGS
            WHERE booking_Id = @bookingId
        `;
        const orderResult = await transaction.request()
            .input("bookingId", sql.Int, bookingId)
            .query(checkOrderQuery);

        if (orderResult.recordset.length === 0) {
            return res.status(404).json({ message: "Order not found." });
        }

        const { departureDate, status } = orderResult.recordset[0];

        // Kiểm tra trạng thái đơn hàng
        if (status === "cancelled") {
            return res.status(400).json({ message: "Order has already been cancelled." });
        }

        if (status === "completed") {
            return res.status(400).json({ message: "Order has already been completed and cannot be cancelled." });
        }

        // Kiểm tra thời gian khởi hành
        const currentDate = new Date();
        const departure = new Date(departureDate);
        const timeDifference = departure - currentDate;
        const hoursDifference = timeDifference / (1000 * 60 * 60); // Chuyển sang giờ

        if (hoursDifference < 24) {
            return res.status(400).json({ message: "Cannot cancel the order within 24 hours of departure." });
        }

        // Hủy đơn hàng (cập nhật trạng thái thành "cancelled")
        const cancelOrderQuery = `
            UPDATE TOUR_BOOKINGS
            SET status = 'cancelled'
            WHERE booking_Id = @bookingId
        `;
        await transaction.request()
            .input("bookingId", sql.Int, bookingId)
            .query(cancelOrderQuery);

        await transaction.commit();

        res.status(200).json({ message: "Order cancelled successfully." });
    } catch (error) {
        console.error("Error cancelling order:", error);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: "An error occurred while cancelling the order.", error: error.message });
    }
};

module.exports = cancelOrder;
