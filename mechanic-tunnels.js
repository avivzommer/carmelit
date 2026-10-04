import {ceramicMaterial} from './mechanic-ceramics.js';
import * as THREE from './vendor/three.module.js';

// Physical passage details follow the same stair coordinates as the mechanic.
// Dark retaining walls sit behind the walkways; the camera-facing side is open.
export function createPassageScenery(layout){
 const root=new THREE.Group();root.name='Underground passage architecture';
 const ribs=[],cables=[],lights=[],walls=[],localLights=[];
 const stationWhite=ceramicMaterial(0xeee9da,{axes:'zy',pitch:.24,pattern:'yellow'});
 const tiledWallX=ceramicMaterial(0xeee9da,{axes:'xy',pitch:.24,pattern:'yellow'});
 const tiledWallZ=ceramicMaterial(0xeee9da,{axes:'zy',pitch:.24,pattern:'yellow'});
 const cream=new THREE.MeshStandardMaterial({color:0x777f7c,roughness:.96});
 const concrete=new THREE.MeshStandardMaterial({color:0x505b5b,roughness:.98});
 const grout=new THREE.MeshStandardMaterial({color:0x344144,roughness:1});
 const blue=new THREE.MeshStandardMaterial({color:0x304954,roughness:.88});
 const steel=new THREE.MeshStandardMaterial({color:0x697875,roughness:.65,metalness:.3});
 const cableMaterials=[0x263f46,0xd9b24e,0x50758b].map(color=>new THREE.MeshStandardMaterial({color,roughness:.7}));
 function layer(id){const group=new THREE.Group();group.name=`${id} passage details`;group.userData.focusLayer=id;root.add(group);return group;}
 const service=layer('service'),rear=layer('rear');
 function part(geometry,material,parent,name){
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;
  mesh.raycast=()=>{};parent.add(mesh);return mesh;
 }
 function box(parent,x,y,z,w,h,d,material,name){const mesh=part(new THREE.BoxGeometry(w,h,d),material,parent,name);mesh.position.set(x,y,z);return mesh;}
 // Recessed strip lamps light actual nearby floors and walls. Keep the light
 // count fixed and shadow-free so the cutaway does not require extra passes.
 function wallLamp(parent,x,y,z,rotation=0){
  const fixture=new THREE.Group();fixture.position.set(x,y,z);fixture.rotation.y=rotation;parent.add(fixture);
  box(fixture,0,0,0,.40,.13,.075,blue,'Recessed basement lamp housing');
  const material=new THREE.MeshStandardMaterial({color:0xffe8ba,emissive:0xffc477,emissiveIntensity:.65,roughness:.4});
  const lamp=box(fixture,0,0,.044,.32,.055,.028,material,'Warm basement wall strip');lamp.castShadow=false;
  lights.push({material,layer:parent.userData.focusLayer});
 }
 function pool(parent,position,intensity,distance){
  const light=new THREE.PointLight(0xffca87,intensity,distance,2);light.position.set(...position);
  light.name='Warm basement light pool';parent.add(light);localLights.push({light,intensity,layer:parent.userData.focusLayer});
 }
 function wall(parent,x,y,z,w,h,d){
  const face=box(parent,x,y+h/2,z,w,h,d,w>d?tiledWallX:tiledWallZ,'White and yellow ceramic basement wall');walls.push(face);
  // Shallow masonry joints, all behind the passage body clearance.
  const alongX=w>d;
  for(let row=1;row<Math.ceil(h/.27);row++){
   if(alongX)box(parent,x,y+row*.27,z+d/2+.002,w,.009,.006,grout,'Concrete course joint');
   else box(parent,x+w/2+.002,y+row*.27,z,.006,.009,d,grout,'Concrete course joint');
  }
  return face;
 }
 function stairWall(parent,path,offset){
  for(let i=2;i<path.length-1;i++){
   const [x,y,z]=path[i],run=i+1<path.length-1?Math.abs(z-path[i+1][2]):Math.abs(path[i-1][2]-z);
   const top=path[0][1],bottom=y-.06;
   const piece=box(parent,x-offset,(top+bottom)/2,z,.10,top-bottom,run+.006,stationWhite,'Continuous white stair retaining wall');walls.push(piece);
   box(parent,x-offset,path[0][1]+.022,z,.13,.045,run+.006,stationWhite,'Continuous white wall coping');
  }
  const [x,y,z]=path[7];wallLamp(parent,x-offset+.064,path[0][1]-.24,z,Math.PI/2);
  pool(parent,[x-.10,path[0][1]-.20,z],1.6,2.6);
 }
 function bundle(parent,points){
  for(let cable=0;cable<3;cable++){
   const route=points.map(p=>new THREE.Vector3(p[0],p[1]+cable*.067,p[2]));
   const path=new THREE.CatmullRomCurve3(route,false,'centripetal');
   cables.push(part(new THREE.TubeGeometry(path,Math.max(20,route.length*4),.013,6,false),cableMaterials[cable],parent,'Wall cable conduit'));
  }
 }
 for(const id of ['dockFar','dockNear']){
  const path=layout.stairPaths.get(id),side=Math.sign(path[0][0]);
  bundle(service,path.slice(1).map(([x,y,z])=>[x+side*.43,y+.46,z]));
  for(const index of [3,7,11]){
   const [x,y,z]=path[index];box(service,x+side*.43,y+.53,z,.048,.23,.045,steel,'Cable saddle');
  }
  stairWall(service,path,.52);
 }
 const serviceY=layout.floors.repair[1],serviceZ=layout.floors.repair[2];
 bundle(service,[[-1.70,serviceY+.40,serviceZ+.30],[0,serviceY+.40,serviceZ+.30],[1.70,serviceY+.40,serviceZ+.30]]);
 for(const x of [-1.70,1.70])box(service,x,serviceY+.49,serviceZ+.30,.16,.22,.07,blue,'Cable junction box');
 // A recessed utility bay wraps the existing repair cabinet. The open front
 // and wide entrance leave both its approach and swinging door clear.
 for(const side of [-1,1]){
  wall(service,side*1.71,serviceY-.08,serviceZ-.44,1.86,1.18,.12);
  wall(service,side*.77,serviceY-.08,serviceZ-.70,.10,1.18,.58);
 }
 wall(service,0,serviceY-.08,serviceZ-1.02,1.64,1.34,.13);
 box(service,0,serviceY+1.28,serviceZ-.86,1.64,.10,.43,cream,'Utility alcove lintel');
 wallLamp(service,0,serviceY+1.10,serviceZ-.94);
 pool(service,[0,serviceY+.92,serviceZ-.15],2.2,3.5);
 // A steel service door and a louvered vent give the space a utility-room scale.
 box(service,1.10,serviceY+.48,serviceZ-.366,.54,1.06,.035,blue,'Closed basement service door frame');
 box(service,1.10,serviceY+.48,serviceZ-.342,.45,.97,.025,steel,'Closed basement service door');
 box(service,.94,serviceY+.49,serviceZ-.316,.035,.11,.03,cream,'Service door handle');
 wallLamp(service,1.10,serviceY+1.03,serviceZ-.34);
 box(service,-1.05,serviceY+.65,serviceZ-.367,.42,.34,.035,blue,'Basement ventilation grille');
 for(let i=0;i<5;i++)box(service,-1.05,serviceY+.54+i*.052,serviceZ-.337,.36,.019,.025,steel,'Vent louver');
 if(layout.upperStairPaths.size){
  for(const [side,path]of layout.upperStairPaths){
   bundle(rear,path.slice(1).map(([x,y,z])=>[x+side*.26,y+.44,z]));
   for(const index of [3,8,13]){
    const [x,y,z]=path[index];box(rear,x+side*.26,y+.51,z,.04,.22,.04,steel,'Rear cable saddle');
   }
   stairWall(rear,path,.37);
  }
  const [,y,z]=layout.upperStairPaths.get(1).at(-1);
  bundle(rear,[[-4.05,y+.44,z-.30],[0,y+.44,z-.30],[4.05,y+.44,z-.30]]);
  wall(rear,0,y-.08,z-.43,8.48,1.16,.12);
  for(const x of [-3.25,0,3.25])wallLamp(rear,x,y+.92,z-.354);
  pool(rear,[0,y+.86,z-.05],2.8,4.6);
 }
 function update(pressed,dt,underground=0){
  for(const light of lights){const powered=pressed[light.layer==='rear'?1:0];light.material.emissiveIntensity=THREE.MathUtils.damp(light.material.emissiveIntensity,(powered?1.5:.65)+underground*.65,4,dt);}
  for(const entry of localLights){const powered=pressed[entry.layer==='rear'?1:0];entry.light.intensity=entry.intensity*(powered?1:.38)*(.35+.65*underground);}
 }
 function reset(){lights.forEach(light=>light.material.emissiveIntensity=.65);localLights.forEach(entry=>entry.light.intensity=entry.intensity*.38*.35);}
 reset();
 return {root,ribs,cables,lights,walls,localLights,update,reset};
}
