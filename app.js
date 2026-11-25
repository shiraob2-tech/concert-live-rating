const $=id=>document.getElementById(id),KEY='concert-notes-v1';let records=JSON.parse(localStorage.getItem(KEY)||'[]'),token=null,tokenClient=null;
// Persistent deletion markers prevent Google Drive from restoring deleted events.
const DELETED_KEY='concert-deleted-ids-v1';
let deletedIds=readDeletedIds();
function readDeletedIds(){try{const v=JSON.parse(localStorage.getItem(DELETED_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}}
function persistDeletedIds(){localStorage.setItem(DELETED_KEY,JSON.stringify(deletedIds))}
function markDeleted(id){if(!id)return;deletedIds[id]=new Date().toISOString();persistDeletedIds()}
function isDeleted(id){return Object.prototype.hasOwnProperty.call(deletedIds,id)}
const save=()=>{localStorage.setItem(KEY,JSON.stringify(records));scheduleCloudSync()};const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Setlist editor: both individual entry and multiline bulk entry.
function addSongRow(song={}){const rows=$('songRows'),row=document.createElement('div');row.className='song-row';const number=document.createElement('span');number.className='song-number';const fields=document.createElement('div');fields.className='song-fields';const title=document.createElement('input');title.type='text';title.placeholder='曲名';title.className='song-title';title.value=String(song.title||'');title.setAttribute('aria-label','曲名');const composer=document.createElement('input');composer.type='text';composer.placeholder='作曲者・アーティスト（任意）';composer.className='song-composer';composer.value=String(song.composer||'');composer.setAttribute('aria-label','作曲者・アーティスト');const remove=document.createElement('button');remove.type='button';remove.className='secondary song-remove';remove.textContent='削除';remove.onclick=()=>{row.remove();renumberSongs()};fields.append(title,composer);row.append(number,fields,remove);rows.append(row);renumberSongs()}
function renumberSongs(){[...$('songRows').children].forEach((row,i)=>{row.querySelector('.song-number').textContent=String(i+1)+'.'})}
function setSongs(songs){$('songRows').replaceChildren();for(const song of songs)addSongRow(song)}
function readSongs(){return [...$('songRows').querySelectorAll('.song-row')].map(row=>({title:row.querySelector('.song-title').value.trim(),composer:row.querySelector('.song-composer').value.trim()})).filter(s=>s.title||s.composer)}
function parseBulkSongs(text){return text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const parts=line.replace(/^\s*(?:\d+[.)．、]|[-*・])\s*/, '').split(/\s+[／/]\s+|\s*[｜|]\s*/);return {title:(parts.shift()||'').trim(),composer:parts.join(' / ').trim()}}).filter(s=>s.title)}
$('addSong').onclick=()=>addSongRow();
$('appendSongs').onclick=()=>{const songs=parseBulkSongs($('bulkSongs').value);if(!songs.length){alert('まとめ入力欄に曲名を入力してください');return}for(const s of songs)addSongRow(s);$('bulkSongs').value=''};
$('replaceSongs').onclick=()=>{const songs=parseBulkSongs($('bulkSongs').value);if(!songs.length){alert('まとめ入力欄に曲名を入力してください');return}if(readSongs().length&&!confirm('現在のセットリストを入力した曲で置き換えますか？'))return;setSongs(songs);$('bulkSongs').value=''};
function render(){const list=$('list');list.replaceChildren();const title=$('searchTitle').value.trim().toLocaleLowerCase('ja-JP'),artist=$('searchArtist').value.trim().toLocaleLowerCase('ja-JP'),venue=$('searchVenue').value.trim().toLocaleLowerCase('ja-JP'),from=$('searchFrom').value,to=$('searchTo').value;const matches=records.filter(e=>(!title||String(e.title||'').toLocaleLowerCase('ja-JP').includes(title))&&(!artist||String(e.artist||'').toLocaleLowerCase('ja-JP').includes(artist))&&(!venue||String(e.venue||'').toLocaleLowerCase('ja-JP').includes(venue))&&(!from||String(e.date||'')>=from)&&(!to||String(e.date||'')<=to));$('searchCount').textContent=records.length+'件中 '+matches.length+'件を表示';if(!records.length){list.textContent='公演記録はまだありません。';return}if(!matches.length){list.textContent='条件に一致する公演がありません。検索条件を変更してください。';return}const mode=$('sortOrder').value;
const cmpText=(a,b)=>String(a||'').localeCompare(String(b||''),'ja-JP',{numeric:true,sensitivity:'base'});
const dateCompare=(a,b,descending)=>{const ad=String(a.date||''),bd=String(b.date||'');if(!ad&&!bd)return 0;if(!ad)return 1;if(!bd)return -1;return descending?bd.localeCompare(ad):ad.localeCompare(bd)};
const sorted=[...matches].sort((a,b)=>{let n=0;
 if(mode==='dateAsc')n=dateCompare(a,b,false);
 else if(mode==='artistAsc'){const aa=String(a.artist||'').trim(),bb=String(b.artist||'').trim();n=!aa&&!bb?0:!aa?1:!bb?-1:cmpText(aa,bb)}
 else if(mode==='ratingDesc'){const av=Number(a.overall),bv=Number(b.overall);const ah=a.overall!==undefined&&a.overall!==null&&a.overall!==''&&Number.isFinite(av)&&av>=1&&av<=5,bh=b.overall!==undefined&&b.overall!==null&&b.overall!==''&&Number.isFinite(bv)&&bv>=1&&bv<=5;n=!ah&&!bh?0:!ah?1:!bh?-1:bv-av}
 else n=dateCompare(a,b,true);
 return n||dateCompare(a,b,true)||cmpText(a.title,b.title)||cmpText(a.id,b.id);
});
for(const e of sorted){const box=document.createElement('div');box.className='event';const h=document.createElement('strong');h.textContent=e.title;box.append(h);const p=document.createElement('p');p.className='muted';p.textContent=[e.date,e.venue,e.artist].filter(Boolean).join(' / ');box.append(p);if(e.doorsOpen||e.showStart||e.showEnd){const t=document.createElement('p');t.className='muted';t.textContent=[e.doorsOpen&&'開場 '+e.doorsOpen,e.showStart&&'開演 '+e.showStart,e.showEnd&&'終演 '+e.showEnd].filter(Boolean).join(' ／ ');box.append(t)}const s=document.createElement('p');s.className='stars';s.textContent=e.overall?'★'.repeat(e.overall)+'☆'.repeat(5-e.overall):'未評価';box.append(s);if(Array.isArray(e.setlist)&&e.setlist.length){const songs=document.createElement('p');songs.className='muted';songs.textContent='セットリスト：'+e.setlist.length+'曲';box.append(songs)}const edit=document.createElement('button');edit.textContent='評価・編集';edit.onclick=()=>editRecord(e.id);box.append(edit);const photos=document.createElement('button');photos.type='button';photos.className='secondary';photos.textContent='📷 公演写真';photos.onclick=()=>{editRecord(e.id);$('photoGallery').scrollIntoView({behavior:'smooth',block:'center'})};box.append(photos);const chat=document.createElement('button');chat.className='secondary';chat.textContent='🤖 ChatGPTでセットリストを検索';chat.onclick=()=>openChatGPTSetlist(e);box.append(chat);const note=document.createElement('button');note.className='secondary';note.textContent='📖 この公演のノート';note.onclick=()=>openSingleNotebook(e.id);box.append(note);const del=document.createElement('button');del.className='secondary';del.textContent='削除';del.onclick=()=>{if(confirm('この記録を削除しますか？')){markDeleted(e.id);records=records.filter(x=>x.id!==e.id);deleteStoredPhoto(e.id).catch(console.warn);save();render()}};box.append(del);list.append(box)}}
for(const id of ['searchTitle','searchArtist','searchVenue','searchFrom','searchTo'])$(id).addEventListener('input',render);$('sortOrder').addEventListener('change',render);$('clearSearch').onclick=()=>{for(const id of ['searchTitle','searchArtist','searchVenue','searchFrom','searchTo'])$(id).value='';render()};
function clearForm(){$('form').reset();$('recordId').value='';$('bulkSongs').value='';setSongs([]);resetPhotoEditor()}function editRecord(id){const e=records.find(x=>x.id===id);if(!e)return;$('recordId').value=e.id;for(const field of ['title','date','venue','artist','music','sound','stage','overall','memo','doorsOpen','showStart','showEnd'])$(field).value=e[field]??(['memo','doorsOpen','showStart','showEnd'].includes(field)?'':5);setSongs(Array.isArray(e.setlist)?e.setlist:[]);$('bulkSongs').value='';loadPhotoForRecord(e.id);$('form').scrollIntoView({behavior:'smooth'})}
$('form').onsubmit=async ev=>{ev.preventDefault();if(galleryBusy){alert('写真の処理が終わるまでお待ちください');return}const same=records.filter(x=>String(x.id||'').startsWith('gcal-')&&concertMatchKey(x)===concertMatchKey({date:$('date').value,title:$('title').value}));const id=$('recordId').value||(same.length===1?same[0].id:crypto.randomUUID());const old=records.find(x=>x.id===id)||{};const e={...old,id};if(!old.id)e.calendarPublish=true;for(const f of ['title','date','venue','artist','memo','doorsOpen','showStart','showEnd'])e[f]=$(f).value;for(const f of ['music','sound','stage','overall'])e[f]=Number($(f).value);if(e.calendarPublish&&!e.date){alert('開催日を入力してください');return}if(e.showEnd&&(!e.showStart||e.showEnd<=e.showStart)){alert('終演時間は開演時間より後にしてください（同日）');return}e.setlist=readSongs();e.updatedAt=new Date().toISOString();const i=records.findIndex(x=>x.id===id);if(i>=0)records[i]=e;else records.push(e);save();try{await persistPhotoForRecord(id);scheduleCloudSync()}catch(err){alert('評価は保存されましたが、写真の保存に失敗しました: '+err.message)}render();clearForm();alert('保存しました');if(token)sync()};$('clear').onclick=clearForm;$('add').onclick=()=>{clearForm();$('title').focus()};$('client').value=localStorage.getItem('google-client-id')||'';$('saveClient').onclick=()=>{localStorage.setItem('google-client-id',$('client').value.trim());$('status').textContent='クライアントIDを保存しました'};
$('login').onclick=()=>{const clientId=$('client').value.trim();if(!clientId){alert('クライアントIDを入力してください');return}if(!window.google?.accounts?.oauth2){alert('Google認証の読み込みを待ってください');return}tokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.appdata',callback:r=>{if(r.error){$('status').textContent='認証エラー: '+r.error;return}token=r.access_token;$('status').textContent='Googleに接続しました';$('cloudStatus').textContent='接続しました。初回は両端末のバックアップを保存してから「初回データ統合」を押してください。';sync();if(localStorage.getItem(CLOUD_ENABLED))runCloudSync(false)}});tokenClient.requestAccessToken({prompt:'consent'})};
const CAL_URL='https://www.googleapis.com/calendar/v3/calendars/primary/events';
let calendarBusy=false;
function calendarId(r){return 'concert'+r.id.replace(/-/g,'').toLowerCase()}
function calendarPayload(r){
 const day=r.date;const next=new Date(day+'T00:00:00+09:00');next.setTime(next.getTime()+86400000);const nextDay=new Date(next.getTime()+9*3600000).toISOString().slice(0,10);
 let start={date:day},end={date:nextDay};
 if(r.showStart){start={dateTime:day+'T'+r.showStart+':00+09:00',timeZone:'Asia/Tokyo'};end={dateTime:r.showEnd?day+'T'+r.showEnd+':00+09:00':new Date(Date.parse(start.dateTime)+7200000).toISOString(),timeZone:'Asia/Tokyo'}}
 return {summary:r.title,location:r.venue||'',description:r.doorsOpen?'開場 '+r.doorsOpen:'',start,end,extendedProperties:{private:{concertRecord:r.id}}};
}
async function calendarWrite(r,events){
 const body=calendarPayload(r),signature=JSON.stringify(body);if(r.calendarSynced===signature&&r.calendarEventId)return;
 const owned=events.filter(g=>g.status!=='cancelled'&&(g.id===calendarId(r)||g.extendedProperties?.private?.concertRecord===r.id||(r.calendarEventId&&g.id===r.calendarEventId)));
 if(owned.length>1)throw Error('関連する予定が複数あります: '+r.title);
 const id=owned[0]?.id||r.calendarEventId||calendarId(r);const matches=events.filter(g=>g.status!=='cancelled'&&g.id!==id&&concertMatchKey({date:(g.start?.dateTime||g.start?.date||'').slice(0,10),title:g.summary})===concertMatchKey(r));
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const url=CAL_URL+'/'+id;
 let res=await fetch(url,{headers});
 if(res.ok){const existing=await res.json();if(existing.extendedProperties?.private?.concertRecord!==r.id&&!(r.calendarEventId===existing.id&&String(existing.id).startsWith('concert')&&existing.extendedProperties?.private?.concertRecord))throw Error('予定IDの競合');res=await fetch(url,{method:'PATCH',headers,body:JSON.stringify(body)})}
 else if(res.status===404&&!r.calendarSynced){if(matches.length)throw Error('同名・同日の予定が既にあります: '+r.title+'（重複防止のため登録保留）');res=await fetch(CAL_URL,{method:'POST',headers,body:JSON.stringify({...body,id})});if(res.status===409)throw Error('別端末が登録中です。再同期してください')}
 else throw Error('予定確認 '+res.status+'（削除済みの予定は自動復元しません）');
 if(!res.ok)throw Error('カレンダー書き込み '+res.status);
 const written=await res.json();const current=records.find(x=>x.id===r.id);if(current){current.calendarEventId=written.id||id;current.calendarSynced=signature;save()}
}
async function sync(){
 if(!token){$('status').textContent='先にGoogleに接続してください';return}
 if(calendarBusy)return;calendarBusy=true;
 try{
  $('status').textContent='Googleカレンダーを確認中…';
  let page='',count=0,removed=0;
  const start=new Date();start.setFullYear(start.getFullYear()-5);
  const startDate=start.toISOString().slice(0,10);
  const calendarEvents=[];
  // Fetch every page successfully BEFORE deleting anything locally.
  do{
   const u=new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
   u.searchParams.set('singleEvents','true');u.searchParams.set('maxResults','250');
   u.searchParams.set('timeMin',start.toISOString());
   if(page)u.searchParams.set('pageToken',page);
   const res=await fetch(u,{headers:{Authorization:'Bearer '+token}});
   if(!res.ok)throw Error('Google Calendar API '+res.status);
   const data=await res.json();
   if(!Array.isArray(data.items))throw Error('カレンダーの応答形式が不正です');
   calendarEvents.push(...data.items);
   page=data.nextPageToken||'';
  }while(page);
  // Recover the known test pair only when the remote event is uniquely app-owned.
  const test=records.filter(r=>r.title==='コンサート同期テスト'&&r.date==='2026-11-26');
  const testRemote=calendarEvents.filter(g=>g.status!=='cancelled'&&g.summary==='コンサート同期テスト'&&(g.start?.dateTime||g.start?.date||'').slice(0,10)==='2026-11-26'&&g.location==='テスト会場'&&String(g.id).startsWith('concert')&&g.extendedProperties?.private?.concertRecord);
  if(test.length===2&&testRemote.length===1){
   const keep=test.find(r=>r.showEnd==='21:00'),extra=test.find(r=>r.showEnd==='20:30');
   if(keep&&extra){
    const merged=combineRecord(extra,keep);Object.assign(keep,merged,{id:keep.id,calendarPublish:true,calendarEventId:testRemote[0].id,calendarSynced:'',showEnd:'21:00',updatedAt:new Date().toISOString()});
    const photos=mergeGallery(await galleryItems(await getStoredPhoto(keep.id)),await galleryItems(await getStoredPhoto(extra.id)));
    if(photos.length)await photoOperation('readwrite',keep.id,photos);
    markDeleted(extra.id);records=records.filter(r=>r.id!==extra.id);save();
   }
  }
  // Merge only an exact imported ID of an owned event, never title/date alone.
  for(const r of [...records].filter(x=>x.calendarPublish)){
   const g=calendarEvents.find(x=>x.status!=='cancelled'&&(x.extendedProperties?.private?.concertRecord===r.id||x.id===calendarId(r)||x.id===r.calendarEventId));
   if(!g)continue;
   const extra=records.find(x=>x.id==='gcal-'+g.id&&x.id!==r.id);
   if(extra){const merged=combineRecord(extra,r);Object.assign(r,merged,{id:r.id,calendarPublish:true,calendarEventId:g.id,showEnd:r.showEnd,updatedAt:new Date().toISOString()});const photos=mergeGallery(await galleryItems(await getStoredPhoto(r.id)),await galleryItems(await getStoredPhoto(extra.id)));if(photos.length)await photoOperation('readwrite',r.id,photos);markDeleted(extra.id);records=records.filter(x=>x.id!==extra.id);save()}
  }
  const errors=[];for(const r of [...records])if(r.calendarPublish&&r.date){try{await calendarWrite(r,calendarEvents)}catch(e){errors.push(e.message)}}
  const present=new Set();
  for(const g of calendarEvents){
   if(g.extendedProperties?.private?.concertRecord||String(g.id||'').startsWith('concert'))continue;
   if(g.status==='cancelled'||!/(コンサート|ライブ)/.test(g.summary||''))continue;
   const id='gcal-'+g.id;
   present.add(id);
   // A deliberately deleted record must not be resurrected by imports.
   if(isDeleted(id))continue;
   const date=(g.start?.dateTime||g.start?.date||'').slice(0,10);
   const matches=records.filter(x=>!x.calendarPublish&&concertMatchKey(x)===concertMatchKey({date,title:g.summary}));
   const e=records.find(x=>x.id===id)||(matches.length===1?matches[0]:null);
   if(e){
    // Associate matched existing records with the calendar event for future deletion tracking.
    if(e.id!==id && !String(e.id).startsWith('gcal-'))e.id=id;
    if(e.title!==g.summary||e.date!==date||e.venue!==(g.location||'')){
     // Keep user-entered times and reviews; only refresh the calendar title.
     e.title=g.summary;
     e.date=date;e.venue=g.location||'';e.updatedAt=new Date().toISOString();
    }
   }else{
    records.push({id,title:g.summary,date,venue:g.location||'',artist:'',source:'calendar',updatedAt:new Date().toISOString()});count++;
   }
  }
  // Only calendar-sourced records inside the fetched time range are eligible.
  // Older history and manually entered concerts are never automatically deleted.
  const missing=records.filter(r=>!r.calendarPublish&&String(r.id||'').startsWith('gcal-')&&r.date>=startDate&&!present.has(r.id));
  for(const r of missing){markDeleted(r.id);deleteStoredPhoto(r.id).catch(console.warn);removed++}
  if(missing.length){const missingIds=new Set(missing.map(r=>r.id));records=records.filter(r=>!missingIds.has(r.id))}
  records=normalizeRecords(records).filter(r=>!isDeleted(r.id));
  save();render();
  $('status').textContent='同期完了。新規 '+count+'件／カレンダーから削除 '+removed+'件'+(errors.length?'／登録保留: '+errors.join('；'):'');
 }catch(err){$('status').textContent='同期失敗: '+err.message}finally{calendarBusy=false}
}
$('sync').onclick=sync;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token)sync()});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});render();

