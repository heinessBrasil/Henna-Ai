'use strict';
var KEY='hennaMindPreviewSafeV1';
function byId(id){return document.getElementById(id)}
function emptyState(){return {name:'',memories:[],tasks:[],chat:[],projects:[],focusSessions:[],profile:{},achievements:[],meta:{createdAt:Date.now(),lastBriefDate:'',lastResurfaceId:''}}}
function safeGet(){try{var x=localStorage.getItem(KEY);if(x){var d=JSON.parse(x);if(d&&typeof d==='object')return d}}catch(e){}return emptyState()}
var state=safeGet();
function ensureState(){var base=emptyState();Object.keys(base).forEach(function(k){if(state[k]===undefined)state[k]=base[k]});if(!Array.isArray(state.memories))state.memories=[];if(!Array.isArray(state.tasks))state.tasks=[];if(!Array.isArray(state.chat))state.chat=[];if(!Array.isArray(state.projects))state.projects=[];if(!Array.isArray(state.focusSessions))state.focusSessions=[];if(!Array.isArray(state.achievements))state.achievements=[];if(!state.profile||typeof state.profile!=='object')state.profile={};if(!state.meta||typeof state.meta!=='object')state.meta=base.meta;if(typeof state.name!=='string')state.name=''}
ensureState();
var seconds=1500,timer=null,running=false,currentFocusGoal='';
function safeSave(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function uid(){return String(Date.now())+'-'+String(Math.floor(Math.random()*1000000))}
function clean(s){return String(s||'').trim().replace(/\s+/g,' ').slice(0,80)}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ')}
function words(s){var stop={para:1,com:1,uma:1,isso:1,essa:1,este:1,esse:1,quero:1,tenho:1,fazer:1,mais:1,muito:1,como:1,porque:1,onde:1,quando:1,ainda:1,esta:1,estou:1,voce:1,seu:1,sua:1,meu:1,minha:1,hoje:1,amanha:1,sobre:1,pelo:1,pela:1,dos:1,das:1,que:1,ser:1,ter:1};return norm(s).split(/\s+/).filter(function(w){return w.length>3&&!stop[w]})}
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(t){var x=byId('toast');x.textContent=t;x.className='toast show';setTimeout(function(){x.className='toast'},1600)}
function openModal(id){byId(id).className='modal show'}
function closeModal(id){byId(id).className='modal'}
function todayKey(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function daysAgo(ts){return Math.floor((Date.now()-(ts||Date.now()))/86400000)}
function classify(t){var s=norm(t);if(/preciso|tenho que|fazer|comprar|ligar|enviar|pagar|terminar|resolver|lembrar|agendar|marcar/.test(s))return'Tarefa';if(/projeto|app|aplicativo|site|jogo|empresa|produto|lancar|startup/.test(s))return'Projeto';if(/ideia|poderia|seria legal|talvez|e se|criar|inventar/.test(s))return'Ideia';if(/aprendi|decidi|percebi|descobri|lembro|prefiro|gosto|nao gosto/.test(s))return'Memória';return'Pensamento'}
function addCapture(text){var v=String(text||'').trim();if(!v)return false;var type=classify(v);if(type==='Tarefa')state.tasks.push({id:uid(),text:v,done:false,created:Date.now(),priority:'normal'});else state.memories.push({id:uid(),text:v,type:type,created:Date.now()});if(type==='Projeto')maybeCreateProjectFromMemory(v);updateProfile();unlockAchievements();safeSave();render();return true}
function maybeCreateProjectFromMemory(text){var name=clean(text).slice(0,45);if(!state.projects.some(function(p){return norm(p.name)===norm(name)}))state.projects.push({id:uid(),name:name,goal:'Criado automaticamente a partir de uma captura.',created:Date.now(),auto:true,archived:false})}
function themeCounts(){var counts={},all=state.memories.concat(state.tasks).concat(state.projects.map(function(p){return {text:p.name+' '+p.goal}}));all.forEach(function(x){words(x.text||'').forEach(function(w){counts[w]=(counts[w]||0)+1})});return counts}
function themes(limit){var counts=themeCounts(),arr=[];Object.keys(counts).forEach(function(k){arr.push([k,counts[k]])});arr.sort(function(a,b){return b[1]-a[1]});return arr.slice(0,limit||6)}