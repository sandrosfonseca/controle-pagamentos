// ---- CONFIGURAÇÃO GOOGLE SHEETS ----
const API_URL = "https://script.google.com/macros/s/AKfycbwhh8j1SFcU9IvWZKii7lYfyHIUf3gIFT3W4FA8Mhv6bKjbTTStJWArAynyLsKlb2d4tQ/exec";

// ---- ESTADO ----
let EMENDA = {num:"1039/2026", vereador:"Débora Camilo", valor_total:13000, proc:"11760/2025"};

let DATA = [];
let nextId=1, sortField='data', sortAsc=true, openRow=null, editingId=null, delTarget=null;
let importPending=[];
let loading = true;

// Carregar dados do Google Sheets ao iniciar
loadFromSheet();

// ---- FUNÇÕES GOOGLE SHEETS ----
async function loadFromSheet() {
  try {
    const response = await fetch(API_URL);
    const result = await response.json();
    if (result && result.result) {
      DATA = result.result.map((r) => ({
        id: r['ID'] || r['id'] || Math.random().toString(36).substr(2, 9),
        DataCadastro: r['DataCadastro'] || '',
        Emenda: r['Emenda'] || '',
        Vereador: r['Vereador(a)'] || '',
        PA_Emenda: r['PA Emenda'] || '',
        PA_Compra: r['PA Compra'] || '',
        Empenho: r['Empenho'] || '',
        Valor: parseFloat(r['Valor (R$)']) || 0,
        Saldo: parseFloat(r['Saldo (R$)']) || 0,
        Plano_despesa: r['Plano de despesa'] || '',
        Data: r['Data'] || '',
        Oficio: r['Ofício nº'] || '',
        Parcela: r['Parcela'] || '',
        Mes: r['Mês'] || '',
        Valor_pago: parseFloat(r['Valor pago (R$)']) || 0,
        PA_Pagto: r['PA Pagto nº'] || ''
      }));
      nextId = DATA.length + 1;
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showToast('Erro ao carregar dados da planilha', false);
  } finally {
    loading = false;
    render();
  }
}

async function saveToSheet(record, action = 'insert') {
  try {
    const payload = {
      action: action,
      data: {
        id: record.id,
        emenda: record.Emenda,
        vereador: record.Vereador,
        pa_emenda: record.PA_Emenda,
        pa_compra: record.PA_Compra,
        empenho: record.Empenho,
        valor: record.Valor,
        saldo: record.Saldo,
        plano_despesa: record.Plano_despesa,
        data: record.Data,
        oficio: record.Oficio,
        parcela: record.Parcela,
        mes: record.Mes,
        valor_pago: record.Valor_pago,
        pa_pagto: record.PA_Pagto
      }
    };
    
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showToast('Erro ao salvar na planilha', false);
    return false;
  }
}

async function deleteFromSheet(id) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'delete', id: id})
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir:', error);
    showToast('Erro ao excluir da planilha', false);
    return false;
  }
}

// ---- UTILS ----
const fmtR = v => 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const isoToDisplay = iso => { if(!iso)return''; const[y,m,d]=iso.split('-'); return d+'/'+m+'/'+y; };
const displayToISO = d => { if(!d||!d.includes('/'))return d||''; const[dd,mm,yy]=d.split('/'); return yy+'-'+mm+'-'+dd; };

