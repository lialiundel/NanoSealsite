const $ = sel=>document.querySelector(sel);
const $$ = sel=>[...document.querySelectorAll(sel)];
const toast=(message)=>{const x=$('#toast');x.textContent=message;x.classList.add('visible');setTimeout(()=>x.classList.remove('visible'),3600)};
async function api(path){if(path==='/api/stats'){const s=NanoSeal.getStore();return {issued:s.products.length,scans:s.checks}}if(path==='/api/products')return {products:NanoSeal.getStore().products};if(path.startsWith('/api/verify?'))return NanoSeal.verify(new URL(path,location.href).searchParams.get('token')||'');throw Error('Неизвестная операция')}
async function stats(){try{let r=await api('/api/stats');$('#statIssued').textContent=r.issued;$('#statChecks').textContent=r.scans}catch(e){$('#statIssued').textContent='—'}}
$('#menuButton').addEventListener('click',()=>$('#nav').classList.toggle('open'));
$$('#nav a').forEach(a=>a.addEventListener('click',()=>$('#nav').classList.remove('open')));
window.addEventListener('scroll',()=>{$('#scrollProgress').style.width=(document.documentElement.scrollTop/(document.documentElement.scrollHeight-innerHeight)*100||0)+'%'},{passive:true});
const detail={
 nano:{icon:'✺',overline:'СЛОЙ 01 · ФИЗИЧЕСКАЯ ЗАЩИТА',title:'Почему наномасштаб важен?',text:'Дифракционные решётки с периодом порядка 600–900 нм изменяют направление видимого света. Поэтому при наклоне наклейки мы видим переливы. Такая структура должна быть подтверждена техническими данными поставщика.'},
 crypto:{icon:'⌘',overline:'СЛОЙ 02 · МАТЕМАТИЧЕСКАЯ ЗАЩИТА',title:'Что проверяет цифровая подпись?',text:'Производитель подписывает точный набор данных закрытым ключом ECDSA P-256. При изменении даже одного символа подпись не проходит проверку открытым ключом. При этом QR-код можно скопировать целиком, поэтому одной подписи недостаточно.'},
 human:{icon:'◉',overline:'СЛОЙ 03 · ОСМОТР УПАКОВКИ',title:'Почему нужен второй шаг?',text:'Покупатель смотрит, меняется ли рисунок при повороте, совпадает ли он с эталоном, нет ли следов снятия или повреждения наклейки. Эта визуальная оценка не является лабораторным измерением нанорельефа.'}
};
$$('[data-tech]').forEach(x=>x.addEventListener('click',()=>{
 $$('[data-tech]').forEach(c=>c.classList.remove('selected'));x.classList.add('selected');let v=detail[x.dataset.tech];$('#techDetail').innerHTML=`<div class="info-icon">${v.icon}</div><div><span>${v.overline}</span><h3>${v.title}</h3><p>${v.text}</p></div>`;
}));
let examples=null;
async function loadExamples(){let x=await api('/api/products');let valid=x.products.find(o=>!o.revoked),revoked=x.products.find(o=>o.revoked);if(!valid)throw Error('В реестре нет активных кодов. Создайте новый в панели производителя.');let bad=valid.token; let chunks=bad.split('.');let tampered=chunks[0].split('');tampered[12]=tampered[12]==='A'?'B':'A';bad=tampered.join('')+'.'+chunks.slice(1).join('.');examples={valid:valid.token,fake:bad,revoked:revoked?.token||''};}
function extractToken(s){s=s.trim();try{if(s.includes('://')){let u=new URL(s);return u.searchParams.get('v')||u.searchParams.get('token')||''}}catch(e){}return s.replace(/^nanoseal:/,'')}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderResult(r){let card=$('#resultCard');card.className='result-card '+r.state;
 let title={signed:'Подпись подтверждена',invalid:'Подпись не подтверждена',revoked:'Код отозван',unknown:'Запись не найдена'}[r.state]||'Результат проверки';
 let icon={signed:'✓',invalid:'✕',revoked:'!',unknown:'?'}[r.state]||'?';
 let rows=r.product?`<div class="result-rows"><div class="result-row"><span>Товар</span><b>${esc(r.product.name)}</b></div><div class="result-row"><span>Номер</span><b>${esc(r.product.id)}</b></div><div class="result-row"><span>Партия</span><b>${esc(r.product.batch)}</b></div><div class="result-row"><span>Проверки в этом браузере</span><b>${r.checks}</b></div></div>`:'';
 const check=r.state==='signed'?`<label class="physical-check"><input type="checkbox" id="opticalCheck"> <span>Я осмотрел(а) наклейку: рисунок меняется при наклоне, пломба не повреждена (самостоятельная визуальная оценка).</span></label><div class="result-caveat" id="opticalNote">Далее обязательна физическая проверка. Подпись не подтверждает реальность самой упаковки.</div>`:'';
 card.innerHTML=`<div class="num">02 / РЕЗУЛЬТАТ ПРОВЕРКИ</div><div class="result-title"><div class="status-icon">${icon}</div><div><h3>${title}</h3><span class="result-message">${esc(r.message||'')}</span></div></div>${rows}${check}${r.state!=='signed'?'<div class="result-caveat">Остановите проверку и уточните происхождение упаковки у продавца или производителя.</div>':''}`;
 const box=$('#opticalCheck');if(box)box.addEventListener('change',()=>{$('#opticalNote').textContent=box.checked?'Вы подтвердили внешний вид наклейки самостоятельно. Для полной защиты требуется проверка у производителя; QR всё ещё может быть скопирован.':'Нужно дополнительно осмотреть голограмму и целостность упаковки.'});
}
async function verify(){let token=extractToken($('#verifyInput').value);if(!token){toast('Отсканируйте QR или выберите пример');return}$('#verifyButton').disabled=true;$('#verifyButton').textContent='Проверяем…';try{let r=await api('/api/verify?token='+encodeURIComponent(token));renderResult(r);stats()}catch(e){toast(e.message)}finally{$('#verifyButton').disabled=false;$('#verifyButton').innerHTML='Проверить введённую ссылку <span>→</span>'}}
$('#verifyButton').addEventListener('click',verify);
$('#clearButton').addEventListener('click',()=>{$('#verifyInput').value='';$('#resultCard').className='result-card';$('#resultCard').innerHTML='<div class="result-empty"><div class="seal-ring">✳</div><span class="result-overline">02 / РЕЗУЛЬТАТ</span><h3>Готовы проверить следующий товар</h3><p>Выберите новый код или пример.</p></div>'});
$$('[data-case]').forEach(btn=>btn.addEventListener('click',async()=>{try{if(!examples)await loadExamples();$('#verifyInput').value=examples[btn.dataset.case];document.querySelector('#verify').scrollIntoView({behavior:'smooth',block:'start'});await verify()}catch(e){toast(e.message)}}));
const initial=new URL(location.href).searchParams.get('v');if(initial){$('#verifyInput').value=initial;setTimeout(()=>{document.querySelector('#verify').scrollIntoView({behavior:'smooth'});verify()},350)}
stats();

