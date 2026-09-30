function smartSearch(query){var q=words(query);if(!q.length)return state.memories.slice().reverse();return state.memories.map(function(m){var mw=words(m.text+' '+m.type),score=0;q.forEach(function(w){if(mw.indexOf(w)>=0)score+=3;else mw.forEach(function(x){if(x.indexOf(w)===0||w.indexOf(x)===0)score+=1})});return {m:m,score:score}}).filter(function(x){return x.score>0}).sort(function(a,b){return b.score-a.score||b.m.created-a.m.created}).map(function(x){return x.m})}
function idea(){var th=themes(3),a=th[0]?th[0][0]:'rotina',b=th[1]?th[1][0]:'projeto';var list=['Crie um experimento de 7 dias sobre "'+a+'" e registre o que muda.','Junte "'+a+'" com "'+b+'" e teste a versão mais simples possível.','Transforme uma parte repetitiva de "'+a+'" em uma checklist reutilizável.','Pegue uma memória antiga sobre "'+a+'" e pergunte: o que eu faria diferente hoje?','Escolha uma tarefa ligada a "'+a+'" e reduza até caber em 20 minutos.'];return list[Math.floor(Math.random()*list.length)]}
function buildBrief(){var open=state.tasks.filter(function(x){return !x.done}).length,done=state.tasks.length-open,th=themes(3),projects=state.projects.filter(function(p){return !p.archived}).length;var s=(state.name?state.name+', você':'Você')+' tem '+open+' tarefa'+(open===1?'':'s')+' aberta'+(open===1?'':'s')+' e '+projects+' projeto'+(projects===1?'':'s')+' ativo'+(projects===1?'':'s')+'.';if(done)s+=' Você já concluiu '+done+' tarefa'+(done===1?'':'s')+'.';if(th.length)s+=' Seus assuntos mais recorrentes são '+th.map(function(x){return x[0]}).join(', ')+'.';var old=resurfaceMemory();if(old)s+=' Uma memória antiga voltou a ficar relevante hoje.';return s}
function resurfaceMemory(){var candidates=state.memories.filter(function(m){return daysAgo(m.created)>=7});if(!candidates.length)return null;var th=themes(4).map(function(x){return x[0]});candidates.sort(function(a,b){var as=th.reduce(function(s,t){return s+(norm(a.text).indexOf(t)>=0?1:0)},0),bs=th.reduce(function(s,t){return s+(norm(b.text).indexOf(t)>=0?1:0)},0);return bs-as||a.created-b.created});return candidates[0]||null}
function relatedScore(a,b){
  var aw=words(a),bw=words(b),score=0;
  aw.forEach(function(w){if(bw.indexOf(w)>=0)score++});
  return score
}
function contextMatches(query){
  var q=words(query),raw=norm(query);
  if(!q.length)return [];
  var pool=[];
  state.memories.forEach(function(m){pool.push({kind:m.type||'Memória',text:m.text,created:m.created||0,done:false})});
  state.tasks.forEach(function(t){pool.push({kind:'Tarefa',text:t.text,created:t.created||0,done:!!t.done})});
  state.projects.filter(function(p){return !p.archived}).forEach(function(p){pool.push({kind:'Projeto',text:p.name+(p.goal?' — '+p.goal:''),created:p.created||0,done:false})});
  return pool.map(function(x){
    var nw=words(x.text),score=0,nt=norm(x.text);
    q.forEach(function(w){
      if(nw.indexOf(w)>=0)score+=4;
      else nw.forEach(function(z){if(z.indexOf(w)===0||w.indexOf(z)===0)score+=1})
    });
    if(raw.length>5&&nt.indexOf(raw)>=0)score+=8;
    if(x.kind==='Tarefa'&&!x.done)score+=1;
    if(Date.now()-x.created<1209600000)score+=1;
    return {item:x,score:score}
  }).filter(function(x){return x.score>0}).sort(function(a,b){return b.score-a.score||b.item.created-a.item.created}).slice(0,6)
}
function contextualReply(query){
  var matches=contextMatches(query);
  if(!matches.length)return '';
  var best=matches.slice(0,4),types={};
  best.forEach(function(x){types[x.item.kind]=(types[x.item.kind]||0)+1});
  var out='Pelo que você já registrou, encontrei contexto relacionado:\n';
  out+=best.map(function(x,i){return (i+1)+'. ['+x.item.kind+'] '+x.item.text}).join('\n');
  var open=best.filter(function(x){return x.item.kind==='Tarefa'&&!x.item.done});
  if(open.length)out+='\n\nPróxima ação sugerida: comece por “'+open[0].item.text+'” e reduza isso ao menor passo possível.';
  else if(best[0]&&best[0].item.kind==='Projeto')out+='\n\nEsse assunto parece ligado a um projeto. Posso ajudar a transformá-lo em próximos passos.';
  else out+='\n\nEsses pontos parecem conectados. Posso resumir, comparar ou transformar isso em uma tarefa.';
  return out
}
function connectionItems(){var items=[],th=themes(5);th.forEach(function(pair){if(pair[1]>=2){var related=state.memories.filter(function(m){return norm(m.text).indexOf(pair[0])>=0}).length+state.tasks.filter(function(t){return norm(t.text).indexOf(pair[0])>=0}).length;items.push({title:'Tema recorrente: '+pair[0],text:'Você mencionou esse tema '+related+' vezes. Talvez exista uma decisão ou projeto escondido aqui.',theme:pair[0]})}});if(!items.length&&state.memories.length>=2){for(var i=0;i<state.memories.length;i++){for(var j=i+1;j<state.memories.length;j++){if(relatedScore(state.memories[i].text,state.memories[j].text)>=2){items.push({title:'Duas memórias parecem conectadas',text:'“'+state.memories[i].text.slice(0,55)+'…” conversa com “'+state.memories[j].text.slice(0,55)+'…”.'});break}}if(items.length)break}}return items.slice(0,4)}
function attentionItems(){var out=[],open=state.tasks.filter(function(t){return !t.done});if(open.length>5)out.push({kind:'notice',title:'Muitas frentes abertas',text:'Você tem '+open.length+' tarefas abertas. Escolher 3 prioridades pode reduzir ruído mental.'});var old=resurfaceMemory();if(old)out.push({kind:'info',title:'Uma memória voltou',text:'Há '+daysAgo(old.created)+' dias você escreveu: “'+old.text.slice(0,110)+(old.text.length>110?'…':'')+'”'});var suggestions=projectSuggestions();if(suggestions.length)out.push({kind:'good',title:'Possível projeto detectado',text:'O tema “'+suggestions[0].theme+'” apareceu '+suggestions[0].count+' vezes. Talvez valha transformar isso em projeto.',theme:suggestions[0].theme});if(!out.length)out.push({kind:'good',title:'Tudo sob controle',text:'Não encontrei nenhuma pendência forte agora. Bom momento para criar ou revisar.'});return out.slice(0,3)}
function projectSuggestions(){return themes(8).filter(function(x){return x[1]>=3&&!state.projects.some(function(p){return norm(p.name).indexOf(x[0])>=0})}).map(function(x){return {theme:x[0],count:x[1]}})}
function createProject(name,goal,auto){var n=clean(name);if(!n)return false;if(state.projects.some(function(p){return norm(p.name)===norm(n)})){toast('Esse projeto já existe');return false}state.projects.push({id:uid(),name:n,goal:String(goal||'').trim(),created:Date.now(),auto:!!auto,archived:false});unlockAchievements();safeSave();render();return true}
function projectStats(p){var keyWords=words(p.name+' '+p.goal);var matches=state.memories.filter(function(m){return keyWords.some(function(w){return norm(m.text).indexOf(w)>=0})}).length+state.tasks.filter(function(t){return keyWords.some(function(w){return norm(t.text).indexOf(w)>=0})}).length;return matches}
function updateProfile(){var th=themes(6);state.profile.topics=th.map(function(x){return x[0]});state.profile.captureCount=state.memories.length+state.tasks.length;state.profile.completedTasks=state.tasks.filter(function(t){return t.done}).length;state.profile.focusSessions=state.focusSessions.length;state.profile.projectCount=state.projects.length;var taskWords={};state.tasks.filter(function(t){return t.done}).forEach(function(t){words(t.text).forEach(function(w){taskWords[w]=(taskWords[w]||0)+1})});var strengths=Object.keys(taskWords).sort(function(a,b){return taskWords[b]-taskWords[a]}).slice(0,3);state.profile.strengths=strengths}
function unlockAchievements(){updateProfile();var defs=[{id:'first_capture',title:'Primeiro despejo mental',desc:'Salvou a primeira informação.',ok:state.profile.captureCount>=1},{id:'ten_capture',title:'Mente externa',desc:'Guardou 10 itens no segundo cérebro.',ok:state.profile.captureCount>=10},{id:'five_done',title:'Em movimento',desc:'Concluiu 5 tarefas.',ok:state.profile.completedTasks>=5},{id:'first_project',title:'Virou projeto',desc:'Criou o primeiro projeto.',ok:state.profile.projectCount>=1},{id:'focus3',title:'Foco consistente',desc:'Concluiu 3 sessões de foco.',ok:state.profile.focusSessions>=3},{id:'connections',title:'Pontos conectados',desc:'A Henna encontrou padrões recorrentes.',ok:connectionItems().length>=2}];state.achievements=defs.filter(function(d){return d.ok}).map(function(d){return d.id});return defs}
function reply(q){
  var t=norm(q),prefix=state.name?state.name+', ':'';
  if(/^(oi|ola|e ai|bom dia|boa tarde|boa noite)\b/.test(t)){
    var openHello=state.tasks.filter(function(x){return !x.done}).length;
    return prefix+'estou aqui. Hoje eu tenho '+state.memories.length+' memórias, '+openHello+' tarefas abertas e '+state.projects.filter(function(p){return !p.archived}).length+' projetos no seu contexto. O que você quer pensar comigo?'
  }
  if(/obrigad|valeu|perfeito|show|top/.test(t))return prefix+'sempre. Pode jogar a próxima coisa na mesa.';
  if(/ideia|sugest/.test(t))return prefix+idea();
  if(/o que.*agora|prioridade|comecar|por onde/.test(t)){
    var todo=state.tasks.filter(function(x){return !x.done}).sort(function(a,b){
      if((a.priority||'normal')!==(b.priority||'normal'))return a.priority==='high'?-1:1;
      return (a.created||0)-(b.created||0)
    });
    return todo.length?prefix+'eu começaria por: “'+todo[0].text+'”. Primeiro passo: defina o resultado mínimo que precisa existir em 25 minutos.':prefix+'você não tem tarefas abertas. Eu revisaria uma ideia, memória antiga ou conexão recorrente.'
  }
  if(/resumo|brief|hoje|meu dia|panorama/.test(t))return buildBrief();
  if(/quem sou|me conhece|padrao|perfil|sobre mim/.test(t)){
    updateProfile();
    var topics=(state.profile.topics||[]).slice(0,5);
    return prefix+'o que eu consigo inferir do que você registrou até agora: seus temas mais recorrentes são '+(topics.join(', ')||'ainda pouco definidos')+'. Você concluiu '+(state.profile.completedTasks||0)+' tarefas, fez '+(state.profile.focusSessions||0)+' sessões de foco e mantém '+state.projects.filter(function(p){return !p.archived}).length+' projetos ativos. Isso é um retrato do seu uso, não uma definição de quem você é.'
  }
  if(/projeto/.test(t)){
    var ps=state.projects.filter(function(p){return !p.archived});
    if(ps.length)return prefix+'seus projetos ativos são:\n'+ps.map(function(p,i){return (i+1)+'. '+p.name+(p.goal?' — '+p.goal:'')}).join('\n');
    return prefix+'ainda não há projetos. Posso detectar um automaticamente conforme seus temas se repetem.'
  }
  if(/memoria|lembra|lembrei|o que eu disse|o que salvei/.test(t)){
    var hits=smartSearch(q).slice(0,5);
    return hits.length?prefix+'encontrei estas memórias relacionadas:\n'+hits.map(function(m,i){return (i+1)+'. '+m.text}).join('\n'):prefix+'não encontrei uma memória suficientemente relacionada ainda.'
  }
  if(/tarefa|pendencia|pendente/.test(t)){
    var a=state.tasks.filter(function(x){return !x.done}).slice(0,6);
    return a.length?prefix+'suas tarefas abertas são:\n'+a.map(function(x,i){return (i+1)+'. '+x.text}).join('\n'):prefix+'você não tem tarefas abertas.'
  }
  if(/passos|planej|quebre|como faco|me ajuda a fazer|me ajuda com/.test(t)){
    var ctx=contextMatches(q);
    if(ctx.length){
      var base=ctx[0].item.text;
      return prefix+'vou usar isto como contexto: “'+base+'”.\n\nEu faria assim:\n1. Defina exatamente o resultado desejado.\n2. Separe o primeiro passo que leva menos de 20 minutos.\n3. Remova uma dependência ou dúvida antes de começar.\n4. Faça o primeiro passo e só depois replaneje.'
    }
    return prefix+'eu faria assim:\n1. Defina o resultado esperado.\n2. Escolha a menor próxima ação.\n3. Trabalhe nela por 20–25 minutos.\n4. Revise o resultado e escolha o próximo passo.'
  }
  if(/conex/.test(t)){
    var cs=connectionItems();
    return cs.length?prefix+cs.map(function(c,i){return (i+1)+'. '+c.title+': '+c.text}).join('\n'):prefix+'ainda preciso de mais material para encontrar conexões fortes.'
  }
  if(/decid|compar|opcao|escolher/.test(t)){
    var contextual=contextualReply(q);
    return contextual?prefix+contextual+'\n\nPara uma comparação melhor, use o Modo decisão e coloque as opções lado a lado.':prefix+'use o Modo decisão e me diga as opções. Eu organizo critérios, riscos e perguntas importantes sem escolher por você.'
  }
  var contextual=contextualReply(q);
  if(contextual)return prefix+contextual;
  var open=state.tasks.filter(function(x){return !x.done}).length,th=themes(3).map(function(x){return x[0]});
  return prefix+'entendi o que você perguntou, mas ainda não encontrei contexto suficiente salvo para responder com segurança. '+(th.length?'Os temas que mais aparecem hoje são '+th.join(', ')+'. ':'')+(open?'Você também tem '+open+' tarefas abertas. ':'')+'Se você me contar um pouco mais ou salvar algo sobre esse assunto, eu consigo conectar melhor.'
}
