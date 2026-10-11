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

// Stair surfaces and their entry arrows win over invisible control padding.
// A direct hit on real machinery still wins over nearby ground.
export function resolveTouchHit(exact,nearby,floorFallback=null){
 if(exact&&!exact.floor)return exact;
 const isStair=hit=>Boolean(hit?.floor)&&(hit.zone?.startsWith('stairs:')||hit.zone==='upperPassage');
 if(isStair(exact))return exact;
 if(!exact&&isStair(floorFallback))return floorFallback;
 return nearby?.action||exact||floorFallback;
}
export function gestureDistance(start,end){return Math.hypot(end.x-start.x,end.y-start.y);}
// Only a deliberate vertical swipe starting on the occupied cabin drives it.
// Return null for taps, diagonal wandering and swipes on another cart.
export function cabinSwipe(start,end,location,hit){
 if(!location?.startsWith('car')||!(hit?.destination===location||typeof hit?.up==='boolean'))return null;
 const dx=end.x-start.x,dy=end.y-start.y;
 if(Math.abs(dy)<36||Math.abs(dy)<Math.abs(dx)*1.35)return null;
 return dy<0;
}