// QR scanner: native BarcodeDetector when available; jsQR fallback for Safari/Firefox.
let scanStream=null,scanLoop=false,scanBusy=false,scanFrame=0,scanDetector=null;
const scannerCanvas=document.createElement('canvas');
const scannerCtx=scannerCanvas.getContext('2d',{willReadFrequently:true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function scannerMessage(message){const el=$('#scanMessage');if(el)el.textContent=message}
function stopScan(){scanLoop=false;cancelAnimationFrame(scanFrame);if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}const video=$('#scanVideo');if(video){video.pause();video.srcObject=null}$('#scanStage').hidden=true}
function explainCameraError(error){const n=error?.name;if(n==='NotAllowedError'||n==='PermissionDeniedError')return 'Доступ к камере запрещён. Разрешите камеру для этого сайта в настройках браузера и попробуйте снова.';if(n==='NotFoundError')return 'Камера не найдена. Можно загрузить фотографию QR-кода.';if(n==='NotReadableError')return 'Камера занята другим приложением. Закройте его и попробуйте снова.';if(n==='OverconstrainedError')return 'Камера не поддерживает выбранные параметры.';return error?.message||'Не удалось включить камеру.'}
async function ensureDecoder(){
 if(scanDetector||window.jsQR)return;
 if('BarcodeDetector' in window){try{const supported=await BarcodeDetector.getSupportedFormats?.();if(!supported||supported.includes('qr_code')){scanDetector=new BarcodeDetector({formats:['qr_code']});return}}catch(e){}}
 if(window.jsQR)return;
 // This library is loaded over HTTPS; GitHub Pages remains a static site.
 for(const url of ['https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js','https://unpkg.com/jsqr@1.4.0/dist/jsQR.js']){
  try{await new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=url;tag.async=true;const timeout=setTimeout(()=>{tag.remove();reject(Error('Время ожидания библиотеки истекло'))},6500);tag.onload=()=>{clearTimeout(timeout);resolve()};tag.onerror=()=>{clearTimeout(timeout);tag.remove();reject(Error('Библиотека недоступна'))};document.head.appendChild(tag)});if(window.jsQR)return}catch(e){}
 }
 throw Error('Не удалось загрузить модуль чтения QR. Проверьте интернет или отсканируйте наклейку обычной камерой телефона.');
}
async function decodeImage(source){
 await ensureDecoder();
 if(scanDetector){try{const found=await scanDetector.detect(source);if(found.length)return found[0].rawValue}catch(e){}}
 if(!window.jsQR)throw Error('QR-код не найден. Попробуйте более чёткое изображение.');
 const w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height;
 if(!w||!h)throw Error('Изображение ещё не готово.');
 const scale=Math.min(1,1000/Math.max(w,h));scannerCanvas.width=Math.max(1,Math.round(w*scale));scannerCanvas.height=Math.max(1,Math.round(h*scale));
 scannerCtx.drawImage(source,0,0,scannerCanvas.width,scannerCanvas.height);
 const data=scannerCtx.getImageData(0,0,scannerCanvas.width,scannerCanvas.height);
 const result=window.jsQR(data.data,data.width,data.height,{inversionAttempts:'attemptBoth'});
 if(!result?.data)throw Error('QR-код не найден. Приблизьте камеру или сделайте более чёткое фото.');
 return result.data;
}
async function applyScanned(value){stopScan();const token=extractToken(value);if(!token)throw Error('Это не ссылка NanoSeal.');$('#verifyInput').value=value;await verify();$('#resultCard').scrollIntoView({behavior:'smooth',block:'center'})}
async function scanTick(){
 if(!scanLoop||scanBusy)return;
 scanBusy=true;
 try{const video=$('#scanVideo');if(video.readyState>=2){try{const value=await decodeImage(video);if(value){await applyScanned(value);return}}catch(e){/* no QR in this frame */}}}finally{scanBusy=false}
 if(scanLoop)scanFrame=requestAnimationFrame(()=>setTimeout(()=>{if(scanLoop)scanTick()},170));
}
$('#scanCamera').addEventListener('click',async()=>{
 if(scanLoop){stopScan();return}
 try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Камера доступна на HTTPS. Откройте опубликованный сайт GitHub Pages, а не HTML-файл.');
  stopScan();
  scannerMessage('Запрашиваем доступ к камере…');
  scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  const video=$('#scanVideo');video.srcObject=scanStream;$('#scanStage').hidden=false;await video.play();
  scanLoop=true;scannerMessage('Наведите камеру на QR-код. Держите его в кадре несколько секунд.');
  try{await ensureDecoder()}catch(e){stopScan();toast(e.message);return}
  scanTick();
 }catch(e){stopScan();toast(explainCameraError(e))}
});
$('#stopCamera').addEventListener('click',stopScan);
$('#scanFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  let image;
  if('createImageBitmap' in window){image=await createImageBitmap(file)}else{image=await new Promise((resolve,reject)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Не удалось прочитать фото'))};img.src=u})}
  try{await applyScanned(await decodeImage(image))}finally{image.close?.()}
 }catch(e){toast(e.message)}finally{e.target.value=''}
});
window.addEventListener('pagehide',stopScan);
