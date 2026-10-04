import * as THREE from './vendor/three.module.js';
import {createTrack,deckHeightAtZ,TRAIN_SLOPE} from './mechanic-track.js';

// The entire downhill railway dissolves together, starting at the station edge.
export function createRunout(){
 const root=new THREE.Group();root.name='Fading downhill railway';
 root.userData.fitCamera=false;root.userData.visualEffect=true;
 function fade(material){
  material.transparent=true;material.depthWrite=false;
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying float runoutZ;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrunoutZ=(modelMatrix*vec4(position,1.0)).z;');
   shader.fragmentShader='varying float runoutZ;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=1.0-smoothstep(4.9,7.2,runoutZ);');
  };
  material.customProgramCacheKey=()=> 'station-runout-fade';return material;
 }
 function box(x,y,z,w,h,d,color){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),fade(new THREE.MeshStandardMaterial({color,roughness:.85})));
  m.matrixAutoUpdate=false;m.matrix.set(1,0,0,x,0,1,-TRAIN_SLOPE,deckHeightAtZ(z)+y,0,0,1,z,0,0,0,1);
  m.raycast=()=>{};root.add(m);return m;
 }
 box(0,-.99,6.05,4.02,.28,2.30,0x899c99).renderOrder=1;
 box(0,-.842,6.05,3.96,.026,2.30,0x536464).renderOrder=2;
 for(const x of [-1.25,1.25]){
  for(let z=5.0;z<7.2;z+=.375)box(x,-.77,z,1.30,.13,.10,0x879894).renderOrder=3;
  for(const dx of [-.47,0,.47]){
   const rail=createTrack(x+dx,dx===0?.028:.034,dx===0?0x253940:0x61737b,{uphillZ:4.89,downhillZ:7.2});
   fade(rail.material);rail.renderOrder=4;root.add(rail);
  }
 }
 return root;
}

// A shared world-space fade keeps the train, sleepers and foundation together.
export function applyDepartureFade(material){
 if(material.userData.departureFade)return;
 material.userData.departureFade=true;material.transparent=true;
 material.clippingPlanes=null;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying float departureZ;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndepartureZ=(modelMatrix*vec4(position,1.0)).z;');
  shader.fragmentShader='varying float departureZ;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=(1.0-smoothstep(7.4,11.0,-departureZ))*(1.0-smoothstep(4.9,7.2,departureZ));');
 };
 material.customProgramCacheKey=()=> 'departure-world-fade';material.needsUpdate=true;
}
export function createDepartureRunout(){
 const root=new THREE.Group();root.name='Continuous uphill departure railway';
 root.userData.fitCamera=false;root.userData.visualEffect=true;
 function box(x,y,z,w,h,d,color,order){
  const mat=new THREE.MeshStandardMaterial({color,roughness:.85});applyDepartureFade(mat);mat.depthWrite=false;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.matrixAutoUpdate=false;mesh.matrix.set(1,0,0,x,0,1,-TRAIN_SLOPE,deckHeightAtZ(z)+y,0,0,1,z,0,0,0,1);
  mesh.renderOrder=order;mesh.raycast=()=>{};root.add(mesh);
 }
 const end=-11,start=-6.72,mid=(start+end)/2;
 box(0,-.99,mid,4.02,.28,start-end,0x899c99,1);
 box(0,-.842,mid,3.96,.026,start-end,0x536464,2);
 for(const x of [-1.99,1.99])box(x,-.86,mid,.08,.18,start-end,0xc2c7b9,3);
 for(const x of [-1.25,1.25]){
  for(let z=-6.8;z>end;z-=.375){
   box(x,-.77,z,1.30,.13,.10,0x879894,3);
   for(const dx of [-.47,.47])box(x+dx,-.688,z,.13,.035,.17,0x253940,3);
   box(x,-.69,z,.17,.10,.10,0xd0ac42,3);
  }
  for(const dx of [-.47,0,.47]){
   const rail=createTrack(x+dx,dx===0?.028:.034,dx===0?0x253940:0x61737b,{uphillZ:end,downhillZ:start+.02});
   applyDepartureFade(rail.material);rail.material.depthWrite=false;rail.renderOrder=4;root.add(rail);
  }
 }
 return root;
}
