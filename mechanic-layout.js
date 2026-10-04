import * as THREE from './vendor/three.module.js';
import {ceramicMaterial} from './mechanic-ceramics.js';
import {STATION_Y} from './mechanic-track.js';

// Walking geometry and navigation share these dimensions. The track corridor
// stays empty: platforms stop outside the body and crossing paths go around it.
export function createMechanicLayout(chapter=1,builders={}){
 const root=new THREE.Group();root.name='Stations and clear pedestrian paths';
 const near=chapter===2?1:-1,far=-near,[LOW,MID,HIGH]=STATION_Y;
 const serviceY=MID-1.35,serviceZ=-3.2,bypassX=4.3,bypassZ=-5.6;
 const palette={cream:'#efe7d4',yellow:'#f2c43e',blue:'#315b9b'};
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
 const mesh=builders.mesh||((geometry,mat,x,y,z,parent)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;});
 const box=builders.box||((x,y,z,w,h,d,color,parent)=>mesh(new THREE.BoxGeometry(w,h,d),material(color),x,y,z,parent));
 const solid=(x,y,z,w,h,d,color=palette.cream,parent=root)=>box(x,y,z,w,h,d,color,parent);
 const floors={entrance:[near*3.8,LOW,4.05],station1:[near*2.7,LOW,3],station2Near:[near*2.7,HIGH,-3],station2Far:[far*2.7,HIGH,-3],dockFar:[far*2.7,MID,0],repair:[0,serviceY,serviceZ],dockNear:[near*2.7,MID,0]};
 const stationAnchors={station1:[...floors.station1],station2Far:[...floors.station2Far]};
 // The repair marker is the mechanic's working position in front of its box.
 // Keep separate boarding waypoints so train doors are still crossed straight.
 for(const id of Object.keys(stationAnchors)){
  const [x,y,z]=stationAnchors[id];floors[id]=[x+Math.sign(x)*.57+.36,y,z-.20];
 }
 const treadMaterial=ceramicMaterial(0xbab4a5,{axes:'auto',pitch:.24});
 const surfaces=[],serviceGates=[],stairPaths=new Map(),upperStairPaths=new Map();
 const bypassY=chapter===2?MID:HIGH;
 function tag(object,id){object.traverse(o=>{if(o.isMesh)o.userData.destination=id;});return object;}
 function decor(object){object.traverse(o=>{if(o.isMesh)o.raycast=()=>{};});return object;}
 function deck(x,y,z,w,d,id){
  const g=new THREE.Group();root.add(g);
  if(id==='repair'||id.startsWith('stairs:')||id.startsWith('dock'))g.userData.focusLayer='service';
  if(id==='upperPassage')g.userData.focusLayer='rear';
  const basement=chapter===2&&(id==='repair'||id.startsWith('stairs:')||id==='upperPassage'&&y<HIGH-.06);
  const slab=solid(x,y-.11,z,w,.22,d,basement?'#777d78':palette.cream,g);
  if(chapter===2)slab.material=treadMaterial;
  if(chapter===2){
   if(basement&&d>.5)solid(x,y+.004,z,w-.04,.008,Math.min(.30,d*.45),palette.yellow,g);
   solid(x,y+.007,z+d/2-.014,w,.012,.028,'#eae4d5',g);
   if(basement){for(const dx of [-.40,0,.40])if(Math.abs(dx)<w/2-.03)solid(x+dx,y+.008,z,.075,.014,d,'#244879',g);}
  }
  solid(x,y-.12,z+d/2,w,.15,.035,basement?'#424d50':palette.blue,g);
  if(chapter===2){
   solid(x,y+.006,z+d/2-Math.min(.055,d/3),w,.012,Math.min(.10,d/3),basement?'#c8a44d':palette.yellow,g);
   if((id.startsWith('station')||id.startsWith('dock'))&&Math.abs(x)>1)solid(x-Math.sign(x)*(w/2-.06),y+.006,z,.12,.012,d,palette.yellow,g);
  }else for(let i=0;i<Math.floor(w/.36);i+=2)solid(x-w/2+.18+i*.36,y+.004,z,.34,.008,d,palette.yellow,g);
  surfaces.push({x,y,z,w,d});return tag(g,id);
 }
 function shell(x,y,z,width){
  const g=new THREE.Group();g.name='Curved station tunnel';root.add(g);
  const radius=width/2;
  if(chapter===2){
   const vault=new THREE.CylinderGeometry(radius,radius,.76,36,1,true,Math.PI/2,Math.PI);vault.rotateX(Math.PI/2);
   mesh(vault,new THREE.MeshStandardMaterial({color:palette.cream,roughness:.8,side:THREE.DoubleSide}),x,y+.6,z-1.44,g);
  }
  for(let i=0;i<5;i++){
   const zz=z-1.10-i*.17;
   mesh(new THREE.TorusGeometry(radius,.065,10,48,Math.PI),material(i===0?palette.yellow:palette.cream),x,y+.6,zz,g);
   for(const xx of [x-radius,x+radius])solid(xx,y+.3,zz,.12,.6,.12,palette.cream,g);
  }
  solid(x,y-.06,z-1.4,width+.1,.14,.85,palette.cream,g);
  decor(g);
  if(chapter===2){
   // The wall already shelters the left bank. Right canopies open inward.
   root.remove(g);

  }
  const side=Math.sign(x),bx=side*(z>0?4.22:3.76),bz=z>0?3.25:-3.90;
  seatRow(bx,y,bz,side);
 }
 function seatRow(bx,y,bz,side){
  const bench=new THREE.Group();bench.name='Platform bench facing train';root.add(bench);
  for(const dz of [-.35,.35])solid(bx,y+.19,bz+dz,.045,.38,.045,'#71817d',bench);
  solid(bx,y+.33,bz,.06,.05,.94,'#71817d',bench);
  const seatMaterial=new THREE.MeshStandardMaterial({color:0xe7ad25,roughness:.42});
  for(let i=0;i<4;i++){
   const zz=bz+(i-1.5)*.235;
   const seat=mesh(new THREE.SphereGeometry(1,16,10),seatMaterial,bx,y+.405,zz,bench);seat.scale.set(.14,.045,.108);seat.name='Rounded yellow station seat';
   const back=mesh(new THREE.SphereGeometry(1,16,12),seatMaterial,bx+side*.105,y+.55,zz,bench);back.scale.set(.04,.17,.108);back.rotation.z=-side*.10;back.name='Molded retro seat back';
  }
  decor(bench);
 }
 if(chapter===2){
  seatRow(-4.35,LOW-.22,3.70,-1);
  seatRow(-4.35,MID-.22,-.75,-1);
  seatRow(4.35,MID-.22,.05,1);
 }
 // Keep every station edge outside the train shell, including the uphill rear.
 deck(near*3.3525,LOW,3.55,2.545,2.1,'station1');
 shell(near*3.08,LOW,3.1,1.8);
 for(const x of [near*3.8-.42,near*3.8+.42])decor(solid(x,LOW+.52,4.52,.07,1.04,.10,palette.yellow));
 decor(solid(near*3.8,LOW+1.05,4.52,.95,.10,.32,palette.yellow));
 for(const side of [-1,1]){
  const id=side===near?'station2Near':'station2Far';
  deck(side*3.05,HIGH,-3.45,1.94,2,id);shell(side*3.08,HIGH,-3.05,1.8);
  // A continuous passage around the OUTSIDE of the tunnel and its bench.
  deck(side*3.5,HIGH,-3,2.3,.7,'upperPassage');
  if(chapter===2){
   const path=[[side*bypassX,HIGH,-3],[side*bypassX,HIGH,-3.275]],count=14,start=-3.35,run=(start-(bypassZ+.175))/count;
   for(let i=0;i<count;i++){
    const y=HIGH-(HIGH-bypassY)*(i+1)/count,z=start-run*(i+.5);
    deck(side*bypassX,y,z,.7,run+.008,'upperPassage');path.push([side*bypassX,y,z]);
   }
   path.push([side*bypassX,bypassY,bypassZ]);upperStairPaths.set(side,path);
  }else deck(side*bypassX,HIGH,(bypassZ-3)/2,.7,Math.abs(bypassZ+3)+.7,'upperPassage');
 }
 deck(0,bypassY,bypassZ,bypassX*2+.7,.7,'upperPassage');
 // Maintenance stairs descend below the entire moving train and cable envelope.
 for(const side of [-1,1]){
  const id=side===far?'dockFar':'dockNear';
  deck(side*2.83,MID,.1,1.5,.95,id);
  // Full-depth treads keep the mechanic clear of the preceding riser while
  // descending. Derive both the mesh and waypoints from the same stair span.
  const path=[[side*2.7,MID,0],[side*2.7,MID,-.3]],steps=12;
  const stairStartZ=-.375,stairEndZ=serviceZ+.175,run=(stairStartZ-stairEndZ)/steps;
  for(let i=0;i<steps;i++){
   const y=MID-(MID-serviceY)*(i+1)/steps,z=stairStartZ-run*(i+.5);
   deck(side*2.7,y,z,chapter===2?1.1:.7,run+.008,`stairs:${id}`);
   path.push([side*2.7,y,z]);
  }
  path.push([side*2.7,serviceY,serviceZ]);stairPaths.set(id,path);
 }
 deck(0,serviceY,serviceZ,6.1,.7,'repair');
 // Provide standing room in front of the opened service cabinet.
 deck(0,serviceY,serviceZ-.35,1,.95,'repair');
 for(const [side,repairIndex] of [[near,2],[far,1]]){
  const x=side*1.95,z=serviceZ;
  for(const dz of [-.32,.32])decor(solid(x,serviceY+.32,z+dz,.07,.64,.07,palette.blue)).userData.focusLayer='service';
  const bars=new THREE.Group();root.add(bars);
  bars.userData.focusLayer='service';
  for(const dz of [-.21,-.07,.07,.21])solid(x,serviceY+.30,z+dz,.035,.56,.035,palette.yellow,bars);
  solid(x,serviceY+.59,z,.055,.045,.57,palette.yellow,bars);
  const emblem=mesh(new THREE.CylinderGeometry(.09,.09,.035,repairIndex===1?4:32),material(palette.yellow),x+.05,serviceY+.45,z,bars);emblem.rotation.z=Math.PI/2;
  tag(bars,'repair');serviceGates.push({bars,repairIndex});
 }
 // Repeat the real lock at the visible stair mouth, so its state is clear before descent.
 if(chapter===2)for(const [side,repairIndex]of [[near,2],[far,1]]){
  const x=side*2.7,z=-.30;
  const bars=new THREE.Group();bars.name='Visible stair entrance barrier';root.add(bars);
  for(const dx of [-.43,.43])decor(solid(x+dx,MID+.34,z,.065,.68,.065,palette.blue));
  for(const dx of [-.30,-.15,0,.15,.30])solid(x+dx,MID+.29,z,.035,.54,.045,palette.yellow,bars);
  solid(x,MID+.58,z,.87,.055,.065,palette.yellow,bars);
  const lamp=mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshStandardMaterial({color:0xec8454,emissive:0xd84b25,emissiveIntensity:.8}),x+.43,MID+.75,z,root);
  decor(lamp);tag(bars,'repair');serviceGates.push({bars,repairIndex,lamp});
 }
 for(const [x,y,z]of [[near*3.7,.3,2.55],[-3.5,HIGH/2,-4.22],[3.5,HIGH/2,-4.22]])decor(solid(x,y,z,.22,y*2+.3,.22));
 function mural(x,y,z,colors){
  const g=new THREE.Group();root.add(g);solid(x,y,z,1.4,.84,.1,palette.cream,g);
  for(let r=0;r<4;r++)for(let c=0;c<7;c++)solid(x-.6+c*.2,y-.3+r*.2,z+.065,.192,.192,.02,colors[Math.floor((c+r)/2)%colors.length],g);
  decor(g);
 }
 mural(near*3.08,LOW+.76,1.51,['#315b9b','#edc647','#c8776b','#efe7d4']);
 mural(far*3.08,HIGH+.75,-4.59,chapter===2?['#6d899e','#dcac9d','#eacb62','#efe7d4']:['#315b9b','#7ca8ae','#eacb62','#efe7d4']);
 const serviceWheel=new THREE.Group();root.add(serviceWheel);serviceWheel.position.set(0,serviceY+.53,serviceZ-.43);
 serviceWheel.userData.focusLayer='service';
 mesh(new THREE.TorusGeometry(.24,.036,10,32),material(palette.yellow),0,0,0,serviceWheel);
 for(const angle of [0,Math.PI/2]){const spoke=solid(0,0,0,.40,.035,.035,palette.cream,serviceWheel);spoke.rotation.z=angle;}
 decor(serviceWheel);
 function route(a,b,point){
  if([a,b].every(id=>id.startsWith('station2'))&&a!==b){
   const side=Math.sign(floors[a][0]);
   if(chapter===2)return [...upperStairPaths.get(side),...[...upperStairPaths.get(-side)].reverse(),floors[b]].map(p=>new THREE.Vector3(...p));
   return [[side*bypassX,HIGH,-3],[side*bypassX,HIGH,bypassZ],[-side*bypassX,HIGH,bypassZ],[-side*bypassX,HIGH,-3],floors[b]].map(p=>new THREE.Vector3(...p));
  }
  if(b==='repair'&&stairPaths.has(a))return [...stairPaths.get(a).slice(1),floors.repair].map(p=>new THREE.Vector3(...p));
  if(a==='repair'&&stairPaths.has(b))return [...stairPaths.get(b)].reverse().map(p=>new THREE.Vector3(...p));
  if(stationAnchors[a]&&b.startsWith('car'))return [new THREE.Vector3(...stationAnchors[a]),point(b)];
  if(a.startsWith('car')&&stationAnchors[b])return [new THREE.Vector3(...stationAnchors[b]),point(b)];
  return [point(b)];
 }
 function cabinetPosition(id){const [x,y,z]=stationAnchors[id]||floors[id];return new THREE.Vector3(x+(id==='repair'?0:Math.sign(x)*.57),y,z-.65);}
 function updateGates(pressed,dt=0){for(const {bars,repairIndex,lamp}of serviceGates){if(lamp){lamp.material.color.setHex(pressed[repairIndex]?0xa4dfac:0xec8454);lamp.material.emissive.setHex(pressed[repairIndex]?0x63ce89:0xd84b25);}bars.position.y=dt?THREE.MathUtils.damp(bars.position.y,pressed[repairIndex]?-.68:0,9,dt):(pressed[repairIndex]?-.68:0);bars.visible=bars.position.y>-.675;}}
 const passages=[{id:'service',floor:serviceY,entryHeight:MID,points:[...stairPaths.get('dockFar'),floors.repair,...[...stairPaths.get('dockNear')].reverse()]}];
 if(chapter===2)passages.push({id:'rear',floor:bypassY,entryHeight:HIGH,points:[...upperStairPaths.get(-1),...[...upperStairPaths.get(1)].reverse()]});
 return {root,floors,serviceGates,serviceWheel,surfaces,stairPaths,upperStairPaths,passages,route,cabinetPosition,updateGates};
}
