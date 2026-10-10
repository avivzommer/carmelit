// A forgiving touch target still needs a visible, reachable object behind it.
export function closestTouchTarget(point,targets,isVisible,radius=28){
 return targets.map(target=>({...target,distance:Math.hypot(point.x-target.x,point.y-target.y)}))
  .filter(target=>target.distance<=radius&&isVisible(target))
  .sort((a,b)=>a.distance-b.distance)[0]||null;
}
