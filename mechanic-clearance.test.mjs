import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import {createMechanicJourney} from './mechanic-state.mjs';
import {createMechanicLayout} from './mechanic-layout.js';
import {createSteppedStation} from './mechanic-station.js';
import {createCarmelitTrain} from './mechanic-train.js';
import {createRepairCabinet} from './mechanic-repair.js';
import {createRestoration} from './mechanic-restoration.js';
import {trainPosition,createTrack,deckHeightAtZ,TERMINAL_Z,departureTravel} from './mechanic-track.js';
import {createWalkGuard,createPlayerCutaway,cabinetWorkOffset,passageAt} from './mechanic-clearance.js';
import {advanceWalkStep} from './mechanic-walk.js';

const vector=p=>new THREE.Vector3(...p);
function setup(chapter){
 const game=createMechanicJourney(chapter),layout=createMechanicLayout(chapter),scene=new THREE.Group();scene.add(layout.root);
 const station=chapter===2?createSteppedStation(layout):null;if(station)scene.add(station.root);
 const trains=[0,1].map(index=>{const train=createCarmelitTrain(index);scene.add(train.root);return train;});
 const cabinets=['station1','station2Far','repair'].map((id,index)=>{const c=createRepairCabinet(index);c.root.position.copy(layout.cabinetPosition(id));scene.add(c.root);return c;});
 const restoration=createRestoration({near:chapter===2?1:-1,floors:layout.floors,stairPaths:layout.stairPaths,terminalZ:chapter===2?TERMINAL_Z:null});scene.add(restoration.root);
 const tracks=[];
 for(const x of [-1.25,1.25])for(const dx of [-.47,0,.47]){const track=createTrack(x+dx,.034,0x61737b,chapter===2?{downhillZ:9.6,uphillZ:-9.6}:{});scene.add(track);tracks.push(track);}
 const guard=createWalkGuard([layout.root,...(station?[station.root]:[]),...trains.map(t=>t.root),...cabinets.map(c=>c.root),restoration.root,...tracks]);
 const point=id=>id.startsWith('car')?trains[id==='carA'?0:1].root.position.clone():vector(layout.floors[id]);
 function sync(travel=game.state.stop){
  layout.updateGates(game.state.pressed);restoration.update(game.state.pressed,3);
  trains.forEach((train,i)=>{train.root.position.copy(trainPosition(i,travel));const landing=game.landingFor(i?'carB':'carA');train.updateBoarding(landing?Math.sign(layout.floors[landing][0]-train.root.position.x):0,landing,false,0,true);});
  guard.refresh();
 }
 function assertClear(a,b,label){const hit=guard.segmentBlocker(a,b);assert.equal(Boolean(hit),false,`${label}: blocked by ${hit?.parent?.name||hit?.name||'mesh'} at ${hit?new THREE.Box3().setFromObject(hit).getCenter(new THREE.Vector3()).toArray():''}`);}
 return {game,layout,station,trains,cabinets,restoration,guard,point,sync,assertClear};
}

