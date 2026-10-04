import {createRunout,createDepartureRunout,applyDepartureFade} from './mechanic-runout.js';
import * as THREE from 'three';
import {createMechanicJourney} from './mechanic-state.mjs';
import {createMechanicLayout} from './mechanic-layout.js';
import {createSteppedStation} from './mechanic-station.js';
import {createWalkGuard,createPlayerCutaway,cabinetWorkOffset} from './mechanic-clearance.js';
import {advanceWalkStep} from './mechanic-walk.js';
import {createRestoration} from './mechanic-restoration.js';
import {createTrack,trainPosition,STATION_Y,TERMINAL_Z,LINE_CLIP_PLANES,departureTravel,deckHeightAtZ} from './mechanic-track.js';
import {createTrainPointer} from './mechanic-input.mjs';
import {createRepairCabinet} from './mechanic-repair.js';
import {createCarmelitTrain} from './mechanic-train.js';
import {createUndergroundAtmosphere} from './mechanic-atmosphere.js';
import {fittedView,restorationReveal,entranceFrame} from './mechanic-presentation.mjs';
import {addBackgroundScenery} from './scenery.js';
const canvas = document.querySelector('canvas');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (error) {
  const message = document.createElement('p');
  message.id = 'error';
  message.textContent = 'This scene needs WebGL. Please open it in a browser with hardware acceleration enabled.';
  document.body.append(message);
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.localClippingEnabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
const chapter=Number(document.body.dataset.chapter||1);
const camera = new THREE.OrthographicCamera(-6, 6, 9, -9, 0.1, 100);
const target = new THREE.Vector3(0, STATION_Y[1]+.6, -.15);
camera.position.copy(target).add(new THREE.Vector3(24, 24*Math.SQRT2, 24));
camera.lookAt(target);
const ambient=new THREE.HemisphereLight(0xfff7e3, 0x7285a3, 2.1);scene.add(ambient);
const sunlight = new THREE.DirectionalLight(0xfff0d4, 3.4);
sunlight.position.set(-7, 20, 12);
sunlight.target.position.set(0, STATION_Y[1], 0);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
Object.assign(sunlight.shadow.camera, { left: -8, right: 8, top: 11, bottom: -11, near: 0.1, far: 50 });
sunlight.shadow.normalBias = 0.025;
sunlight.shadow.bias = -0.00015;
sunlight.shadow.radius = 4;
scene.add(sunlight, sunlight.target);
const fill = new THREE.DirectionalLight(0xd7e7ff, 0.65);
fill.position.set(8, 8, -10);
scene.add(fill);

const palette = { cream: '#efe7d4', yellow: '#f2c43e', blue: '#315b9b', dark: '#263140' };
const materials = new Map();
// Physical tile pitch is shared across every box face, independent of its size.
function tiled(color, width, height) {
  const key = `${color}:${width.toFixed(3)}:${height.toFixed(3)}`;
  if (materials.has(key)) return materials.get(key);
  const tile = document.createElement('canvas');
  tile.width = tile.height = 128;
  const ctx = tile.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fillRect(0, 0, 128, 1.5);
  ctx.fillRect(0, 0, 1.5, 128);
  ctx.fillStyle = 'rgba(79,65,45,.13)';
  ctx.fillRect(0, 126.5, 128, 1.5);
  ctx.fillRect(126.5, 0, 1.5, 128);
  const map = new THREE.CanvasTexture(tile);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(width / 0.36, height / 0.36);
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const material = new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
  materials.set(key, material);
  return material;
}
const plain = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
const cream = plain(palette.cream);
const blue = plain(palette.blue);
const dark = plain(palette.dark);
function mesh(geometry, material, x, y, z, parent = scene) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(x, y, z, w, h, d, color = palette.cream, parent = scene) {
  const sides = [tiled(color,d,h), tiled(color,d,h), tiled(color,w,d), tiled(color,w,d), tiled(color,w,h), tiled(color,w,h)];
  return mesh(new THREE.BoxGeometry(w,h,d), sides,x,y,z,parent);
}

// All joints rotate at their anatomical attachment, never at a limb's centre.
const person=new THREE.Group();
const bodyRig=new THREE.Group();
person.add(bodyRig);
scene.add(person);
person.scale.setScalar(1.35);
const skin=plain('#cfac87'),workwear=plain('#285879'),safety=plain('#f3c543'),steel=plain('#bbc9c9');
mesh(new THREE.SphereGeometry(0.062,16,12),skin,0,0.49,0,bodyRig);
mesh(new THREE.SphereGeometry(.077,20,12,0,Math.PI*2,0,Math.PI/2),safety,0,.51,0,bodyRig);
mesh(new THREE.CylinderGeometry(.087,.087,.015,24),safety,0,.511,.006,bodyRig);
mesh(new THREE.BoxGeometry(.025,.022,.02),cream,0,.536,.071,bodyRig);
mesh(new THREE.CapsuleGeometry(0.053,0.105,5,12),workwear,0,0.345,0,bodyRig);
mesh(new THREE.BoxGeometry(.10,.092,.035),safety,0,.373,.036,bodyRig);
mesh(new THREE.BoxGeometry(.12,.025,.09),dark,0,.282,0,bodyRig);
mesh(new THREE.BoxGeometry(.046,.06,.045),plain('#b27d4c'),.076,.267,0,bodyRig);
mesh(new THREE.BoxGeometry(.013,.080,.016),steel,.077,.31,.024,bodyRig);
mesh(new THREE.TorusGeometry(.019,.005,6,12,Math.PI*1.55),steel,.077,.354,.024,bodyRig);
function joint(parent,x,y,z) {
  const pivot=new THREE.Group();pivot.position.set(x,y,z);parent.add(pivot);return pivot;
}
function bone(parent,length,radius) {
  return mesh(new THREE.CapsuleGeometry(radius,length-2*radius,4,8),dark,0,-length/2,0,parent);
}
function leg(x) {
  const hip=joint(bodyRig,x,0.25,0);
  bone(hip,0.12,0.021);
  const knee=joint(hip,0,-0.12,0);bone(knee,0.11,0.018);
  const foot=mesh(new THREE.CapsuleGeometry(0.018,0.035,4,8),dark,0,-0.112,0.018,knee);
  foot.rotation.x=Math.PI/2;
  return {hip,knee};
}
function arm(x) {
  const shoulder=joint(bodyRig,x,0.402,0);
  shoulder.rotation.z=x<0?-0.08:0.08;
  bone(shoulder,0.095,0.015);
  const elbow=joint(shoulder,0,-0.095,0);bone(elbow,0.085,0.013);
  elbow.rotation.x=-0.12;
  mesh(new THREE.SphereGeometry(0.015,8,6),dark,0,-0.088,0,elbow);
  return {shoulder,elbow};
}
const legs=[leg(-0.035),leg(0.035)];
const arms=[arm(-0.067),arm(0.067)];
let gaitPhase=0,gaitWeight=0,desiredHeading=0;
function settlePose() { gaitWeight=0;bodyRig.position.y=0;bodyRig.rotation.z=0;
  for(const {hip,knee} of legs){hip.rotation.x=0;knee.rotation.x=0;}
  for(const {shoulder,elbow} of arms){shoulder.rotation.x=0;elbow.rotation.x=-0.12;}
}
function updateGait(dt,distance,climbing) {
  const walking=distance>0.00001;
  gaitWeight=THREE.MathUtils.damp(gaitWeight,walking?1:0,walking?12:9,dt);
  gaitPhase+=distance/0.43*Math.PI*2;
  for(let i=0;i<2;i++) {
    const phase=gaitPhase+i*Math.PI,swing=Math.sin(phase);
    legs[i].hip.rotation.x=swing*(climbing?0.48:0.32)*gaitWeight;
    legs[i].knee.rotation.x=Math.max(0,-swing)*(climbing?0.7:0.42)*gaitWeight;
    arms[i].shoulder.rotation.x=-swing*0.19*gaitWeight;
    arms[i].elbow.rotation.x=-0.12-Math.max(0,swing)*0.13*gaitWeight;
  }
  bodyRig.position.y=Math.abs(Math.sin(gaitPhase))*0.009*gaitWeight;
  bodyRig.rotation.z=Math.sin(gaitPhase)*0.015*gaitWeight;
  const delta=Math.atan2(Math.sin(desiredHeading-person.rotation.y),Math.cos(desiredHeading-person.rotation.y));
  person.rotation.y+=delta*(1-Math.exp(-12*dt));
}

const game=createMechanicJourney(chapter),status=document.querySelector('#status'),win=document.querySelector('#win');
const near=chapter===2?1:-1;
const HIGH=STATION_Y[2];
const carriages=[],buttons=[],signals=[],cabinets=[],powerPulses=[];
const layout=createMechanicLayout(chapter,{box,mesh});scene.add(layout.root);
const station=chapter===2?createSteppedStation(layout):null;
if(station)scene.add(station.root);
const {floors}=layout;
const atmosphere=createUndergroundAtmosphere({scene,renderer,ambient,sunlight,fill,passages:layout.passages,
 onChange:(strength,power)=>document.body.style.setProperty('--underground-depth',THREE.MathUtils.lerp(.30*(1-power),1,strength).toFixed(3))});
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const say=text=>status.textContent=text;
const introCard=document.createElement('div');introCard.id='intro-guide';introCard.hidden=true;
introCard.setAttribute('role','dialog');introCard.setAttribute('aria-modal','true');introCard.setAttribute('aria-labelledby','intro-title');
const introPanel=document.createElement('section'),introCount=document.createElement('div'),introTitle=document.createElement('h1'),introText=document.createElement('p'),introNext=document.createElement('button');
introCount.className='intro-progress';introCount.setAttribute('role','progressbar');introCount.setAttribute('aria-label','Introduction progress');introCount.setAttribute('aria-valuemin','0');introCount.setAttribute('aria-valuemax','3');
introTitle.id='intro-title';introNext.type='button';introPanel.append(introCount,introTitle,introText,introNext);introCard.append(introPanel);document.body.append(introCard);
const introPages=[
 ['Your shift begins','The station has lost power. You are the technician sent to restore its three repair stations and bring the line back to life.'],
 ['Make your first repair','Tap the triangle beside the blue cabinet. The technician will walk over and fix it. Tap accessible paths and platforms to move around.'],
 ['Bring the line back to life','Board through an open train door, then drag the train along the rails. Explore the underground passages and repair the remaining cabinets to light up the exit.']
];
let introPage=0;
let actionRevealTimer;
function cancelActionReveal(){clearTimeout(actionRevealTimer);}
function revealReadingScreen(container,textElements,actions){
 cancelActionReveal();
 container.tabIndex=-1;container.focus({preventScroll:true});
 for(const element of textElements){
  element.getAnimations().forEach(a=>a.cancel());
  element.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:reducedMotion?0:700,easing:'ease-out'});
 }
 for(const action of actions){action.getAnimations().forEach(a=>a.cancel());action.style.visibility='hidden';action.inert=true;}
 actionRevealTimer=setTimeout(()=>{
  if(container.hidden)return;
  for(const action of actions){
   action.style.visibility='visible';action.inert=false;
   action.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:reducedMotion?0:650,easing:'ease-out'});
  }
  actions[0]?.focus({preventScroll:true});
 },2000);
}
function showCompletion(){
 win.hidden=false;document.querySelector('#controls').inert=true;
 win.querySelector('.completion-sparkles')?.remove();
 if(!reducedMotion){
  const sparkles=document.createElement('div');sparkles.className='completion-sparkles';sparkles.setAttribute('aria-hidden','true');
  for(let i=0;i<22;i++){
   const spark=document.createElement('i'),angle=i*Math.PI*2/22;
   spark.style.setProperty('--x',`${Math.cos(angle)*(140+(i%4)*38)}px`);
   spark.style.setProperty('--y',`${Math.sin(angle)*(100+(i%3)*32)-55}px`);
   spark.style.setProperty('--delay',`${(i%5)*.09}s`);sparkles.append(spark);
  }
  win.append(sparkles);
 }
 revealReadingScreen(win,[win.querySelector('h1'),win.querySelector('p')],[...win.querySelectorAll('button,a')]);
}
function showIntroPage(){
 introCount.style.setProperty('--progress',`${(introPage+1)/introPages.length*100}%`);
 introCount.setAttribute('aria-valuenow',String(introPage+1));
 introCount.setAttribute('aria-valuetext',`Step ${introPage+1} of ${introPages.length}`);
 [introTitle.textContent,introText.textContent]=introPages[introPage];
 introNext.textContent=introPage===introPages.length-1?'Start the game':'Continue';
 revealReadingScreen(introCard,[introTitle,introText],[introNext]);
}
introNext.onclick=async()=>{
 if(introPage<introPages.length-1){introPage++;showIntroPage();}
 else {
  introNext.disabled=true;
  await introCard.animate([{opacity:1},{opacity:0}],{duration:reducedMotion?0:350,easing:'ease-in'}).finished;
  introCard.hidden=true;introNext.disabled=false;document.querySelector('#controls').inert=false;canvas.focus({preventScroll:true});
 }
};
introCard.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();(introNext.inert?introCard:introNext).focus();}});

