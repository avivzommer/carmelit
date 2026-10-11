import * as THREE from './vendor/three.module.js';
import {cabinetWorkOffset} from './mechanic-clearance.js';

export function repairWorkPosition(cabinet,index){
 const offset=cabinetWorkOffset.clone();
 // The service bay has a conduit on the wall behind the mechanic. Leave room
 // for the whole body, rather than placing its back against that conduit.
 if(index===2)offset.z=.53;
 return cabinet.root.position.clone().add(offset);
}

// A moving obstruction may clear, but a repair must never hold the controls
// forever. Restore the cabinet and report cancellation after a short blocked wait.
export function advanceRepairMovement(step,position,dt,guard,cabinet){
 const t=Math.min(1,step.time/step.duration),pose=cabinet.setProgress(t,false);
 const next=(step.next??=new THREE.Vector3()).lerpVectors(step.from,step.work,pose.approach);
 guard.refresh();
 const blocker=guard.segmentBlocker(position,next);
 if(blocker){
  step.time=Math.max(0,step.time-dt);step.blockedFor=(step.blockedFor??0)+dt;
  const cancelled=step.blockedFor>=.35;
  const heldPose=cabinet.setProgress(cancelled?0:step.time/step.duration,false);
  return {t:step.time/step.duration,pose:heldPose,blocker,cancelled};
 }
 step.blockedFor=0;position.copy(next);
 return {t,pose,blocker:null,cancelled:false};
}
