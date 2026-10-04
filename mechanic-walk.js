// Shared by the game loop and movement regression tests. A blocked frame keeps
// its previous position and elapsed time, allowing opening doors to clear.
export function advanceWalkStep(step,position,dt,guard){
 const time=Math.min(step.duration,step.time+dt);
 const next=step.from.clone().lerp(step.to,time/step.duration);
 guard.refresh();
 const blocker=guard.segmentBlocker(position,next);
 if(blocker)return {moved:false,arrived:false,blocker};
 const moved=position.distanceToSquared(next)>1e-12;
 position.copy(next);step.time=time;
 return {moved,arrived:time===step.duration,blocker:null};
}
