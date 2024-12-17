const fs = require('fs');
const path = require('path');
const { scrapeTours, scrapeHotels, scrapeRestaurants } = require('../scraper/scraper.js');  // Import các hàm scraper

// Đảm bảo thư mục 'data' tồn tại
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Hàm ghi dữ liệu vào file JSON
async function saveDataToFile(fileName, data) {
    const filePath = path.join(dataDir, fileName);

    // Ghi dữ liệu vào file JSON
    try {
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`${fileName} saved successfully!`);
    } catch (err) {
        console.error('Error writing to file', err);
    }
}

// Hàm để thực hiện scraping và lưu dữ liệu vào các file
(async () => {
    try {
        console.log("Starting to scrape data...");

        // Lấy dữ liệu tour
        const tours = await scrapeTours();
        await saveDataToFile('tours.json', tours);

        // Lấy dữ liệu khách sạn
        const hotels = await scrapeHotels();
        await saveDataToFile('hotels.json', hotels);

        // Lấy dữ liệu nhà hàng
        const restaurants = await scrapeRestaurants();
        await saveDataToFile('restaurants.json', restaurants);

        console.log("Data scraping and saving complete!");
    } catch (err) {
        console.error('Error during scraping:', err);
    }
})();