// Excel-compatible UTF-8 CSV export. No data leaves the device.
$('exportCsv').onclick=()=>{
  if(!records.length){alert('出力する公演記録がありません。');return}
  const cols=[['date','開催日'],['doorsOpen','開場時間'],['showStart','開演時間'],['showEnd','終演時間'],['title','公演名'],['venue','会場'],['artist','出演者'],['music','演奏・歌唱'],['sound','音響'],['stage','演出'],['overall','総合満足度'],['memo','感想'],['setlistCount','曲数'],['setlistText','セットリスト（曲名 / 作曲者）']];
  const escapeCell=v=>{
    let s=String(v??'');
    // Avoid spreadsheet formula injection when opened in Excel.
    if(/^[\s\uFEFF]*[=+@\-]/.test(s) && !/^-?\d+(?:\.\d+)?$/.test(s.trim()))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  };
  const sorted=[...records].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const lines=[cols.map(c=>escapeCell(c[1])).join(','),...sorted.map(e=>cols.map(c=>escapeCell(c[0]==='setlistCount'?(Array.isArray(e.setlist)?e.setlist.length:0):c[0]==='setlistText'?(Array.isArray(e.setlist)?e.setlist.map((s,i)=>`${i+1}. ${s.title}${s.composer?' / '+s.composer:''}`).join('\n'):''):e[c[0]])).join(','))];
  const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='concert-ratings-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
};


