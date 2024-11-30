const express = require("express");
const router = express.Router();
const {
    getTotalRevenueInYear,
    getTotalTourAndHotelInYear,
    getTotalRevenueInYearforStaff,
    getReportforStaff,
    manageTransaction,
    deleteTransaction
} = require("../controllers/dashboardController");


//Dashboard
router.get("/dashboard/admin/totalrevenue/:year", getTotalRevenueInYear);
router.get("/dashboard/admin/totaltourandhotel/:year", getTotalTourAndHotelInYear);
router.get("/dashboard/staff/totalrevenue/:year", getTotalRevenueInYearforStaff);
router.get("/dashboard/staff/totaltourandhotel/:year", getReportforStaff);
router.get("/dashboard/managetransaction", manageTransaction);//khong phai dashboard ma day la transactio
router.delete("/dashboard/deletetransaction/:id", deleteTransaction);//Xoa transaction

module.exports = router;