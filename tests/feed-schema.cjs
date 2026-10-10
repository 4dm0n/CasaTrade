const ws=new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public');
const timer=setTimeout(()=>ws.close(),12000);
ws.addEventListener('open',()=>ws.send(JSON.stringify({active_symbols:'brief'})));
ws.addEventListener('message',event=>{
 const data=JSON.parse(event.data);
 if(data.error)console.log(JSON.stringify(data));
 if(data.active_symbols){
  console.log(JSON.stringify({sample:data.active_symbols.filter(m=>JSON.stringify(m).includes('Volatility')).slice(0,2)}));
  ws.send(JSON.stringify({contracts_for:'R_10'}));
  ws.send(JSON.stringify({ticks_history:'R_10',count:100,end:'latest',style:'ticks',subscribe:1}));
 }
 if(data.contracts_for)console.log(JSON.stringify({echo:data.echo_req,contracts:data.contracts_for.available.filter(c=>c.contract_type.includes('DIGIT')).slice(0,4)}));
 if(data.history)console.log(JSON.stringify({historyKeys:Object.keys(data.history),echo:data.echo_req,prices:data.history.prices.slice(-3),times:data.history.times.slice(-3),pip_size:data.pip_size}));
 if(data.tick){console.log(JSON.stringify(data));clearTimeout(timer);setTimeout(()=>ws.close(),1000);}
});
ws.addEventListener('error',e=>console.log(e.message));
