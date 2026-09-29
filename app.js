(function(){
'use strict';
var KEY='hennaMindPreviewSafeV1';
function byId(id){return document.getElementById(id)}
function safeGet(){
  try{var x=localStorage.getItem(KEY);if(x){var d=JSON.parse(x);if(d&&typeof d==='object')return d}}catch(e){}
  return {name:'',memories:[],tasks:[],chat:[]}
}
var state=safeGet();
if(!Array.isArray(state.memories))state.memories=[];
if(!Array.isArray(state.tasks))state.tasks=[];
if(!Array.isArray(state.chat))state.chat=[];
if(typeof state.name!=='string')state.name='';
var seconds=1500,timer=null,running=false;

function safeSave(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function uid(){return String(new Date().getTime())+'-'+String(Math.floor(Math.random()*1000000))}
function clean(s){return String(s||'').trim().replace(/\s+/g,' ').slice(0,40)}
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(t){var x=byId('toast');x.textContent=t;x.className='toast show';setTimeout(function(){x.className='toast'},1400)}
function openModal(id){byId(id).className='modal show'}
function closeModal(id){byId(id).className='modal'}
function classify(t){
  var s=t.toLowerCase();
  if(/preciso|tenho que|fazer|comprar|ligar|enviar|pagar|terminar|resolver|amanhã|hoje/.test(s))return'Tarefa';
  if(/projeto|app|aplicativo|site|jogo|empresa|produto|lançar/.test(s))return'Projeto';
  if(/ideia|poderia|seria legal|talvez|e se|criar/.test(s))return'Ideia';
  if(/aprendi|decidi|percebi|descobri|lembro|prefiro|gosto/.test(s))return'Memória';
  return'Pensamento'
}
function addCapture(text){
  var v=String(text||'').trim();if(!v)return false;
  var type=classify(v);
  if(type==='Tarefa')state.tasks.push({id:uid(),text:v,done:false,created:new Date().getTime()});
  else state.memories.push({id:uid(),text:v,type:type,created:new Date().getTime()});
  safeSave();render();return true
}
function themes(){
  var counts={},stop={para:1,com:1,uma:1,isso:1,essa:1,este:1,esse:1,quero:1,tenho:1,fazer:1,mais:1,muito:1,como:1};
  var all=state.memories.concat(state.tasks);
  for(var i=0;i<all.length;i++){
    var words=String(all[i].text||'').toLowerCase().replace(/[^a-z0-9áéíóúâêôãõç ]/g,' ').split(/\s+/);
    for(var j=0;j<words.length;j++){var w=words[j];if(w.length>4&&!stop[w])counts[w]=(counts[w]||0)+1}
  }
  var arr=[];for(var k in counts)arr.push([k,counts[k]]);
  arr.sort(function(a,b){return b[1]-a[1]});return arr.slice(0,4).map(function(x){return x[0]})
}
function idea(){
  var th=themes(),a=th[0]||'rotina',b=th[1]||'projeto';
  var list=[
    'Crie um pequeno experimento de 7 dias sobre "'+a+'" e registre o que muda.',
    'Junte "'+a+'" com "'+b+'" e teste uma versão bem simples da ideia.',
    'Transforme uma parte repetitiva de "'+a+'" em uma checklist reutilizável.',
    'Pegue uma memória sobre "'+a+'" e pergunte: o que eu faria diferente hoje?'
  ];
  return list[Math.floor(Math.random()*list.length)]
}
function brief(){
  var open=0,done=0;
  for(var i=0;i<state.tasks.length;i++){if(state.tasks[i].done)done++;else open++}
  if(!state.memories.length&&!state.tasks.length)return (state.name?state.name+', ':'')+'comece jogando aqui qualquer coisa que esteja ocupando sua cabeça.';
  var s=(state.name?state.name+', você':'Você')+' tem '+open+' tarefa'+(open===1?'':'s')+' aberta'+(open===1?'':'s')+'.';
  var th=themes();if(th.length)s+=' Seus temas recorrentes parecem ser '+th.slice(0,3).join(', ')+'.';
  return s
}
function reply(q){
  var t=String(q||'').toLowerCase();
  var prefix=state.name?state.name+', ':'';
  if(/ideia|sugest/.test(t))return prefix+idea();
  if(/o que.*agora|prioridade|começar/.test(t)){
    var todo=state.tasks.filter(function(x){return !x.done});
    return todo.length?prefix+'eu começaria por: "'+todo[0].text+'". Faça só o primeiro passo durante 25 minutos.':prefix+'você não tem tarefas abertas. Aproveite para revisar uma ideia antiga.';
  }
  if(/resumo|dia|brief/.test(t))return brief();
  if(/tarefa|pend/.test(t)){
    var a=state.tasks.filter(function(x){return !x.done}).slice(0,5);
    if(!a.length)return prefix+'você não tem tarefas abertas.';
    return prefix+'suas próximas tarefas são:\n'+a.map(function(x,i){return (i+1)+'. '+x.text}).join('\n')
  }
  if(/passos|planej|quebre/.test(t)){
    return prefix+'eu faria assim:\n1. Defina o resultado esperado.\n2. Escolha a menor próxima ação.\n3. Trabalhe nela por 20–25 minutos.\n4. Revise o resultado e decida o próximo passo.'
  }
  return prefix+'entendi. Posso transformar isso em uma tarefa, gerar ideias ou ajudar a escolher o próximo passo.'
}
function itemHtml(m){
  return '<div class="item"><div class="itemTop"><b>'+esc(m.type||'Memória')+'</b><button class="tiny" data-delmem="'+esc(m.id)+'">Excluir</button></div><p>'+esc(m.text)+'</p></div>'
}
function taskHtml(t){
  return '<div class="item task '+(t.done?'done':'')+'"><button class="check" data-toggle="'+esc(t.id)+'">✓</button><div style="flex:1"><div class="itemTop"><b>Tarefa</b><button class="tiny" data-deltask="'+esc(t.id)+'">Excluir</button></div><p>'+esc(t.text)+'</p><div class="minirow">'+(!t.done?'<button class="tiny" data-plan="'+esc(t.id)+'">✦ Quebrar em passos</button>':'')+'</div></div></div>'
}
function render(){
  var open=state.tasks.filter(function(x){return !x.done}).length;
  var done=state.tasks.length-open;
  var ideas=state.memories.filter(function(x){return x.type==='Ideia'}).length;
  byId('sMem').textContent=state.memories.length;
  byId('sTasks').textContent=open;
  byId('sIdeas').textContent=ideas;
  byId('sDone').textContent=done;
  byId('brandSub').textContent=state.name?'assistente de '+state.name:'seu segundo cérebro';
  byId('helloTitle').innerHTML=state.name?'Olá, '+esc(state.name)+'.<br><span class="grad">O que importa agora?</span>':'Sua mente,<br><span class="grad">mais leve.</span>';
  byId('currentName').textContent=state.name||'Não definido';
  byId('brief').innerHTML='<div class="briefTop"><div class="ai">✦</div><div><h3>'+(state.name?'Seu panorama, '+esc(state.name):'Seu panorama agora')+'</h3><p>'+esc(brief())+'</p><div class="minirow"><button class="tiny" id="briefIdea">💡 Gerar ideia</button><button class="tiny" id="briefNext">✓ Próxima ação</button></div></div></div>';
  var recent=state.memories.slice().reverse().slice(0,4);
  byId('recentList').innerHTML=recent.length?recent.map(itemHtml).join(''):'<div class="empty">Ainda não há memórias. Capture seu primeiro pensamento acima.</div>';
  renderMemories();
  var tasks=state.tasks.slice().sort(function(a,b){return (a.done?1:0)-(b.done?1:0)});
  byId('taskList').innerHTML=tasks.length?tasks.map(taskHtml).join(''):'<div class="empty">Nenhuma tarefa ainda.</div>';
  renderChat();
  var bi=byId('briefIdea'),bn=byId('briefNext');
  if(bi)bi.onclick=function(){saveIdea()};
  if(bn)bn.onclick=function(){go('assistant');ask('O que devo fazer agora?')};
}
function renderMemories(){
  var q=byId('searchInput').value.toLowerCase().trim();
  var list=state.memories.filter(function(x){return !q||String(x.text+' '+x.type).toLowerCase().indexOf(q)>=0}).slice().reverse();
  byId('memoryList').innerHTML=list.length?list.map(itemHtml).join(''):'<div class="empty">Nada encontrado.</div>'
}
function renderChat(){
  var arr=state.chat.length?state.chat:[{role:'ai',text:(state.name?'Oi, '+state.name+'! ':'')+'Eu sou a Henna. Posso ajudar com ideias, tarefas, memórias e prioridades.'}];
  byId('messages').innerHTML=arr.map(function(m){return '<div class="bubble '+(m.role==='user'?'user':'aiMsg')+'">'+esc(m.text).replace(/\n/g,'<br>')+'</div>'}).join('')
}
function ask(text){
  var v=String(text||byId('chatInput').value||'').trim();if(!v)return;
  state.chat.push({role:'user',text:v});
  state.chat.push({role:'ai',text:reply(v)});
  byId('chatInput').value='';safeSave();renderChat()
}
function saveIdea(){
  var x=idea();state.memories.push({id:uid(),text:x,type:'Ideia',created:new Date().getTime()});safeSave();render();toast('Ideia salva')
}
function go(p){
  var pages=document.querySelectorAll('.page');for(var i=0;i<pages.length;i++)pages[i].className='page';
  byId('page-'+p).className='page active';
  var ns=document.querySelectorAll('.nav button');for(i=0;i<ns.length;i++)ns[i].className=ns[i].getAttribute('data-page')===p?'active':'';
  try{window.scrollTo(0,0)}catch(e){}
}
function tick(){
  if(seconds>0){seconds--;drawClock()}else{clearInterval(timer);timer=null;running=false;seconds=1500;drawClock();byId('startFocus').textContent='Iniciar';toast('Sessão concluída')}
}
function drawClock(){var m=Math.floor(seconds/60),s=seconds%60;byId('clock').textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s}
function saveName(){
  var n=clean(byId('nameInput').value);if(!n){toast('Digite seu nome');return}
  n=n.charAt(0).toUpperCase()+n.slice(1);state.name=n;safeSave();closeModal('nameModal');render();toast('Prazer, '+n+'!')
}

byId('saveQuick').onclick=function(){if(addCapture(byId('quickInput').value)){byId('quickInput').value='';toast('Salvo')}};
byId('ideaBtn').onclick=saveIdea;
byId('quickIdea').onclick=saveIdea;
byId('quickPlan').onclick=function(){go('assistant');ask('Quebre minha próxima tarefa em passos')};
byId('quickReview').onclick=function(){go('assistant');ask('Faça um resumo do meu dia')};
byId('sendBtn').onclick=function(){ask()};
byId('chatInput').onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask()}};
byId('searchInput').oninput=renderMemories;
byId('newTaskBtn').onclick=function(){openModal('taskModal');byId('taskText').focus()};
byId('cancelTask').onclick=function(){closeModal('taskModal')};
byId('saveTask').onclick=function(){var v=String(byId('taskText').value||'').trim();if(!v)return;state.tasks.push({id:uid(),text:v,done:false,created:new Date().getTime()});byId('taskText').value='';safeSave();closeModal('taskModal');render();toast('Tarefa criada')};
byId('settingsBtn').onclick=function(){openModal('settingsModal')};
byId('closeSettings').onclick=function(){closeModal('settingsModal')};
byId('editName').onclick=function(){closeModal('settingsModal');byId('nameInput').value=state.name;openModal('nameModal')};
byId('saveName').onclick=saveName;
byId('nameInput').onkeydown=function(e){if(e.key==='Enter')saveName()};
byId('exportBtn').onclick=function(){
  try{
    var blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='henna-mind-backup.json';a.click();URL.revokeObjectURL(url)
  }catch(e){toast('Exportação indisponível neste preview')}
};
byId('eraseBtn').onclick=function(){if(confirm('Apagar todos os dados deste navegador?')){state={name:'',memories:[],tasks:[],chat:[]};safeSave();closeModal('settingsModal');render();openModal('nameModal')}};
byId('startFocus').onclick=function(){running=!running;if(running){byId('startFocus').textContent='Pausar';timer=setInterval(tick,1000)}else{byId('startFocus').textContent='Continuar';clearInterval(timer);timer=null}};
byId('resetFocus').onclick=function(){if(timer)clearInterval(timer);timer=null;running=false;seconds=1500;drawClock();byId('startFocus').textContent='Iniciar'};

document.onclick=function(e){
  var x=e.target;
  while(x&&x!==document){
    if(x.getAttribute){
      var p=x.getAttribute('data-page');if(p){go(p);return}
      var g=x.getAttribute('data-go');if(g){go(g);return}
      var id=x.getAttribute('data-delmem');if(id){state.memories=state.memories.filter(function(m){return m.id!==id});safeSave();render();return}
      id=x.getAttribute('data-deltask');if(id){state.tasks=state.tasks.filter(function(t){return t.id!==id});safeSave();render();return}
      id=x.getAttribute('data-toggle');if(id){for(var i=0;i<state.tasks.length;i++)if(state.tasks[i].id===id)state.tasks[i].done=!state.tasks[i].done;safeSave();render();return}
      id=x.getAttribute('data-plan');if(id){var t=state.tasks.filter(function(z){return z.id===id})[0];go('assistant');ask('Quebre em passos: '+(t?t.text:''));return}
    }
    x=x.parentNode
  }
};

render();drawClock();
if(!state.name)setTimeout(function(){openModal('nameModal');byId('nameInput').focus()},120);
})();