const vector=p=>new THREE.Vector3(...p);
function tag(object,key,value){object.traverse(o=>{if(o.isMesh)o.userData[key]=value;});return object;}
// Orange-red Carmelit trains, with doors that identify the platform side.
const trainModels=[];
for(let i=0;i<2;i++){
 const train=createCarmelitTrain(i);scene.add(train.root);carriages.push(train.root);trainModels.push(train);
 if(chapter===2)train.root.traverse(o=>{if(o.isMesh)for(const mat of Array.isArray(o.material)?o.material:[o.material]){applyDepartureFade(mat);mat.clipShadows=true;}});
}
function updateBoarding(dt=0){
 trainModels.forEach((train,i)=>{
  const id=i?'carB':'carA';
  const arriving=game.state.motion?.type==='intro'&&entranceFrame(animation?.time||0,reducedMotion).arrival<1;
  const landing=arriving?null:game.landingFor(id);
  const side=landing?Math.sign(floors[landing][0]-train.root.position.x):0;
  train.updateBoarding(side,landing,train.containsPassenger(person.position),dt,game.state.pressed[0]);
 });
}
// Rails and the central haul cable run below the sloped chassis at every stop.
const tracks=[];
const trackRange=chapter===2?{downhillZ:9.6,uphillZ:-9.6,clippingPlanes:LINE_CLIP_PLANES}:{};
for(const x of [-1.25,1.25]){
 for(const dx of [-.47,.47])tracks.push(createTrack(x+dx,.034,0x61737b,trackRange));
 tracks.push(createTrack(x,.028,0x253940,trackRange));
}
scene.add(...tracks);
if(chapter===2){scene.add(createRunout(),createDepartureRunout());person.traverse(o=>{if(o.isMesh)for(const mat of Array.isArray(o.material)?o.material:[o.material])applyDepartureFade(mat);});}
if(chapter===2)tracks.forEach(track=>track.userData.fitCamera=false);
// Three repairs retain the familiar walk-on, latch-down button interaction.
const repairIds=['station1','station2Far','repair'];
repairIds.forEach((id,i)=>{
 const [x,y,z]=floors[id],sides=[3,4,32][i],color=[0xf2c43e,0x7db9ca,0xd69483][i];
 const base=mesh(new THREE.CylinderGeometry(.29,.29,.055,32),blue,x,y+.03,z);base.userData.destination=id;
 const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.05});
 const cap=mesh(new THREE.CylinderGeometry(.23,.23,.10,sides),mat,x,y+.125,z);cap.userData.destination=id;buttons.push({cap,y});
 // Hinged cabinet: the mechanic opens it, repairs the contacts, then closes it.
 const cabinet=createRepairCabinet(i);
 cabinet.root.position.copy(layout.cabinetPosition(id));
 scene.add(cabinet.root);tag(cabinet.root,'destination',id);cabinets.push(cabinet);signals.push(cabinet.lamp);
 if(i===2){base.userData.focusLayer=cap.userData.focusLayer=cabinet.root.userData.focusLayer='service';}
 // Matching release indicators above the upper station.
 const indicatorX=(i-1)*(chapter===2?.72:.34),indicatorY=chapter===2?deckHeightAtZ(TERMINAL_Z)+2.48:HIGH+.72,indicatorZ=chapter===2?TERMINAL_Z+.12:-4.48;
 if(chapter===2){
  const bezel=mesh(new THREE.CylinderGeometry(.30,.30,.055,48),new THREE.MeshStandardMaterial({color:0x17394d,metalness:.35,roughness:.45}),indicatorX,indicatorY,indicatorZ-.045);bezel.rotation.x=Math.PI/2;
  const rim=mesh(new THREE.TorusGeometry(.275,.018,8,48),new THREE.MeshStandardMaterial({color:0xd3bd78,roughness:.5}),indicatorX,indicatorY,indicatorZ-.007);
 }
 const topLamp=mesh(new THREE.CylinderGeometry(chapter===2?.215:.085,chapter===2?.215:.085,.04,sides),mat.clone(),indicatorX,indicatorY,indicatorZ);topLamp.rotation.x=Math.PI/2;signals.push(topLamp);
 topLamp.userData.repairColor=color;

});
// Current follows the existing central haul cable, entirely below the trains.
if(chapter===2)repairIds.forEach((id,i)=>{
 const cableX=i===1?-1.25:1.25;
 const cablePoint=z=>new THREE.Vector3(cableX,deckHeightAtZ(z)-.62+.018,z);
 const curve=new THREE.LineCurve3(cablePoint(3.15),cablePoint(TERMINAL_Z));
 const dots=[];
 for(let n=0;n<18;n++){
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.026,8,6),new THREE.MeshBasicMaterial({color:0xffe7a0,transparent:true,opacity:0,depthWrite:false}));dot.visible=false;dot.raycast=()=>{};scene.add(dot);dots.push(dot);
 }
 powerPulses.push({curve,dots,time:-1,latched:false});
});
function updatePowerPulses(dt){
 powerPulses.forEach((p,i)=>{
  const pressed=game.state.pressed[i];
  if(pressed&&!p.latched){p.time=0;p.latched=true;}
  if(!pressed){p.latched=false;p.time=-1;}
  if(p.time>=0)p.time+=dt;
  const progress=p.time/2.2;
  p.dots.forEach((dot,n)=>{
   const t=progress-n*.009;dot.visible=p.time>=0&&t>=0&&t<=1;
   if(dot.visible){dot.position.copy(p.curve.getPointAt(t));dot.material.opacity=(1-n/18)*.9;}
  });
  const arriving=progress>=.95&&progress<1.55;
  const lamp=signals[i*2+1];
  if(pressed&&progress<.95)lamp.material.emissiveIntensity=.12;
  if(arriving){const glow=Math.sin((progress-.95)/.60*Math.PI);lamp.material.emissiveIntensity=1.8+glow*2;lamp.scale.setScalar(1+glow*.14);}
  else lamp.scale.setScalar(1);
 });
}

