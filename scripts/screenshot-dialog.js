/**
 * Screenshot Dialog Script
 * 
 * Purpose: Automatically login and capture screenshots of CapPhepDialog
 * 
 * TROUBLESHOOTING TIPS:
 * 
 * 1. RATE LIMITING / LOGIN BLOCKED:
 *    - If login fails repeatedly, the server may have rate limiting enabled
 *    - Wait 5-10 minutes before trying again
 *    - Or restart the backend server to reset rate limit
 *    - Script now includes delays between attempts to avoid this
 * 
 * 2. LOGIN CREDENTIALS:
 *    - Default: admin / 123456
 *    - If credentials changed, update in the script below
 * 
 * 3. SERVER NOT RUNNING:
 *    - Ensure both frontend (localhost:5173) and backend are running
 *    - Check: npm run dev in client folder
 *    - Check: npm run dev in server folder
 * 
 * 4. NAVIGATION TIMEOUT:
 *    - Increase timeout values if network is slow
 *    - Current: 30000ms for page load, 8000ms for login redirect
 * 
 * 5. ELEMENT NOT FOUND:
 *    - UI selectors may have changed
 *    - Check browser DevTools for current selectors
 *    - Update selectors in script accordingly
 * 
 * 6. PUPPETEER ISSUES:
 *    - Ensure puppeteer is installed in chrome-devtools skill
 *    - Path: C:/Users/USER/.factory/skills/chrome-devtools/scripts/node_modules/puppeteer
 * 
 * Usage: node scripts/screenshot-dialog.js
 */

import puppeteer from 'file:///C:/Users/USER/.factory/skills/chrome-devtools/scripts/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Configuration - Edit these if needed
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  credentials: {
    username: 'admin',
    password: '123456'
  },
  timeouts: {
    pageLoad: 30000,
    loginRedirect: 8000,
    elementWait: 10000,
    rateLimitDelay: 3000,  // Delay before login to avoid rate limiting
    betweenActions: 500    // Delay between form actions
  },
  outputDir: 'E:/Github_Repos/Freelance_upcode/Quanlybenxe/docs/screenshots'
};

async function main() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Check if already logged in by going directly to dieu-do
    console.log('Checking if already logged in...');
    await page.goto(`${CONFIG.baseUrl}/dieu-do`, { waitUntil: 'networkidle2', timeout: CONFIG.timeouts.pageLoad });
    await sleep(2000);
    
    // If redirected to login, need to authenticate
    if (page.url().includes('login')) {
      console.log('Not logged in, waiting before login attempt (to avoid rate limit)...');
      await sleep(CONFIG.timeouts.rateLimitDelay);
      
      // Fill login form
      console.log(`Filling login form with username: ${CONFIG.credentials.username}...`);
      await page.waitForSelector('#usernameOrEmail', { timeout: CONFIG.timeouts.elementWait });
      
      // Clear any existing values first
      await page.click('#usernameOrEmail', { clickCount: 3 });
      await page.keyboard.type(CONFIG.credentials.username, { delay: 100 });
      
      await sleep(CONFIG.timeouts.betweenActions);
      
      await page.click('#password', { clickCount: 3 });
      await page.keyboard.type(CONFIG.credentials.password, { delay: 100 });
      
      await sleep(1000);
      
      // Click login button
      console.log('Clicking login...');
      await page.click('button[type="submit"]');
      
      // Wait longer for redirect (in case of rate limiting delay)
      await sleep(CONFIG.timeouts.loginRedirect);
      console.log('Current URL after login:', page.url());
      
      // If still on login page, check for errors
      if (page.url().includes('login')) {
        console.log('');
        console.log('⚠️  LOGIN FAILED - Possible causes:');
        console.log('   1. Rate limiting - Wait 5-10 minutes and try again');
        console.log('   2. Wrong credentials - Check CONFIG.credentials');
        console.log('   3. Backend not running - Start server with npm run dev');
        console.log('');
        
        const errorMsg = await page.evaluate(() => {
          const err = document.querySelector('[class*="error"], [class*="alert"], [class*="toast"], .text-red-500, .text-rose-500');
          return err ? err.textContent : 'No visible error message';
        });
        console.log('Error/Message from page:', errorMsg);
        
        // Take screenshot of login page to see what's happening
        await page.screenshot({ 
          path: `${CONFIG.outputDir}/login-error.png`,
          fullPage: true 
        });
        console.log('Saved login page screenshot to login-error.png');
        
        // Exit early since we can't proceed without login
        console.log('\nExiting due to login failure. Fix the issue and try again.');
        await browser.close();
        return;
      }
    } else {
      console.log('Already logged in!');
    }
    
    // Navigate to dieu-do page
    console.log('Navigating to dieu-do...');
    await page.goto(`${CONFIG.baseUrl}/dieu-do`, { waitUntil: 'networkidle2' });
    await sleep(5000); // Wait longer for data to load
    
    // Take screenshot of the page
    console.log('Taking page screenshot...');
    await page.screenshot({ 
      path: `${CONFIG.outputDir}/dieu-do-page.png`,
      fullPage: false 
    });
    
    // Click on the green "Cấp phép" button (emerald/green colored button on vehicle card)
    console.log('Looking for Cấp phép button (green/emerald)...');
    
    // The cấp phép button should be the emerald/green button on the card
    const clicked = await page.evaluate(() => {
      // Find emerald/green buttons (cấp phép) - they have bg-emerald class
      const emeraldButtons = document.querySelectorAll('button[class*="bg-emerald"], button[class*="bg-green"]');
      if (emeraldButtons.length > 0) {
        emeraldButtons[0].click();
        return 'emerald button clicked';
      }
      
      // Alternative: find by title or aria-label
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const title = btn.getAttribute('title')?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        if (title.includes('cấp phép') || title.includes('permit') || ariaLabel.includes('cấp phép')) {
          btn.click();
          return 'titled button clicked';
        }
      }
      
      return false;
    });
    
    console.log('Click result:', clicked);
    
    if (clicked) {
      console.log('Waiting for dialog...');
      await sleep(5000); // Wait longer for dialog to fully render
      
      // Take screenshot of dialog - full page
      console.log('Taking dialog screenshot (full page)...');
      await page.screenshot({ 
        path: `${CONFIG.outputDir}/cap-phep-dialog.png`,
        fullPage: true 
      });
      
      // Also scroll down and take another screenshot
      console.log('Scrolling down...');
      await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0');
        if (dialog) {
          dialog.scrollTop = dialog.scrollHeight;
        }
        window.scrollTo(0, document.body.scrollHeight);
      });
      await sleep(1000);
      
      console.log('Taking scrolled screenshot...');
      await page.screenshot({ 
        path: `${CONFIG.outputDir}/cap-phep-dialog-scrolled.png`,
        fullPage: true 
      });
    } else {
      console.log('No cấp phép button found');
    }
    
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

main();