for(const chapter of [1,2]){
 test(`chapter ${chapter}: walking up and down both staircases never stalls between waypoints`,()=>{
  const {game,layout,point,sync,guard}=setup(chapter);game.state.pressed=[true,true,true];sync(1);
  const journeys=[['dockNear','repair'],['repair','dockNear'],['dockFar','repair'],['repair','dockFar'],['station2Near','station2Far'],['station2Far','station2Near']];
  for(const [a,b]of journeys){
   for(const cadence of [[1/30],[1/60],[1/120],[1/144],[.008,.024,.016,.05]]){
    const position=point(a);let frames=0;
    for(const to of layout.route(a,b,point)){
     const step={from:position.clone(),to,time:0,duration:Math.max(.1,position.distanceTo(to)/1.55)};
     let arrived=false;
     while(!arrived&&frames<5000){
      const frame=advanceWalkStep(step,position,cadence[frames++%cadence.length],guard);
      assert.equal(Boolean(frame.blocker),false,`${a} to ${b} blocked at ${position.toArray()}, frame ${frames}, cadence ${cadence}`);
      arrived=frame.arrived;
     }
     assert.ok(arrived,'walking must finish, not leave controls locked');
    }
    assert.ok(position.distanceTo(point(b))<1e-8);
   }
  }
 });
 test(`chapter ${chapter}: every open graph edge has physical clearance in both directions`,()=>{
  const h=setup(chapter),{game,layout,point,sync,assertClear}=h;
  for(const pressed of [[false,false,false],[true,false,false],[true,true,false],[true,true,true]])for(const stop of [0,1,2]){
   Object.assign(game.state,{pressed,stop});sync();
   for(const edge of game.connections())for(const [a,b]of [edge,[...edge].reverse()]){
    let from=point(a);
    for(const to of layout.route(a,b,point)){assertClear(from,to,`${a} to ${b}, stop ${stop}, repairs ${pressed}`);from=to;}
   }
  }
 });
 test(`chapter ${chapter}: a waiting mechanic stays clear throughout both trains' travel`,()=>{
  const {game,layout,guard,point,sync}=setup(chapter);game.state.pressed=[true,true,true];
  for(let i=0;i<=100;i++){
   game.state.motion={type:'drag'};sync(i/50);
   for(const id of Object.keys(layout.floors))assert.equal(Boolean(guard.blocker(point(id))),false,`${id} blocked with cable at ${i/50}`);
   for(const car of ['carA','carB'])assert.equal(Boolean(guard.blocker(point(car))),false,`riding ${car} blocked with cable at ${i/50}`);
  }
 });
 test(`chapter ${chapter}: repaired departure has clearance through the open tunnel`,()=>{
  const {game,guard,point,sync}=setup(chapter);game.state.pressed=[true,true,true];game.state.complete=true;
  for(let i=0;i<=30;i++){
   sync(THREE.MathUtils.lerp(game.high,departureTravel(game.high,chapter),i/30));
   assert.equal(Boolean(guard.blocker(point(game.primary))),false,`departure ${i}`);
  }
 });
 test(`chapter ${chapter}: cabinet approach and swinging door leave room for mechanic`,()=>{
  const {game,layout,cabinets,guard,sync,point,assertClear}=setup(chapter);
  game.state.pressed=[true,true,true];sync(1);
  ['station1','station2Far','repair'].forEach((id,index)=>{
   const c=cabinets[index],from=point(id),work=c.root.position.clone().add(cabinetWorkOffset);let previous=from;
   for(let i=0;i<=100;i++){
    const pose=c.setProgress(i/100),next=from.clone().lerp(work,pose.approach);guard.refresh();
    assertClear(previous,next,`${id}, repair frame ${i}`);previous=next;
   }
  });
 });
 test(`chapter ${chapter}: rerouted paths have continuous floors and sensible stair heights`,()=>{
  const {game,layout,point,sync}=setup(chapter);game.state.pressed=[true,true,true];sync();
  for(const [a,b]of [['station2Near','station2Far'],['dockNear','repair'],['dockFar','repair']]){
   let from=point(a);
   for(const to of layout.route(a,b,point)){
    const n=Math.ceil(from.distanceTo(to)/.025);
    for(let i=0;i<=n;i++){
     const p=from.clone().lerp(to,i/n);
     assert.ok(layout.surfaces.some(s=>Math.abs(p.x-s.x)<=s.w/2+.005&&Math.abs(p.z-s.z)<=s.d/2+.005&&Math.abs(p.y-s.y)<=.13),`missing floor ${p.toArray()}`);
    }
    from=to;
   }
  }
 });
}

test('the guard rejects closed doors and the old route through the rear train wall',()=>{
 const h=setup(2);h.game.state.stop=h.game.high;h.sync();
 const train=h.trains[1],base=train.root.position.clone();train.updateBoarding(0,null,false,0,true);h.guard.refresh();
 assert.ok(h.guard.segmentBlocker(base,base.clone().add(new THREE.Vector3(1.45,0,0))),'closed side door must block boarding');
 train.updateBoarding(1,'station2Near',false,0,true);h.guard.refresh();
 assert.equal(h.guard.segmentBlocker(base,base.clone().add(new THREE.Vector3(1.45,0,0))),null,'open aligned doorway is clear');
 const height=h.layout.floors.station2Near[1];
 assert.ok(h.guard.segmentBlocker(new THREE.Vector3(-2.7,height,-4.15),new THREE.Vector3(2.7,height,-4.15)),'former rear crossing must be rejected');
});

