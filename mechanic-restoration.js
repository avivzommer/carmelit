import * as THREE from './vendor/three.module.js';
import {deckHeightAtZ,trackPoint} from './mechanic-track.js';
const ease=value=>{const t=Math.max(0,Math.min(1,value));return t*t*t*(t*(t*6-15)+10);};

// A physical departure shutter and persistent route lights show what the repairs changed.
export function createRestoration({near,floors,stairPaths,terminalZ=null}){
 const root=new THREE.Group();root.name='Restored departure route';
 const cream=new THREE.MeshStandardMaterial({color:0xeee6d3,roughness:.8});
 const blue=new THREE.MeshStandardMaterial({color:0x315b9b,roughness:.7});
 const gold=new THREE.MeshStandardMaterial({color:0xf1c94c,roughness:.65});
 const glow=()=>new THREE.MeshStandardMaterial({color:0xd3eac3,emissive:0xb8f5a1,emissiveIntensity:0,roughness:.6});
 function part(geometry,material,x,y,z,parent=root){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.raycast=()=>{};m.castShadow=false;m.receiveShadow=true;parent.add(m);return m;}
 function box(x,y,z,w,h,d,mat,parent=root){return part(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
 let portal=null,shutter=null,rimMaterial=null;
 const signalMaterials=[];
 // A chapter with the large terminal uses that gate as its only exit.
 if(terminalZ===null){
  portal=new THREE.Group();portal.position.set(near*1.25,deckHeightAtZ(-4.65),-4.65);root.add(portal);
  for(let i=0;i<3;i++){
   const zz=-i*.17;
   part(new THREE.TorusGeometry(1.0,.065,12,40,Math.PI),i===0?gold:cream,0,.83,zz,portal);
   for(const x of [-1,1])box(x,.415,zz,.12,.83,.12,cream,portal);
  }
  rimMaterial=glow();
  part(new THREE.TorusGeometry(.94,.025,8,40,Math.PI),rimMaterial,0,.83,.07,portal);
  for(const x of [-.94,.94])box(x,.415,.07,.025,.83,.025,rimMaterial,portal);
  shutter=new THREE.Group();shutter.position.y=1.752;portal.add(shutter);
  for(let i=0;i<12;i++){
   const y=-.073-i*.146,height=1.752+y,aboveSpring=Math.max(0,height-.83);
   const width=Math.min(1.82,2*Math.sqrt(Math.max(.08,.94**2-aboveSpring**2)));
   box(0,y,0,width,.138,.065,i%2?blue:cream,shutter);
  }
  box(0,-1.722,.055,1.82,.045,.035,gold,shutter);
  for(let i=0;i<3;i++){
   const material=glow(),lamp=part(new THREE.CylinderGeometry(.062,.062,.03,[3,4,32][i]),material,(i-1)*.25,2.00,-.17,portal);
   lamp.rotation.x=Math.PI/2;signalMaterials.push(material);
  }
 }
 const terminalShutters=[],terminalSignals=[];
 let terminal=null;
 if(terminalZ!==null){
  terminal=new THREE.Group();terminal.name='Final rail exit gates';terminal.position.set(0,deckHeightAtZ(terminalZ),terminalZ);root.add(terminal);
  for(const side of [-1,1]){
   const leaf=new THREE.Group();leaf.position.y=1.86;terminal.add(leaf);terminalShutters.push(leaf);
   for(let row=0;row<19;row++){
    const y=-.80+(row+.5)*.138,aboveSpring=Math.max(0,y+.069-.80);
    const outer=Math.min(2.26,2.34*Math.sqrt(Math.max(0,1-(aboveSpring/1.02)**2)));
    if(outer<=.04)continue;
    box(side*(outer+.04)/2,y-1.86,.035,outer-.04,.13,.07,row%2?blue:cream,leaf);
   }
   box(side*1.15,-2.63,.08,2.20,.045,.045,gold,leaf);
   const mat=glow();terminalSignals.push(mat);
   part(new THREE.CylinderGeometry(.075,.075,.04,24),mat,side*1.25,1.90,.07,terminal).rotation.x=Math.PI/2;
  }
 }
 function route(points){
  const pieces=[];
  for(let segment=0;segment<points.length-1;segment++){
   const a=new THREE.Vector3(...points[segment]),b=new THREE.Vector3(...points[segment+1]);
   const count=Math.max(1,Math.ceil(a.distanceTo(b)/.24));
   for(let i=0;i<count;i++){
    const p=a.clone().lerp(b,(i+.5)/count),mat=glow();
    const m=box(p.x,p.y+.021,p.z,.105,.025,.105,mat);
    m.userData.focusLayer='service';
    pieces.push({mesh:m,mat,segment});
   }
  }
  return pieces;
 }
 const mid=floors.dockNear[1];
 const returnPoints=[floors.repair,...[...stairPaths.get('dockNear')].reverse(),[near*1.25,mid,0]];
 const returnRoute=route(returnPoints);
 const serviceRoute=route([...stairPaths.get('dockFar'),floors.repair]);
 const boardingSegment=returnPoints.length-2;
 const railLights=[];
 const railCount=terminalZ===null?20:Math.ceil((3.15-terminalZ+.40)/.395)+1;
 for(let i=0;i<railCount;i++){
  const z=3.15-i*.395,p=trackPoint(near*1.25,z),mat=glow();
  const m=box(p.x,p.y+.055,p.z,.23,.035,.06,mat);railLights.push({mesh:m,mat});
 }
 const boarding=new THREE.Group();root.add(boarding);
 boarding.userData.focusLayer='service';
 boarding.position.set(near*2.7,mid+.025,0);
 const boardMat=glow();
 const ring=part(new THREE.TorusGeometry(.28,.018,8,36),boardMat,0,.017,0,boarding);ring.rotation.x=Math.PI/2;
 let finalAge=0,totalAge=0,releaseAge=0,powerAge=0;
 function update(pressed,dt,trainAtMiddle=true,releaseReady=true){
  const all=pressed.every(Boolean);
  totalAge+=dt;powerAge=pressed[0]?powerAge+dt:0;releaseAge=pressed[1]?releaseAge+dt:0;finalAge=all&&releaseReady?finalAge+dt:0;
  const opening=all?ease((finalAge-.30)/.85):0;
  if(shutter){shutter.scale.y=1-opening*.985;shutter.visible=opening<.999;}
  terminalShutters.forEach(leaf=>{leaf.scale.y=1-opening*.985;leaf.visible=opening<.999;});
  terminalSignals.forEach(mat=>{mat.color.setHex(all?0xc7f4ac:0xc98259);mat.emissiveIntensity=all?.8+.15*Math.sin(totalAge*2):.1;});
  if(rimMaterial)rimMaterial.emissiveIntensity=opening*(.55+.12*Math.sin(totalAge*2));
  signalMaterials.forEach((mat,i)=>{mat.emissiveIntensity=pressed[i]?1.15:0;mat.color.setHex(pressed[i]?0xd3eac3:0x536779);});
  returnRoute.forEach(({mesh,mat,segment},i)=>{
   mesh.visible=all&&(segment<boardingSegment||trainAtMiddle);
   mat.emissiveIntensity=all&&finalAge>i*.055?.5+.55*Math.pow(Math.max(0,Math.cos(totalAge*4-i*.6)),6):0;
  });
  serviceRoute.forEach(({mesh,mat},i)=>{mesh.visible=pressed[1];mat.emissiveIntensity=pressed[1]&&releaseAge>i*.04?.35+.15*Math.sin(totalAge*3-i*.4):0;});
  railLights.forEach(({mesh,mat},i)=>{
   mesh.visible=pressed[0];
   mat.emissiveIntensity=all&&finalAge>i*.055?.45+.8*Math.pow(Math.max(0,Math.cos(totalAge*4-i*.48)),8):powerAge>i*.06?.14:0;
  });
  boarding.visible=all&&trainAtMiddle;boardMat.emissiveIntensity=.8+.35*Math.sin(totalAge*3);boarding.scale.setScalar(1+.08*Math.sin(totalAge*3));
 }
 function reset(){finalAge=totalAge=releaseAge=powerAge=0;update([false,false,false],0,false);}
 reset();
 return {root,portal,shutter,terminal,terminalShutters,returnRoute,railLights,boarding,boardingSegment,update,reset,get opened(){return (!shutter||!shutter.visible)&&terminalShutters.every(leaf=>!leaf.visible);}};
}
