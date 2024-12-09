const request = require('request');
const fs = require('fs');
const { Parser } = require('json2csv');

// Hàm để thêm dữ liệu từ một locationId và trang vào file CSV
function appendHotelDataToCSV(locationId, pageNumber) {
  const options = {
    method: 'GET',
    url: 'https://tripadvisor16.p.rapidapi.com/api/v1/hotels/searchHotels',
    qs: {
      locationId: locationId,
      pageNumber: pageNumber,
      currencyCode: 'USD', // Sử dụng đồng tiền USD
      checkIn: '2024-12-01', // Ngày check-in giả định
      checkOut: '2024-12-05' // Ngày check-out giả định
      
    },
    headers: {
      'x-rapidapi-key': '761b67e2e5mshe502d72ad98d2a6p136e22jsnd8e3d3e83334',
      'x-rapidapi-host': 'tripadvisor16.p.rapidapi.com'
    }
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    console.log('HTTP Status Code:', response && response.statusCode);
    if (response.statusCode !== 200) {
      console.error('Failed to fetch data, HTTP status code:', response.statusCode);
      return;
    }

    try {
      console.log('Response Body:', body); // In response để kiểm tra nội dung
      const data = JSON.parse(body);
      const hotels = data.data && data.data.data;

      if (hotels && hotels.length > 0) {
        fs.readFile('hotels.csv', 'utf8', (err, fileData) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Failed to read CSV file', err);
            return;
          }

          let csvData = '';
          const json2csvParser = new Parser();

          // Nếu file CSV không tồn tại, tạo dữ liệu mới
          if (err && err.code === 'ENOENT') {
            csvData = json2csvParser.parse(hotels);
          } else {
            // Nếu file đã có dữ liệu, chuyển dữ liệu cũ thành JSON
            const existingData = fileData ? parseCSVtoJson(fileData) : [];

            // Thêm dữ liệu mới vào dữ liệu hiện có
            const updatedData = existingData.concat(hotels);

            // Chuyển dữ liệu tổng hợp thành CSV
            csvData = json2csvParser.parse(updatedData);
          }

          // Ghi lại dữ liệu vào file CSV
          fs.writeFile('hotels.csv', csvData, (writeErr) => {
            if (writeErr) {
              console.error('Failed to write data to CSV file', writeErr);
            } else {
              console.log('Hotel data successfully written to CSV file.');
            }
          });
        });
      } else {
        console.log('No hotel data available to save.');
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
    }
  });
}

// Hàm để chuyển đổi dữ liệu CSV thành JSON
function parseCSVtoJson(csvString) {
  const lines = csvString.split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index];
    });
    return obj;
  });
}

// Sử dụng hàm để thêm dữ liệu từ các trang khác nhau
appendHotelDataToCSV('293924', '1'); // Hà Nội - Trang 1
appendHotelDataToCSV('293925', '1'); // Hồ Chí Minh - Trang 1
appendHotelDataToCSV('298085', '2'); // Đà Nẵng - Trang 2