const restoration=createRestoration({near,floors,stairPaths:layout.stairPaths,terminalZ:chapter===2?TERMINAL_Z:null});scene.add(restoration.root);
// A turning service wheel visibly starts when the middle repair is complete.
const {serviceWheel}=layout;
const repairTool=new THREE.Group();arms[1].elbow.add(repairTool);
mesh(new THREE.BoxGeometry(.014,.07,.014),steel,0,-.11,.02,repairTool);
mesh(new THREE.TorusGeometry(.022,.006,6,12,Math.PI*1.5),steel,0,-.157,.02,repairTool);
repairTool.visible=false;
const architecture=[layout.root,...(station?[station.root]:[])];
const clearanceRoots=[...architecture,...carriages,...cabinets.map(c=>c.root),restoration.root,...tracks];
person.userData.alwaysVisible=true;
const walkGuard=createWalkGuard(clearanceRoots),cutaway=createPlayerCutaway([scene],{passages:layout.passages});
let travel=game.low,animation=null;
function point(id){if(id==='carA'||id==='carB')return carriages[id==='carA'?0:1].position.clone();return vector(floors[id]);}
function positions(t){travel=t;carriages.forEach((car,i)=>car.position.copy(trainPosition(i,t)));if(['carA','carB'].includes(game.state.location))person.position.copy(point(game.state.location));}
function hint(){
 const s=game.state,train=game.primary==='carA'?'1':'2',other=train==='1'?'2':'1';
 if(s.pressed.every(Boolean)){
  say(s.location===game.primary?`The departure tunnel is open. Drag train ${train} uphill along the lit track.`:s.stop!==1?`The tunnel is open. Bring train ${train} to the middle landing, then follow the lights to board.`:`The tunnel is open. Follow the glowing walkway to train ${train}, then drag it uphill.`);
  return;
 }
 if(['carA','carB'].includes(s.location)){
  const landing=game.landingFor(s.location);
  if(landing){
   const destination=landing.startsWith('dock')?'maintenance landing':landing==='station1'?'first station':'upper station';
   say(`The open door and lit arrow lead to the ${destination}. Click the arrow or platform to step off.`);
  }else say('No platform at this stop. Drag the train to an aligned station.');
  return;
 }
 say(!s.pressed[0]?(chapter===1?'The first shift':'The upper line')+' · Step on the triangle to restore station power.':!s.pressed[1]?`Board train ${train}. Drag the train up to the second station.`:!s.pressed[2]?`Call train ${other} to the upper station. Ride down halfway to repair the cable.`:`Service restored. Cross to train ${train} and ride up to depart.`);
}
function route(a,b){return layout.route(a,b,point);}
function blockedWalkHint(id){
 const s=game.state;
 if(id==='repair'&&s.stop===1){
  const other=game.secondary==='carA'?'1':'2';
  if(!s.pressed[1])say('The service gates are closed. Ride up and press the square repair button at the second station.');
  else if(!s.pressed[2])say(`The round gate opens from the other side. Use train ${other} to reach the repair.`);
  else say('Bring the train level with this landing first.');
 }else say('Bring the train level with this landing first.');
}
function walk(id){
 if(['intro','reveal'].includes(game.state.motion?.type))return;
 if(id.startsWith('stairs:')){const dock=id.slice(7);id=game.state.location===dock?'repair':dock;}
 if(id===game.state.location){hint();return;}
 if(id==='upperPassage')id=game.state.location==='station2Far'?'station2Near':'station2Far';
 const path=game.walk(id);if(!path){if(!game.state.motion)blockedWalkHint(id);return;}
 const points=[];for(let i=1;i<path.length;i++)points.push(...route(path[i-1],path[i]));animation={type:'walk',points};nextStep();
}
function nextStep(){
 if(!animation.points.length){
  game.finishWalk();animation=null;
  if(game.state.motion?.type==='repair'){
   const index=game.state.motion.index,cabinet=cabinets[index],from=person.position.clone();
   const work=cabinet.root.position.clone().add(cabinetWorkOffset);
   animation={type:'repair',index,from,work,continueTo:game.state.motion.continueTo,time:0,duration:3.2};
   say(['Opening the power cabinet. Restoring station power…','Opening the release cabinet. Repairing the train controls…','Opening the service cabinet. Repairing the cable drive…'][index]);
  }else if(game.state.motion?.type==='departure')depart();else hint();return;
 }
 const from=person.position.clone(),to=animation.points.shift(),d=to.clone().sub(from);Object.assign(animation,{from,to,time:0,duration:Math.max(.1,from.distanceTo(to)/1.55)});if(Math.hypot(d.x,d.z)>.001)desiredHeading=Math.atan2(d.x,d.z);
}
function depart(){animation={type:'departure',from:travel,to:departureTravel(game.high,chapter),time:0,duration:chapter===2?6:2.1};say(chapter===1?'Line repaired. Departing for the upper line.':'The exit is open. Taking the train through the final tunnel.');}
function release(index){if(game.release(index))animation={type:'slide',from:travel,to:index,time:0,duration:Math.max(.45,Math.abs(travel-index)*.7)};}
function reset(){cancelActionReveal();introCard.hidden=true;document.querySelector('#controls').inert=false;canvas.style.opacity='1';introFocus=0;departureFocus=0;resize();pointer.cancel();game.reset();animation=null;positions(game.low);person.position.copy(point('entrance'));person.rotation.y=0;desiredHeading=0;settlePose();bodyRig.rotation.x=0;repairTool.visible=false;cabinets.forEach(c=>c.setProgress(0,false));win.hidden=true;document.body.classList.remove('departing','entering');restoration.reset();station?.reset();atmosphere?.reset();layout.updateGates(game.state.pressed);updateBoarding();hint();}
const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
function hit(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(ndc,camera);scene.updateMatrixWorld(true);for(const h of raycaster.intersectObjects(scene.children,true)){let parent=h.object,ignore=false;while(parent){if(parent===person||!parent.visible){ignore=true;break;}parent=parent.parent;}if(ignore||h.object.userData.cutawayOpacity<.35)continue;const d=h.object.userData;if(d.trainIndex!==undefined)return {trainIndex:d.trainIndex,destination:d.destination};if(d.destination)return {destination:d.destination};break;}return null;}
canvas.style.touchAction='none';
const pointer=createTrainPointer({
 available:()=>!game.state.motion&&!game.state.complete&&!animation,
 pick:hit,travel:()=>travel,begin:()=>game.beginDrag(),move:positions,end:release,click:walk,
 blocked:()=>say('Step on the triangle and let the mechanic finish the power repair before moving the trains.'),
 cancel:()=>{game.cancel();positions(game.state.stop);},
 capture:id=>canvas.setPointerCapture(id),releaseCapture:id=>{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);},
 axis:()=>{const a=trainPosition(0,0).project(camera),b=trainPosition(0,1).project(camera);return {x:(b.x-a.x)*canvas.clientWidth/2,y:-(b.y-a.y)*canvas.clientHeight/2};}
});
canvas.addEventListener('pointerdown',pointer.down);
canvas.addEventListener('pointermove',e=>{if(pointer.move(e)){canvas.style.cursor=pointer.dragging?'grabbing':'grab';return;}const h=hit(e);canvas.style.cursor=h?.trainIndex!==undefined?'grab':h?'pointer':'default';});
canvas.addEventListener('pointerup',e=>{pointer.up(e);canvas.style.cursor='default';});
canvas.addEventListener('pointercancel',pointer.cancel);canvas.addEventListener('lostpointercapture',pointer.cancel);
window.addEventListener('keydown',e=>{if(!introCard.hidden)return;if(e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement)return;if(e.key.toLowerCase()==='r')reset();if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const sign=game.state.location==='carB'?-1:1;if(game.beginDrag())release(THREE.MathUtils.clamp(game.state.stop+(e.key==='ArrowUp'?1:-1)*sign,0,2));else hint();}const destinations={'1':'station1','2':game.primary,'3':'station2Far','4':game.secondary,'5':'repair','6':game.primary};if(destinations[e.key])walk(destinations[e.key]);});
document.querySelector('#restart').onclick=reset;document.querySelector('#again').onclick=reset;let hintTimer;document.querySelector('#help').onclick=()=>{hint();document.body.classList.toggle('show-hint');clearTimeout(hintTimer);hintTimer=setTimeout(()=>document.body.classList.remove('show-hint'),6000);};
// Fit both trains at both ends of their travel, including the departure, before adding scenery.
const screenBounds=new THREE.Box2();
function measure(){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(p.userData.fitCamera===false)return;const bounds=new THREE.Box3().setFromObject(o);for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=vector([x,y,z]).applyMatrix4(camera.matrixWorldInverse);screenBounds.expandByPoint(new THREE.Vector2(p.x,p.y));}});}
positions(-.58);measure();positions(2.58);measure();positions(1);updateBoarding();measure();
const size=screenBounds.getSize(new THREE.Vector2()),center=screenBounds.getCenter(new THREE.Vector2());
let introFocus=0,departureFocus=0;
function resize(){
 const rect=canvas.getBoundingClientRect(),width=rect.width,height=rect.height;
 // Let the decorative wall tips crop slightly, while all platforms remain in view.
 const focusPoint=point('entrance').add(new THREE.Vector3(0,.35,0)).applyMatrix4(camera.matrixWorldInverse);
 const framedCenter=center.clone().lerp(new THREE.Vector2(focusPoint.x,focusPoint.y),introFocus*.70);
 if(departureFocus){const follow=carriages[game.primary==='carB'?1:0].position.clone().add(new THREE.Vector3(0,.6,0)).applyMatrix4(camera.matrixWorldInverse);framedCenter.lerp(new THREE.Vector2(follow.x,follow.y),departureFocus*.65);}
 const zoom=1+introFocus*.65+departureFocus*.28;
 Object.assign(camera,fittedView({x:size.x*.94/zoom,y:size.y*.94/zoom},framedCenter,width,height,{top:0,bottom:0,left:0,right:0}));
 camera.updateProjectionMatrix();const ratio=renderer.getPixelRatio();if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio))renderer.setSize(width,height,false);
}
if(chapter===1)addBackgroundScenery(scene,camera,target);
window.addEventListener('resize',resize);resize();reset();startEntrance();
window.visualViewport?.addEventListener('resize',resize);

