import { U, setGlcMode, setLipMode } from './units.js';
import { defaults, optimum, scenarios, getState, set, setMany, reset, applyOptimum, applyScenario, subscribe, exportJSON, importJSON, undo, redo, getSnapshots, setSnapshotA, setSnapshotB, getLastChanged, setLastChanged } from './state.js';
import { S, clamp, toFixed, parseNum, bmi, bodyFatPct, rmr, tdee_base, tdee_effective, kcal_extra_steps, kcal_extra_strength, intake_effective, energyBalance, weightChangePerWeek, mhr, vo2max, bpCategory, homaIR, eAG, ldl_mg, ldlDisplay, nonHDL_mg, tgHdlRatio, ldlCat, tgHdlCat, bmiCat, bfCat, glcBadge, metabolicSyndromeCount, derivedVector } from './engine.js';

// DOM helpers
const el = (id) => document.getElementById(id);
const q = (sel, root=document) => root.querySelector(sel);

// Toggle button active state
function setActive(btn, active){ btn.classList.toggle('active', !!active); }

// Inputs mapping
const inputKeys = ['sex','age','height_cm','weight_kg','waist_cm','rhr','sbp','dbp','pal','glucose','insulin','hba1c','tc','hdl','tg','kcal_intake','horizon_weeks','steps_extra','kcal_delta','strength_pw'];

function syncInputs(){ const st=getState(); inputKeys.forEach(k=>{ const n=el(k); if(!n) return; if(n.tagName==='SELECT'){ n.value = st[k]; } else { n.value = st[k]; } }); updateUnitLabels(); }

function bindInputs(){
  inputKeys.forEach(k=>{
    const n = el(k); if(!n) return;
    if(n.tagName==='SELECT'){
      n.addEventListener('change', ()=>{ set(k, n.value); setLastChanged(k); });
    } else {
      const handler = ()=>{ const v = parseNum(n.value); if(isFinite(v)) set(k, v); setLastChanged(k); };
      n.addEventListener('input', handler);
      n.addEventListener('change', handler);
    }
  });
}

function populateScenario(){ const sel=el('scenario'); sel.innerHTML=''; Object.keys(scenarios).forEach(name=>{ const o=document.createElement('option'); o.value=name; o.textContent=name; sel.appendChild(o); }); sel.addEventListener('change', ()=>applyScenario(sel.value)); }

function updateUnitLabels(){ el('u-glc-label').textContent = U.glc.mode==='mg' ? 'mg/dL' : 'mmol/L'; const lipUnit = U.lip.mode==='mg' ? 'mg/dL' : 'mmol/L'; el('u-lip-label-tc').textContent = lipUnit; el('u-lip-label-hdl').textContent = lipUnit; el('u-lip-label-tg').textContent = lipUnit; }

function bindControls(){
  document.querySelector('[data-action="reset"]').addEventListener('click', ()=> reset());
  document.querySelector('[data-action="optimum"]').addEventListener('click', ()=> applyOptimum());
  document.querySelector('[data-action="undo"]').addEventListener('click', ()=> undo());
  document.querySelector('[data-action="redo"]').addEventListener('click', ()=> redo());

  // Units
  const glcMg = document.querySelector('[data-action="glc-mg"]');
  const glcMmol = document.querySelector('[data-action="glc-mmol"]');
  const lipMg = document.querySelector('[data-action="lip-mg"]');
  const lipMmol = document.querySelector('[data-action="lip-mmol"]');
  glcMg.addEventListener('click', ()=>{ setGlcMode('mg', getState()); setActive(glcMg,true); setActive(glcMmol,false); syncInputs(); render(); });
  glcMmol.addEventListener('click', ()=>{ setGlcMode('mmol', getState()); setActive(glcMg,false); setActive(glcMmol,true); syncInputs(); render(); });
  lipMg.addEventListener('click', ()=>{ setLipMode('mg', getState()); setActive(lipMg,true); setActive(lipMmol,false); syncInputs(); render(); });
  lipMmol.addEventListener('click', ()=>{ setLipMode('mmol', getState()); setActive(lipMg,false); setActive(lipMmol,true); syncInputs(); render(); });

  // Export/Import
  document.querySelector('[data-action="export"]').addEventListener('click', ()=>{
    const blob = new Blob([exportJSON()], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='physio-sandbox.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 500);
  });
  el('import_file').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const text = await file.text();
    try { const obj = JSON.parse(text); importJSON(obj); } catch(err){ alert('Import fehlgeschlagen: ungültiges JSON'); }
    e.target.value = '';
  });

  // A/B
  document.querySelector('[data-action="snapA"]').addEventListener('click', ()=> setSnapshotA());
  document.querySelector('[data-action="snapB"]').addEventListener('click', ()=> setSnapshotB());
  document.querySelector('[data-action="clearAB"]').addEventListener('click', ()=> { importJSON({state:getState(), snapA:null, snapB:null}); });
}

