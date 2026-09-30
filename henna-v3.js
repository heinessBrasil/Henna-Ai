(function(){
'use strict';

var KEY='hennaMindPreviewSafeV1';
var $=function(id){return document.getElementById(id)};
function loadFallback(){
  try{var raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):{}}catch(e){return {}}
}
var st=(typeof window.state==='object'&&window.state)?window.state:loadFallback();
if(!st||typeof st!=='object')st={};
if(!Array.isArray(st.memories))st.memories=[];
if(!Array.isArray(st.tasks))st.tasks=[];
if(!Array.isArray(st.chat))st.chat=[];
if(!Array.isArray(st.projects))st.projects=[];
if(!Array.isArray(st.reminders))st.reminders=[];
if(!st.meta||typeof st.meta!=='object')st.meta={};
if(!st.wellbeing||typeof st.wellbeing!=='object')st.wellbeing={};
window.state=st;

function persist(){
  try{
    if(typeof window.safeSave==='function')window.safeSave();
    else localStorage.setItem(KEY,JSON.stringify(st));
  }catch(e){}
}
function e(s){
  if(typeof window.esc==='function')return window.esc(s);
  return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
}
function n(s){
  try{return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ')}
  catch(err){return String(s||'').toLowerCase()}
}
function dayKey(){
  var d=new Date();
  return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()
}
function showToast(msg){
  try{if(typeof window.toast==='function'){window.toast(msg);return}}catch(e){}
  var t=$('toast');if(!t)return;t.textContent=msg;t.className='toast show';setTimeout(function(){t.className='toast'},2200)
}
function saveChat(role,text){
  st.chat.push({role:role,text:String(text||''),at:Date.now()});
  if(st.chat.length>80)st.chat=st.chat.slice(-80);
  persist()
}
function allContext(){
  var pool=[];
  st.memories.forEach(function(x){pool.push({kind:x.type||'Memória',text:x.text||'',date:x.created||0})});
  st.tasks.forEach(function(x){pool.push({kind:x.done?'Tarefa concluída':'Tarefa',text:x.text||'',date:x.created||0,open:!x.done})});
  st.projects.filter(function(x){return !x.archived}).forEach(function(x){pool.push({kind:'Projeto',text:(x.name||'')+(x.goal?' — '+x.goal:''),date:x.created||0})});
  return pool
}
function keyWords(s){
  var stop={para:1,como:1,uma:1,com:1,isso:1,essa:1,esse:1,voce:1,quero:1,preciso:1,sobre:1,qual:1,meu:1,minha:1,seu:1,sua:1,agora:1,hoje:1};
  return n(s).split(/\s+/).filter(function(w){return w.length>3&&!stop[w]})
}
function rankedContext(q){
  var qw=keyWords(q);
  if(!qw.length)return [];
  return allContext().map(function(item){
    var txt=n(item.text),score=0;
    qw.forEach(function(w){
      if(txt.indexOf(w)>=0)score+=4;
      else keyWords(item.text).forEach(function(x){if(x.indexOf(w)===0||w.indexOf(x)===0)score+=1})
    });
    if(item.open)score+=1;
    return {item:item,score:score}
  }).filter(function(x){return x.score>0}).sort(function(a,b){return b.score-a.score||b.item.date-a.item.date}).slice(0,5)
}
function fallbackAnswer(q){
  var t=n(q),name=st.name?st.name+', ':'';
  var open=st.tasks.filter(function(x){return !x.done});
  if(/^(oi|ola|e ai|bom dia|boa tarde|boa noite)/.test(t))
    return name+'estou aqui. Posso pensar com você usando o que já ficou salvo no seu segundo cérebro.';
  if(/agua|hidrat/.test(t))
    return name+'posso te ajudar com hidratação enquanto o site estiver aberto. Você já marcou '+(st.wellbeing.waterCount||0)+' copo'+((st.wellbeing.waterCount||0)===1?'':'s')+' hoje.';
  if(/como foi meu dia|meu dia|resumo|brief/.test(t)){
    var done=st.tasks.filter(function(x){return x.done}).length;
    return name+'hoje seu contexto tem '+open.length+' tarefas abertas, '+done+' concluídas e '+st.memories.length+' memórias salvas. Se você me contar o que aconteceu hoje, eu guardo os pontos importantes.';
  }
  if(/o que.*agora|prioridade|por onde|comecar/.test(t)){
    return open.length?name+'eu começaria por “'+open[0].text+'”. Reduza isso a uma ação de até 20 minutos e faça só essa parte primeiro.':name+'você não tem tarefas abertas. Que tal me contar o que está ocupando sua cabeça agora?';
  }
  if(/lembra|memoria|salvei|disse/.test(t)){
    var hits=rankedContext(q);
    return hits.length?name+'encontrei isto no seu contexto:\n'+hits.map(function(x,i){return (i+1)+'. ['+x.item.kind+'] '+x.item.text}).join('\n'):name+'não encontrei algo relacionado ainda.';
  }
  if(/tarefa|pendente|pendencia/.test(t)){
    return open.length?name+'suas tarefas abertas são:\n'+open.slice(0,6).map(function(x,i){return (i+1)+'. '+x.text}).join('\n'):name+'você não tem tarefas abertas.';
  }
  if(/ideia|sugest/.test(t)){
    var ctx=allContext().slice(-4);
    var seed=ctx.length?ctx[ctx.length-1].text:'sua rotina';
    return name+'uma ideia: pegue “'+seed.slice(0,80)+'” e crie uma versão que você consiga testar em 24 horas. O que seria o menor experimento possível?';
  }
  var ranked=rankedContext(q);
  if(ranked.length){
    var answer=name+'eu encontrei algumas coisas que parecem relacionadas ao que você falou:\n';
    answer+=ranked.slice(0,3).map(function(x,i){return (i+1)+'. ['+x.item.kind+'] '+x.item.text}).join('\n');
    answer+='\n\nO ponto em comum parece estar em “'+keyWords(q).slice(0,2).join(' / ')+'”. Quer que eu transforme isso em próximos passos?';
    return answer
  }
  return name+'entendi. Ainda não tenho contexto suficiente sobre isso, mas você pode me contar mais. Eu consigo guardar o que importa, conectar com suas memórias e transformar em tarefa ou lembrete.'
}
function answer(q){
  try{
    if(typeof window.reply==='function'){
      var r=window.reply(q);
      if(r&&String(r).trim())return r
    }
  }catch(err){}
  return fallbackAnswer(q)
}

function renderChatSafe(){
  var box=$('messages');if(!box)return;
  var arr=st.chat.length?st.chat:[{role:'ai',text:(st.name?'Oi, '+st.name+'! ':'')+'Eu sou a Henna. Estou pronta para pensar com você.'}];
  box.innerHTML=arr.map(function(m){
    return '<div class="bubble '+(m.role==='user'?'user':'aiMsg')+'">'+e(m.text).replace(/\n/g,'<br>')+'</div>'
  }).join('');
  try{box.scrollTop=box.scrollHeight}catch(err){}
}
window.renderChat=renderChatSafe;

function setPresence(mode,label){
  var p=$('hennaPresence'),status=$('hennaPresenceText');
  document.body.classList.toggle('ai-thinking',mode==='thinking');
  if(p)p.className='hennaPresence '+mode;
  if(status)status.textContent=label||(mode==='thinking'?'Pensando...':'Pronta')
}
window.ask=function(text){
  var input=$('chatInput');
  var v=String(text||(input?input.value:'')||'').trim();
  if(!v)return;
  saveChat('user',v);
  if(input)input.value='';
  renderChatSafe();
  setPresence('thinking','Pensando no seu contexto...');
  var delay=650+Math.floor(Math.random()*350);
  setTimeout(function(){
    var response='';
    try{response=answer(v)}catch(err){response=fallbackAnswer(v)}
    saveChat('ai',response);
    renderChatSafe();
    setPresence('idle','Pronta');
    try{window.scrollTo(0,document.body.scrollHeight)}catch(e){}
  },delay)
};

function installChat(){
  var send=$('sendBtn'),input=$('chatInput');
  if(send)send.onclick=function(ev){if(ev)ev.preventDefault();window.ask()};
  if(input)input.onkeydown=function(ev){if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();window.ask()}};
  document.querySelectorAll('[data-ask]').forEach(function(el){
    el.onclick=function(ev){
      ev.preventDefault();ev.stopPropagation();
      var p='assistant';
      try{if(typeof window.go==='function')window.go(p)}catch(e){}
      window.ask(el.getAttribute('data-ask'))
    }
  })
}

function injectPresence(){
  var page=$('page-assistant');if(!page||$('hennaPresence'))return;
  var ref=$('assistantSuggestions');
  var node=document.createElement('div');
  node.id='hennaPresence';
  node.className='hennaPresence idle';
  node.innerHTML='<div class="hennaBrain"><span class="ring ringA"></span><span class="ring ringB"></span><span class="brainCore">H</span></div><div><b>Henna AI</b><small id="hennaPresenceText">Pronta</small></div><div class="thinkingDots"><i></i><i></i><i></i></div>';
  if(ref)page.insertBefore(node,ref);else page.appendChild(node)
}

function injectCare(){
  var home=$('page-home');if(!home||$('hennaCare'))return;
  var section=document.createElement('div');
  section.className='section';
  section.id='hennaCare';
  section.innerHTML='<div class="sectionHead"><h2>Henna cuida de você</h2><span>lembretes no site</span></div><div class="careGrid"><button class="careCard" id="waterBtn"><span>💧</span><b>Água</b><small id="waterText">Marcar um copo</small></button><button class="careCard" id="newReminderBtn"><span>⏰</span><b>Novo lembrete</b><small>Lembre de algo mais tarde</small></button><button class="careCard wide" id="dayCheckinBtn"><span>✦</span><b id="dayCheckinTitle">Como está seu dia?</b><small id="dayCheckinText">Converse com a Henna sobre hoje.</small></button></div>';
  var attention=$('attentionSection');
  if(attention&&attention.parentNode)attention.parentNode.insertBefore(section,attention.nextSibling);else home.appendChild(section);

  var modal=document.createElement('div');
  modal.className='modal';modal.id='reminderModal';
  modal.innerHTML='<div class="sheet"><h2>Novo lembrete</h2><div class="desc">A Henna avisa enquanto este site estiver aberto.</div><input class="field" id="reminderTitle" maxlength="100" placeholder="Ex.: ligar para o fornecedor"><label class="label">Quando?</label><input class="field" id="reminderWhen" type="datetime-local"><div class="sheetActions"><button class="btn" id="cancelReminder">Cancelar</button><button class="btn primary" id="saveReminderBtn">Criar lembrete</button></div></div>';
  document.body.appendChild(modal);

  $('waterBtn').onclick=markWater;
  $('newReminderBtn').onclick=function(){setDefaultReminderTime();openReminder()};
  $('dayCheckinBtn').onclick=function(){goAssistantCheckin()};
  $('cancelReminder').onclick=function(){modal.className='modal'};
  $('saveReminderBtn').onclick=saveReminderFromModal;
  renderCare()
}

function renderCare(){
  if(st.wellbeing.waterDate!==dayKey()){
    st.wellbeing.waterDate=dayKey();st.wellbeing.waterCount=0;st.wellbeing.lastWaterAt=0;persist()
  }
  var w=$('waterText');if(w)w.textContent=(st.wellbeing.waterCount||0)+' copo'+((st.wellbeing.waterCount||0)===1?'':'s')+' marcado'+((st.wellbeing.waterCount||0)===1?'':'s')+' hoje';
  var h=new Date().getHours(),title=$('dayCheckinTitle'),txt=$('dayCheckinText');
  if(title&&txt){
    if(h>=17||h<5){title.textContent='Como foi seu dia?';txt.textContent='O que deu certo e o que você quer lembrar de hoje?'}
    else if(h<12){title.textContent='Como você quer começar o dia?';txt.textContent='Defina uma prioridade para hoje.'}
    else{title.textContent='Como está seu dia?';txt.textContent='Tem algo que precisa ser reorganizado?'}
  }
}

function markWater(){
  if(st.wellbeing.waterDate!==dayKey()){st.wellbeing.waterDate=dayKey();st.wellbeing.waterCount=0}
  st.wellbeing.waterCount=(st.wellbeing.waterCount||0)+1;
  st.wellbeing.lastWaterAt=Date.now();
  persist();renderCare();showToast('💧 Água registrada. Boa!')
}

function openReminder(){var m=$('reminderModal');if(m)m.className='modal show'}
function setDefaultReminderTime(){
  var d=new Date(Date.now()+3600000);
  d.setMinutes(Math.ceil(d.getMinutes()/5)*5,0,0);
  var pad=function(x){return String(x).padStart(2,'0')};
  var val=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  if($('reminderWhen'))$('reminderWhen').value=val
}
function saveReminderFromModal(){
  var title=String($('reminderTitle').value||'').trim();
  var when=Date.parse($('reminderWhen').value);
  if(!title||!when){showToast('Preencha o lembrete e o horário');return}
  st.reminders.push({id:'r-'+Date.now()+'-'+Math.floor(Math.random()*9999),title:title,at:when,fired:false});
  $('reminderTitle').value='';
  $('reminderModal').className='modal';
  persist();showToast('⏰ Lembrete criado')
}
function parseReminderText(text){
  var raw=String(text||''),normalized=n(raw);
  if(!/(me lembre|lembrar|lembrete)/.test(normalized))return null;
  var tm=normalized.match(/\b(?:as)\s*(\d{1,2})(?::(\d{2}))?\b/);
  if(!tm)return null;
  var h=parseInt(tm[1],10),m=parseInt(tm[2]||'0',10);
  if(h>23||m>59)return null;
  var d=new Date();d.setSeconds(0,0);d.setHours(h,m,0,0);
  if(/amanha/.test(normalized))d.setDate(d.getDate()+1);
  else if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);
  var title=raw.replace(/^(me\s+lembre\s+de|lembrar\s+de|lembrete\s*:?)/i,'').replace(/\s+[àa]s?\s*\d{1,2}(?::\d{2})?.*$/i,'').trim();
  return {title:title||raw,at:d.getTime()}
}

