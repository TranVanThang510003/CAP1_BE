const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeTours() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://www.klook.com/vi-VN/', { waitUntil: 'domcontentloaded' });

    const tours = await page.evaluate(() => {
        const tourList = [];
        const tourElements = document.querySelectorAll('div.card-item'); // Chỉnh sửa selector nếu cần
        tourElements.forEach(tour => {
            const name = tour.querySelector('h3.tour-name') ? tour.querySelector('h3.tour-name').textContent.trim() : '';
            const price = tour.querySelector('.price') ? tour.querySelector('.price').textContent.trim() : '';
            const location = tour.querySelector('.location') ? tour.querySelector('.location').textContent.trim() : '';
            tourList.push({ name, price, location });
        });
        return tourList;
    });

    await fs.promises.writeFile('./data/tours.json', JSON.stringify(tours, null, 2));

    console.log('Tours data saved to tours.json');
    await browser.close();
}

scrapeTours();
