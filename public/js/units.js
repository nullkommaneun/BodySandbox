// Einheiten & Umrechnung
export const U = {
  glc: { mode: 'mg', MG_PER_MMOL: 18.0182 },
  lip: { mode: 'mg', MG_PER_MMOL_CHOL: 38.67, MG_PER_MMOL_TG: 88.57 }
};

export const mgdl_to_mmol = (mg, factor) => mg / factor;
export const mmol_to_mgdl = (mmol, factor) => mmol * factor;

export function setGlcMode(mode, state){
  if(mode===U.glc.mode) return;
  if(mode==='mmol') state.glucose = mgdl_to_mmol(state.glucose, U.glc.MG_PER_MMOL);
  if(mode==='mg')   state.glucose = mmol_to_mgdl(state.glucose, U.glc.MG_PER_MMOL);
  U.glc.mode = mode;
}

export function setLipMode(mode, state){
  if(mode===U.lip.mode) return;
  if(mode==='mmol'){
    state.tc  = mgdl_to_mmol(state.tc,  U.lip.MG_PER_MMOL_CHOL);
    state.hdl = mgdl_to_mmol(state.hdl, U.lip.MG_PER_MMOL_CHOL);
    state.tg  = mgdl_to_mmol(state.tg,  U.lip.MG_PER_MMOL_TG);
  } else {
    state.tc  = mmol_to_mgdl(state.tc,  U.lip.MG_PER_MMOL_CHOL);
    state.hdl = mmol_to_mgdl(state.hdl, U.lip.MG_PER_MMOL_CHOL);
    state.tg  = mmol_to_mgdl(state.tg,  U.lip.MG_PER_MMOL_TG);
  }
  U.lip.mode = mode;
}