var oldAdd=typeof window.addCapture==='function'?window.addCapture:null;
if(oldAdd){
  window.addCapture=function(text){
    var parsed=parseReminderText(text);
    var ok=oldAdd(text);
    if(parsed){
      st.reminders.push({id:'r-'+Date.now(),title:parsed.title,at:parsed.at,fired:false});
      persist();showToast('⏰ Também criei um lembrete')
    }
    return ok
  }
}

function fireReminder(r){
  r.fired=true;r.firedAt=Date.now();
  var msg='⏰ Lembrete: '+r.title;
  saveChat('ai',msg);
  renderChatSafe();
  showToast(msg);
  setPresence('alert','Tenho um lembrete para você');
  setTimeout(function(){setPresence('idle','Pronta')},4500);
  try{
    if('Notification' in window&&Notification.permission==='granted')new Notification('Henna AI',{body:r.title})
  }catch(e){}
}
function checkReminders(){
  var now=Date.now(),changed=false;
  st.reminders.forEach(function(r){if(!r.fired&&r.at<=now){fireReminder(r);changed=true}});
  if(changed)persist();
  if(st.wellbeing.lastWaterAt&&now-st.wellbeing.lastWaterAt>=5400000){
    if(!st.wellbeing.lastWaterReminder||now-st.wellbeing.lastWaterReminder>=5400000){
      st.wellbeing.lastWaterReminder=now;persist();
      showToast('💧 Que tal beber um pouco de água?');
      setPresence('alert','Hora de se hidratar 💧');
      setTimeout(function(){setPresence('idle','Pronta')},4000)
    }
  }
}

