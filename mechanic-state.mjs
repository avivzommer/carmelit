// The two stations share one cable. The middle landing is a maintenance passage.
export function createMechanicJourney(chapter=1,{autoRepair=true}={}){
 const primary=chapter===2?'carB':'carA',secondary=primary==='carA'?'carB':'carA';
 const low=primary==='carA'?0:2,high=2-low;
 const initial=()=>({location:'entrance',stop:low,pressed:[false,false,false],motion:null,complete:false});
 const state=initial();
 const connections=()=>{
  const edges=[['entrance','station1'],['station2Near','station2Far']];
  if(state.stop===low)edges.push(['station1',primary]);
  if(state.stop===high)edges.push([primary,'station2Near']);
  // Alignment alone determines boarding. Repair locks belong to visible gates.
  if(state.stop===low)edges.push([secondary,'station2Far']);
  if(state.stop===1)edges.push([secondary,'dockFar'],[primary,'dockNear']);
  if(state.pressed[1])edges.push(['dockFar','repair']);
  if(state.pressed[2])edges.push(['repair','dockNear']);
  return edges;
 };
 function landingFor(car){
  if(!['carA','carB'].includes(car)||state.complete||['drag','slide','departure'].includes(state.motion?.type))return null;
  for(const [a,b] of connections()){if(a===car)return b;if(b===car)return a;}
  return null;
 }
 function checkDeparture(){if(state.pressed.every(Boolean)&&state.location===primary&&state.stop===high)state.motion={type:'departure'};}
 function finishDeparture(){if(state.motion?.type!=='departure')return false;state.motion=null;state.complete=true;return true;}
 function walk(to){
  if(state.motion||state.complete||to===state.location)return false;
  const queue=[[state.location]],seen=new Set([state.location]);
  while(queue.length){const path=queue.shift(),here=path.at(-1);if(here===to){
    const repairNodes=['station1','station2Far','repair'];
    const stopAt=autoRepair?path.findIndex((node,n)=>n>0&&repairNodes.includes(node)&&!state.pressed[repairNodes.indexOf(node)]):-1;
    const actualPath=stopAt>0?path.slice(0,stopAt+1):path,arrival=actualPath.at(-1);
    state.motion={type:'walk',path:actualPath,to:arrival,continueTo:arrival===to?null:to};return actualPath;
   }
   for(const[a,b]of connections()){const next=a===here?b:b===here?a:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next]);}}}
  return false;
 }
 function finishWalk(){if(state.motion?.type!=='walk')return false;const continueTo=state.motion.continueTo;state.location=state.motion.to;state.motion=null;
  const i=['station1','station2Far','repair'].indexOf(state.location);
  if(autoRepair&&i>=0&&!state.pressed[i])state.motion={type:'repair',index:i,continueTo};
  checkDeparture();return true;
 }
 function finishRepair({reveal=false}={}){
  if(state.motion?.type!=='repair')return false;
  const index=state.motion.index;state.pressed=state.pressed.map((value,i)=>value||i===index);state.motion=null;
  if(reveal&&state.pressed.every(Boolean))state.motion={type:'reveal'};else checkDeparture();return true;
 }
 function finishReveal(){if(state.motion?.type!=='reveal')return false;state.motion=null;checkDeparture();return true;}
 function beginDrag(){if(!state.pressed[0]||state.motion||state.complete)return false;state.motion={type:'drag'};return true;}
 function release(stop){if(state.motion?.type!=='drag'||!Number.isInteger(stop)||stop<0||stop>2)return false;state.motion={type:'slide',to:stop};return true;}
 function finishSlide(){if(state.motion?.type!=='slide')return false;state.stop=state.motion.to;state.motion=null;checkDeparture();return true;}
 function cancel(){if(state.motion?.type!=='drag')return false;state.motion=null;return true;}
 function reset(){Object.assign(state,initial());}
 return {state,primary,secondary,low,high,connections,landingFor,walk,finishWalk,finishRepair,finishReveal,beginDrag,release,finishSlide,finishDeparture,cancel,reset};
}
