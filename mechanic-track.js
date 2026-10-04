import * as THREE from './vendor/three.module.js';
// One incline drives the train shell, rails, travel, and station landing heights.
export const TRAIN_SLOPE=.40;
export const TRACK_CLEARANCE=.62;
export const STOP_RUN=3;
export const STOP_RISE=STOP_RUN*TRAIN_SLOPE;
export const STATION_Y=[1,1+STOP_RISE,1+2*STOP_RISE];
export const TERMINAL_Z=-6.10;
export const DEPARTURE_EXTRA=2.50;
export const LINE_CLIP_PLANES=[new THREE.Plane(new THREE.Vector3(0,0,1),6.72),new THREE.Plane(new THREE.Vector3(0,0,-1),4.90)];
export const departureTravel=(high,chapter)=>high+(high===2?1:-1)*(chapter===2?DEPARTURE_EXTRA:.58);
export function trainPosition(index,travel){const stop=index?2-travel:travel;return new THREE.Vector3(index?1.25:-1.25,STATION_Y[0]+stop*STOP_RISE,3-stop*STOP_RUN);}
export function deckHeightAtZ(z){return STATION_Y[1]-z*TRAIN_SLOPE;}
export function trackPoint(x,z){return new THREE.Vector3(x,deckHeightAtZ(z)-TRACK_CLEARANCE,z);}
export function createTrack(x,radius,color,{downhillZ=4.7,uphillZ=-4.9,clippingPlanes=null}={}){
 const a=trackPoint(x,downhillZ),b=trackPoint(x,uphillZ),delta=b.clone().sub(a),length=delta.length();
 const material=new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.35,transparent:true});
 material.clippingPlanes=clippingPlanes;
 // Compute the fade per fragment. End vertices alone cannot describe a solid middle.
 material.onBeforeCompile=shader=>{
  shader.uniforms.trackLength={value:length};
  shader.vertexShader='varying float trackDistance;\nuniform float trackLength;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntrackDistance=position.y+trackLength*.5;');
  shader.fragmentShader='varying float trackDistance;\nuniform float trackLength;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=smoothstep(0.0,1.3,trackDistance)*smoothstep(0.0,.8,trackLength-trackDistance);');
 };
 const track=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,10,24),material);
 track.position.copy(a).add(b).multiplyScalar(.5);track.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 track.raycast=()=>{};return track;
}