test('boarding waits for animated doors and never crosses the closed leaf',()=>{
 const h=setup(1);h.sync();const train=h.trains[0],from=train.root.position.clone(),to=h.point('station1');
 train.updateBoarding(0,null,false,0,true);h.guard.refresh();assert.ok(h.guard.segmentBlocker(from,to));
 let clearAt=null;
 for(let frame=1;frame<=60;frame++){
  train.updateBoarding(-1,'station1',true,1/60,true);h.guard.refresh();
  if(!h.guard.segmentBlocker(from,to)){clearAt=frame;break;}
 }
 assert.ok(clearAt>1&&clearAt<60,`door must clear before boarding, frame ${clearAt}`);
});

test('cutaways reveal the mechanic but preserve physical walls and live signal colors',()=>{
 const scene=new THREE.Group(),source=new THREE.MeshStandardMaterial({color:0x315b9b,emissive:0x77cc66,emissiveIntensity:0});
 const wall=new THREE.Mesh(new THREE.BoxGeometry(2,2,.1),source);wall.position.set(0,.8,1);scene.add(wall);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,.55,5);camera.lookAt(0,.55,0);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
 const cutaway=createPlayerCutaway([scene]),guard=createWalkGuard([scene]);
 for(let i=0;i<60;i++)cutaway.update(camera,new THREE.Vector3(),1/60);
 assert.ok(wall.material.opacity<.25);assert.ok(wall.userData.cutawayOpacity<.35);
 assert.ok(guard.segmentBlocker(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,2)),'fading must never remove collision');
 source.emissiveIntensity=.8;assert.equal(wall.material.emissiveIntensity,.8);
 wall.material.color.setHex(0xff0000);assert.equal(source.color.getHex(),0xff0000);
 for(let i=0;i<60;i++)cutaway.update(camera,new THREE.Vector3(4,0,0),1/60);
 assert.ok(wall.material.opacity>.999);assert.equal(wall.material.transparent,false);
});

test('station scenery leaves both complete inclined train corridors clear, including departure',()=>{
 const station=createSteppedStation(createMechanicLayout(2));station.root.updateMatrixWorld(true);
 // Transform the world into rail-relative coordinates, so these boxes enclose
 // the whole moving train shell and bogies at every position along the incline.
 const corridors=[-1.25,1.25].map(x=>new THREE.Box3(new THREE.Vector3(x-.81,-.59,-9.35),new THREE.Vector3(x+.81,1.11,9.4)));
 const triangle=new THREE.Triangle();
 station.root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.visualEffect)return;const pos=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:pos.count;
  for(let i=0;i<count;i+=3){
   [triangle.a,triangle.b,triangle.c].forEach((p,j)=>{p.fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);p.y-=deckHeightAtZ(p.z);});
   assert.ok(corridors.every(c=>!c.intersectsTriangle(triangle)),`${mesh.name||'station mesh'} obstructs a moving train`);
  }
 });
});

test('station bulbs keep partial emergency lighting until all repairs, then reset correctly',()=>{
 const station=createSteppedStation(createMechanicLayout(2));station.reset();
 const bulbs=station.fixtures.filter(f=>f.light);
 assert.equal(bulbs.length,4);
 for(const pressed of [[false,false,false],[true,false,false],[true,true,false]]){
  station.update(pressed,2);
  assert.equal(bulbs.filter(f=>f.light.intensity>1).length,2);
  assert.ok(bulbs.filter(f=>!f.standby).every(f=>f.lamp.material.emissiveIntensity===0));
 }
 station.update([true,true,true],2);
 assert.ok(bulbs.every(f=>f.light.intensity>1&&f.lamp.material.emissiveIntensity>2));
 station.update([true,true,true],2,1);
 assert.ok(bulbs.every(f=>f.light.intensity<.2));
 station.reset();assert.equal(bulbs.filter(f=>f.light.intensity>1).length,2);
 assert.ok(bulbs.filter(f=>!f.standby).every(f=>f.light.intensity===0));
});