// ---- VIEWS ----
function showView(v){
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(e=>e.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.getElementById('tab-'+v).classList.add('active');
  if(v==='lista'){editingId=null;render();}
  if(v==='novo'&&!editingId)resetForm();
  if(v==='import')resetImport();
}
function cancelForm(){editingId=null;showView('lista')}
function clearE(id){document.getElementById(id).classList.remove('show')}

// ---- HEADER ----
function updateHeader(){
  document.getElementById('eh-id').textContent='Emenda '+EMENDA.num;
  document.getElementById('eh-name').textContent='Vereador(a): '+EMENDA.vereador;
  document.getElementById('eh-ver').textContent='Proc. Adm. Câmara: '+EMENDA.proc;
  document.getElementById('tot-total').textContent=fmtR(EMENDA.valor_total);
  const util=DATA.reduce((s,r)=>s+Number(r.Valor_pago||0),0);
  const saldo=EMENDA.valor_total-util;
  document.getElementById('tot-util').textContent=fmtR(util);
  document.getElementById('tot-saldo').textContent=fmtR(saldo);
  const pct=EMENDA.valor_total>0?Math.min(100,Math.round(util/EMENDA.valor_total*100)):0;
  document.getElementById('prog-bar').style.width=pct+'%';
  document.getElementById('prog-pct').textContent=pct+'%';
}

function openEmendaEdit(){
  document.getElementById('me-num').value=EMENDA.num;
  document.getElementById('me-ver').value=EMENDA.vereador;
  document.getElementById('me-valor').value=EMENDA.valor_total;
  document.getElementById('me-proc').value=EMENDA.proc;
  document.getElementById('modal-emenda').classList.add('open');
}
function saveEmenda(){
  EMENDA.num=document.getElementById('me-num').value.trim()||EMENDA.num;
  EMENDA.vereador=document.getElementById('me-ver').value.trim()||EMENDA.vereador;
  EMENDA.valor_total=parseFloat(document.getElementById('me-valor').value)||EMENDA.valor_total;
  EMENDA.proc=document.getElementById('me-proc').value.trim()||EMENDA.proc;
  closeMo('modal-emenda');
  updateHeader();
  showToast('Cabeçalho atualizado!',true);
}

// ---- FORM ----
function resetForm(){
  ['f-emenda','f-vereador','f-pa-emenda','f-pa-compra','f-empenho','f-valor','f-saldo','f-plano','f-data','f-oficio','f-valor-pago','f-pa-pagto']
    .forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-parcela').value='';
  document.getElementById('f-mes').value='';
  // fill defaults from EMENDA
  document.getElementById('f-emenda').value=EMENDA.num;
  document.getElementById('f-vereador').value=EMENDA.vereador;
  document.querySelectorAll('.ferr').forEach(e=>e.classList.remove('show'));
  document.getElementById('form-title').textContent='Novo lançamento';
  document.getElementById('form-sub').innerHTML='Campos com <span style="color:var(--red)">*</span> são obrigatórios.';
  document.getElementById('btn-save').textContent='Salvar lançamento';
  document.getElementById('btn-del').style.display='none';
}

function loadForm(id) {
    const item = db.find(r => r.ID == id);
    if (!item) return;

    // Preenche os campos normais
    document.getElementById('f-emenda').value = item['Emenda'] || '';
    document.getElementById('f-vereador').value = item['Vereador(a)'] || '';
    document.getElementById('f-pa-emenda').value = item['PA Emenda'] || '';
    document.getElementById('f-pa-compra').value = item['PA Compra'] || '';
    document.getElementById('f-empenho').value = item['Empenho'] || '';
    document.getElementById('f-valor').value = item['Valor (R$)'] || '';
    document.getElementById('f-saldo').value = item['Saldo (R$)'] || '';
    document.getElementById('f-plano').value = item['Plano de despesa'] || '';
    document.getElementById('f-oficio').value = item['Ofício nº'] || '';
    document.getElementById('f-parcela').value = item['Parcela'] || '';
    document.getElementById('f-mes').value = item['Mês'] || '';
    document.getElementById('f-valor-pago').value = item['Valor pago (R$)'] || '';
    document.getElementById('f-pa-pagto').value = item['PA Pagto nº'] || '';

    // --- CORREÇÃO DA DATA ---
    let dataRaw = item['Data'] || '';
    let dataISO = '';

    if (dataRaw) {
        // Se já estiver no formato ISO (vier do próprio input), mantém
        if (dataRaw.includes('-')) {
            dataISO = dataRaw.split('T')[0]; 
        } 
        // Se estiver no formato BR (DD/MM/YYYY) vindo da planilha, converte
        else if (dataRaw.includes('/')) {
            const parts = dataRaw.split('/');
            if (parts.length === 3) {
                // parts[2] = Ano, parts[1] = Mês, parts[0] = Dia
                dataISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
    }
    document.getElementById('f-data').value = dataISO;
    // ------------------------

    // Atualiza o estado da edição
    editId = id;
    document.getElementById('form-title').innerText = 'Editar Pagamento';
    document.getElementById('btn-save').innerText = 'Atualizar';
    document.getElementById('btn-cancel').style.display = 'inline-block';
    
    // Rola até o formulário
    document.getElementById('form-container').scrollIntoView({ behavior: 'smooth' });
}

function validateAll(){
  let ok=true;
  const req=[['f-emenda','e-emenda'],['f-vereador','e-vereador'],['f-pa-emenda','e-pa-emenda'],
    ['f-pa-compra','e-pa-compra'],['f-empenho','e-empenho'],['f-data','e-data'],
    ['f-oficio','e-oficio'],['f-parcela','e-parcela'],['f-mes','e-mes'],['f-pa-pagto','e-pa-pagto']];
  req.forEach(([fi,ei])=>{if(!document.getElementById(fi).value.trim()){document.getElementById(ei).classList.add('show');ok=false}});
  if(isNaN(parseFloat(document.getElementById('f-valor').value))||parseFloat(document.getElementById('f-valor').value)<0){document.getElementById('e-valor').classList.add('show');ok=false}
  if(isNaN(parseFloat(document.getElementById('f-saldo').value))||parseFloat(document.getElementById('f-saldo').value)<0){document.getElementById('e-saldo').classList.add('show');ok=false}
  if(isNaN(parseFloat(document.getElementById('f-valor-pago').value))||parseFloat(document.getElementById('f-valor-pago').value)<0){document.getElementById('e-valor-pago').classList.add('show');ok=false}
  return ok;
}

function saveForm(){
  if(!validateAll()){showToast('Corrija os campos em vermelho.',false);return}
  const iso=document.getElementById('f-data').value;
  const rec={
    id: editingId || nextId++,
    Emenda: document.getElementById('f-emenda').value.trim(),
    Vereador: document.getElementById('f-vereador').value.trim(),
    PA_Emenda: document.getElementById('f-pa-emenda').value.trim(),
    PA_Compra: document.getElementById('f-pa-compra').value.trim(),
    Empenho: document.getElementById('f-empenho').value.trim(),
    Valor: parseFloat(document.getElementById('f-valor').value),
    Saldo: parseFloat(document.getElementById('f-saldo').value),
    Plano_despesa: document.getElementById('f-plano').value.trim(),
    Data: isoToDisplay(iso),
    Oficio: document.getElementById('f-oficio').value.trim(),
    Parcela: document.getElementById('f-parcela').value,
    Mes: document.getElementById('f-mes').value,
    Valor_pago: parseFloat(document.getElementById('f-valor-pago').value),
    PA_Pagto: document.getElementById('f-pa-pagto').value.trim(),
  };
  if(editingId){
    const i=DATA.findIndex(r=>r.id===editingId);
    if(i!==-1)DATA[i]=rec;
    saveToSheet(rec, 'update');
    showToast('Lançamento atualizado!',true);
  }else{
    DATA.push(rec);
    nextId++;
    saveToSheet(rec, 'insert');
    showToast('Lançamento salvo!',true);
  }
  editingId=null;showView('lista');
}

function editRecord(id){
  const r=DATA.find(x=>x.id===id);if(!r)return;
  editingId=id;loadForm(r);
  document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.ntab').forEach(e=>e.classList.remove('active'));
  document.getElementById('view-novo').classList.add('active');
  document.getElementById('tab-novo').classList.add('active');
  window.scrollTo(0,0);
}

// ---- DELETE ----
function confirmDel(){
  if(!editingId)return;
  delTarget=editingId;
  const r=DATA.find(x=>x.id===editingId);
  document.getElementById('md-del-body').textContent='Excluir lançamento do empenho '+r.empenho+'? Esta ação não pode ser desfeita.';
  document.getElementById('modal-del').classList.add('open');
}
function deleteRecord(id){
  delTarget=id;
  const r=DATA.find(x=>x.id===id);
  document.getElementById('md-del-body').textContent='Excluir lançamento do empenho '+r.empenho+'? Esta ação não pode ser desfeita.';
  document.getElementById('modal-del').classList.add('open');
}
function closeMo(id){document.getElementById(id).classList.remove('open')}
async function delConfirm(){
  const idToDelete = delTarget;
  DATA=DATA.filter(r=>r.id!==delTarget);
  closeMo('modal-del');
  await deleteFromSheet(idToDelete);
  showToast('Lançamento excluído.',true);
  editingId=null;delTarget=null;render();
}

// ---- TOAST ----
let ttmr;
function showToast(msg,ok){
  const el=document.getElementById('toast');
  document.getElementById('tm').textContent=msg;
  document.getElementById('ti').textContent=ok?'✓':'!';
  el.className='toast '+(ok?'tok':'terr');el.classList.add('show');
  clearTimeout(ttmr);ttmr=setTimeout(()=>el.classList.remove('show'),3200);
}

// ---- SORT / RENDER ----
function sortBy(f){if(sortField===f)sortAsc=!sortAsc;else{sortField=f;sortAsc=true}render()}

function render(){
  const q=(document.getElementById('search').value||'').toLowerCase();
  const fm=document.getElementById('fil-mes').value;
  let rows=DATA.filter(r=>{
    if(fm&&r.mes!==fm)return false;
    if(q&&![r.empenho,r.pa_compra,r.pa_emenda,r.pa_pagto,r.plano_despesa,r.mes].some(s=>String(s||'').toLowerCase().includes(q)))return false;
    return true;
  });
  rows.sort((a,b)=>{
    let va=a[sortField],vb=b[sortField];
    if(['valor','saldo','valor_pago'].includes(sortField)){return sortAsc?va-vb:vb-va}
    va=String(va||'');vb=String(vb||'');
    return sortAsc?va.localeCompare(vb,'pt-BR'):vb.localeCompare(va,'pt-BR');
  });
  updateHeader();
  document.getElementById('tab-count').textContent=DATA.length;
  document.getElementById('count-label').textContent=rows.length+' lançamento'+(rows.length!==1?'s':'');
  ['emenda','pa_emenda','pa_compra','empenho','valor','saldo','data','oficio','mes','valor_pago','pa_pagto'].forEach(f=>{
    const el=document.getElementById('s-'+f);
    if(el)el.textContent=sortField===f?(sortAsc?'↑':'↓'):'';
  });
  const tbody=document.getElementById('tbody');tbody.innerHTML='';
  if(!rows.length){tbody.innerHTML='<tr><td colspan="11" class="empty">Nenhum lançamento encontrado.</td></tr>';return}

  rows.forEach((r,i)=>{
    const pb=r.Parcela==='única'?'<span class="badge b-uni">Única</span>':'<span class="badge b-parc">'+r.Parcela+'</span>';
    const mb='<span class="badge b-mes">'+r.Mes+'</span>';
    const tr=document.createElement('tr');tr.className='dr';
    tr.innerHTML=
      `<td class="mc">${r.Emenda}</td>`+
      `<td class="mc">${r.PA_Emenda}</td>`+
      `<td class="mc">${r.PA_Compra}</td>`+
      `<td class="mc">${r.Empenho}</td>`+
      `<td><span class="num">${fmtR(r.Valor)}</span></td>`+
      `<td><span class="num num-green">${fmtR(r.Saldo)}</span></td>`+
      `<td class="mc">${r.Data}</td>`+
      `<td class="mc">${r.Oficio}</td>`+
      `<td>${mb}</td>`+
      `<td><span class="num num-amber">${fmtR(r.Valor_pago)}</span></td>`+
      `<td class="mc">${r.PA_Pagto}</td>`;
    tr.onclick=()=>toggleDet(tr,r,i);
    tbody.appendChild(tr);
  });

  // summary row
  const totalVP=rows.reduce((s,r)=>s+Number(r.Valor_pago||0),0);
  const sr=document.createElement('tr');sr.className='sum-row';
  sr.innerHTML=
    `<td colspan="4">Total (${rows.length} lançamentos)</td>`+
    `<td></td><td></td><td></td><td></td><td></td>`+
    `<td>${fmtR(totalVP)}</td><td></td>`;
  tbody.appendChild(sr);
}

function toggleDet(tr,r,i){
  const ex=document.getElementById('det-'+i);
  if(ex){ex.remove();openRow=null;return}
  if(openRow!==null){const old=document.getElementById('det-'+openRow);if(old)old.remove()}
  openRow=i;
  const det=document.createElement('tr');det.id='det-'+i;det.className='det-row';
  det.innerHTML=`<td colspan="11">
    <div class="det-grid">
      <div class="di"><label>Vereador(a)</label><span>${r.Vereador}</span></div>
      <div class="di"><label>Plano de despesa</label><span class="mc">${r.Plano_despesa||'—'}</span></div>
      <div class="di"><label>Parcela</label><span>${r.Parcela}</span></div>
      <div class="di"><label>PA Pagto</label><span class="mc">${r.PA_Pagto}</span></div>
    </div>
    <div class="det-actions">
      <button class="btn" onclick="editRecord(${r.id});event.stopPropagation()">Editar</button>
      <button class="btn btn-danger" onclick="deleteRecord(${r.id});event.stopPropagation()">Excluir</button>
    </div>
  </td>`;
  det.onclick=e=>e.stopPropagation();
  tr.after(det);
}

// ---- EXPORT CSV ----
const CSV_COLS=['Emenda','Vereador','PA_Emenda','PA_Compra','Empenho','Valor','Saldo','Plano_despesa','Data','Oficio','Parcela','Mes','Valor_pago','PA_Pagto'];
const CSV_HEADER='"Emenda","Vereador","PA Emenda","PA Compra","Empenho","Valor (R$)","Saldo (R$)","Plano de despesa","Data","Ofício nº","Parcela","Mês","Valor pago (R$)","PA Pagto nº"';

function exportCSV(){
  const rows=DATA.map(r=>CSV_COLS.map(c=>`"${String(r[c]||'').replace(/"/g,'""')}"`).join(','));
  const csv=[CSV_HEADER,...rows].join('\r\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download='execucao_emenda_'+EMENDA.num.replace('/','_')+'.csv';
  a.click();
  showToast('CSV exportado!',true);
}

function downloadTemplate(){
  const sample=CSV_HEADER+'\r\n'+
    '"1039/2026","Débora Camilo","1090/2026-78","13940/2026-16","5916/2026","13000","9829.79","3.3.50.43","18/03/2026","1","única","Março","3170.21","1/2026-01"';
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(sample);
  a.download='template_execucao_emenda.csv';a.click();
}

// ---- IMPORT CSV ----
function resetImport(){
  importPending=[];
  document.getElementById('import-msg').style.display='none';
  document.getElementById('import-preview-wrap').style.display='none';
  document.getElementById('csv-file-input').value='';
}

function dragOver(e){e.preventDefault();document.getElementById('drop-zone').classList.add('drag')}
function dragLeave(){document.getElementById('drop-zone').classList.remove('drag')}
function dropFile(e){e.preventDefault();dragLeave();const f=e.dataTransfer.files[0];if(f)handleFile(f)}

function handleFile(file){
  if(!file){return}
  if(!file.name.endsWith('.csv')&&file.type!=='text/csv'){
    showImportMsg('Apenas arquivos .csv são aceitos.',false);return;
  }
  const reader=new FileReader();
  reader.onload=e=>{
    const text=e.target.result;
    parseCSV(text);
  };
  reader.readAsText(file,'UTF-8');
}

function parseCSV(text){
  const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l=>l.trim());
  if(lines.length<2){showImportMsg('O arquivo está vazio ou só contém o cabeçalho.',false);return}

  const header=lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/^"|"$/g,''));
  const required=['emenda','vereador','pa_emenda','pa_compra','empenho','valor','saldo','data','oficio','parcela','mes','valor_pago','pa_pagto'];
  const missing=required.filter(c=>!header.includes(c));
  if(missing.length){showImportMsg('Colunas ausentes: '+missing.join(', '),false);return}

  const parsed=[];
  const errors=[];
  for(let i=1;i<lines.length;i++){
    if(!lines[i].trim())continue;
    const cols=splitCSVLine(lines[i]);
    if(cols.length<header.length&&cols.length<required.length){errors.push('Linha '+(i+1)+': número insuficiente de colunas');continue}
    const row={};
    header.forEach((h,j)=>{row[h]=(cols[j]||'').replace(/^"|"$/g,'').trim()});
    // validate numbers
    if(isNaN(parseFloat(row.valor))||isNaN(parseFloat(row.saldo))||isNaN(parseFloat(row.valor_pago))){
      errors.push('Linha '+(i+1)+': valor, saldo ou valor_pago inválido');continue;
    }
    row.valor=parseFloat(row.valor);
    row.saldo=parseFloat(row.saldo);
    row.valor_pago=parseFloat(row.valor_pago);
    row.dataISO=displayToISO(row.data);
    row.id=null;
    parsed.push(row);
  }

  if(errors.length){showImportMsg('Erros encontrados:\n'+errors.slice(0,5).join('\n')+(errors.length>5?'\n... e mais '+(errors.length-5)+' erros':''),false);return}
  if(!parsed.length){showImportMsg('Nenhum registro válido encontrado.',false);return}

  importPending=parsed;
  showImportMsg(parsed.length+' registro(s) lidos com sucesso. Revise abaixo e confirme.',true);
  showPreview(parsed);
}

function splitCSVLine(line){
  const result=[];let cur='';let inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++}else inQ=!inQ}
    else if(c===','&&!inQ){result.push(cur);cur=''}
    else cur+=c;
  }
  result.push(cur);return result;
}

