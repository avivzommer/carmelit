import {ceramicMaterial} from './mechanic-ceramics.js';
import * as THREE from './vendor/three.module.js';
import {deckHeightAtZ,TRAIN_SLOPE,STATION_Y,LINE_CLIP_PLANES} from './mechanic-track.js';
import {createPassageScenery} from './mechanic-tunnels.js';

// The station is built around a recessed railway. This is physical architecture,
// included in the movement guard, with no scenery placed across a walking route.
export function createSteppedStation(layout){
 const root=new THREE.Group();root.name='Stepped Carmelit station';
 const mats=new Map(),fixtures=[],rollers=[];
 const material=(color)=>{if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.83}));return mats.get(color);};
 const colors={stone:0xc8c9bd,cream:0xebe6d4,grout:0xb9c2b8,concrete:0x899c99,bed:0x536464,steel:0x879894,blue:0x31577e,yellow:0xe4bc48,dark:0x263d42};
 function part(geometry,mat,x,y,z,parent=root,name=''){
  const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.name=name;m.castShadow=m.receiveShadow=true;
  // Decorative surfaces never steal a platform click or a train drag.
  m.raycast=()=>{};parent.add(m);return m;
 }
 function box(x,y,z,w,h,d,color=colors.cream,parent=root,name=''){
  return part(new THREE.BoxGeometry(w,h,d),material(color),x,y,z,parent,name);
 }
 function incline(){const g=new THREE.Group();g.matrixAutoUpdate=false;g.matrix.set(1,0,0,0,0,1,-TRAIN_SLOPE,STATION_Y[1],0,0,1,0,0,0,0,1);root.add(g);return g;}
 const trackBed=incline();trackBed.name='Continuous recessed track bed';
 // Separate short sections let the cutaway reveal only the area over the
 // mechanic, keeping the rest of the track bed solid during an underpass walk.
 const sectionLength=11.65/18;
 for(let i=0;i<18;i++){
  const z=-6.75+(i+.5)*sectionLength;
  box(0,-.99,z,4.02,.28,sectionLength,colors.concrete,trackBed);
  box(0,-.842,z,3.96,.026,sectionLength,colors.bed,trackBed);
 }
 // Modest curbs are below the bogies, not walls alongside the carriages.
 for(const x of [-1.99,1.99])box(x,-.86,-.925,.08,.18,11.65,colors.stone,trackBed);
 for(const x of [-1.25,1.25]){
  for(let i=0;i<30;i++){
   const z=4.45-i*.375;
   box(x,-.77,z,1.30,.13,.10,colors.steel,trackBed);
   for(const dx of [-.47,.47])box(x+dx,-.688,z,.13,.035,.17,colors.dark,trackBed);
  }
  for(let i=0;i<14;i++){
   const z=4.20-i*.79;
   const roller=part(new THREE.CylinderGeometry(.067,.067,.16,12),material(colors.dark),x,deckHeightAtZ(z)-.692,z,root,'Haul cable guide roller');
   roller.rotation.z=Math.PI/2;rollers.push(roller);
   for(const dx of [-.11,.11])box(x+dx,deckHeightAtZ(z)-.715,z,.035,.12,.20,colors.yellow);
  }
 }
 // Actual platforms gain foundations. Upper foundations leave the maintenance
 // stairs and crossing open underneath, rather than filling that space in.
 const bottom=-.6;
 for(const surface of layout.surfaces){
  const {x,y,z,w,d}=surface;
  const upper=y>STATION_Y[1]+.4;
  const depth=upper?.24:Math.max(.14,y-.22-bottom);
  box(x,y-.22-depth/2,z,w-.018,depth,Math.max(.045,d-.016),upper?colors.stone:colors.concrete,root,'Platform foundation');
 }
 // One foundation joins the railway, both platform banks and the rear tunnel.
 // The side banks are solid retaining structures, with real service passages
 // cut out around the existing floors. Their roofs never become extra routes.
 const foundationBottom=-.95,bankEnd=-6.10,bankStart=4.90;
 const foundations=new THREE.Group();foundations.name='Connected station foundations';root.add(foundations);
 box(-.12,foundationBottom-.085,-.925,9.82,.17,11.65,colors.concrete,foundations,'Continuous station footing');
 const round=n=>Number(n.toFixed(6));
 const unique=values=>[...new Set(values.map(round))].sort((a,b)=>a-b);
 const passages=layout.surfaces.map(s=>({
  xa:s.x-s.w/2-.19,xb:s.x+s.w/2+.19,za:s.z-s.d/2-.19,zb:s.z+s.d/2+.19,
  bottom:s.y-.23,top:s.y+1.12
 }));
 function bankTop(side,z){
  if(z< -5.10)return STATION_Y[1]-.22;
  if(z< -2.45)return STATION_Y[2]-.22;
  if(z< .575)return STATION_Y[1]-.22;
  // The lower station keeps a broad, level concourse behind its repair cabinet.
  // Opposite it, closed service entrances sit on a quiet stepped terrace.
  if(side>0)return STATION_Y[0]-.22;
  return Math.max(STATION_Y[0]-.22,Math.ceil((deckHeightAtZ(z)-.22)/.24)*.24);
 }
 function createBank(side){
  const xa=side<0?-4.91:2.075,xb=side<0?-2.075:4.79;
  const relevant=passages.filter(p=>p.xb>xa&&p.xa<xb&&p.zb>bankEnd&&p.za<bankStart);
  const xs=unique([xa,xb,...relevant.flatMap(p=>[Math.max(xa,p.xa),Math.min(xb,p.xb)])]);
  const zs=unique([bankEnd,bankStart,-5.10,-2.45,.575,...relevant.flatMap(p=>[Math.max(bankEnd,p.za),Math.min(bankStart,p.zb)]),...Array.from({length:8},(_,i)=>.6+i*.6)]);
  const pieces=[];
  for(let xi=0;xi<xs.length-1;xi++){
   const left=xs[xi],right=xs[xi+1],x=(left+right)/2;let previous=new Map();
   for(let zi=0;zi<zs.length-1;zi++){
    const front=zs[zi],back=zs[zi+1],z=(front+back)/2;
    let spans=[[foundationBottom,bankTop(side,z)]];
    for(const p of relevant){
     if(x<=p.xa||x>=p.xb||z<=p.za||z>=p.zb)continue;
     spans=spans.flatMap(([low,high])=>p.top<=low||p.bottom>=high?[[low,high]]:
      [[low,Math.min(high,p.bottom)],[Math.max(low,p.top),high]].filter(([a,b])=>b-a>.005));
    }
    const next=new Map();
    for(const [low,high] of spans){
     const key=`${round(low)}:${round(high)}`;
     let piece=previous.get(key);
     if(piece)piece.zb=back;
     else {piece={xa:left,xb:right,za:front,zb:back,low,high};pieces.push(piece);}
     next.set(key,piece);
    }
    previous=next;
   }
  }
  // Join equal adjoining strips rather than leaving a grid of detached blocks.
  const merged=new Map();
  for(const p of pieces){
   const key=[p.za,p.zb,round(p.low),round(p.high)].join(':');
   const last=merged.get(key);
   if(last&&last.xb===p.xa){last.xb=p.xb;p.joined=true;}else merged.set(key,p);
  }
  const sideMat=ceramicMaterial(0xaaa89c,{axes:'auto',pitch:.28}),topMat=ceramicMaterial(0xbdb7a8,{axes:'xz',pitch:.28});
  for(const p of pieces.filter(p=>!p.joined)){
   const mesh=part(new THREE.BoxGeometry(p.xb-p.xa,p.high-p.low,p.zb-p.za),
    [sideMat,sideMat,topMat,sideMat,sideMat,sideMat],
    (p.xa+p.xb)/2,(p.low+p.high)/2,(p.za+p.zb)/2,foundations,'Station retaining bank');
   mesh.userData.stationBank=side;
   if(p.high>STATION_Y[0]-.24&&p.zb>.59&&side<0){
    box((p.xa+p.xb)/2,p.high+.006,p.zb-.020,p.xb-p.xa,.012,.040,0xeee8d9,foundations,'Pale terrace step nosing');
    if(p.xa<-3.30&&p.xb>-3.30)box(-3.30,p.high+.008,(p.za+p.zb)/2,.17,.014,p.zb-p.za,colors.yellow,foundations,'Yellow terrace stair stripe');
   }
  }
 }
 createBank(-1);createBank(1);
 const passageScenery=createPassageScenery(layout);root.add(passageScenery.root);
 // The long FAR wall follows the incline. The near side is an open cutaway.
 const wall=new THREE.Group();wall.name='Tiled station wall';root.add(wall);
 const wallLift=1.55;
 // The wall now reaches the same footing as the banks, rather than floating
 // above them as its bottom follows the slope.
 const wallProfile=new THREE.Shape();
 wallProfile.moveTo(-5.80,foundationBottom);wallProfile.lineTo(5.10,foundationBottom);
 wallProfile.lineTo(5.10,deckHeightAtZ(5.10)+1.155+wallLift);wallProfile.lineTo(-5.80,deckHeightAtZ(-5.80)+1.155+wallLift);wallProfile.closePath();
 const wallGeometry=new THREE.ExtrudeGeometry(wallProfile,{depth:.24,bevelEnabled:false});
 wallGeometry.rotateY(-Math.PI/2);
 part(wallGeometry,material(colors.grout),-4.79,0,0,wall,'Continuous far retaining wall');
 const positions=[],normals=[],tileColors=[];
 function quad(points,color){const c=new THREE.Color(color);for(const i of [0,1,2,0,2,3]){positions.push(...points[i]);normals.push(1,0,0);tileColors.push(c.r,c.g,c.b);}}
 const pitch=.32,z0=-5.78,z1=5.08,x=-4.783;
 // World-aligned tile rows, so the wall reads as ceramic squares, not a sheared grid.
 for(let col=0;z0+col*pitch<z1;col++){
  const za=z0+col*pitch+.006,zb=Math.min(za+pitch-.012,z1),top=Math.min(deckHeightAtZ(za),deckHeightAtZ(zb))+1.13+wallLift;
  const base=foundationBottom;
  for(let row=Math.floor(base/pitch);row*pitch<top;row++){
   const ya=Math.max(row*pitch+.006,base),yb=Math.min((row+1)*pitch-.006,top);if(yb<=ya)continue;
   const band=Math.floor(((ya+yb)/2-deckHeightAtZ((za+zb)/2)-.58)/pitch);
   let color=colors.cream;
   if(band>=0&&band<3)color=colors.blue;
   if((col>=5&&col<=8||col>=21&&col<=24)&&band>=-1&&band<=3)color=(col+band)%3===0?0xb95b42:colors.yellow;
   quad([[x,ya,za],[x,yb,za],[x,yb,zb],[x,ya,zb]],color);
  }
 }
 const tiles=new THREE.BufferGeometry();tiles.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));tiles.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));tiles.setAttribute('color',new THREE.Float32BufferAttribute(tileColors,3));
 part(tiles,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,side:THREE.DoubleSide}),0,0,0,wall,'White tiles and Carmelit color bands');
 // Curved ceiling lining only follows the far edge; the rail corridor stays open.
 function curveStrip(z,length){
  const group=incline();
  const shape=new THREE.Shape(),cx=-3.92,cy=1.08+wallLift,r=.94,thickness=.095;
  shape.absarc(cx,cy,r+thickness,Math.PI,Math.PI/2,true);
  shape.absarc(cx,cy,r,Math.PI/2,Math.PI,false);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,curveSegments:14});
  part(g,material(colors.cream),0,0,z,group,'Curved ceiling edge');
 }
 for(let i=0;i<12;i++)curveStrip(-5.77+i*.9,.875);
 // Closed side-access doors and recessed lights establish the station scale.
 for(const [i,z]of [3.7,.45,-2.35,-4.85].entries()){
  const y=bankTop(-1,z)+.02;
  const lampLift=.65;
  box(-4.758,y+.665,z,.04,1.33,.54,colors.blue);
  box(-4.73,y+.665,z,.025,1.19,.43,colors.steel);
  box(-4.705,y+.69,z-.14,.035,.11,.035,colors.yellow);
  // Projecting wall sconces read as real bulbs even at phone scale.
  const standby=i===0||i===2;
  const lampMat=new THREE.MeshStandardMaterial({color:0xffefd1,emissive:0xffd18a,emissiveIntensity:standby?1.7:0,roughness:.35});
  box(-4.73,y+1.59+lampLift,z+.40,.08,.38,.26,colors.blue);
  box(-4.51,y+1.74+lampLift,z+.40,.46,.055,.065,colors.dark);
  const shade=part(new THREE.CylinderGeometry(.13,.23,.12,16),material(colors.blue),-4.29,y+1.68+lampLift,z+.40,root,'Station lamp shade');
  const lamp=part(new THREE.SphereGeometry(.115,16,12),lampMat,-4.29,y+1.50+lampLift,z+.40,root,'Warm station bulb');
  const light=new THREE.PointLight(0xffd19a,standby?1.5:0,3.1,2);light.position.set(-4.12,y+1.48+lampLift,z+.40);root.add(light);
  fixtures.push({lamp,light,standby,index:i<2?0:1});
 }
 // A wide elliptical tunnel mouth sits BEHIND the rear pedestrian passage.
 // Its spring line follows the tracks; its roof never covers the playable space.
 const portal=new THREE.Group();portal.position.set(0,deckHeightAtZ(-6.10),-6.10);root.add(portal);portal.name='Upward rail tunnel';portal.userData.cutawayProtected=true;
 portal.matrixAutoUpdate=false;
 portal.matrix.set(1,0,0,0,0,1,-TRAIN_SLOPE,portal.position.y,0,0,1,portal.position.z,0,0,0,1);
 const span=2.34,rise=1.02,spring=.80;
 // A complete tunnel headwall closes the uphill gap. Its arch is a real hole;
 // the rear pedestrian crossing stays in front of this structure.
 const tunnelBase=portal.position.y;
 const surround=new THREE.Shape();
 surround.moveTo(-5.03,foundationBottom-tunnelBase);surround.lineTo(4.79,foundationBottom-tunnelBase);
 surround.lineTo(4.79,1.20+wallLift);surround.quadraticCurveTo(4.79,1.95+wallLift,4.04,1.95+wallLift);
 surround.lineTo(-4.28,1.95+wallLift);surround.quadraticCurveTo(-5.03,1.95+wallLift,-5.03,1.20+wallLift);surround.closePath();
 const mouth=new THREE.Path();mouth.moveTo(-span,-.99);mouth.lineTo(span,-.99);mouth.lineTo(span,spring);
 mouth.absellipse(0,spring,span,rise,0,Math.PI,false);mouth.lineTo(-span,-.99);surround.holes.push(mouth);
 part(new THREE.ExtrudeGeometry(surround,{depth:.65,bevelEnabled:false,curveSegments:32}),material(colors.stone),0,0,-.65,portal,'Solid tunnel surround');
 // Short returns join the long tiled wall and the outer platform bank to it.
 for(const side of [-1,1]){
  const x=side<0?-4.91:4.67,top=deckHeightAtZ(-5.95)+1.155+wallLift;
  box(x,(foundationBottom+top)/2,-5.95,.24,top-foundationBottom,.30,colors.grout,root,'Tunnel side return');
 }
 // The same ceramic mosaic wraps the gate, with tile courses clipped to its opening.
 const headPositions=[],headColors=[];
 function headTile(xa,xb,ya,yb,color){
  const c=new THREE.Color(color);
  for(const i of [0,1,2,0,2,3]){const corners=[[xa,ya,.016],[xb,ya,.016],[xb,yb,.016],[xa,yb,.016]];headPositions.push(...corners[i]);headColors.push(c.r,c.g,c.b);}
 }
 const headPitch=.30;
 for(let col=0;col<32;col++)for(let row=0;row<28;row++){
  const xa=-4.94+col*headPitch+.007,xb=xa+headPitch-.014,ya=-4.65+row*headPitch+.007,yb=ya+headPitch-.014;
  if(xb>4.70||yb>3.26||ya<foundationBottom-tunnelBase+.02)continue;
  const nearest=Math.min(Math.abs(xa),Math.abs(xb));
  const archTop=nearest<span?spring+rise*Math.sqrt(Math.max(0,1-(nearest/span)**2)):-1;
  if(nearest<span&&ya<archTop+.10)continue;
  let color=colors.cream;
  if(row%7===3||row%7===4)color=colors.yellow;
  if((col+Math.floor(row/2))%9<2)color=colors.blue;
  if((col+row)%17===0)color=0xb95b42;
  headTile(xa,xb,ya,yb,color);
 }
 const headGeometry=new THREE.BufferGeometry();headGeometry.setAttribute('position',new THREE.Float32BufferAttribute(headPositions,3));headGeometry.setAttribute('color',new THREE.Float32BufferAttribute(headColors,3));headGeometry.computeVertexNormals();
 part(headGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,side:THREE.DoubleSide}),0,0,0,portal,'Colorful ceramic departure headwall');
 for(let i=0;i<3;i++){
  const pts=[];for(let n=0;n<=40;n++){const a=n/40*Math.PI;pts.push(new THREE.Vector3(Math.cos(a)*span,spring+Math.sin(a)*rise,-i*.20));}
  part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),40,.09,8,false),material(i===0?colors.stone:colors.concrete),0,0,0,portal,'Tunnel lining rib');
  for(const side of [-1,1])box(side*span,spring/2,-i*.20,.18,spring,.16,colors.stone,portal);
 }
 const back=new THREE.Shape();back.moveTo(-span,-.99);back.lineTo(span,-.99);back.lineTo(span,spring);back.absellipse(0,spring,span,rise,0,Math.PI,false);back.lineTo(-span,-.99);
 // Darkness is a visual depth effect inside an open tunnel, not a solid wall.
 const darkness=part(new THREE.ShapeGeometry(back),new THREE.MeshBasicMaterial({color:0x132a30,transparent:true,opacity:0,depthWrite:false}),0,0,-.55,portal,'Tunnel darkness');
 darkness.userData.visualEffect=true;darkness.castShadow=false;
 // The running surface continues past the visible cutaway at both ends. The
 // carriages disappear into the tunnel rather than stopping short of its mouth.
 const continuation=incline();continuation.userData.fitCamera=false;
 for(const [a,b]of [[-9.6,-6.75],[4.90,9.6]]){
  const deck=box(0,-.99,(a+b)/2,4.02,.28,b-a,colors.bed,continuation,'Tunnel track foundation');
  deck.material=deck.material.clone();deck.material.clippingPlanes=LINE_CLIP_PLANES;deck.material.clipShadows=true;
 }
 const tunnelLamp=new THREE.MeshStandardMaterial({color:0xffefd1,emissive:0xffde9e,emissiveIntensity:.1});
 part(new THREE.BoxGeometry(1.0,.04,.055),tunnelLamp,0,spring+rise-.16,-.25,portal,'Departure tunnel light');
 fixtures.push({lamp:{material:tunnelLamp},index:2});
 let age=0;
 function update(pressed,dt,underground=0){
  age+=dt;
  fixtures.forEach(({lamp,light,standby,index})=>{
   const on=light?(standby||pressed.every(Boolean)):pressed[index];
   lamp.material.emissiveIntensity=THREE.MathUtils.damp(lamp.material.emissiveIntensity,on?(light?2.3:1):0,6,dt);
   if(light)light.intensity=THREE.MathUtils.damp(light.intensity,on?1.9*(1-underground*.90):0,6,dt);
  });
  if(pressed[2])rollers.forEach(roller=>roller.rotation.x=age*.5);
  passageScenery.update(pressed,dt,underground);
 }
 function reset(){age=0;fixtures.forEach(({lamp,light,standby})=>{lamp.material.emissiveIntensity=standby?1.7:0;if(light)light.intensity=standby?1.5:0;});rollers.forEach(roller=>roller.rotation.x=0);passageScenery.reset();}
 return {root,trackBed,wall,portal,foundations,passageScenery,fixtures,update,reset};
}