function goAssistantCheckin(){
  try{if(typeof window.go==='function')window.go('assistant')}catch(e){}
  var h=new Date().getHours();
  var q=(h>=17||h<5)?'Quero te contar como foi meu dia':'Quero te contar como está meu dia';
  window.ask(q)
}
function proactiveCheckin(){
  if(!st.name)return false;
  var k=dayKey();
  if(st.meta.lastDailyCheckin===k)return true;
  st.meta.lastDailyCheckin=k;
  var h=new Date().getHours();
  var msg;
  if(h>=17||h<5)msg=st.name+', como foi seu dia? O que deu certo, o que ficou pesado e o que você quer lembrar de hoje?';
  else if(h<12)msg='Bom dia, '+st.name+'. Qual é a coisa mais importante para você hoje?';
  else msg=st.name+', como está seu dia até agora? Tem algo que precisa ser reorganizado?';
  saveChat('ai',msg);
  renderChatSafe();
  showToast('✦ A Henna quer saber de você');
  return true
}

function boot(){
  injectPresence();
  injectCare();
  installChat();
  renderChatSafe();
  setPresence('idle','Pronta');
  setTimeout(function(){
    if(!proactiveCheckin()){
      var tries=0,wait=setInterval(function(){tries++;if(proactiveCheckin()||tries>30)clearInterval(wait)},1000)
    }
  },900);
  setInterval(checkReminders,30000);
  setTimeout(checkReminders,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

window.addEventListener('error',function(ev){
  try{
    if($('hennaPresenceText'))$('hennaPresenceText').textContent='Modo seguro ativo';
    console.warn('Henna safe mode:',ev.message)
  }catch(e){}
});
})();