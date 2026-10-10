// Read-only public market-data diagnostic. No authorization or buy requests.
const endpoints=[
 'wss://api.derivws.com/trading/v1/options/ws/public',
 'wss://ws.derivws.com/websockets/v3?app_id=1089',
 'wss://ws.binaryws.com/websockets/v3?app_id=1089'
];
Promise.all(endpoints.map(url=>new Promise(resolve=>{
 const ws=new WebSocket(url);
 const timer=setTimeout(()=>{ws.close();resolve({url,status:'timeout'});},10000);
 ws.addEventListener('open',()=>ws.send(JSON.stringify({active_symbols:'brief'})));
 ws.addEventListener('message',event=>{
  const data=JSON.parse(event.data);clearTimeout(timer);ws.close();
  resolve({url,status:data.error?'api-error':'ok',error:data.error,symbols:data.active_symbols?.length});
 });
 ws.addEventListener('error',event=>{clearTimeout(timer);resolve({url,status:'connection-error',message:event.message});});
}))).then(results=>console.log(JSON.stringify(results)));
