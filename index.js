const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const db = require("./conn-hunter-mail");
const https = require('https');

async function savePsiScoreByDomainName(domain,ID) {
  const browser = await puppeteer.launch({headless:true});
  try {    
    const page = await browser.newPage();
    await page.goto('https://developers.google.com/speed/pagespeed/insights/');
    await page.type('input[name="url"]', `https://${domain}/`);
    await page.keyboard.press('Enter');
    await page.waitForSelector('div.lh-gauge__percentage', { timeout: 60000 }); 
    await page.waitForTimeout(10000); 
    await page.evaluate(() => {
      const sectionToScroll = document.querySelector('div.PePDG[jsname="X5Aehb"] .lh-container');
      if (sectionToScroll) {
        window.scrollTo(0, sectionToScroll.getBoundingClientRect().top + window.scrollY);
      } else {
        console.error('Section not found. Check your selector.');
            }
    });
    await page.waitForTimeout(10000);
    await page.click('button[jsname="yfXuWd"]');
    await page.setViewport({
      width: 1200, 
      height: 800, 
    });
    const screenshot = await page.screenshot();
    const psiScore = await page.$eval('div.lh-gauge__percentage', (element) => {
      return element.textContent;
    });
    console.log(`Google PSI Score for ${domain}:`, psiScore);
    const currentURL = await page.evaluate(() => {
      return window.location.href;
    });
  
    console.log('Report url:', currentURL);
    const baseFolderPath = 'score';
    const currentMonth = format(new Date(), 'MM'); 
    const currentYear = format(new Date(), 'yyyy');
    const folderPath = path.join(baseFolderPath, currentMonth);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const screenshotFileName = `${domain}_${psiScore}.png`;
    const screenshotFilePath = path.join(folderPath, screenshotFileName);
    fs.writeFileSync(screenshotFilePath, screenshot);
    const imageBuffer = fs.readFileSync(screenshotFilePath);
    // Define the request options
    const options = {
      method: 'POST',
      hostname: 'businesswithseo.com',
      path: `/website-score-images/save-image.php?image_name=${domain}&id=${ID}`,
      headers: {
        'Content-Type': 'image/png', // Adjust the content type based on your image type
        'Content-Length': imageBuffer.length.toString(),
      },
    };
    // Create an HTTPS request
    const request = https.request(options, (response) => {
      let responseData = '';
      response.on('data', (chunk) => {
        responseData += chunk;
      });
      response.on('end', () => {
        console.log('Server Response:', responseData);
      });
    });
    // Handle request errors
    request.on('error', (error) => {
      console.error('An error occurred while making the request:', error);
    });
    // Send the image data in the request body
    request.write(imageBuffer);
    request.end();  
    
    
    const [updateResult] = await db.query(`UPDATE speed_optimization_service SET psi_score = "${psiScore}", psi_screenshot_path="https://businesswithseo.com/website-score-images/uploads/${currentYear}/${currentMonth}/${domain}.png" ,psi_report_url= "${currentURL}" , psi_curl=1  WHERE ID=${ID};`);
    
  } catch (error) {
    const [updateResult] = await db.query(`UPDATE speed_optimization_service SET  psi_curl=1  WHERE ID=${ID};`);
    console.error(`An error occurred for ${domain}:`, error);
  } finally{
    await browser.close();
  }
}
async function save() {
  console.log('----FFF----');
  try {
    const [rows] = await db.query("SELECT * FROM speed_optimization_service WHERE psi_curl =0 LIMIT 100");
    for (const element of rows) {
      console.log(element.url + '----ID---'+element.ID);
      await savePsiScoreByDomainName(element.url, element.ID);
    }
    console.log("---All records updated successfully---");
  } catch (err) {
    console.error(err);
  }
}
save();

