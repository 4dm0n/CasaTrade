const {chromium}=require('C:/Users/david/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/'));
 await page.waitForTimeout(15000);
 await page.locator('#tab-agent-chat-panel').click();
 await page.locator('#tab-history-panel').click();
 if(await page.locator('.workspace-panel:visible').count()!==1)throw Error('Panels overlap');
 await page.locator('#tab-config-widget').click();
 await page.locator('#auto-mode').click();
 await page.locator('#tab-analysis-panel').click();
 await page.locator('#analyze-now').click();
 const feed=await page.evaluate(()=>({
   status:discoveryStatus,
   markets:[...marketBook.values()].map(m=>({symbol:m.symbol,types:m.types,source:m.source,ticks:m.digits.length,status:m.status})),
   connected:websocketConnected
 }));
 console.log(JSON.stringify({feed}));
 await page.screenshot({path:path.resolve(__dirname,'desktop.png')});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(500);
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');
 await page.screenshot({path:path.resolve(__dirname,'mobile.png'),fullPage:true});
 console.log(JSON.stringify({errors,feedback:await page.locator('#action-feedback').textContent()}));
 await browser.close();
 if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