// Photo attachments are stored locally in IndexedDB, separately from the existing localStorage records.
// This preserves the existing record format and Google Calendar integration.
const PHOTO_DB='concert-notes-photos-v1';let activePhoto=null,photoRemove=false,previewUrl=null,photoLoadSequence=0;
function openPhotoDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(PHOTO_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('photos'))r.result.createObjectStore('photos')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function photoOperation(mode,key,value){const db=await openPhotoDB();return new Promise((resolve,reject)=>{const tx=db.transaction('photos',mode),store=tx.objectStore('photos');const req=mode==='readonly'?store.get(key):value===null?store.delete(key):store.put(value,key);req.onsuccess=()=>{};req.onerror=()=>reject(req.error);tx.oncomplete=()=>{db.close();resolve(req.result)};tx.onerror=()=>reject(tx.error)})}
const getStoredPhoto=id=>photoOperation('readonly',id);
const deleteStoredPhoto=id=>photoOperation('readwrite',id,null);
let gallery=[], galleryDirty=false, galleryBusy=false;
async function galleryItems(value){if(Array.isArray(value))return value;if(value instanceof Blob)return [{id:'legacy',src:await photoDataUrl(value),comment:'',updatedAt:'1970-01-01T00:00:00.000Z'}];return []}
function mergeGallery(a,b){const m=new Map();for(const x of [...a,...b])if(x&&x.id&&(!m.has(x.id)||String(x.updatedAt)>String(m.get(x.id).updatedAt)))m.set(x.id,x);return [...m.values()].sort((a,b)=>a.id.localeCompare(b.id))}
function base64ToBlob(uri){
 const match=/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]*)$/i.exec(uri);
 if(!match)throw Error('写真データの形式が異なります');
 const raw=atob(match[2]);const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return new Blob([bytes],{type:match[1]});
}
async function decodeGallery(v){return typeof v==='string'?galleryItems(base64ToBlob(v)):Array.isArray(v)?v:[]}
function showGallery(){const root=$('photoGallery');root.replaceChildren();for(const item of gallery.filter(x=>!x.deleted)){const card=document.createElement('div');card.className='photo-card';const img=document.createElement('img');img.src=item.src;img.alt='公演写真';img.onclick=()=>{const d=$('photoZoom');$('zoomImage').src=item.src;d.showModal()};const comment=document.createElement('input');comment.placeholder='写真のコメント';comment.value=item.comment||'';comment.oninput=()=>{item.comment=comment.value;item.updatedAt=new Date().toISOString();galleryDirty=true};const del=document.createElement('button');del.type='button';del.className='secondary';del.textContent='削除';del.onclick=()=>{if(confirm('この写真を削除しますか？')){item.deleted=true;delete item.src;delete item.comment;item.updatedAt=new Date().toISOString();galleryDirty=true;showGallery()}};card.append(img,comment,del);root.append(card)}$('photoStatus').textContent=gallery.filter(x=>!x.deleted).length+'枚 ／ 保存ボタンで確定します'}
function resetPhotoEditor(){photoLoadSequence++;gallery=[];galleryDirty=false;galleryBusy=false;$('setlistPhoto').value='';$('cameraPhoto').value='';showGallery()}
async function loadPhotoForRecord(id){resetPhotoEditor();const seq=photoLoadSequence;galleryBusy=true;try{const items=await galleryItems(await getStoredPhoto(id));if(seq!==photoLoadSequence)return;gallery=items;showGallery()}catch(e){if(seq===photoLoadSequence)$('photoStatus').textContent='写真読み込み失敗: '+e.message}finally{if(seq===photoLoadSequence)galleryBusy=false}}
async function persistPhotoForRecord(id){if(!galleryDirty)return;const existing=await galleryItems(await getStoredPhoto(id));await photoOperation('readwrite',id,mergeGallery(existing,gallery))}
async function compressPhoto(file){const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.78)}finally{URL.revokeObjectURL(url)}}
for(const id of ['setlistPhoto','cameraPhoto'])$(id).onchange=async ev=>{const files=[...ev.target.files];ev.target.value='';if(galleryBusy)return;const seq=photoLoadSequence;galleryBusy=true;try{for(const file of files){try{const src=await compressPhoto(file);if(seq!==photoLoadSequence)return;gallery.push({id:crypto.randomUUID(),src,comment:'',updatedAt:new Date().toISOString()});galleryDirty=true}catch(e){alert('写真を読み込めません: '+file.name)}}if(seq===photoLoadSequence)showGallery()}finally{if(seq===photoLoadSequence)galleryBusy=false}};
$('closeZoom').onclick=()=>$('photoZoom').close();

