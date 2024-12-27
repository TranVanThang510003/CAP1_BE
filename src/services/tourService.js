const { connectToDB } = require('../config/db');
const sql = require('mssql');

const getTour = async (filters) => {
  const { tourTypeId, startDate, endDate, minPrice, maxPrice, serviceType, province } = filters;

  const pool = await connectToDB();
  const query = `
    SELECT 
        t.TOUR_ID,
        t.TOUR_NAME,
        t.DESCRIPTION,
        t.PROVINCE,
        t.service_type,
        ts.PRICE_ADULT,
        ts.PRICE_CHILD,
        ts.DEPARTURE_DATE,
        ts.END_DATE
    FROM dbo.TOUR t
    INNER JOIN dbo.TOUR_SCHEDULE ts ON t.TOUR_ID = ts.TOUR_ID
    WHERE 
        t.TOUR_TYPE_ID = @TourTypeId AND
        ts.DEPARTURE_DATE >= @StartDate AND
        ts.DEPARTURE_DATE <= @EndDate AND
        ts.PRICE_ADULT BETWEEN @MinPrice AND @MaxPrice AND
        t.service_type = @ServiceType AND
        t.PROVINCE = @Province
    ORDER BY ts.DEPARTURE_DATE ASC;
  `;

  try {
    const request = pool.request();
    request.input('TourTypeId', sql.Int, tourTypeId);
    request.input('StartDate', sql.Date, startDate);
    request.input('EndDate', sql.Date, endDate);
    request.input('MinPrice', sql.Float, minPrice);
    request.input('MaxPrice', sql.Float, maxPrice);
    request.input('ServiceType', sql.NVarChar, serviceType);
    request.input('Province', sql.NVarChar, province);

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('Error fetching filtered tours:', error);
    throw new Error('Error fetching filtered tours');
  }
}

module.exports = { getTour };
