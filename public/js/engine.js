// Ableitungen & Kategorien
import { U, mmol_to_mgdl } from './units.js';

export const S = { G:'g', Y:'y', R:'r', B:'b', V:'v' };
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const toFixed = (v, n=1) => (isFinite(v) ? Number(v).toFixed(n) : '—');

// Parser (Komma/Punkt)
export function parseNum(val){ if(typeof val==='number') return val; if(val==null) return NaN; const s=String(val).trim().replace(',', '.'); return Number(s); }

// Körperzusammensetzung & Energie
export function bmi(st){ const h = st.height_cm/100; return st.weight_kg/(h*h); }
export function bodyFatPct(st){ const sexFlag = st.sex==='male'?1:0; const bf = 1.2*bmi(st) + 0.23*st.age - 10.8*sexFlag - 5.4; return clamp(bf, 3, 60); }
export function rmr(st){ const {weight_kg:w, height_cm:h, age:a} = st; return st.sex==='male' ? (10*w + 6.25*h - 5*a + 5) : (10*w + 6.25*h - 5*a - 161); }
export function tdee_base(st){ return rmr(st)*st.pal; }
export function kcal_extra_steps(st){ return st.steps_extra * 0.045; }
export function kcal_extra_strength(st){ return (st.strength_pw * 50) / 7; }
export function intake_effective(st){ return st.kcal_intake + st.kcal_delta; }
export function tdee_effective(st){ return tdee_base(st) + kcal_extra_steps(st) + kcal_extra_strength(st); }
export function energyBalance(st){ return intake_effective(st) - tdee_effective(st); }
export function weightChangePerWeek(st){ return energyBalance(st)/7700; }

// Kreislauf & Fitness
export function mhr(st){ return 208 - 0.7*st.age; }
export function vo2max(st){ return 15.3 * (mhr(st)/st.rhr); }
export function bpCategory(st){ const s=st.sbp, d=st.dbp; if(s<120 && d<80) return ['Optimal', S.G]; if((s>=120&&s<=129)||(d>=80&&d<=84)) return ['Normal', S.G]; if((s>=130&&s<=139)||(d>=85&&d<=89)) return ['Hoch‑normal', S.Y]; if((s>=140&&s<=159)||(d>=90&&d<=99)) return ['Hypertonie Grad 1', S.R]; if((s>=160&&s<=179)||(d>=100&&d<=109)) return ['Hypertonie Grad 2', S.R]; if(s>=180||d>=110) return ['Hypertonie Grad 3', S.R]; return ['Unklar', S.Y]; }

// Glykämie
export function homaIR(st){ const glc_mg = U.glc.mode==='mg'? st.glucose : mmol_to_mgdl(st.glucose, U.glc.MG_PER_MMOL); return (glc_mg * st.insulin)/405; }
export function eAG(st){ return 28.7*st.hba1c - 46.7; }

// Lipide
export function ldl_mg(st){
  const tc_mg  = U.lip.mode==='mg'? st.tc  : mmol_to_mgdl(st.tc,  U.lip.MG_PER_MMOL_CHOL);
  const hdl_mg = U.lip.mode==='mg'? st.hdl : mmol_to_mgdl(st.hdl, U.lip.MG_PER_MMOL_CHOL);
  const tg_mg  = U.lip.mode==='mg'? st.tg  : mmol_to_mgdl(st.tg,  U.lip.MG_PER_MMOL_TG);
  const v = tc_mg - hdl_mg - (tg_mg/5);
  return (tg_mg<=400? v : NaN);
}
export function ldlDisplay(st){ const v = ldl_mg(st); if(!isFinite(v)) return '—'; if(U.lip.mode==='mg') return `${Math.round(v)} mg/dL`; const mmol = v / U.lip.MG_PER_MMOL_CHOL; return `${mmol.toFixed(2)} mmol/L`; }
export function nonHDL_mg(st){ const tc_mg  = U.lip.mode==='mg'? st.tc  : mmol_to_mgdl(st.tc,  U.lip.MG_PER_MMOL_CHOL); const hdl_mg = U.lip.mode==='mg'? st.hdl : mmol_to_mgdl(st.hdl, U.lip.MG_PER_MMOL_CHOL); return tc_mg - hdl_mg; }
export function tgHdlRatio(st){ const tg_mg  = U.lip.mode==='mg'? st.tg  : mmol_to_mgdl(st.tg,  U.lip.MG_PER_MMOL_TG); const hdl_mg = U.lip.mode==='mg'? st.hdl : mmol_to_mgdl(st.hdl, U.lip.MG_PER_MMOL_CHOL); return tg_mg/hdl_mg; }

// Kategorien
export function ldlCat(st){ const v = ldl_mg(st); if(!isFinite(v)) return ['n. anwendbar (TG hoch)', S.B]; if(v<100) return ['optimal', S.G]; if(v<130) return ['nahe optimal', S.G]; if(v<160) return ['grenzwertig hoch', S.Y]; if(v<190) return ['hoch', S.R]; return ['sehr hoch', S.R]; }
export function tgHdlCat(st){ const r=tgHdlRatio(st); if(r<2) return ['günstig', S.G]; if(r<3) return ['beobachten', S.Y]; return ['ungünstig', S.R]; }
export function bmiCat(st){ const v=bmi(st); if(v<18.5) return ['Untergewicht', S.Y]; if(v<25) return ['Normal', S.G]; if(v<30) return ['Übergewicht', S.Y]; return ['Adipositas', S.R]; }
export function bfCat(st){ const v=bodyFatPct(st); const male=st.sex==='male'; if((male && v<10) || (!male && v<18)) return ['athletisch', S.G]; if((male && v<=20) || (!male && v<=28)) return ['gut', S.G]; if((male && v<=25) || (!male && v<=33)) return ['erhöht', S.Y]; return ['hoch', S.R]; }
export function glcBadge(st){ const glc_mg = U.glc.mode==='mg'? st.glucose : mmol_to_mgdl(st.glucose, U.glc.MG_PER_MMOL); return glc_mg<100?['normal',S.G]:(glc_mg<126?['gestört',S.Y]:['Diabetes‑Schwelle',S.R]); }

// Metabolisches Syndrom
export function metabolicSyndromeCount(st){ const male=st.sex==='male'; const waistCrit = male? (st.waist_cm>=94):(st.waist_cm>=80); const tg_mg  = U.lip.mode==='mg'? st.tg  : mmol_to_mgdl(st.tg,  U.lip.MG_PER_MMOL_TG); const hdl_mg = U.lip.mode==='mg'? st.hdl : mmol_to_mgdl(st.hdl, U.lip.MG_PER_MMOL_CHOL); const tgCrit = tg_mg>=150; const hdlCrit = male? (hdl_mg<40):(hdl_mg<50); const bpCrit = (st.sbp>=130 || st.dbp>=85); const glc_mg = U.glc.mode==='mg'? st.glucose : mmol_to_mgdl(st.glucose, U.glc.MG_PER_MMOL); const glcCrit = glc_mg>=100; return [waistCrit+0, tgCrit+0, hdlCrit+0, bpCrit+0, glcCrit+0].reduce((a,b)=>a+b,0); }

// Abgeleitete Vektorwerte (für Sensitivität & A/B)
export function derivedVector(st){
  return {
    BMI: bmi(st), KFA: bodyFatPct(st), RMR: rmr(st), TDEE: tdee_effective(st), EB: energyBalance(st), dW: weightChangePerWeek(st),
    VO2: vo2max(st), HOMA: homaIR(st), LDL: ldl_mg(st), TGHDL: tgHdlRatio(st), MS: metabolicSyndromeCount(st)
  };
}
