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
 mesh(new THREE.TorusGeometry(.29,.04,10,32),yellow,0,0,0,rotor);
 for(let i=0;i<3;i++){const spoke=mesh(new THREE.BoxGeometry(.54,.025,.025),metal,0,0,0,rotor);spoke.rotation.z=i*Math.PI/3;}
 mesh(new THREE.CylinderGeometry(.065,.065,.09,16),metal,0,0,0,rotor).rotation.x=Math.PI/2;
 mesh(new THREE.SphereGeometry(.055,12,8),yellow,.25,0,.07,rotor);
 root.traverse(o=>{if(o.isMesh)o.userData.platformWheel=index;});
 return {root,rotor,rimMaterial:yellow};
}
export function createCabControls(train,index){
 const root=new THREE.Group();root.name='Cabin uphill and downhill controls';train.root.add(root);
 const controls=[];
 for(const [up,x,z,color]of [[true,-.48,-.85,0x9bdbbd],[false,.48,.85,0xe9c35e]]){
  const control=new THREE.Group();control.position.set(x,.44,z);root.add(control);
  const base=new THREE.Mesh(new THREE.BoxGeometry(.36,.40,.38),new THREE.MeshStandardMaterial({color:0x24465a,roughness:.6}));control.add(base);
  const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.35});
  const button=new THREE.Mesh(new THREE.BoxGeometry(.32,.06,.34),material);button.position.y=.23;control.add(button);
  const shape=new THREE.Shape();shape.moveTo(-.045,-.10);shape.lineTo(.045,-.10);shape.lineTo(.045,.01);shape.lineTo(.11,.01);shape.lineTo(0,.13);shape.lineTo(-.11,.01);shape.lineTo(-.045,.01);shape.closePath();
  const arrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x163343,side:THREE.DoubleSide}));
  arrow.rotation.x=-Math.PI/2;arrow.rotation.z=up?0:Math.PI;arrow.position.y=.264;control.add(arrow);
  control.traverse(o=>{if(o.isMesh){o.userData.cabDirection=up;o.userData.trainIndex=index;}});
  controls.push({root:control,button,material,up});
 }
 return {root,controls};
}
export function addCabinetWrench(cabinet){
 const root=new THREE.Group();root.position.set(.215,.15,.055);root.rotation.z=-.65;cabinet.hinge.add(root);
 const mat=new THREE.MeshStandardMaterial({color:0xe3bc53,emissive:0xe3bc53,emissiveIntensity:.25,metalness:.3,roughness:.5});
 const stem=new THREE.Mesh(new THREE.BoxGeometry(.025,.12,.012),mat);root.add(stem);
 const jaw=new THREE.Mesh(new THREE.TorusGeometry(.034,.012,6,16,Math.PI*1.55),mat);jaw.position.y=.075;jaw.rotation.z=.7;root.add(jaw);
 return root;
}

export function createInteractionHalo(position,radius=.36){
 const material=new THREE.MeshBasicMaterial({color:0xffdc83,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide});
 const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.025,48),material);ring.rotation.x=-Math.PI/2;ring.position.copy(position);ring.position.y+=.025;ring.userData.visualEffect=true;return ring;
}
