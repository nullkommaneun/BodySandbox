// Globaler State, Persistenz, Undo/Redo, Subscriptions

const STORAGE_KEY = 'physio_sandbox_state_v1';
const HISTORY_MAX = 50;

export const defaults = {
  sex: 'male', age: 35, height_cm: 180, weight_kg: 75, waist_cm: 84,
  rhr: 55, sbp: 118, dbp: 76, pal: 1.6,
  glucose: 85, insulin: 5.0, hba1c: 5.0, tc: 175, hdl: 60, tg: 90,
  kcal_intake: 2400, horizon_weeks: 12,
  steps_extra: 0, kcal_delta: 0, strength_pw: 0
};

export const optimum = {
  sex: 'male', age: 25, height_cm: 180, weight_kg: 72, waist_cm: 80,
  rhr: 52, sbp: 115, dbp: 75, pal: 1.75,
  glucose: 82, insulin: 4.5, hba1c: 5.0, tc: 170, hdl: 62, tg: 80,
  kcal_intake: 2500, horizon_weeks: 12,
  steps_extra: 3000, kcal_delta: 0, strength_pw: 2
};

export const scenarios = {
  Sitzend: { pal: 1.4, kcal_intake: 2200, steps_extra: 1000, strength_pw: 0 },
  Aktiv: { pal: 1.9, kcal_intake: 2700, steps_extra: 8000, strength_pw: 3 },
  Nachtschicht: { pal: 1.6, kcal_intake: 2500, steps_extra: 4000, strength_pw: 1 }
};

const listeners = new Set();
let past = [];
let future = [];
let state = load() || structuredClone(defaults);
let lastChangedKey = null;
let snapA = null, snapB = null;

export function getState(){ return state; }
export function getLastChanged(){ return lastChangedKey; }
export function setLastChanged(k){ lastChangedKey = k; }

export function subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }
function emit(){ save(); for(const fn of listeners) fn(); }

export function reset(){ commit(); state = structuredClone(defaults); emit(); }
export function applyOptimum(){ commit(); state = structuredClone(optimum); emit(); }
export function applyScenario(name){ if(!scenarios[name]) return; commit(); Object.assign(state, scenarios[name]); emit(); }

export function set(key, value){ commit(); state = { ...state, [key]: value }; lastChangedKey = key; emit(); }
export function setMany(obj){ commit(); state = { ...state, ...obj }; emit(); }

export function commit(){
  past.push(structuredClone(state));
  if(past.length>HISTORY_MAX) past.shift();
  future = [];
}

export function undo(){ if(!past.length) return; future.push(structuredClone(state)); state = past.pop(); emit(); }
export function redo(){ if(!future.length) return; past.push(structuredClone(state)); state = future.pop(); emit(); }

export function exportJSON(){ return JSON.stringify({ state, snapA, snapB }, null, 2); }
export function importJSON(obj){ if(!obj || !obj.state) return; commit(); state = { ...structuredClone(defaults), ...obj.state }; snapA = obj.snapA||null; snapB = obj.snapB||null; emit(); }

export function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, snapA, snapB })); }catch(e){} }
export function load(){ try{ const s = localStorage.getItem(STORAGE_KEY); return s? JSON.parse(s).state : null; }catch(e){ return null; } }

export function setSnapshotA(){ snapA = structuredClone(state); emit(); }
export function setSnapshotB(){ snapB = structuredClone(state); emit(); }
export function getSnapshots(){ return { snapA, snapB }; }