// Printable, self-contained HTML notebook export. Existing CSV export is unchanged.
function notebookEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function photoDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
async function notebookHTML(selectedRecords=records){
  const sorted=[...selectedRecords].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const sections=[];
  for(const e of sorted){
    let photo='';
    try{for(const item of await galleryItems(await getStoredPhoto(e.id))){if(!item.deleted&&/^data:image\/(jpeg|png|webp|gif);base64,/i.test(item.src))photo+='<figure style="width:40mm;max-width:100%;flex:0 0 40mm;margin:0 0 2mm;break-inside:avoid"><img style="display:block;width:40mm;height:30mm;max-width:100%;object-fit:contain;margin:0 auto" src="'+notebookEscape(item.src)+'" alt="公演写真"><figcaption>'+notebookEscape(item.comment||'公演写真')+'</figcaption></figure>'}}catch(err){console.warn('写真の取得に失敗:',err)}
    const songs=Array.isArray(e.setlist)?e.setlist:[];
    const setlist=songs.length?'<ol>'+songs.map(s=>'<li>'+notebookEscape(s.title||'（曲名未入力）')+(s.composer?' <span class="composer">／ '+notebookEscape(s.composer)+'</span>':'')+'</li>').join('')+'</ol>':'<p class="muted">未登録</p>';
    const fields=[['演奏・歌唱',e.music],['音響',e.sound],['演出',e.stage],['総合満足度',e.overall]].map(([k,v])=>'<div class="rating"><span>'+k+'</span><strong>'+notebookEscape(v??'—')+' / 5</strong></div>').join('');
    sections.push('<article><div class="date">'+notebookEscape(e.date||'開催日未入力')+'</div><h2>'+notebookEscape(e.title||'公演名未入力')+'</h2><div class="meta">'+[e.venue&&'会場：'+notebookEscape(e.venue),e.artist&&'出演者：'+notebookEscape(e.artist),e.doorsOpen&&'開場：'+notebookEscape(e.doorsOpen),e.showStart&&'開演：'+notebookEscape(e.showStart),e.showEnd&&'終演：'+notebookEscape(e.showEnd)].filter(Boolean).join('<br>')+'</div><h3>評価</h3><div class="ratings">'+fields+'</div><h3>感想・メモ</h3><div class="memo">'+notebookEscape(e.memo||'未記入')+'</div><h3>セットリスト（'+songs.length+'曲）</h3>'+setlist+(photo?'<h3>公演写真</h3><div class="notebook-photos">'+photo+'</div>':'')+'<section class="handwritten-notes"><h3>手書き感想・メモ欄</h3><p class="handwriting-hint">印刷後に自由に書き込んでください</p><div class="writing-lines">'+Array.from({length:8},()=>'<div class="writing-line"></div>').join('')+'</div></section></article>');
  }
  const css='@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:"Yu Gothic","Meiryo",system-ui,sans-serif;color:#182338;max-width:850px;margin:0 auto;padding:24px;background:#fff;line-height:1.65}header{border-bottom:3px solid #243f76;padding-bottom:12px;margin-bottom:25px}h1{font-size:24px;margin:0}h2{font-size:20px;margin:6px 0 10px}h3{font-size:15px;margin:20px 0 6px;color:#243f76}.sub,.muted,.date,.meta,.composer{color:#596579}.date{font-weight:bold}article{padding:18px 0 25px;border-bottom:1px solid #cbd5e1;break-inside:avoid-page}.ratings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.rating{display:flex;justify-content:space-between;gap:12px;border:1px solid #dce3ee;border-radius:6px;padding:7px 10px}.memo{white-space:pre-wrap;overflow-wrap:anywhere}ol{padding-left:26px}li{padding:3px 0;overflow-wrap:anywhere} .notebook-photos{display:flex;flex-wrap:wrap;gap:3mm;align-items:flex-start}.notebook-photos figure{margin:0 0 2mm;width:40mm;max-width:100%;min-width:0;break-inside:avoid;page-break-inside:avoid}.notebook-photos img{display:block;width:auto;height:auto;max-width:100%;max-height:30mm;object-fit:contain;margin:0 auto}.notebook-photos figcaption{font-size:11px;color:#596579;line-height:1.35;text-align:center;overflow-wrap:anywhere}.handwritten-notes{margin-top:24px;break-inside:avoid-page;page-break-inside:avoid}.handwriting-hint{font-size:12px;color:#596579;margin:0 0 8px}.writing-lines{margin-top:8px}.writing-line{height:29px;border-bottom:1px solid #a9b4c4}.printbtn{background:#243f76;color:white;border:0;padding:10px 18px;border-radius:8px;cursor:pointer;margin:14px 0}@media print{body{padding:0;max-width:none}.printbtn{display:none}article{break-inside:auto}h2,h3{break-after:avoid}figure{break-inside:avoid}}';
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>コンサート鑑賞ノート</title><style>'+css+'</style></head><body><header><h1>🎵 コンサート鑑賞ノート</h1><div class="sub">'+sorted.length+'公演の記録 ／ 写真コンパクト版2 ／ 作成日 '+new Date().toLocaleDateString('ja-JP')+'</div></header><button class="printbtn" onclick="window.print()">印刷・PDF保存</button><button class="printbtn" onclick="downloadNotebook()">HTMLを保存</button><script>function downloadNotebook(){const c=document.documentElement.cloneNode(true);const buttons=c.querySelectorAll(".printbtn");buttons.forEach(b=>b.remove());const blob=new Blob(["<!doctype html>\n"+c.outerHTML],{type:"text/html;charset=utf-8"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download="concert-notebook.html";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}</script>'+(sections.join('')||'<p>公演記録がありません。</p>')+'</body></html>';
}
$('exportNote').onclick=async()=>{if(!records.length){alert('出力する公演記録がありません。');return}const btn=$('exportNote');btn.disabled=true;try{const html=await notebookHTML(),blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='concert-notebook-'+new Date().toISOString().slice(0,10)+'.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(err){alert('ノートの出力に失敗しました: '+err.message)}finally{btn.disabled=false}};
$('printNote').onclick=async()=>{if(!records.length){alert('印刷する公演記録がありません。');return}const popup=window.open('','_blank');if(!popup){alert('印刷画面が開けませんでした。ポップアップを許可するか、HTML形式で保存して開いてください。');return}popup.document.write('<!doctype html><html lang="ja"><meta charset="utf-8"><title>準備中</title><body>ノートを準備しています…</body></html>');popup.document.close();try{const html=await notebookHTML();popup.document.open();popup.document.write(html);popup.document.close();popup.focus()}catch(err){popup.document.body.textContent='印刷用ノートの作成に失敗しました: '+err.message}};

// Single-event notebook: preview in a new tab, with print/PDF and HTML save buttons.
async function openSingleNotebook(id){
  const event=records.find(r=>r.id===id);
  if(!event){alert('公演が見つかりません。');return}
  const popup=window.open('','_blank');
  if(!popup){alert('ノートを開けません。ポップアップを許可してください。');return}
  popup.document.write('<!doctype html><html lang="ja"><meta charset="utf-8"><title>準備中</title><body>鑑賞ノートを準備しています…</body></html>');
  popup.document.close();
  try{
    const html=await notebookHTML([event]);
    if(popup.closed)return;
    popup.document.open();popup.document.write(html);popup.document.close();popup.focus();
  }catch(err){if(!popup.closed)popup.document.body.textContent='ノートの作成に失敗しました: '+err.message}
}


// Google Drive appDataFolder synchronization. No server credentials are embedded.
// Existing localStorage + IndexedDB remain the source for offline access.
const CLOUD_FILE='concert-rating-cloud-v1.json', CLOUD_ENABLED='concert-cloud-enabled-v2';
let cloudBusy=false, cloudTimer=null, cloudDirty=false;
const cloudMsg=s=>{$('cloudStatus').textContent=s};
function scheduleCloudSync(){cloudDirty=true;if(!localStorage.getItem(CLOUD_ENABLED)||!token)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>runCloudSync(false).catch(console.warn),2500)}
function canonicalId(id){const m=/^conflict-(gcal-.*)-[a-z0-9]+$/.exec(id||'');return m?m[1]:id}
function hasValue(v){return v!==undefined&&v!==null&&v!==''&&!(Array.isArray(v)&&!v.length)}
function combineRecord(local,remote){
 // Prefer the most recently edited version when both sides have a value.
 // Empty fields never erase existing comments, ratings or setlists.
 const localTime=Date.parse(local.updatedAt||'')||0;
 const remoteTime=Date.parse(remote.updatedAt||'')||0;
 const newer=remoteTime>localTime?remote:local;
 const older=newer===remote?local:remote;
 const result={...older,...newer};
 for(const key of new Set([...Object.keys(local),...Object.keys(remote)])){
  if(key==='id')continue;
  if(['doorsOpen','showStart','showEnd','calendarSynced'].includes(key)&&newer.calendarPublish&&Object.prototype.hasOwnProperty.call(newer,key))continue;
  if(key==='title'){
   result.title=String(newer.title||older.title||'').replace(/（同期時の別バージョン）/g,'');
  }else if(!hasValue(newer[key])&&hasValue(older[key])){
   result[key]=older[key];
  }
 }
 return result;
}
// Match only an unambiguous manually-created copy to an existing calendar event.
// Never merge two calendar events merely because their titles/dates match.
function concertMatchKey(r){return String(r.date||'')+'\u0001'+String(r.title||'').replace(/（同期時の別バージョン）/g,'').trim().replace(/\s+/g,' ')}
function dedupeCalendarTwins(list){
 const groups=new Map();
 for(const r of list){const key=concertMatchKey(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
 const remove=new Set();
 for(const group of groups.values()){
  const calendar=group.filter(r=>String(r.id||'').startsWith('gcal-'));
  const manual=group.filter(r=>!r.calendarPublish&&!String(r.id||'').startsWith('gcal-'));
  if(calendar.length!==1||manual.length!==1||group.length!==2)continue;
  const target=calendar[0],extra=manual[0];
  // Preserve user edits even if the imported calendar record is newer.
  const merged=combineRecord(target,extra);
  for(const field of ['doorsOpen','showStart','showEnd','memo','artist'])if(hasValue(extra[field]))merged[field]=extra[field];
  if(Array.isArray(extra.setlist)&&extra.setlist.length)merged.setlist=extra.setlist;
  for(const field of ['music','sound','stage','overall'])if(hasValue(extra[field]))merged[field]=extra[field];
  Object.assign(target,merged,{id:target.id,source:'calendar'});
  remove.add(extra);
 }
 return list.filter(r=>!remove.has(r));
}
function normalizeRecords(list){
 const map=new Map();
 for(const entry of list){
  if(!entry||typeof entry.id!=='string')continue;
  const id=canonicalId(entry.id),r={...entry,id};
  if(typeof r.title==='string')r.title=r.title.replace(/（同期時の別バージョン）/g,'');
  if(!map.has(id))map.set(id,r);
  else map.set(id,combineRecord(map.get(id),r));
 }
 return dedupeCalendarTwins([...map.values()]);
}
function mergeRecords(remote){
 const previous=JSON.stringify(records);
 const combined=[...records,...remote].filter(r=>!isDeleted(r.id));records=normalizeRecords(combined).filter(r=>!isDeleted(r.id));
 const photoAlias={};for(const old of combined){if(!records.some(r=>r.id===old.id)){const matches=records.filter(r=>concertMatchKey(r)===concertMatchKey(old));if(matches.length===1)photoAlias[old.id]=matches[0].id}}
 return {changed:previous!==JSON.stringify(records),conflicts:0,photoAlias};
}
async function driveRequest(url,opts={}){const res=await fetch(url,{...opts,headers:{Authorization:'Bearer '+token,...(opts.headers||{})}});if(!res.ok){const txt=(await res.text()).slice(0,250);throw Error('Google Drive API '+res.status+' '+txt)}return res}
async function findCloudFile(){const u=new URL('https://www.googleapis.com/drive/v3/files');u.searchParams.set('spaces','appDataFolder');u.searchParams.set('q',"name = '"+CLOUD_FILE+"' and trashed = false");u.searchParams.set('fields','files(id,name),nextPageToken');u.searchParams.set('page_size','100');const res=await driveRequest(u);const data=await res.json();return data.files?.[0]||null}
async function fetchCloudFile(id){
 const res=await driveRequest('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media');
 const etag=res.headers.get('ETag');const obj=await res.json();
 if(obj.schema!==1||!Array.isArray(obj.records)||typeof obj.photos!=='object'||obj.photos===null)throw Error('クラウドデータ形式が異なります');
 return {data:obj,etag};
}
async function writeCloudFile(file,snapshot,etag){
 const boundary='concert'+crypto.randomUUID().replace(/-/g,'');
 const metadata=file?{}:{name:CLOUD_FILE,parents:['appDataFolder'],mimeType:'application/json'};
 const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(snapshot)+'\r\n--'+boundary+'--\r\n';
 const u=file?'https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(file.id)+'?uploadType=multipart':'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
 // If the server supplies an ETag, reject writes against a changed remote version.
 const headers={'Content-Type':'multipart/related; boundary='+boundary};if(file&&etag)headers['If-Match']=etag;
 await driveRequest(u,{method:file?'PATCH':'POST',headers,body});
}
// Build the complete cloud/backup payload. The previous release called this function
// without defining it, which caused "createSnapshot is not defined" on both devices.
async function createSnapshot(){
 const photos={};
 for(const r of records){
  if(!r||typeof r.id!=='string')continue;
  const blob=await getStoredPhoto(r.id);
  if(blob)photos[r.id]=await galleryItems(blob);
 }
 return {schema:1,exportedAt:new Date().toISOString(),records:JSON.parse(JSON.stringify(records)),photos,deletedIds:{...deletedIds}};
}
function downloadSnapshot(snapshot){
 const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='concert-complete-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
// Explicit restore of a verified complete backup. Never silently replace local records.
$('restoreBackup').onclick=()=>{
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{
  if(!input.files?.length)return;
  try{
   const data=JSON.parse(await input.files[0].text());
   if(data.schema!==1||!Array.isArray(data.records)||!data.photos||typeof data.photos!=='object')throw Error('完全バックアップの形式ではありません');
   if(!confirm('現在の端末の記録を、選択したバックアップの'+data.records.length+'件に置き換えます。事前に現在の完全バックアップを保存しましたか？'))return;
   deletedIds={...deletedIds,...(data.deletedIds&&typeof data.deletedIds==='object'?data.deletedIds:{})};persistDeletedIds();
   records=normalizeRecords(data.records).filter(r=>!isDeleted(r.id));
   for(const [id,uri] of Object.entries(data.photos)){
    if(!records.some(r=>r.id===id))continue;
    await photoOperation('readwrite',id,await decodeGallery(uri));
   }
   localStorage.setItem(KEY,JSON.stringify(records));render();scheduleCloudSync();
   cloudMsg('復元完了：'+records.length+'公演。Google接続後に同期結果を確認してください。');
  }catch(e){cloudMsg('復元できません: '+e.message)}
 };
 input.click();
};
$('backupAll').onclick=async()=>{
 try{downloadSnapshot(await createSnapshot());cloudMsg('端末の完全バックアップを保存しました。');}
 catch(e){cloudMsg('バックアップに失敗しました: '+e.message);}
};
async function mergeCloudPhotos(remote,aliases={}){let count=0;for(const [remoteId,uri] of Object.entries(remote)){const id=canonicalId(aliases[remoteId]||remoteId);if(!records.some(r=>r.id===id))continue;const existing=await galleryItems(await getStoredPhoto(id));const merged=mergeGallery(existing,await decodeGallery(uri));if(JSON.stringify(existing)!==JSON.stringify(merged)){await photoOperation('readwrite',id,merged);count++}}return count}
async function runCloudSync(manual=true){
 if(!token){cloudMsg('Googleへの接続が必要です。「Googleに接続」を押してください。');return}
 if(!localStorage.getItem(CLOUD_ENABLED)){cloudMsg('初回同期の設定が必要です');return}
 if(cloudBusy)return;
 cloudBusy=true;cloudDirty=false;cloudMsg('同期中です。画面を閉じずにお待ちください…');
 try{
  const file=await findCloudFile();
  const result=file?await fetchCloudFile(file.id):null;
  const remote=result?result.data:{schema:1,records:[],photos:{}};
  // Keep a safety snapshot of the pre-merge local records before changing local storage.
  const before=JSON.stringify(records);
  for(const [id,stamp] of Object.entries(remote.deletedIds||{})){if(!deletedIds[id]||String(stamp)>String(deletedIds[id]))deletedIds[id]=stamp}
  persistDeletedIds();
  const {changed,conflicts,photoAlias}=mergeRecords(remote.records);
  const photosAdded=await mergeCloudPhotos(remote.photos,photoAlias);
  if(changed){localStorage.setItem(KEY,JSON.stringify(records));render()}
  const snapshot=await createSnapshot();
  for(const [remoteId,uri] of Object.entries(remote.photos)){
   const id=canonicalId(photoAlias[remoteId]||remoteId);
   if(!snapshot.photos[id]&&records.some(r=>r.id===id))snapshot.photos[id]=uri;
  }
  // Do not upload identical data repeatedly; prevents unnecessary whole-file rewrites.
  const cloudComparable=JSON.stringify({records:remote.records,photos:remote.photos,deletedIds:remote.deletedIds||{}});
  const localComparable=JSON.stringify({records:snapshot.records,photos:snapshot.photos,deletedIds:snapshot.deletedIds||{}});
  if(cloudComparable!==localComparable)await writeCloudFile(file,snapshot,result?.etag);
  cloudMsg('同期完了：'+records.length+'公演、写真 '+Object.keys(snapshot.photos).length+'件'+(conflicts?'／別バージョン '+conflicts+'件を保護':'')+'。最終同期 '+new Date().toLocaleTimeString('ja-JP'));
 }catch(e){
  const message=String(e.message||e);
  if(/Google Drive API 401|Google Drive API 403/.test(message)){
   token=null;cloudMsg('Google接続の期限切れ・権限エラーです。「Googleに接続」で再認証してください。同期は停止しました。');
  }else if(/Google Drive API 412/.test(message)){
   cloudMsg('別端末が先にクラウドを更新しました。上書きせず停止しました。再度「今すぐ同期」を押してください。');
  }else cloudMsg('同期できません: '+message+'。元のバックアップは保管してください。');
  console.error(e);
 }finally{
  cloudBusy=false;
  if(cloudDirty&&token&&localStorage.getItem(CLOUD_ENABLED)){
   clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>runCloudSync(false),4000);
  }
 }
}
$('startCloud').onclick=async()=>{if(!token){alert('先にGoogleに接続してください');return}if(!confirm('AndroidとPCの両方で完全バックアップを保存しましたか？ 保存前なら「キャンセル」を押してください。'))return;localStorage.setItem(CLOUD_ENABLED,'1');await runCloudSync(true)};
$('cloudNow').onclick=()=>runCloudSync(true);
setInterval(()=>{if(token&&localStorage.getItem(CLOUD_ENABLED)&&!document.hidden)runCloudSync(false)},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token&&localStorage.getItem(CLOUD_ENABLED))runCloudSync(false)});
if(localStorage.getItem(CLOUD_ENABLED))cloudMsg('自動同期設定済み。Googleに接続すると同期できます。');


// Open ChatGPT with a ready-to-paste concert-specific request.
// ChatGPT is a separate service; no API key is required and results are not imported automatically.
function openChatGPTSetlist(record){
 const details=[record.title&&'公演名：'+record.title,record.date&&'開催日：'+record.date,record.venue&&'会場：'+record.venue,record.artist&&'出演者：'+record.artist].filter(Boolean).join('\n');
 const prompt='次の公演の実際の演奏曲目（セットリスト）を、公開情報を調べて教えてください。\n'+details+'\n曲名・演奏順・作曲者が確認できれば整理し、情報源のURLを示してください。別の日や別会場の公演と混同せず、確認できない曲目は推測で補わず「未確認」と明記してください。';
 document.getElementById('chatgptPromptDialog')?.remove();
 const overlay=document.createElement('div');overlay.id='chatgptPromptDialog';overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:12px';
 const panel=document.createElement('div');panel.style.cssText='background:white;color:#172033;border-radius:14px;padding:18px;width:min(620px,100%);max-height:90vh;overflow:auto;box-sizing:border-box';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','ChatGPTへの質問文');
 const heading=document.createElement('h3');heading.textContent='ChatGPTでセットリストを検索';
 const info=document.createElement('p');info.textContent='質問文を入力したChatGPTを開きます。うまく入力されない場合は「手動でコピーする（予備）」を開いてください。';
 const area=document.createElement('textarea');area.value=prompt;area.readOnly=true;area.rows=9;area.style.cssText='width:100%;box-sizing:border-box;font-size:16px';area.setAttribute('aria-label','ChatGPTへの質問文');
 const status=document.createElement('p');status.style.cssText='font-size:14px;color:#475569';status.setAttribute('role','status');
 const prefill=document.createElement('button');prefill.type='button';prefill.textContent='✨ 質問文入りでChatGPTを開く';prefill.onclick=()=>{const url='https://chatgpt.com/?q='+encodeURIComponent(prompt);const tab=window.open(url,'_blank');if(!tab)status.textContent='ChatGPTを開けませんでした。ポップアップを許可してください。';else status.textContent='質問文が表示されない場合は、下の「手動でコピーする（予備）」をご利用ください。';};
 const backup=document.createElement('details');backup.style.cssText='margin:12px 0;padding:12px;border:1px solid #cbd5e1;border-radius:9px;background:#f8fafc';
 const summary=document.createElement('summary');summary.textContent='手動でコピーする（予備）';summary.style.cssText='cursor:pointer;font-weight:600';
 const guidance=document.createElement('p');guidance.className='muted';guidance.textContent='自動入力できない場合のみ使います。質問文をコピーしてからChatGPTを開き、入力欄に貼り付けてください。';
 const copy=document.createElement('button');copy.type='button';copy.className='secondary';copy.textContent='質問文をコピー';
 copy.onclick=async()=>{area.focus();area.select();try{if(!navigator.clipboard?.writeText||!window.isSecureContext)throw Error('手動コピー');await navigator.clipboard.writeText(prompt);status.textContent='コピーしました。ChatGPTを開いて貼り付けてください。'}catch{status.textContent='質問文を選択しました。パソコンは Ctrl+C、Androidは長押しして「コピー」を選んでください。'}};
 const open=document.createElement('a');open.href='https://chatgpt.com/';open.target='_blank';open.rel='noopener noreferrer';open.textContent='ChatGPTを開く（貼り付け用）';open.style.cssText='display:inline-block;margin:8px;color:#2458bd';
 backup.append(summary,guidance,area,copy,open);
 const close=document.createElement('button');close.type='button';close.className='secondary';close.textContent='閉じる';close.onclick=()=>overlay.remove();
 panel.append(heading,info,prefill,backup,status,close);overlay.append(panel);document.body.append(overlay);

}

setInterval(()=>{if(token&&!document.hidden&&records.some(r=>r.calendarPublish&&r.date&&r.calendarSynced!==JSON.stringify(calendarPayload(r))))sync()},60000);
