import * as THREE from './vendor/three.module.js';
import {passageAt} from './mechanic-clearance.js';

// Lighting follows the real stair descent, not a button or camera position.
// A small work light preserves the mechanic's silhouette in the darker rooms.
export function createUndergroundAtmosphere({scene,renderer,ambient,sunlight,fill,passages,onChange=()=>{}}){
 const daylight={ambient:ambient.intensity,sunlight:sunlight.intensity,fill:fill.intensity,exposure:renderer.toneMappingExposure,
  sky:ambient.color.clone(),ground:ambient.groundColor.clone(),fillColor:fill.color.clone()};
 const night={sky:new THREE.Color(0x8199ab),ground:new THREE.Color(0x263238),fill:new THREE.Color(0xa0b5ca)};
 const workLight=new THREE.PointLight(0xffd6a0,0,2.5,2);workLight.name='Mechanic basement work light';scene.add(workLight);
 let strength=0,power=0;
 function apply(){
  ambient.intensity=THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.10,daylight.ambient,power),.48,strength);
  sunlight.intensity=THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.45,daylight.sunlight,power),.26,strength);
  fill.intensity=THREE.MathUtils.lerp(THREE.MathUtils.lerp(.40,daylight.fill,power),.24,strength);
  ambient.color.copy(daylight.sky).lerp(night.sky,strength);
  ambient.groundColor.copy(daylight.ground).lerp(night.ground,strength);
  fill.color.copy(daylight.fillColor).lerp(night.fill,strength);
  renderer.toneMappingExposure=THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.06,daylight.exposure,power),1.04,strength);
  workLight.intensity=.72*strength;
  onChange(strength,power);
 }
 function update(feet,dt,{restored=false,surfaceReveal=0}={}){
  const passage=passageAt(feet,passages);
  const target=passage?THREE.MathUtils.smoothstep(passage.entryHeight-feet.y,.04,.8)*(1-surfaceReveal):0;
  power=THREE.MathUtils.damp(power,restored?1:0,2,dt);
  if(Math.abs(power-(restored?1:0))<.001)power=restored?1:0;
  strength=THREE.MathUtils.damp(strength,target,5,dt);
  if(Math.abs(strength-target)<.0001)strength=target;
  workLight.position.copy(feet).add(new THREE.Vector3(0,.72,.12));
  apply();
  return strength;
 }
 function reset(){strength=power=0;apply();}
 reset();
 return {update,reset,workLight,get strength(){return strength;},get restoredPower(){return power;}};
}
