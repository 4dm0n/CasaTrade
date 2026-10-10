const {chromium}=require('C:/Users/david/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
   window.feedRequests=[];
   window.WebSocket=class {
     constructor(){this.readyState=1;setTimeout(()=>this.onopen?.(),0);}
     send(raw){const req=JSON.parse(raw);window.feedRequests.push(req);
       const emit=data=>setTimeout(()=>this.onmessage?.({data:JSON.stringify({...data,echo_req:req})}),0);
       if(req.active_symbols)emit({active_symbols:[{underlying_symbol:'R_10',underlying_symbol_name:'Volatility 10',pip_size:0.01},{underlying_symbol:'R_25',underlying_symbol_name:'Volatility 25',pip_size:0.01},{underlying_symbol:'1HZ100V',underlying_symbol_name:'Volatility 100 (1s)',pip_size:0.01},{symbol:'EURUSD',display_name:'Forex'}]});
       if(req.contracts_for)emit({contracts_for:{available:[{contract_type:'DIGITOVER',min_contract_duration:'1t'},{contract_type:'DIGITUNDER',min_contract_duration:'1t'}]}});
       if(req.ticks_history){emit({history:{prices:Array(100).fill(100.01),times:Array(100).fill(1)},pip_size:2});emit({tick:{symbol:req.ticks_history,quote:100.09,pip_size:2,epoch:2}});}
     }
     close(){this.readyState=3;this.onclose?.();}
   };
 });
 await page.goto('file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/'));
 await page.waitForFunction(()=>typeof marketBook!=='undefined'&&marketBook.size===3&&marketBook.get('1HZ100V').digits.length>0);
 await page.evaluate(()=>{clearInterval(marketWatchdog);clearInterval(fallbackTimer);clearTimeout(marketReconnect);});
 assert.deepEqual(await page.evaluate(()=>window.feedRequests.filter(r=>r.ticks_history).map(r=>r.ticks_history).sort()),['1HZ100V','R_10','R_25']);
 await page.locator('#tab-agent-chat-panel').click();
 await page.locator('#tab-history-panel').click();
 assert.equal(await page.locator('.workspace-panel:visible').count(),1);
 await page.locator('#tab-config-widget').click();
 assert.equal(await page.locator('#balance-editor').isVisible(),false);
 assert.equal(await page.evaluate(()=>currentBalance),10000);
 await page.locator('#balance-value').click();
 assert.equal(await page.locator('#balance-editor').isVisible(),false);
 await page.locator('#balance-value').dblclick();
 assert.equal(await page.locator('#balance-editor').isVisible(),false);
 await page.locator('#balance-value').click({clickCount:3});
 assert.equal(await page.locator('#balance-editor').isVisible(),true);
 await page.locator('#input-balance').fill('12000');
 await page.locator('#input-balance').press('Enter');
 assert.equal(await page.evaluate(()=>currentBalance),12000);
 assert.equal(await page.locator('#balance-editor').isVisible(),false);
 await page.locator('#input-martingale').fill('25');
 assert.equal(await page.locator('#input-martingale').inputValue(),'10');
 await page.locator('#input-martingale').fill('2');
 await page.locator('#contract-digit').selectOption('2');
 console.log(await page.evaluate(()=>{
    const check=(ok,label)=>{if(!ok)throw Error(label);};
    const seed=(symbol,digit,count=100)=>{
      const m=ensureMarket(symbol);m.digits=[];m.prices=[];
      for(let i=0;i<count;i++)receiveTick(100+digit/100,2,'live',symbol);
    };
    seed('R_10',9);seed('R_25',0);seed('1HZ100V',0);
    recordTradeOperation();
    check(pendingTrade.contract==='OVER'&&pendingTrade.target===2&&pendingTrade.symbol==='R_10','Manual filter not preserved');
    const before=currentBalance;
    receiveTick(100.09,2,'live','R_25');
    check(!!pendingTrade&&currentBalance===before,'Wrong market settled trade');
    receiveTick(100.02,2,'live','R_10');
    check(!tradeHistory[0].isWon&&currentBalance===before-10,'Equality must lose');
    check(nextTradeStake()===20,'First loss must double');
    recordTradeOperation();receiveTick(100.01,2,'live','R_10');
    check(tradeHistory[0].stake===20&&nextTradeStake()===40,'Second loss must double');
    recordTradeOperation();receiveTick(100.09,2,'live','R_10');
    check(tradeHistory[0].isWon&&tradeHistory[0].stake===40&&nextTradeStake()===10,'Win must reset');
    check(document.getElementById('display-pnl').textContent.includes('15.71'),'PnL must match rounded trades');
    document.getElementById('contract-type').value='UNDER';
    document.getElementById('contract-digit').value='7';seed('R_10',1);
    recordTradeOperation();check(pendingTrade.contract==='UNDER'&&pendingTrade.target===7,'Under not preserved');
    receiveTick(100.07,2,'live','R_10');check(!tradeHistory[0].isWon,'Under equality must lose');
    recordTradeOperation();setGlobalOrder('rest_all');check(!pendingTrade,'Pause must cancel pending');
    setGlobalOrder('work');currentBalance=1;
    recordTradeOperation();check(!pendingTrade,'Insufficient balance must block');
    currentBalance=12000;document.getElementById('input-confidence').value=99;updateConfidenceValue();
    seed('R_10',1,30);seed('R_25',9,99);seed('1HZ100V',0,100);
    setTradingMode('auto');recordTradeOperation();
    check(pendingTrade?.symbol==='1HZ100V'&&pendingTrade.contract==='UNDER','Automatic 1s market selection');
    receiveTick(100.09,2,'live','R_25');check(pendingTrade?.symbol==='1HZ100V','Automatic must await its own tick');
    receiveTick(100.00,2,'live','1HZ100V');check(tradeHistory[0].symbol==='1HZ100V','Automatic settlement provenance');
    marketBook.get('1HZ100V').source='demo';marketBook.get('R_25').lastTickAt=Date.now()-6000;
    recordTradeOperation();check(!pendingTrade,'No valid live candidate must block');
    check(document.getElementById('sample-size').textContent!=='0/100','Monitoring must show ticks without a qualified candidate');
    setTradingMode('manual');check(manualSelection().contract==='UNDER'&&manualSelection().target===7,'Manual selection lost');
    seed('R_10',1,100);recordTradeOperation();
    check(!!pendingTrade,'Manual trade should prepare');
    const unchangedBalance=currentBalance;
    receiveTick(100.01,2,'demo','R_10');
    check(!pendingTrade&&currentBalance===unchangedBalance,'Source switch must cancel, never settle');
    seed('R_10',1,100);marketBook.get('R_10').types=['OVER'];recordTradeOperation();
    check(!pendingTrade,'Unsupported contract must block');marketBook.get('R_10').types=['OVER','UNDER'];
    receiveTick(100.01,2,'live','R_10','duplicate');recordTradeOperation();
    receiveTick(100.01,2,'live','R_10','duplicate');check(!!pendingTrade,'Duplicate tick must not settle');
    pendingTrade=null;
    openTab('invoice-modal');check(!document.getElementById('invoice-modal').hidden,'Receipt missing');closeInvoiceModal();
    resetSimulation();check(tradeHistory.length===0&&currentBalance===10000&&martingaleFactor===1&&lossStreak===0,'Reset incomplete');
    check(document.getElementById('history-winrate').textContent==='—'&&document.getElementById('history-pnl').textContent==='$0.00','Empty history summary');
    seed('R_10',9);recordTradeOperation();receiveTick(100.01,2,'live','R_10');
    recordTradeOperation();receiveTick(100.09,2,'live','R_10');
    check(document.getElementById('history-winrate').textContent==='50.0%'&&document.getElementById('history-wins').textContent==='1'&&document.getElementById('history-losses').textContent==='1'&&document.getElementById('history-pnl').textContent==='+$11.67','History summary after win and loss');
    setGlobalOrder('rest_all');openTab('config-widget');
    return 'Discovery, triple click, manual Over/Under, market isolation, PnL, martingale, balance guard, automatic 1s selection, stale/demo exclusion, receipt and reset passed';
 }));
 await page.screenshot({path:path.resolve(__dirname,'contract-desktop.png')});
 await page.locator('#balance-value').click({clickCount:3});
 await page.locator('#input-balance').fill('15000');await page.locator('#input-balance').press('Enter');
 assert.equal(await page.locator('#display-pnl').textContent(),'+$11.67');
 assert.equal(await page.locator('#history-pnl').textContent(),'+$11.67');
 await page.locator('#tab-history-panel').click();
 await page.screenshot({path:path.resolve(__dirname,'history-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.resolve(__dirname,'contract-mobile.png'),fullPage:true});
 await page.locator('#tab-analysis-panel').click();
 await page.screenshot({path:path.resolve(__dirname,'analysis-mobile.png'),fullPage:true});
 console.log(JSON.stringify({errors}));assert.deepEqual(errors,[]);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
