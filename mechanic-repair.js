import * as THREE from './vendor/three.module.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function repairPose(progress){
 const p=Math.max(0,Math.min(1,progress));
 return {approach:p<.22?smooth(p/.22):p>.82?1-smooth((p-.82)/.18):1,
  door:p<.22?0:p<.35?smooth((p-.22)/.13):p<.70?1:1-smooth((p-.70)/.12),
  working:p>=.35&&p<.70};
}
export function createRepairCabinet(index){
 const root=new THREE.Group();root.name='Repair cabinet';
 const blue=new THREE.MeshStandardMaterial({color:0x315b9b,roughness:.7});
 const cream=new THREE.MeshStandardMaterial({color:0xeee5d3,roughness:.7});
 const dark=new THREE.MeshStandardMaterial({color:0x183340,roughness:.8});
 const copper=new THREE.MeshStandardMaterial({color:0xdeb26d,metalness:.5,roughness:.5});
 const lampMaterial=new THREE.MeshStandardMaterial({color:0xf2c43e,emissive:0xf2c43e,emissiveIntensity:0});
 function box(x,y,z,w,h,d,mat,parent=root){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 for(const x of [-.22,.22])box(x,.30,0,.045,.60,.27,blue);
 for(const y of [.02,.59])box(0,y,0,.46,.04,.27,blue);
 box(0,.30,-.12,.46,.6,.04,blue);box(0,.30,-.085,.39,.50,.022,dark);
 const contacts=[];
 for(let i=0;i<3;i++){
  box(-.12+i*.12,.28,-.035,.018,.31,.018,copper);
  const mat=new THREE.MeshStandardMaterial({color:0xe1bd67,emissive:0xffc453,emissiveIntensity:.08});
  contacts.push(box(-.12+i*.12,.37,.002,.062,.12,.038,mat));
 }
 const hinge=new THREE.Group();hinge.position.set(-.215,0,.145);root.add(hinge);
 box(.215,.30,0,.43,.55,.036,blue,hinge);
 box(.215,.31,.027,.32,.36,.022,cream,hinge);
 box(.35,.30,.052,.025,.10,.023,copper,hinge);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.066,.066,.03,[3,4,32][index]),lampMaterial);
 lamp.position.set(.215,.34,.058);lamp.rotation.x=Math.PI/2;hinge.add(lamp);
 function setProgress(p,done=false){
  const pose=repairPose(p);hinge.rotation.y=-pose.door*Math.PI*.62;
  contacts.forEach((contact,i)=>{
   contact.rotation.z=pose.working?Math.sin(p*65+i)*.12:0;
   contact.material.emissiveIntensity=done?.5:pose.working?.3+Math.abs(Math.sin(p*50+i))*.6:.08;
   contact.material.color.setHex(done?0xa2cb94:0xe1bd67);
  });
  lamp.material.emissiveIntensity=done?1.2:pose.working?.5:0;
  return pose;
 }
 return {root,hinge,lamp,setProgress};
}