test('station banks continuously fill the side gaps and the tunnel has a solid surround with an open mouth',()=>{
 const station=createSteppedStation(createMechanicLayout(2));station.root.updateMatrixWorld(true);
 const banks=[];station.foundations.traverse(m=>{if(m.userData.stationBank)banks.push(new THREE.Box3().setFromObject(m));});
 // Sample through both long retaining banks, not just the individual platform
 // supports. A return to detached pillars would leave these positions empty.
 for(const side of [-1,1])for(let x=2.2;x<4.79;x+=.17)for(let z=-5.95;z<4.9;z+=.19){
  const point=new THREE.Vector3(side*x,.3,z);
  assert.ok(banks.some(b=>b.containsPoint(point)),`gap in the station foundation at ${point.toArray()}`);
 }
 for(const p of [[-4.15,.5,3],[3.65,.5,1.2],[3.75,2.5,-3.6]]){
  assert.ok(banks.some(b=>b.containsPoint(vector(p))),`unfilled marked gap at ${p}`);
 }
 const surround=station.portal.getObjectByName('Solid tunnel surround');
 const ray=new THREE.Raycaster(),hits=[];
 for(const x of [-3.2,3.2]){
  hits.length=0;ray.set(new THREE.Vector3(x,4.8,-5.9),new THREE.Vector3(0,0,-1));
  THREE.Mesh.prototype.raycast.call(surround,ray,hits);
  assert.ok(hits.length,'the tunnel surround must join the side structures');
 }
 hits.length=0;ray.set(new THREE.Vector3(0,5.3,-5.9),new THREE.Vector3(0,0,-1));
 THREE.Mesh.prototype.raycast.call(surround,ray,hits);
 assert.equal(hits.length,0,'the rail tunnel must remain an actual opening');
});

test('both underground passages stay opaque while the whole upper level fades, then restore on exit',()=>{
 const {layout,station,trains,game,sync}=setup(2);game.state.pressed=[true,true,true];sync(1);
 const camera=new THREE.PerspectiveCamera();camera.position.set(24,24*Math.SQRT2,24);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const roots=[layout.root,station.root,...trains.map(t=>t.root)];
 const cutaway=createPlayerCutaway(roots,{passages:layout.passages});
 const settle=feet=>{for(let i=0;i<120;i++)cutaway.update(camera,feet,1/60);};
 for(const [id,feet]of [['service',vector(layout.floors.repair)],['rear',vector([0,2.2,-5.6])]]){
  assert.equal(passageAt(feet,layout.passages)?.id,id);settle(feet);
  assert.equal(cutaway.activePassage,id);
  layout.root.traverse(mesh=>{
   if(!mesh.isMesh)return;
   let layer;for(let p=mesh;p;p=p.parent)if(p.userData.focusLayer){layer=p.userData.focusLayer;break;}
   if(layer===id)assert.equal(mesh.material.opacity,1,`${id} floor and stair geometry must remain fully opaque`);
   if(mesh.userData.destination==='station2Far')assert.ok(mesh.material.opacity<.10,'the entire upper station dims, not just one occluder');
  });
  for(const train of trains)assert.ok(train.roof.children.every(m=>m.material.opacity<.10));
 }
 settle(vector(layout.floors.entrance));assert.equal(cutaway.activePassage,null);
 for(const train of trains)assert.ok(train.roof.children.every(m=>m.material.opacity===1));
});

test('occupied train roofs reveal the mechanic and become solid after disembarking without changing collisions',()=>{
 const train=createCarmelitTrain(0),camera=new THREE.PerspectiveCamera();
 camera.position.set(4,6,5);camera.lookAt(0,.5,0);camera.updateMatrixWorld(true);train.root.updateMatrixWorld(true);
 const cutaway=createPlayerCutaway([train.root]),guard=createWalkGuard([train.root]);guard.refresh();
 const inside=new THREE.Vector3(),outside=new THREE.Vector3(2.7,0,0);
 assert.equal(train.containsPassenger(inside),true);assert.equal(train.containsPassenger(outside),false);
 train.updateBoarding(1,'station1',train.containsPassenger(inside),0,true);
 for(let i=0;i<120;i++)cutaway.update(camera,inside,1/60);
 assert.ok(train.roof.children.every(m=>m.material.opacity>.11&&m.material.opacity<.13));
 assert.equal(guard.blocker(inside),null,'roof provides actual standing headroom');
 assert.ok(guard.blocker(new THREE.Vector3(0,.4,0)),'transparent roof keeps physical collision');
 train.updateBoarding(1,'station1',train.containsPassenger(outside),0,true);
 for(let i=0;i<120;i++)cutaway.update(camera,outside,1/60);
 assert.ok(train.roof.children.every(m=>m.material.opacity===1&&!m.material.transparent&&m.castShadow));
});

