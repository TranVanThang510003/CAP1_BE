const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeHotels() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://www.klook.com/vi-VN/hotels/', { waitUntil: 'domcontentloaded' });

    const hotels = await page.evaluate(() => {
        const hotelList = [];
        const hotelElements = document.querySelectorAll('.hotel-item'); // Chỉnh sửa selector nếu cần
        hotelElements.forEach(hotel => {
            const name = hotel.querySelector('h3') ? hotel.querySelector('h3').textContent.trim() : '';
            const price = hotel.querySelector('.price') ? hotel.querySelector('.price').textContent.trim() : '';
            const location = hotel.querySelector('.location') ? hotel.querySelector('.location').textContent.trim() : '';
            hotelList.push({ name, price, location });
        });
        return hotelList;
    });

    await fs.promises.writeFile('./data/hotels.json', JSON.stringify(hotels, null, 2));

    console.log('Hotels data saved to hotels.json');
    await browser.close();
}

scrapeHotels();
