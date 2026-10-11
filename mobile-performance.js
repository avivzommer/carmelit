// Reuse the shadow texture while stationary. Underground, only its tiny sun
// contribution needs a slower refresh; player movement and lighting stay full rate.
export function createShadowSchedule(){
 let age=Infinity,settle=0,previousDepth=0;
 return {update(dt,{moving=false,depth=0}={}){
  age+=dt;
  if(moving||Math.abs(depth-previousDepth)>.0001)settle=.8;
  previousDepth=depth;
  const due=age==Infinity||settle>0&&age>=(depth>.7?1/12:0);
  settle=Math.max(0,settle-dt);
  if(due)age=0;
  return due;
 }};
}

// Dense translucent station layers are fill-rate heavy on phone GPUs. Change
// resolution only at depth thresholds, never continuously during a transition.
export function createUndergroundResolution(baseRatio){
 let below=false;
 return depth=>{
  if(depth>.72)below=true;
  else if(depth<.28)below=false;
  return below?Math.min(baseRatio,1):baseRatio;
 };
}