test('the repaired terminal clears the full train roof envelope through the far tunnel',()=>{
 const {restoration,game,sync}=setup(2);game.state.pressed=[true,true,true];sync(1);
 assert.equal(restoration.opened,true);
 const corridor=new THREE.Box3(new THREE.Vector3(.44,-.59,-9.35),new THREE.Vector3(2.06,1.11,4.4)),triangle=new THREE.Triangle();
 restoration.root.updateMatrixWorld(true);
 for(const gate of [restoration.portal,restoration.terminal].filter(Boolean))gate.traverse(mesh=>{
  if(!mesh.isMesh)return;for(let p=mesh;p;p=p.parent)if(!p.visible)return;
  const pos=mesh.geometry.attributes.position,index=mesh.geometry.index;
  for(let i=0;i<(index?index.count:pos.count);i+=3){
   [triangle.a,triangle.b,triangle.c].forEach((p,j)=>{p.fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);p.y-=deckHeightAtZ(p.z);});
   assert.equal(corridor.intersectsTriangle(triangle),false,'an open departure gate must clear the carriage roof and body');
  }
 });
 const end=trainPosition(1,departureTravel(game.high,2));
 assert.ok(end.z+1.23<TERMINAL_Z-.65,'the entire train passes the back of the final tunnel before winning');
});

test('enclosed train sides block walking through windows while the aligned door stays clear',()=>{
 for(const index of [0,1]){
  const train=createCarmelitTrain(index),guard=createWalkGuard([train.root]);
  for(const side of [-1,1]){
   train.updateBoarding(side,'station1',false,0,true);guard.refresh();
   assert.equal(guard.segmentBlocker(vector([0,0,0]),vector([side*1.4,0,0])),null,'boarding uses the open sliding doorway');
   for(const z of [-.72,.72]){
    const y=-.4*z;
    assert.ok(guard.segmentBlocker(vector([0,y,z]),vector([side*1.3,y,z])),'full side walls prevent walking through a window');
   }
   train.updateBoarding(0,null,false,0,true);guard.refresh();
   assert.ok(guard.segmentBlocker(vector([0,0,0]),vector([side*1.4,0,0])),'closed full-height door blocks boarding');
  }
 }
});

test('underground walls and conduits stay solid in the active passage and keep walking clearance',()=>{
 const {layout,station,game,sync}=setup(2);game.state.pressed=[true,true,true];sync(1);
 const scenery=station.passageScenery,camera=new THREE.PerspectiveCamera();camera.position.set(24,24*Math.SQRT2,24);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const cutaway=createPlayerCutaway([station.root],{passages:layout.passages});
 for(const [id,feet]of [['service',vector(layout.floors.repair)],['rear',vector([0,2.2,-5.6])]]){
  for(let frame=0;frame<120;frame++)cutaway.update(camera,feet,1/60);
  const group=scenery.root.children.find(g=>g.userData.focusLayer===id);
  group.traverse(mesh=>{if(mesh.isMesh)assert.equal(mesh.material.opacity,1,'passage fixtures must not fade with the upper structure');});
 }
 const guard=createWalkGuard([scenery.root]);guard.refresh();
 for(const passage of layout.passages){
  for(let i=1;i<passage.points.length;i++)assert.equal(guard.segmentBlocker(vector(passage.points[i-1]),vector(passage.points[i])),null,'no arch or cable may cross a walking route');
 }
});

test('entrance step has clearance while the trains roll into their starting stations',()=>{
 for(const chapter of [1,2]){
  const h=setup(chapter),end=h.point('entrance'),start=end.clone().add(new THREE.Vector3(0,0,.25));
  for(let t=0;t<=1;t+=.1){h.sync(h.game.low+(h.game.low===2?-.65:.65)*(1-t));h.assertClear(start,end,'entrance');}
 }
});

test('protected terminal wall remains opaque during player cutaways',()=>{
 const root=new THREE.Group();root.userData.cutawayProtected=true;
 const wall=new THREE.Mesh(new THREE.BoxGeometry(2,2,.1),new THREE.MeshStandardMaterial());wall.position.set(0,.8,1);root.add(wall);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,.55,5);camera.lookAt(0,.55,0);camera.updateMatrixWorld(true);root.updateMatrixWorld(true);
 const cutaway=createPlayerCutaway([root]);
 for(let i=0;i<60;i++)cutaway.update(camera,new THREE.Vector3(),1/60);
 assert.equal(wall.material.opacity,1);assert.equal(wall.material.depthWrite,true);assert.equal(wall.material.transparent,false);
});
