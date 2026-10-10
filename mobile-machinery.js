import * as THREE from './vendor/three.module.js';
export function wheelTravel(start,angle,index){return THREE.MathUtils.clamp(start+angle/Math.PI*(index?-1:1),0,2);}
export function carriageStep(stop,index,up){return THREE.MathUtils.clamp(stop+(up?1:-1)*(index?-1:1),0,2);}
export function createPlatformWheel(position,index){
 const root=new THREE.Group();root.name='Platform haul-cable handwheel';root.position.copy(position);
 const metal=new THREE.MeshStandardMaterial({color:0x233f50,metalness:.55,roughness:.45});
 const yellow=new THREE.MeshStandardMaterial({color:0xe8bd49,metalness:.3,roughness:.4});
 function mesh(g,m,x,y,z,parent=root){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
 mesh(new THREE.BoxGeometry(.16,.78,.15),metal,0,.39,-.12);
 const rotor=new THREE.Group();rotor.position.y=.64;root.add(rotor);
 mesh(new THREE.TorusGeometry(.25,.035,10,32),yellow,0,0,0,rotor);
 for(let i=0;i<3;i++){const spoke=mesh(new THREE.BoxGeometry(.46,.025,.025),metal,0,0,0,rotor);spoke.rotation.z=i*Math.PI/3;}
 mesh(new THREE.CylinderGeometry(.065,.065,.09,16),metal,0,0,0,rotor).rotation.x=Math.PI/2;
 mesh(new THREE.SphereGeometry(.055,12,8),yellow,.21,0,.07,rotor);
 root.traverse(o=>{if(o.isMesh)o.userData.platformWheel=index;});
 return {root,rotor};
}
export function createCabControls(train,index){
 const root=new THREE.Group();root.name='Cabin uphill and downhill controls';root.position.set(-.4,.33,-.63);train.root.add(root);
 const base=new THREE.Mesh(new THREE.BoxGeometry(.28,.30,.18),new THREE.MeshStandardMaterial({color:0x24465a,roughness:.6}));root.add(base);
 for(const [up,x,color]of [[true,-.075,0x91c8ad],[false,.075,0xe5b953]]){
  const button=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.035,16),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.3}));
  button.position.set(x,.17,.015);root.add(button);button.userData.cabDirection=up;button.userData.trainIndex=index;
 }
 return root;
}
