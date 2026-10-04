export function snapTrainStop(start,current){
 const rounded=Math.round(current);
 if(rounded===Math.round(start)&&Math.abs(current-start)>.16)return Math.max(0,Math.min(2,Math.round(start)+Math.sign(current-start)));
 return Math.max(0,Math.min(2,rounded));
}
// Click boards a train. Moving the same press six pixels starts a drag.
export function createTrainPointer(options){
 let press=null;
 function cancel(){if(!press)return;const p=press;press=null;if(p.dragging)options.cancel();options.releaseCapture(p.id);}
 function down(e){
  if(e.button!==0||press||!options.available())return;
  const hit=options.pick(e);if(!hit)return;
  if(hit.trainIndex===undefined){if(hit.destination)options.click(hit.destination);return;}
  press={id:e.pointerId,x:e.clientX,y:e.clientY,start:options.travel(),current:options.travel(),index:hit.trainIndex,destination:hit.destination,dragging:false};
  options.capture(press.id);
 }
 function move(e){
  if(!press||press.id!==e.pointerId)return false;
  const dx=e.clientX-press.x,dy=e.clientY-press.y;
  if(!press.dragging){
   if(Math.hypot(dx,dy)<6)return true;
   if(!options.begin()){options.blocked();cancel();return true;}
   press.dragging=true;
  }
  const axis=options.axis(),denominator=axis.x*axis.x+axis.y*axis.y;
  if(denominator<1)return true;
  const delta=(dx*axis.x+dy*axis.y)/denominator*(press.index===1?-1:1);
  press.current=Math.max(0,Math.min(2,press.start+delta));options.move(press.current);return true;
 }
 function up(e){
  if(!press||press.id!==e.pointerId)return;
  const p=press;press=null;
  if(p.dragging)options.end(snapTrainStop(p.start,p.current));else if(p.destination)options.click(p.destination);
  options.releaseCapture(p.id);
 }
 return {down,move,up,cancel,get dragging(){return Boolean(press?.dragging);}};
}
