(async function(){
'use strict';
var status=document.getElementById('status'), progress=document.getElementById('progress');
function done(id,value){document.getElementById('startup-'+id).classList.add('done');progress.value=value;}
async function query(sql){
var timer;
try{return await Promise.race([window.db.exec(sql,'get'),new Promise(function(_,reject){timer=setTimeout(function(){reject(Error('A base de dados demorou demasiado a responder. Feche e volte a abrir a aplicação ou tente novamente.'));},15000);})]);}
finally{clearTimeout(timer);}
}
try{
for(var n=0;!window.db||typeof window.db.exec!=='function';n++){if(n>=150)throw Error('Não foi possível ligar à base de dados.');await new Promise(function(r){setTimeout(r,100);});}
await query('SELECT 1 AS connected');done('db',1);
status.textContent='A verificar as perguntas instaladas…';
var rows=await query('SELECT COUNT(*) AS total FROM perguntas');
if(!rows.length||Number(rows[0].total)===0)throw Error('A base de dados não contém perguntas.');
done('questions',2);status.textContent='A preparar o acesso local…';
done('access',3);
status.textContent='Verificações concluídas. A abrir a aplicação…';
done('ready',4);
await new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r);});});
location.replace('opcoesexame.html');
}catch(e){status.textContent=e.message||'Não foi possível iniciar a aplicação.';document.getElementById('retry').hidden=false;}
})();
