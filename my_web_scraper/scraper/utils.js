const fs = require('fs');

// Hàm giúp lưu dữ liệu vào file JSON
function saveDataToFile(fileName, data) {
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
}

module.exports = { saveDataToFile };
