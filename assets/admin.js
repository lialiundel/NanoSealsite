const $=s=>document.querySelector(s);
const toast=m=>{let x=$('#toast');x.textContent=m;x.classList.add('visible');setTimeout(()=>x.classList.remove('visible'),3500)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Real reference pairs from Edmund Optics reflective ruled gratings. These are
// optical benchmarks, not certified specifications of embossable security foil.
const GRATING_PRESETS=[
 {density:600,blaze:400,blazeAngle:6.88,ref:'Edmund Optics #41-021'},
 {density:600,blaze:500,blazeAngle:8.62,ref:'Edmund Optics 600 grooves 500 nm'},
 {density:1200,blaze:400,blazeAngle:13.88,ref:'Edmund Optics #41-048'},
 {density:1200,blaze:500,blazeAngle:17.45,ref:'Edmund Optics 1200 grooves 500 nm'}
];
function randomGrating(){const t=GRATING_PRESETS[Math.floor(Math.random()*GRATING_PRESETS.length)];const pitch=1000000/t.density;const lambda=550;const theta=Math.asin(lambda/pitch)*180/Math.PI;return {...t,pitchNm:+pitch.toFixed(1),wavelengthRange:'400–700 нм',testWavelength:lambda,firstOrderAngle:+theta.toFixed(1),type:'Отражательная, периодическая',coating:'Алюминий (оптический эталон)',foil:'Для наклейки — отдельная разработка тиснёной плёнки',dimensions:'12,5 × 25 мм (оптическая область, ориентир)'};}
function gratingRows(g){return [['Тип',g.type],['Плотность штрихов',g.density+' штр./мм'],['Шаг решётки',g.pitchNm+' нм'],['Диапазон длин волн',g.wavelengthRange],['Длина волны блеска',g.blaze+' нм'],['Угол блеска',g.blazeAngle+'°'],['Угол первого порядка при 550 нм (нормальное падение)',g.firstOrderAngle+'°'],['Размер оптической области',g.dimensions],['Покрытие эталонной решётки',g.coating],['Исполнение наклейки',g.foil],['Источник исходных параметров',g.ref]]}
function renderGrating(p){const g=p.grating;$('#gratingPanel').hidden=!g;if(!g)return;$('#gratingSpecs').innerHTML=gratingRows(g).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');}
const orgForm=$('#orgForm'),orgName=$('#orgName'),orgContact=$('#orgContact'),orgType=$('#orgContactType');
const authNotice=$('#authNotice'),authArea=$('#authArea'),authReady=$('#authReady');
let authClient=null,authUser=null,authLoaded=false;
const authConfig=window.NANOSEAL_AUTH||{};
function authMessage(message){authNotice.textContent=message;}
function orgStorageKey(){return 'nanoseal-org-user-'+authUser.id;}
function orgForUser(){try{return JSON.parse(localStorage.getItem(orgStorageKey()))}catch{return null}}
function saveOrgForUser(o){localStorage.setItem(orgStorageKey(),JSON.stringify(o));NanoSeal.saveOrg(o);}
function displayOrg(){const o=orgForUser();orgName.value=o?.name||'';orgType.value=o?.type||'email';orgContact.value=o?.contact||'';orgType.dispatchEvent(new Event('change'));$('#orgSaved').textContent=o?'Профиль организации: '+o.name+' · '+o.contact:'Заполните данные организации для выпуска наклеек.';}
function applyAuth(user){authUser=user||null;const ok=!!authUser;authArea.hidden=ok;authReady.hidden=!ok;$('#authIdentity').textContent=ok?'Вы вошли как '+authUser.email:'';$('#issueButton').disabled=!ok||!orgForUser();if(ok){displayOrg();const o=orgForUser();if(o)NanoSeal.saveOrg(o);else NanoSeal.saveOrg({name:'',contact:''});}else{NanoSeal.saveOrg({name:'',contact:''});$('#orgSaved').textContent='Для сохранения организации войдите в аккаунт.';}}
orgType.addEventListener('change',()=>{orgContact.type=orgType.value==='email'?'email':'tel';orgContact.placeholder=orgType.value==='email'?'company@example.ru':'+7 900 123-45-67'});
orgForm.addEventListener('submit',e=>{e.preventDefault();if(!authUser){toast('Сначала войдите в аккаунт');return;}const name=orgName.value.trim(),contact=orgContact.value.trim(),type=orgType.value;const valid=type==='email'?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact):/^\+?[0-9 ()-]{10,22}$/.test(contact);if(name.length<2||!valid){toast('Проверьте название и формат почты или телефона');return;}saveOrgForUser({name,type,contact});$('#issueButton').disabled=false;displayOrg();toast('Профиль сохранён. Контакт организации не подтверждён.');});
async function initAuth(){
 if(!authConfig.url||!authConfig.anonKey||authConfig.url.includes('ВАШ')){authMessage('Регистрация пока не подключена. В файле assets/auth-config.js укажите URL проекта и publishable/anon key Supabase. Инструкция в README.');return;}
 if(!window.supabase?.createClient){authMessage('Не удалось загрузить библиотеку авторизации. Проверьте интернет и доступ к CDN.');return;}
 try{
  authClient=window.supabase.createClient(authConfig.url,authConfig.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await authClient.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')console.warn(error);
  applyAuth(data?.user||null);authLoaded=true;
  authClient.auth.onAuthStateChange((_event,session)=>{applyAuth(session?.user||null)});
  authMessage('Зарегистрируйтесь по электронной почте или войдите в существующий аккаунт.');
 }catch(e){authMessage('Ошибка подключения к сервису регистрации: '+e.message)}
}
$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!authClient){authMessage('Сначала настройте Supabase по инструкции.');return;}
 const email=$('#authEmail').value.trim(),password=$('#authPassword').value;
 if(password.length<8){authMessage('Пароль должен содержать минимум 8 символов.');return;}
 const action=e.submitter?.value||'signin';
 $('#authForm').querySelectorAll('button').forEach(b=>b.disabled=true);
 try{
  if(action==='signup'){
   const {data,error}=await authClient.auth.signUp({email,password,options:{emailRedirectTo:new URL('admin.html',location.href).href}});if(error)throw error;
   if(data.session){applyAuth(data.user);authMessage('Аккаунт создан, вход выполнен.');}
   else authMessage('Проверьте почту и подтвердите адрес по ссылке в письме. Затем войдите с паролем.');
  }else{
   const {data,error}=await authClient.auth.signInWithPassword({email,password});if(error)throw error;
   applyAuth(data.user);authMessage('Вход выполнен.');
  }
 }catch(err){authMessage('Ошибка: '+err.message)}finally{$('#authForm').querySelectorAll('button').forEach(b=>b.disabled=false)}
});
$('#authSignout').addEventListener('click',async()=>{if(!authClient)return;await authClient.auth.signOut();applyAuth(null);authMessage('Вы вышли из аккаунта.');});
initAuth();
let products=[],active=null;
function refresh(){const s=NanoSeal.getStore();products=s.products;$('#adminIssued').textContent=products.length;$('#adminChecks').textContent=s.checks;$('#adminRevoked').textContent=products.filter(p=>p.revoked).length;
$('#registryBody').innerHTML=products.map(p=>`<tr><td><strong>${esc(p.name)}</strong><small>${esc(p.batch)}</small></td><td>${esc(p.id)}</td><td><span class="tag ${p.revoked?'revoke':''}">${p.revoked?'Отозван':'Активен'}</span></td><td>${p.checks}</td><td><button class="tbl-btn" data-action="select" data-id="${esc(p.id)}">QR</button><button class="tbl-btn" data-action="verify" data-id="${esc(p.id)}">Проверить ↗</button>${p.revoked?'':`<button class="tbl-btn" data-action="revoke" data-id="${esc(p.id)}">Отозвать</button>`}</td></tr>`).join('');}
function verifyLink(p){let base=$('#baseUrl').value.trim();if(!base)base=new URL('./',location.href).href;let u=new URL(base,location.href);if(!['http:','https:'].includes(u.protocol))throw Error('Нужен адрес https://');u.searchParams.set('v',p.token);return u.href}
function show(p){active=p;$('#labelEmpty').hidden=true;$('#labelReady').hidden=false;$('#labelName').textContent=p.name;$('#labelId').textContent=p.id;$('#labelBatch').textContent=p.batch+' • '+p.issued+' • '+(p.org||'');renderGrating(p);try{$('#labelQR').src=NanoSeal.qrDataUrl(verifyLink(p))}catch(e){toast('Не удалось создать QR: '+e.message)}}
$('#issueForm').addEventListener('submit',async e=>{e.preventDefault();let b=$('#issueButton');b.disabled=true;b.textContent='Создаём подпись…';try{if(!authUser||!orgForUser())throw Error('Войдите в аккаунт и заполните профиль организации');let p=await NanoSeal.issue($('#productName').value,$('#productBatch').value,{grating:randomGrating()});show(p);$('#issueForm').reset();refresh();toast('Макет защитной наклейки создан. Скачайте его в SVG.')}catch(e){toast('Ошибка выпуска: '+e.message)}finally{b.disabled=false;b.innerHTML='Создать наклейку с QR <span>↗</span>'}});
$('#registryBody').addEventListener('click',e=>{let b=e.target.closest('[data-action]');if(!b)return;let p=products.find(x=>x.id===b.dataset.id);if(!p)return;if(b.dataset.action==='select'){show(p);window.scrollTo({top:450,behavior:'smooth'})}if(b.dataset.action==='verify')window.open(verifyLink(p),'_blank','noopener');if(b.dataset.action==='revoke'){if(!confirm('Отозвать '+p.id+' в локальном реестре этого браузера?'))return;let s=NanoSeal.getStore();let found=s.products.find(x=>x.id===p.id);if(found)found.revoked=true;NanoSeal.saveStore(s);refresh();toast('Код отозван в этом браузере')}});
$('#refreshRegistry').addEventListener('click',()=>{refresh();toast('Реестр обновлён')});
$('#baseUrl').addEventListener('change',()=>{if(active)show(active)});
$('#downloadQR').addEventListener('click',()=>{if(!active)return;try{let blob=new Blob([NanoSeal.svgQR(verifyLink(active))],{type:'image/svg+xml'});let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='NanoSeal_'+active.id+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}catch(e){toast(e.message)}});
$('#printLabel').addEventListener('click',()=>window.print());
Promise.resolve().then(()=>{refresh();if(products.length)show(products[0])}).catch(e=>toast('Ошибка подготовки: '+e.message));
// Export a complete printable label: simulated foil + signed QR + serial number.
function labelSVG(p){
 const qr=NanoSeal.svgQR(verifyLink(p));
 const qrBody=qr.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
 const view=(qr.match(/viewBox="([^"]+)"/)||[])[1]||'0 0 100 100';
 const safe=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 1000 600"><defs><linearGradient id="foil" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#a7e9e0"/><stop offset=".25" stop-color="#dfc7ff"/><stop offset=".5" stop-color="#ffdbd3"/><stop offset=".75" stop-color="#a9e7e0"/><stop offset="1" stop-color="#d6c7ff"/></linearGradient><pattern id="lines" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 8 Q8 0 16 8" stroke="#fff" stroke-opacity=".6" fill="none"/></pattern></defs><rect width="1000" height="600" rx="40" fill="url(#foil)"/><rect x="18" y="18" width="964" height="564" rx="28" stroke="#40556d" stroke-width="3" fill="none"/><rect x="28" y="28" width="944" height="544" rx="20" fill="url(#lines)"/><text x="68" y="115" font-size="64" font-family="Arial,sans-serif" font-weight="bold" fill="#18303e">✳ NANOSEAL</text><text x="68" y="159" font-size="25" font-family="Arial,sans-serif" fill="#284659">ЗАЩИТНАЯ ЭТИКЕТКА · МАКЕТ</text><text x="68" y="250" font-size="33" font-family="Arial,sans-serif" font-weight="bold" fill="#203545">${safe(p.name).slice(0,60)}</text><text x="68" y="305" font-size="26" font-family="Arial,sans-serif" fill="#203545">Партия: ${safe(p.batch).slice(0,40)}</text><text x="68" y="370" font-size="30" font-family="Arial,sans-serif" font-weight="bold" fill="#203545">${safe(p.id)}</text><text x="68" y="470" font-size="24" font-family="Arial,sans-serif" fill="#203545">1. Сканируйте QR</text><text x="68" y="505" font-size="24" font-family="Arial,sans-serif" fill="#203545">2. Осмотрите голограмму</text><rect x="605" y="50" width="350" height="410" rx="20" fill="white"/><svg x="622" y="66" width="316" height="316" viewBox="${view}">${qrBody}</svg><text x="628" y="419" font-size="20" font-family="Arial,sans-serif" fill="#203545">ПРОВЕРИТЬ ТОВАР ↑</text><text x="68" y="554" font-size="17" font-family="Arial,sans-serif" fill="#203545">${p.grating?`${p.grating.density} штр./мм · шаг ${p.grating.pitchNm} нм · блеск ${p.grating.blaze} нм`:"Оптические параметры не указаны"}</text><text x="606" y="512" font-size="19" font-family="Arial,sans-serif" fill="#203545">Фольга на экране — имитация</text></svg>`;
}
$('#downloadLabel').addEventListener('click',()=>{if(!active)return;try{let blob=new Blob([labelSVG(active)],{type:'image/svg+xml;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='NanoSeal_Наклейка_'+active.id+'.svg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000)}catch(e){toast('Ошибка макета: '+e.message)}});

$('#rerollGrating').addEventListener('click',async()=>{if(!active)return;if(!confirm('Будет создана НОВАЯ наклейка с новым номером и подписанными характеристиками. Продолжить?'))return;try{if(!authUser||!orgForUser())throw Error('Требуется вход в аккаунт');const p=await NanoSeal.issue(active.name,active.batch,{grating:randomGrating()});show(p);refresh();toast('Выпущена новая наклейка с другим вариантом решётки.')}catch(e){toast(e.message)}});
$('#downloadSpec').addEventListener('click',()=>{if(!active?.grating)return;const lines=['NANOSEAL — ПРОЕКТНОЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ','Не является сертификатом и не гарантирует технологическую реализуемость на гибкой плёнке.','',`Организация: ${active.org||'не указана'}`,`Товар: ${active.name}`,`Партия: ${active.batch}`,`Наклейка: ${active.id}`,'',...gratingRows(active.grating).map(([k,v])=>k+': '+v),'','Проверить с изготовителем: материал подложки, глубину рельефа, штамп для тиснения, адгезию и разрушение при вскрытии.','Источники: https://www.edmundoptics.com/p/600-grooves-125-x-25mm-400nm-ruled-diffraction-grating/4656/','https://www.edmundoptics.de/p/1200-grooves-125-x-25mm-400nm-ruled-diffraction-grating/4664/'];const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='NanoSeal_ТЗ_'+active.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)});