function startEntrance(){
 game.state.motion={type:'intro'};
 animation={type:'intro',time:0,duration:entranceFrame(0,reducedMotion).duration};
 canvas.style.opacity='0';document.body.classList.add('entering');
 introPage=0;introCard.hidden=true;canvas.tabIndex=-1;
 trainModels.forEach(train=>train.updateBoarding(0,null,false,0,false));
}
const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),before=person.position.clone();
 if(!introCard.hidden||game.state.complete)return;
 let repairFrame=null,walked=false,surfaceReveal=0;
 if(animation){
  if(animation.type!=='walk'&&(animation.type!=='departure'||restoration.opened))animation.time+=dt;
  const t=Math.min(1,animation.time/animation.duration),kind=animation.type;
  if(kind==='intro'){
   const frame=entranceFrame(animation.time,reducedMotion);
   if(!animation.instructionsShown&&animation.time>=(reducedMotion?.6:3.5)){
    animation.instructionsShown=true;introCard.hidden=false;document.querySelector('#controls').inert=true;showIntroPage();
   }
   canvas.style.opacity=String(frame.opacity);introFocus=frame.focus;resize();
   positions(THREE.MathUtils.lerp(game.low+(game.low===2?-.65:.65),game.low,frame.arrival));
   person.position.copy(point('entrance'));person.position.z+=(1-frame.step)*.25;
   walked=frame.step>0&&frame.step<1;desiredHeading=Math.PI;
   if(frame.complete){positions(game.low);person.position.copy(point('entrance'));game.state.motion=null;animation=null;introFocus=0;canvas.style.opacity='1';document.body.classList.remove('entering');introCard.hidden=true;resize();hint();}
  }else if(kind==='walk'){
   const frame=advanceWalkStep(animation,person.position,dt,walkGuard);
   walked=frame.moved;if(frame.arrived)nextStep();
  }
  else if(kind==='repair'){
   const pose=cabinets[animation.index].setProgress(t,false);
   const next=new THREE.Vector3().lerpVectors(animation.from,animation.work,pose.approach);
   walkGuard.refresh();
   if(walkGuard.segmentBlocker(person.position,next)){animation.time-=dt;}
   else person.position.copy(next);
   walked=t<.22||t>.82;
   if(walked){const delta=person.position.clone().sub(before);if(delta.lengthSq()>.000001)desiredHeading=Math.atan2(delta.x,delta.z);}
   else {const toward=cabinets[animation.index].root.position.clone().sub(person.position);desiredHeading=Math.atan2(toward.x,toward.z);}
   repairFrame={t,pose};
   if(t===1){
    const continueTo=animation.continueTo;game.finishRepair({reveal:true});cabinets[animation.index].setProgress(1,true);animation=null;repairFrame=null;
    if(game.state.motion?.type==='reveal'){animation={type:'reveal',time:0,duration:restorationReveal(0,reducedMotion).duration,continueTo};say('All three repairs complete. Bringing the station back to life…');}
    else if(continueTo)walk(continueTo);else hint();
   }
  }else if(kind==='reveal'){
   const reveal=restorationReveal(animation.time,reducedMotion);surfaceReveal=reveal.surfaceReveal;
   say(t<.23?'Station power restored. The lights are coming back…':t<.76?'The departure gates are open. Follow the lit track uphill.':'Back to the maintenance room. Follow the lights to your train.');
   if(reveal.complete){const continueTo=animation.continueTo;game.finishReveal();animation=null;surfaceReveal=0;if(continueTo)walk(continueTo);else hint();}
  }else{
   positions(THREE.MathUtils.lerp(animation.from,animation.to,t*t*(3-2*t)));
   if(kind==='departure'){if(chapter===2){departureFocus=reducedMotion?0:Math.min(1,t*2)**2*(3-2*Math.min(1,t*2));resize();}if(t>.65&&chapter===1)document.body.classList.add('departing');if(t===1){game.finishDeparture();animation=null;if(chapter===1)window.location.assign('./level5.html');else{showCompletion();}}}
   else if(t===1){game.finishSlide();animation=null;if(game.state.motion?.type==='departure')depart();else hint();}
  }
 }
 updateGait(dt,walked?person.position.distanceTo(before):0,Math.abs(person.position.y-before.y)>.001);
 repairTool.visible=Boolean(repairFrame?.pose.working);bodyRig.rotation.x=0;
 if(repairFrame&&repairFrame.t>=.22&&repairFrame.t<.82){
  const reach=repairFrame.pose.door;
  bodyRig.rotation.x=.13*reach;
  arms[0].shoulder.rotation.x=-.78*reach;arms[0].elbow.rotation.x=-.35*reach;
  arms[1].shoulder.rotation.x=(-.93+(repairFrame.pose.working?Math.sin(repairFrame.t*55)*.09:0))*reach;
  arms[1].elbow.rotation.x=-.55*reach;
 }
 buttons.forEach((b,i)=>{const pressed=game.state.pressed[i],active=game.state.motion?.type==='repair'&&game.state.motion.index===i;b.cap.position.y=THREE.MathUtils.damp(b.cap.position.y,b.y+((pressed||active)?.045:.125),12,dt);b.cap.material.emissiveIntensity=pressed?.5:active?.2:.05;signals[i*2].material.emissiveIntensity=pressed?1.2:active?.35:0;signals[i*2+1].material.color.setHex(pressed?signals[i*2+1].userData.repairColor:0x8c9a9e);signals[i*2+1].material.emissiveIntensity=pressed?1.8:0;});
 updatePowerPulses(dt);
 layout.updateGates(game.state.pressed,dt);
 const undergroundStrength=atmosphere.update(person.position,dt,{restored:game.state.pressed.every(Boolean),surfaceReveal});
 station?.update(game.state.pressed,dt,undergroundStrength);
 restoration.update(game.state.pressed,dt,Math.abs(travel-1)<.015&&!['drag','slide'].includes(game.state.motion?.type),chapter!==2||powerPulses[2].time>=2.2);
 updateBoarding(dt);
 if(game.state.pressed[2])serviceWheel.rotation.z-=dt*.7;
 scene.updateMatrixWorld(true);cutaway.update(camera,person.position,dt,{surfaceReveal});
 renderer.render(scene,camera);
}
animate();
