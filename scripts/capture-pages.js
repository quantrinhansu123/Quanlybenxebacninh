const puppeteer = require('C:/Users/USER/.factory/skills/chrome-devtools/scripts/node_modules/puppeteer');
const path = require('path');

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.join(__dirname, '../docs/screenshots');

async function capturePages() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Login
    console.log('Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Filling credentials...');
    await page.waitForSelector('#usernameOrEmail', { timeout: 10000 });
    await page.type('#usernameOrEmail', 'admin');
    await page.type('#password', '123456');
    
    console.log('Clicking login...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);
    
    console.log('Logged in, current URL:', page.url());
    await new Promise(r => setTimeout(r, 2000));
    
    // Capture Dashboard (Tổng quan)
    console.log('Capturing Tổng quan (Dashboard)...');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ 
      path: path.join(OUTPUT_DIR, 'dashboard.png'), 
      fullPage: true 
    });
    console.log('Saved dashboard.png');
    
    // Capture Điều độ
    console.log('Capturing Điều độ...');
    await page.goto(`${BASE_URL}/dieu-do`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ 
      path: path.join(OUTPUT_DIR, 'dieu-do.png'), 
      fullPage: true 
    });
    console.log('Saved dieu-do.png');
    
    // Capture Thanh toán
    console.log('Capturing Thanh toán...');
    await page.goto(`${BASE_URL}/thanh-toan`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ 
      path: path.join(OUTPUT_DIR, 'thanh-toan.png'), 
      fullPage: true 
    });
    console.log('Saved thanh-toan.png');
    
    console.log('All pages captured successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

capturePages();
