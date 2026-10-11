// Expanded hit areas never bypass visibility or replace a closer control.
export function closestTouchTarget(point,targets,isVisible,radius=28){
 return targets.map(target=>({...target,distance:Math.hypot(point.x-target.x,point.y-target.y)}))
  .filter(target=>target.distance<=(target.radius??radius)&&isVisible(target))
  .sort((a,b)=>a.distance-b.distance)[0]||null;
}
// Freeze the grip centre for this gesture. A generous minimum radius prevents
// a finger crossing the hub from turning a tiny movement into half a revolution.
export function createWheelGrip(point,center){
 let prior={x:point.x-center.x,y:point.y-center.y},total=0;
 return {move(point){
  const next={x:point.x-center.x,y:point.y-center.y};
  const radius=Math.max(36,Math.hypot(prior.x,prior.y),Math.hypot(next.x,next.y));
  total+=Math.max(-.45,Math.min(.45,(prior.x*(next.y-prior.y)-prior.y*(next.x-prior.x))/(radius*radius)));
  prior=next;return total;
 }};
}