function showImportMsg(msg,ok){
  const el=document.getElementById('import-msg');
  el.textContent=msg;el.className='import-msg '+(ok?'import-ok':'import-err');el.style.display='block';
}

function showPreview(rows){
  const cols=['emenda','pa_compra','empenho','valor','saldo','data','mes','valor_pago','pa_pagto'];
  const thead='<thead><tr>'+cols.map(c=>'<th>'+c.replace('_',' ')+'</th>').join('')+'</tr></thead>';
  const tbody='<tbody>'+rows.slice(0,20).map(r=>'<tr>'+cols.map(c=>'<td>'+(r[c]||'')+'</td>').join('')+'</tr>').join('')+(rows.length>20?'<tr><td colspan="'+cols.length+'" style="text-align:center;color:var(--text3);font-family:var(--mono);font-size:11px">... e mais '+(rows.length-20)+' registros</td></tr>':'')+'</tbody>';
  document.getElementById('import-preview-tbl').innerHTML='<table>'+thead+tbody+'</table>';
  document.getElementById('import-count-lbl').textContent=rows.length+' registro(s) prontos para importar';
  document.getElementById('import-preview-wrap').style.display='block';
}

function confirmImport(){
  if(!importPending.length)return;
  const replace=document.getElementById('import-replace').checked;
  const newRows=importPending.map(r=>({...r,id:nextId++}));
  if(replace){DATA=newRows}
  else{DATA=[...DATA,...newRows]}
  showToast(importPending.length+' lançamento(s) importados!',true);
  importPending=[];
  showView('lista');
}

// ---- INIT ----
render();
