import * as THREE from './vendor/three.module.js';
import {TRAIN_SLOPE,TRACK_CLEARANCE} from './mechanic-track.js';

// A Carmelit-inspired shell with a camera-side cutaway around the mechanic.
export function createCarmelitTrain(index){
 const root=new THREE.Group();root.name=`Carmelit train ${index+1}`;
 const body=new THREE.Group();body.name='Inclined train shell';root.add(body);
 body.matrixAutoUpdate=false;body.matrix.set(1,0,0,0, 0,1,-TRAIN_SLOPE,0, 0,0,1,0, 0,0,0,1);
 const nose=new THREE.Group();nose.name='Raked front';body.add(nose);
 nose.matrixAutoUpdate=false;nose.matrix.set(1,0,0,0, 0,1,0,0, 0,-.12,1,.0864, 0,0,0,1);
 const paint=new THREE.MeshStandardMaterial({color:index===0?0xdb501e:0xc93d22,roughness:.36,metalness:.18});
 const rubber=new THREE.MeshStandardMaterial({color:0x263331,roughness:.83});
 const glass=new THREE.MeshStandardMaterial({color:0x183942,roughness:.18,metalness:.3});
 const windowTrim=new THREE.MeshStandardMaterial({color:0x172c30,roughness:.5});
 const aluminium=new THREE.MeshStandardMaterial({color:0xc7c9b6,roughness:.4,metalness:.45});
 const yellow=new THREE.MeshStandardMaterial({color:0xffd33a,roughness:.45});
 const navy=new THREE.MeshStandardMaterial({color:0x213d67,roughness:.6});
 const floor=new THREE.MeshStandardMaterial({color:0xe1ddc8,roughness:.9});
 const cream=new THREE.MeshStandardMaterial({color:0xffefd4,roughness:.65});
 const headlights=[],doors=[];
 function part(geometry,material,x,y,z,parent=body){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function box(x,y,z,w,h,d,mat,parent=body){return part(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
 function rounded(w,h,r,depth,mat,x,y,z,parent=body){
  const shape=new THREE.Shape(),l=-w/2,b=-h/2;
  shape.moveTo(l+r,b);shape.lineTo(l+w-r,b);shape.quadraticCurveTo(l+w,b,l+w,b+r);
  shape.lineTo(l+w,b+h-r);shape.quadraticCurveTo(l+w,b+h,l+w-r,b+h);
  shape.lineTo(l+r,b+h);shape.quadraticCurveTo(l,b+h,l,b+h-r);
  shape.lineTo(l,b+r);shape.quadraticCurveTo(l,b,l+r,b);
  return part(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:5}),mat,x,y,z,parent);
 }
 function digit(n,x,y,z,parent=body){
  if(n===1){box(x,y,z,.034,.14,.013,yellow,parent);box(x-.025,y+.045,z,.055,.022,.013,yellow,parent);}
  else {for(const yy of [-.065,0,.065])box(x,y+yy,z,.10,.022,.013,yellow,parent);box(x+.04,y+.033,z,.023,.062,.013,yellow,parent);box(x-.04,y-.033,z,.023,.062,.013,yellow,parent);}
 }
 box(0,-.30,0,1.46,.27,2.20,rubber);
 box(0,-.16,0,1.46,.20,2.16,paint);
 for(let j=0;j<3;j++){
  const z=.7-j*.7,top=-TRAIN_SLOPE*z;
  box(0,top-.05,z,1.40,.10,.69,floor,root);
  box(0,top+.006,z+.322,1.36,.012,.035,yellow,root);
 }
 // Bogies connect the sloping chassis to the rails below the carriage.
 for(const z of [-.55,.55]){
  const wheelY=-TRACK_CLEARANCE+.154*Math.sqrt(1+TRAIN_SLOPE**2)-TRAIN_SLOPE*z,bodyY=-.35-TRAIN_SLOPE*z;
  box(0,(bodyY+wheelY)/2,z,.10,bodyY-wheelY,.10,rubber,root);
  box(0,wheelY,z,1.05,.07,.07,rubber,root);
  for(const x of [-.47,.47]){const wheel=part(new THREE.CylinderGeometry(.12,.12,.09,16),rubber,x,wheelY,z,root);wheel.rotation.z=Math.PI/2;}
 }
 // The downhill face follows the reference: one broad screen and dark bumper.
 rounded(1.46,1.20,.08,.11,paint,0,.39,1.02,nose);
 rounded(1.29,.81,.055,.018,windowTrim,0,.49,1.137,nose);
 rounded(1.20,.73,.04,.012,glass,0,.49,1.158,nose);
 const reflection=new THREE.MeshStandardMaterial({color:0x769c9d,roughness:.15,transparent:true,opacity:.34,depthWrite:false});
 const gleam=box(-.29,.39,1.176,.025,.34,.005,reflection,nose);gleam.rotation.z=-.50;
 const wiper=box(.25,.195,1.179,.43,.014,.012,rubber,nose);wiper.rotation.z=.22;
 box(0,1.02,1.005,1.46,.055,.40,paint,nose);
 rounded(1.39,.19,.03,.02,navy,0,-.06,1.142,nose);
 const stripe=box(0,-.06,1.168,.042,.17,.018,yellow,nose);stripe.rotation.z=-.65;
 const stripe2=box(.075,-.06,1.168,.025,.17,.018,yellow,nose);stripe2.rotation.z=-.65;
 digit(index+1,-.55,.946,1.147,nose);
 rounded(1.48,.17,.04,.08,rubber,0,-.285,1.08,nose);
 for(const x of [-.52,.52]){
  const mat=new THREE.MeshStandardMaterial({color:0xffe5a2,emissive:0xffc667,emissiveIntensity:.1});headlights.push(mat);
  box(x,-.075,1.172,.14,.063,.02,mat,nose);
 }
 // The circular drag grips remain at the nose, separate from boarding doors.
 for(const x of [-.29,0,.29]){const grip=part(new THREE.TorusGeometry(.061,.019,8,24),cream,x,-.28,1.205,nose);grip.userData.grip=index;}
 // Rear window and orange roof edge complete the square cabin silhouette.
 box(0,.48,-1.065,1.46,1.03,.06,paint);
 rounded(1.2,.70,.04,.025,windowTrim,0,.52,-1.022);
 rounded(1.1,.62,.03,.014,glass,0,.52,-.991);
 box(0,1.035,-.89,1.48,.07,.42,paint);
 // The roof fades while occupied. Both orange side walls remain real geometry
 // with an opening only at the sliding passenger doors.
 const roof=new THREE.Group();roof.name='Passenger roof';roof.userData.occupancyRoof=true;roof.userData.viewOpacity=1;body.add(roof);
 box(0,1.065,0,1.50,.075,2.25,paint,roof);
 box(0,1.017,0,1.48,.025,2.22,rubber,roof);
 const sidePanels=[];
 function sideWindow(side,w,h,r,depth,mat,x,y,z,parent=body){
  const pane=rounded(w,h,r,depth,mat,x,y,z,parent);pane.rotation.y=side*Math.PI/2;return pane;
 }
 for(const side of [-1,1]){
  for(const z of [-.738,.738]){
   const panel=box(side*.715,.492,z,.065,1.024,.674,paint);panel.name='Closed orange side panel';sidePanels.push(panel);
   sideWindow(side,.563,.608,.05,.013,windowTrim,side*.750,.573,z);
   sideWindow(side,.505,.547,.037,.009,glass,side*.765,.573,z);
   box(side*.780,.627,z,.006,.014,.47,aluminium);
   // Small yellow marks sit in the orange band above each broad window.
   const brand=new THREE.Group();brand.position.set(side*.756,.938,z);brand.rotation.y=side*Math.PI/2;body.add(brand);
   for(const x of [-.034,.034]){const mark=box(x,0,0,.028,.115,.012,yellow,brand);mark.rotation.z=-.65;}
   box(side*.721,-.009,z,.078,.057,.67,aluminium);
  }
  for(const z of [-.373,.373])box(side*.715,.492,z,.065,1.024,.057,paint);
  box(side*.715,1.015,0,.065,.04,.815,paint);
  const door=new THREE.Group();body.add(door);
  const leaves=[];
  for(const half of [-1,1]){
   const leaf=new THREE.Group();leaf.position.set(side*.767,0,half*.175);door.add(leaf);
   const height=.984;
   box(0,height/2+.018,0,.038,height,.34,paint,leaf);
   // Narrow window panes echo the sliding doors in the supplied photographs.
   sideWindow(side,.192,.666,.047,.011,windowTrim,side*.023,.55,0,leaf);
   sideWindow(side,.148,.614,.031,.006,glass,side*.036,.55,0,leaf);
   box(side*.033,.48,half*.12,.012,.062,.015,aluminium,leaf);
   box(side*.021,.508,half*.162,.012,.964,.012,rubber,leaf);
   leaves.push({leaf,half});
  }
  const lightMat=new THREE.MeshStandardMaterial({color:0x70483c,emissive:0x9edb9b,emissiveIntensity:0});
  const light=box(side*.756,.954,-.36,.055,.045,.067,lightMat);
  const step=box(side*.87,.014,0,.35,.028,.61,aluminium,root);step.visible=false;
  box(side*.725,.015,0,.035,.025,.66,yellow,root);
  const cue=new THREE.Group();root.add(cue);
  const cueMat=new THREE.MeshBasicMaterial({color:0xd7ffbc});
  box(side*.93,.035,0,.35,.018,.31,navy,cue);
  const arrow=new THREE.Shape();arrow.moveTo(-.13,-.045);arrow.lineTo(.015,-.045);arrow.lineTo(.015,-.105);arrow.lineTo(.14,0);arrow.lineTo(.015,.105);arrow.lineTo(.015,.045);arrow.lineTo(-.13,.045);arrow.closePath();
  const mark=part(new THREE.ShapeGeometry(arrow),cueMat,side*.93,.046,0,cue);mark.rotation.x=-Math.PI/2;mark.rotation.z=side===1?0:Math.PI;
  cue.visible=false;
  doors.push({side,door,leaves,step,cue,light,open:0});
 }
 root.traverse(o=>{if(o.isMesh){o.userData.destination=index?'carB':'carA';o.userData.trainIndex=index;}});
 let activeSide=0,activeLanding=null;
 function containsPassenger(position){
  const local=position.clone().sub(root.position);
  return Math.abs(local.x)<.86&&Math.abs(local.z)<.78&&Math.abs(local.y+TRAIN_SLOPE*local.z)<.22;
 }
 function updateBoarding(side,landing,inside,dt,power){
  roof.userData.viewOpacity=inside?.12:1;
  activeSide=landing?side:0;activeLanding=landing;
  for(const d of doors){
   const open=Boolean(landing&&side===d.side),destination=inside?landing:(index?'carB':'carA');
   d.open=dt?THREE.MathUtils.damp(d.open,open?1:0,16,dt):(open?1:0);
   for(const {leaf,half}of d.leaves)leaf.position.z=half*(.175+d.open*.35);
   d.step.visible=d.cue.visible=open;
   d.light.material.color.setHex(open?0xc3f5a5:0x70483c);d.light.material.emissiveIntensity=open?.7:0;
   for(const element of [d.door,d.step,d.cue,d.light])element.traverse(o=>{if(o.isMesh)o.userData.destination=open?destination:(index?'carB':'carA');});
  }
  headlights.forEach(m=>m.emissiveIntensity=power?.8:.08);
 }
 return {root,body,nose,roof,sidePanels,doors,containsPassenger,updateBoarding,get boarding(){return {side:activeSide,landing:activeLanding};}};
}