// Render helpers
function renderCard(id, title, valueStr, badges=[], note=''){
  const cardsEl = el('cards');
  let div = document.getElementById('card-'+id);
  if(!div){ div = document.createElement('div'); div.className='card'; div.id='card-'+id; cardsEl.appendChild(div); }
  const html = `<h3>${title}</h3><div class="value">${valueStr}</div>${badges.length?`<div class="badges">${badges.map(b=>`<span class=\"badge ${b[1]}\">${b[0]}</span>`).join('')}</div>`:''}${note?`<div class=\"muted\">${note}</div>`:''}`;
  if(div.innerHTML!==html){ div.innerHTML = html; div.classList.add('flash'); setTimeout(()=>div.classList.remove('flash'), 520); }
}

function mmolSuffix(mg, kind){ if(!isFinite(mg)) return ''; let factor=1; if(kind==='glucose') factor=18.0182; if(kind==='chol') factor=38.67; if(kind==='tg') factor=88.57; const mmol = mg / factor; return ` (≈ ${mmol.toFixed(2)} mmol/L)`; }

function drawChart(st){
  const chart = el('chart');
  const weeks = clamp(st.horizon_weeks||12,1,52); el('h-weeks').textContent = weeks;
  const dw = weightChangePerWeek(st);
  const pts = []; for(let i=0;i<=weeks;i++){ const w = st.weight_kg + dw*i; pts.push([i, w]); }
  const pad = {l:40,r:10,t:10,b:24}; const W=600, H=180; const xMax = weeks; const yVals = pts.map(p=>p[1]); const yMin = Math.min(...yVals)*0.995; const yMax = Math.max(...yVals)*1.005;
  const x = v=> pad.l + (W-pad.l-pad.r)*(v/xMax);
  const y = v=> pad.t + (H-pad.t-pad.b)*(1-(v-yMin)/(yMax-yMin||1));
  const path = pts.map((p,i)=> `${i?'L':'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
  const y0 = y(st.weight_kg);
  chart.innerHTML = `
    <rect x="0" y="0" width="600" height="180" fill="none" />
    <path d="${path}" fill="none" stroke="currentColor" stroke-width="2" />
    <line x1="${x(0)}" y1="${y0}" x2="${x(xMax)}" y2="${y0}" stroke="currentColor" stroke-width="1" opacity="0.3" />
    <text x="${x(0)}" y="${y0-6}" font-size="10" fill="currentColor" opacity="0.6">Start: ${st.weight_kg.toFixed(1)} kg</text>
    <text x="${x(xMax)}" y="${y(pts[pts.length-1][1])+12}" font-size="10" fill="currentColor" opacity="0.8" text-anchor="end">${pts[pts.length-1][1].toFixed(1)} kg</text>
    <text x="${x(xMax)}" y="${H-6}" font-size="10" fill="currentColor" opacity="0.6" text-anchor="end">${weeks} Wochen</text>
  `;
}

let prevDerived = null;
const norm = { BMI:1, KFA:1, RMR:50, TDEE:50, EB:100, dW:0.1, VO2:1, HOMA:0.2, LDL:5, TGHDL:0.1, MS:1 };
function sensitivityItems(newD, oldD){ if(!oldD) return []; const items = Object.keys(newD).map(k=>{ const delta = newD[k]-oldD[k]; const score = Math.abs(delta)/(norm[k]||1); return {k, delta, score}; }); items.sort((a,b)=> b.score-a.score); return items.slice(0,5); }

function render(){
  const st = getState();
  el('cards').innerHTML = '';

  // Body composition
  renderCard('bmi', 'BMI', toFixed(bmi(st),1), [bmiCat(st), [`KFA ≈ ${toFixed(bodyFatPct(st),1)} %`, 'v']], 'Körperfett: Deurenberg‑Schätzung.');

  // Energy & interventions
  const tdeeB = tdee_base(st), tdeeE = tdee_effective(st), eb = energyBalance(st), dW = weightChangePerWeek(st);
  const ebBadge = eb>100 ? ['Überschuss', S.Y] : (eb<-100 ? ['Defizit', S.Y] : ['≈ ausgeglichen', S.G]);
  const dWstr = `${dW>=0?'+':''}${toFixed(dW,2)} kg/Woche`;
  const kSteps = kcal_extra_steps(st); const kStr = kcal_extra_strength(st); const intakeEff = intake_effective(st);
  renderCard('energy', 'Energiebilanz (effektiv)', `${Math.round(eb)} kcal/Tag`, [ebBadge, [dWstr,'v']], `TDEE(basis) ${Math.round(tdeeB)} + Schritte ${Math.round(kSteps)} + Kraft ${Math.round(kStr)} = ${Math.round(tdeeE)} kcal/Tag; Zufuhr = Basis ${Math.round(st.kcal_intake)} ${st.kcal_delta>=0?'+':'−'} ${Math.abs(Math.round(st.kcal_delta))} = ${Math.round(intakeEff)} kcal/Tag.`);
  renderCard('rmr', 'Grundumsatz (RMR)', `${Math.round(rmr(st))} kcal/Tag`, [[`PAL ×${toFixed(st.pal,2)}`, 'b']], 'Mifflin‑St. Jeor.');
  renderCard('tdee', 'Gesamtumsatz (TDEE effektiv)', `${Math.round(tdeeE)} kcal/Tag`, [[`Basis ${Math.round(tdeeB)}`, 'b'], [`+Schritte ${Math.round(kSteps)}`, 'b'], [`+Kraft ${Math.round(kStr)}`, 'b']]);

  // Fitness & BP
  renderCard('vo2', 'VO₂max (geschätzt)', `${toFixed(vo2max(st),1)} ml/kg/min`, [[`MHR≈${Math.round(mhr(st))} bpm`, 'b']], 'Uth‑Sørensen: 15.3 × (MHR/RHR).');
  renderCard('bp', 'Blutdruck‑Kategorie', `${st.sbp}/${st.dbp} mmHg`, [bpCategory(st)]);

  // Glycemia
  const glcDisp = U.glc.mode==='mg' ? `${toFixed(st.glucose,0)} mg/dL` : `${toFixed(st.glucose,2)} mmol/L`;
  renderCard('glc', 'Glukose (nüchtern)', glcDisp, [glcBadge(st)]);
  renderCard('homa', 'HOMA‑IR', toFixed(homaIR(st),2), [homaIR(st)<1?['niedrig',S.G]:(homaIR(st)<2?['erhöht',S.Y]:['Insulinresistenz‑Verdacht',S.R])], 'Glukose×Insulin/405 (mg/dL).');
  renderCard('a1c', 'HbA1c', `${toFixed(st.hba1c,1)} %`, [[`eAG≈${Math.round(eAG(st))} mg/dL${mmolSuffix(eAG(st),'glucose')}`, 'v']], 'Langzeit‑Glukose.');

  // Lipids
  const hdlDisp = U.lip.mode==='mg' ? `${Math.round(st.hdl)} mg/dL` : `${(st.hdl).toFixed(2)} mmol/L`;
  const tgDisp  = U.lip.mode==='mg' ? `${Math.round(st.tg)} mg/dL`  : `${(st.tg).toFixed(2)} mmol/L`;
  renderCard('lipids', 'Lipidprofil', `LDL≈ ${ldlDisplay(st)}`, [ldlCat(st), [ `HDL ${hdlDisp}`, 'b' ], [ `TG ${tgDisp}`, 'b' ] ], `Non‑HDL ${Math.round(nonHDL_mg(st))} mg/dL${mmolSuffix(nonHDL_mg(st),'chol')}.`);
  renderCard('tghdl', 'TG/HDL‑Quotient', toFixed(tgHdlRatio(st),2), [tgHdlCat(st)]);

  // Metabolic syndrome
  const msCnt = metabolicSyndromeCount(st); const msBadge = [[`${msCnt}/5 Kriterien`, msCnt>=3?S.R:(msCnt===2?S.Y:S.G)]];
  renderCard('metsyn', 'Metabolisches Syndrom (Screening)', `${msCnt>=3?'Verdacht':'kein Vollbild'}`, msBadge, 'Kriterien: Taille, TG, HDL, Blutdruck, Nüchternglukose.');

  // Dependencies note
  renderCard('deps', 'Wechselwirkungen (Beispiele)', '→', [
    ['Gewicht ↑ → BMI, KFA, RMR ↑; BP, HOMA‑IR tendenziell ↑', S.B],
    ['PAL ↑ → TDEE ↑ → Energiebilanz ↓ (bei gleicher Zufuhr)', S.B],
    ['Glukose/Insulin ↑ → HOMA‑IR ↑', S.B],
    ['HDL ↑ oder TG ↓ → TG/HDL‑Quotient ↓', S.B]
  ], 'Kausalität komplex; vereinfachte Richtungen.');

  // Sensitivity card
  const newD = derivedVector(st); const sens = sensitivityItems(newD, prevDerived); prevDerived = newD;
  if(sens && sens.length){
    const lines = sens.map(e=>{ const sign = e.delta>=0?'+':''; const unit = e.k==='EB'?' kcal': (e.k==='dW'?' kg/W':''); return `${e.k}: ${sign}${toFixed(e.delta, e.k==='LDL'||e.k==='RMR'||e.k==='TDEE'||e.k==='EB'?0:2)}${unit}`; }).join(' · ');
    renderCard('sens', 'Sensitivität (letzte Änderung: '+(getLastChanged()||'—')+')', lines, [[`Top‑${sens.length}`, 'b']], 'Größte relative Änderungen (intern skaliert).');
  } else {
    renderCard('sens', 'Sensitivität', '—', [], 'Ändere einen Eingabewert, um die Top‑Effekte zu sehen.');
  }

  // A/B comparison card
  const { snapA, snapB } = getSnapshots();
  if(snapA && snapB){
    const A = derivedVector(snapA); const B = derivedVector(snapB);
    const keys = ['BMI','KFA','RMR','TDEE','EB','dW','VO2','HOMA','LDL','TGHDL','MS'];
    const text = keys.map(k=>{ const d = (B[k]-A[k]); const sign = d>=0?'+':''; const unit = (k==='EB'?' kcal': (k==='dW'?' kg/W': '')); return `${k}: ${sign}${toFixed(d, k==='RMR'||k==='TDEE'||k==='EB'?0:2)}${unit}`; }).join(' · ');
    renderCard('ab', 'Vergleich A ↔ B (Δ B−A)', text, [[`Snapshots aktiviert`, 'b']], 'Buttons „Snapshot A/B“ unter Eingaben.');
  } else { renderCard('ab', 'Vergleich A ↔ B', '—', [], 'Lege zwei Snapshots an, um Deltas zu sehen.'); }

  drawChart(st);
}

// Boot
populateScenario();
bindInputs();
bindControls();
syncInputs();
subscribe(render);
render();
