const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeRestaurants() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://www.klook.com/vi-VN/restaurants/', { waitUntil: 'domcontentloaded' });

    const restaurants = await page.evaluate(() => {
        const restaurantList = [];
        const restaurantElements = document.querySelectorAll('.restaurant-item'); // Chỉnh sửa selector nếu cần
        restaurantElements.forEach(restaurant => {
            const name = restaurant.querySelector('h3') ? restaurant.querySelector('h3').textContent.trim() : '';
            const price = restaurant.querySelector('.price') ? restaurant.querySelector('.price').textContent.trim() : '';
            const location = restaurant.querySelector('.location') ? restaurant.querySelector('.location').textContent.trim() : '';
            restaurantList.push({ name, price, location });
        });
        return restaurantList;
    });

    await fs.promises.writeFile('./data/restaurants.json', JSON.stringify(restaurants, null, 2));

    console.log('Restaurants data saved to restaurants.json');
    await browser.close();
}

scrapeRestaurants();
