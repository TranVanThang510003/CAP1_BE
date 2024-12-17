const puppeteer = require('puppeteer');
const fs = require('fs');

// Hàm Scrape chung cho tất cả các loại
async function scrapeData(url, selector, fileName) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const data = await page.evaluate((selector) => {
        const itemList = [];
        const elements = document.querySelectorAll(selector); // Selector chung cho tất cả các loại

        elements.forEach(item => {
            const name = item.querySelector('h3') ? item.querySelector('h3').textContent.trim() : '';
            const price = item.querySelector('.price') ? item.querySelector('.price').textContent.trim() : '';
            const location = item.querySelector('.location') ? item.querySelector('.location').textContent.trim() : '';
            itemList.push({ name, price, location });
        });

        return itemList;
    }, selector);

    await fs.promises.writeFile(`./data/${fileName}.json`, JSON.stringify(data, null, 2));
    console.log(`${fileName} data saved to ${fileName}.json`);

    await browser.close();
}

// Gọi các scraper với URL và selector riêng biệt
async function scrapeTours() {
    await scrapeData('https://www.klook.com/vi-VN/', 'div.card-item', 'tours');
}

async function scrapeHotels() {
    await scrapeData('https://www.klook.com/vi-VN/hotels/', '.hotel-item', 'hotels');
}

async function scrapeRestaurants() {
    await scrapeData('https://www.klook.com/vi-VN/restaurants/', '.restaurant-item', 'restaurants');
}

// Chạy các scraper
(async () => {
    await scrapeTours();
    await scrapeHotels();
    await scrapeRestaurants();
})();
