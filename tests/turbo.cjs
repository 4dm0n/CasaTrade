const {chromium}=require('C:/Users/david/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/'));
  await page.waitForFunction(()=>typeof people!=='undefined'&&people.length===8);
  await page.evaluate(()=>{
   ++feedGeneration;clearInterval(marketWatchdog);clearInterval(fallbackTimer);clearTimeout(marketReconnect);
   if(marketSocket){marketSocket.onclose=null;marketSocket.close();}
   marketBook.clear();
   const market=ensureMarket('R_10','Volatility 10');
   market.types=['OVER','UNDER'];market.source='live';market.lastTickAt=Date.now();
   market.digits=Array(30).fill(9);market.prices=Array(30).fill(6452.19);market.sequence=30;
   globalOrder='work';renderAnalysis();
  });
  await page.locator('#tab-config-widget').click();
  await page.locator('#turbo-mode').click();
  assert.equal(await page.locator('#sample-size').textContent(),'30/30');
  assert.equal(await page.locator('#manual-contract-fields').evaluate(el=>el.disabled),true);
  assert.match(await page.locator('#selection-reason').textContent(),/30 ticks/);
  await page.locator('#tab-analysis-panel').click();
  await page.locator('#analyze-now').click();
  assert.equal(await page.evaluate(()=>pendingTrade?.mode),'turbo');
  assert.equal(await page.evaluate(()=>pendingTrade?.frequency),100);
  await page.locator('#analyze-now').click();
  assert.match(await page.locator('#action-feedback').textContent(),/Ya hay un trade esperando/);
  await page.evaluate(()=>receiveTick(6452.18,2,'live','R_10','turbo-test-tick'));
  assert.equal(await page.evaluate(()=>pendingTrade),null);
  assert.match(await page.evaluate(()=>tradeHistory[0].agent),/Turbo/);
  assert.equal(await page.evaluate(()=>tradeHistory.length),1);
  await page.locator('#tab-agent-chat-panel').click();
  assert.equal(await page.locator('#chat-messages-container .chat-message').count(),5);
  assert.equal(await page.locator('#chat-messages-container').getAttribute('role'),'log');
  await page.locator('#tab-history-panel').click();
  assert.equal(await page.locator('.workspace-panel:not([hidden])').count(),1);
  assert.deepEqual(errors,[]);
  console.log('Turbo 30-tick selection, one-pending-trade rule, next-tick settlement, chat and tabs passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
