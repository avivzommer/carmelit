import * as THREE from './vendor/three.module.js';

// Camera-relative staging puts every scenic silhouette behind the play space.
export function addBackgroundScenery(scene,camera,target){
  const root=new THREE.Group();root.name='Distant architecture';
  const towardCamera=camera.position.clone().sub(target).normalize();
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const stone=new THREE.MeshBasicMaterial({color:0xb6c6ba,transparent:true,opacity:0.30,depthWrite:false});
  const trim=new THREE.MeshBasicMaterial({color:0x779fa0,transparent:true,opacity:0.36,depthWrite:false});
  const gold=new THREE.MeshBasicMaterial({color:0xc7bd93,transparent:true,opacity:0.28,depthWrite:false});
  function part(parent,geometry,material,x,y,z){
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);
    mesh.raycast=()=>{}; // Scenery never intercepts game controls.
    parent.add(mesh);return mesh;
  }
  function box(parent,x,y,z,w,h,d,material=stone){return part(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);}
  const towers=[
    [-4.1,-3.5,4.5,0.85,29],[-3.7,1.8,3.0,0.72,33],
    [3.9,-4.3,4.7,0.85,31],[4.1,2.0,3.5,0.74,34],
    [-2.6,-6.2,2.0,0.62,35],[2.5,-6.6,1.8,0.6,36]
  ];
  for(const [screenX,screenY,height,width,depth] of towers){
    const tower=new THREE.Group();
    tower.position.copy(target).addScaledVector(towardCamera,-depth).addScaledVector(right,screenX).addScaledVector(up,screenY);
    root.add(tower);
    const shape=new THREE.Shape();
    shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,height);shape.lineTo(-width/2,height);shape.closePath();
    const radius=width*0.23,bottom=height*0.57,straight=height*0.17;
    const hole=new THREE.Path();hole.moveTo(-radius,bottom);hole.lineTo(-radius,bottom+straight);
    hole.absarc(0,bottom+straight,radius,Math.PI,0,true);hole.lineTo(radius,bottom);hole.closePath();shape.holes.push(hole);
    part(tower,new THREE.ExtrudeGeometry(shape,{depth:width*0.6,bevelEnabled:false,curveSegments:16}),stone,0,0,-width*0.3);
    box(tower,0,0.03,0,width+0.1,0.09,width*0.7,trim);
    box(tower,0,height-0.12,0,width+0.05,0.1,width*0.7,gold);
    // Quiet horizontal tile courses, not ladder rungs or false playable steps.
    for(let y=0.45;y<height*0.5;y+=0.45)box(tower,0,y,width*0.305,width,0.008,0.008,trim);
    for(let rib=0;rib<5;rib++){
      const cap=part(tower,new THREE.TorusGeometry(width/2,0.035,6,24,Math.PI),stone,0,height,-width*0.3+rib*width*0.15);
    }
  }
  scene.add(root);
  return root;
}
