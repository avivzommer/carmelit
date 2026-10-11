import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import {createMechanicLayout} from './mechanic-layout.js';
import {createSteppedStation} from './mechanic-station.js';
import {createCarmelitTrain} from './mechanic-train.js';
import {createRepairCabinet} from './mechanic-repair.js';
import {createWalkGuard,createPlayerCutaway} from './mechanic-clearance.js';
import {createStationWheels,createCabControls,addCabinetWrench,wheelTravel,carriageStep} from './mobile-machinery.js';
import {createFloorWalker} from './mobile-wander.js';
import {closestTouchTarget} from './mobile-interaction.js';
import {createMechanicJourney} from './mechanic-state.mjs';
import {trainPosition} from './mechanic-track.js';

test('wheel direction reverses carts, allows wrong-way travel and clamps endpoints',()=>{
 assert.equal(wheelTravel(1,Math.PI,0),2);assert.equal(wheelTravel(1,Math.PI,1),0);
 assert.equal(wheelTravel(1,-Math.PI,0),0);assert.equal(wheelTravel(1,-Math.PI,1),2);
 assert.equal(wheelTravel(1,8*Math.PI,0),2);
 assert.equal(carriageStep(1,1,true),0);assert.equal(carriageStep(1,0,true),2);
});
test('physical wheel approaches remain clear while both carts move, and deck wandering avoids cabinets',()=>{
 const layout=createMechanicLayout(2,{serviceStairX:3.8}),station=createSteppedStation(layout,{wheelWallBays:true});layout.serviceWheel.visible=false;
 const trains=[0,1].map(i=>createCarmelitTrain(i,{fullRoofCutaway:true}));trains.forEach(createCabControls);
 const cabinets=['station1','station2Far','repair'].map((id,i)=>{const c=createRepairCabinet(i);c.root.position.copy(layout.cabinetPosition(id));addCabinetWrench(c);return c;});
 const wheels=createStationWheels(layout);
 const guard=createWalkGuard([layout.root,station.root,...trains.map(t=>t.root),...cabinets.map(c=>c.root),...wheels.map(w=>w.root)]);
 const walker=createFloorWalker(layout.surfaces,guard);layout.updateGates([true,true,true]);
 for(let t=0;t<=2;t+=.1){trains.forEach((train,i)=>{train.root.position.copy(trainPosition(i,t));train.updateBoarding(0,null,false,0,true);});guard.refresh();
  for(const {id,approach}of wheels)assert.equal(Boolean(guard.blocker(approach)),false,`${id} wheel approach must clear moving trains`);
 }
 for(const {id,approach:to}of wheels){
  const from=new THREE.Vector3(...layout.floors[id]),points=walker.path(from,to);
  assert.ok(points,`${id} wheel must be reachable on its platform`);
  let prior=from;for(const p of points){assert.equal(Boolean(guard.segmentBlocker(prior,p)),false);assert.ok(walker.supported(prior,p));prior=p;}
 }
 const game=createMechanicJourney(2);game.state.pressed=[true,true,true];
 const point=id=>id.startsWith('car')?trains[id==='carA'?0:1].root.position.clone():new THREE.Vector3(...layout.floors[id]);
 for(const stop of [0,1,2]){game.state.stop=stop;trains.forEach((train,i)=>{train.root.position.copy(trainPosition(i,stop));const landing=game.landingFor(i?'carB':'carA');train.updateBoarding(landing?Math.sign(layout.floors[landing][0]-train.root.position.x):0,landing,false,0,true);});guard.refresh();
  for(const edge of game.connections())for(const [a,b]of [edge,[...edge].reverse()]){let prior=point(a);for(const p of layout.route(a,b,point)){assert.equal(Boolean(guard.segmentBlocker(prior,p)),false,`${a} to ${b} must clear new machinery`);prior=p;}}
 }
 const from=new THREE.Vector3(...layout.floors.station1),rail=new THREE.Vector3(1.25,from.y,3);
 assert.equal(walker.path(from,rail),null,'free walking cannot enter the track void');
});

test('wheel bays face the trains, clear the stair mouth and replace nearby false doorways',()=>{
 const layout=createMechanicLayout(2,{serviceStairX:3.8}),station=createSteppedStation(layout,{wheelWallBays:true}),wheels=createStationWheels(layout);
 for(const wheel of wheels){
  wheel.root.updateMatrixWorld(true);
  const normal=new THREE.Vector3(0,0,1).transformDirection(wheel.root.matrixWorld);
  assert.ok(normal.x*Math.sign(wheel.root.position.x)<-.99,'wheel faces inward toward its train');
  if(wheel.id.startsWith('dock')){
   const mouth=new THREE.Vector3(...layout.stairPaths.get(wheel.id)[2]);
   assert.ok(wheel.root.position.distanceTo(mouth)>.65,'pedestal and wheel stay away from stair opening');
  }
 }
 const doors=[];station.root.traverse(o=>{if(o.name==='Station access door')doors.push(o.position.z);});
 assert.deepEqual(doors,[3.7,-4.85],'wheel bays have tiled wall rather than an access door');
});

test('mobile basement wall continues from utility bay to both relocated stairs without blocking the passage',()=>{
 const layout=createMechanicLayout(2,{serviceStairX:3.8}),station=createSteppedStation(layout),scenery=station.passageScenery;
 station.root.updateMatrixWorld(true);
 const y=layout.floors.repair[1],z=layout.floors.repair[2],walls=scenery.walls.map(m=>new THREE.Box3().setFromObject(m));
 for(const side of [-1,1])for(let x=.8;x<4.3;x+=.1)assert.ok(walls.some(b=>b.containsPoint(new THREE.Vector3(side*x,y+.5,z-.44))),'continuous wall behind underground walkway');
 const guard=createWalkGuard([scenery.root]);
 assert.equal(guard.segmentBlocker(new THREE.Vector3(-3.8,y,z),new THREE.Vector3(3.8,y,z)),null,'the wall stays beside the walking route');
});

test('all cabin console faces and arrow glyphs share the train departure fade, including cutaway copies',()=>{
 const train=createCarmelitTrain(1,{fullRoofCutaway:true}),cab=createCabControls(train,1),camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,100);
 camera.position.set(24,24*Math.SQRT2,24);camera.lookAt(0,0,0);camera.updateMatrixWorld();train.root.updateMatrixWorld(true);
 const cutaway=createPlayerCutaway([train.root]);
 for(let frame=0;frame<60;frame++)cutaway.update(camera,new THREE.Vector3(),1/60);
 cab.root.traverse(o=>{if(!o.isMesh)return;for(const mat of Array.isArray(o.material)?o.material:[o.material]){
  assert.equal(mat.userData.departureFade,true);assert.equal(mat.transparent,true);
  const shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};mat.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/smoothstep\(7.4,11.0,-departureZ\)/,'both console bases and button arrows dissolve beyond the tunnel');
 }});
});

test('mobile boarding and walking never auto-repair cabinets',()=>{
 const game=createMechanicJourney(2,{autoRepair:false});
 assert.deepEqual(game.walk('carB'),['entrance','station1','carB']);
 game.finishWalk();assert.equal(game.state.location,'carB');assert.equal(game.state.motion,null);
 assert.deepEqual(game.state.pressed,[false,false,false]);assert.equal(game.beginDrag(),false,'unrepaired power still prevents driving');
 assert.ok(game.walk('station1'));game.finishWalk();assert.equal(game.state.motion,null);
 assert.ok(game.walk('carB'));game.finishWalk();assert.equal(game.state.location,'carB');
 game.state.stop=0;assert.ok(game.walk('station2Far'));game.finishWalk();assert.equal(game.state.location,'station2Far');assert.equal(game.state.motion,null);
 assert.deepEqual(game.state.pressed,[false,false,false]);
});

test('mobile stair taps stop at the chosen tread and allow returning before finishing the passage',()=>{
 const layout=createMechanicLayout(2,{serviceStairX:3.8}),station=createSteppedStation(layout);
 layout.serviceWheel.visible=false;layout.updateGates([true,true,true]);
 const guard=createWalkGuard([layout.root,station.root]),walker=createFloorWalker(layout.surfaces,guard,{waypoints:[...layout.stairPaths.values(),...layout.upperStairPaths.values()].flat()});
 for(const id of ['dockFar','dockNear']){
  const stairs=layout.stairPaths.get(id),from=new THREE.Vector3(...layout.floors[id]),tread=new THREE.Vector3(...stairs[6]);
  assert.equal(Math.abs(stairs[1][0]),3.8,'stair mouth is on the outside edge of the platform');
  const path=walker.path(from,tread);assert.ok(path,`${id} chosen tread is reachable`);
  assert.ok(path.at(-1).distanceTo(tread)<.001,'tap must not automatically finish the stair route');
  assert.ok(path.at(-1).distanceTo(new THREE.Vector3(...layout.floors.repair))>2,'repair room is not selected implicitly');
  assert.ok(walker.path(tread,from),'player can change their mind and return upstairs');
 }
 const rear=layout.upperStairPaths.get(1),top=new THREE.Vector3(...rear[0]),tread=new THREE.Vector3(...rear[6]);
 assert.ok(walker.path(top,tread),'upper passage can be entered only as far as the clicked step');
 assert.ok(walker.path(tread,top),'upper passage allows turning back');
 layout.updateGates([false,false,false]);guard.refresh();
 assert.equal(walker.path(new THREE.Vector3(...layout.floors.dockNear),new THREE.Vector3(...layout.stairPaths.get('dockNear')[6])),null,'free exploration respects the closed entrance barrier');
});

test('forgiving object taps choose a visible nearby object without reaching through scenery',()=>{
 const targets=[{id:'cabinet behind wall',x:100,y:100},{id:'wheel',x:115,y:100},{id:'door',x:150,y:100}];
 const visible=t=>t.id!=='cabinet behind wall';
 assert.equal(closestTouchTarget({x:100,y:100},targets,visible).id,'wheel');
 assert.equal(closestTouchTarget({x:141,y:100},targets,visible).id,'door');
 assert.equal(closestTouchTarget({x:100,y:140},targets,visible),null);
 assert.equal(closestTouchTarget({x:115,y:100},targets,()=>false),null);
});

test('mobile roof caps fade with the full roof while aboard and restore after stepping off',()=>{
 for(const index of [0,1]){
  const train=createCarmelitTrain(index,{fullRoofCutaway:true}),cab=createCabControls(train,index);
  const cutaway=createPlayerCutaway([train.root]),camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,100);
  camera.position.set(24,24*Math.SQRT2,24);camera.lookAt(0,0,0);camera.updateMatrixWorld();train.root.updateMatrixWorld(true);
  const panels=[...train.roof.children,...train.roofEdges];
  train.updateBoarding(1,'station1',true,0,true);
  for(let frame=0;frame<120;frame++)cutaway.update(camera,new THREE.Vector3(),1/60);
  for(const panel of panels){assert.ok(panel.material.opacity<.13,'every roof panel and edge must reveal the controls');assert.equal(panel.castShadow,false);assert.equal(panel.material.depthWrite,false);}
  for(const control of cab.controls){
   const target=control.root.localToWorld(new THREE.Vector3(0,.27,0)),direction=new THREE.Vector3();camera.getWorldDirection(direction);
   const ray=new THREE.Raycaster(target.clone().addScaledVector(direction,-10),direction);
   const first=ray.intersectObject(train.root,true).find(hit=>hit.object.isMesh&&(hit.object.userData.cutawayOpacity??1)>.35);
   assert.ok(first,'control must be visible from the game camera');
   let owner=first.object;while(owner&&owner!==control.root)owner=owner.parent;
   assert.ok(owner===control.root,`no solid train panel may cover ${control.up?'uphill':'downhill'} control (hit ${first.object.name||first.object.geometry.type})`);
   assert.ok(Math.abs(control.root.position.z)+.19<.805,'consoles stay inside the roof-cap edges');
   const floorY=-.4*Math.sign(control.root.position.z)*.7;
   assert.ok(Math.abs(control.root.position.y-.20-floorY-.02)<.001,'console rests on its own cabin floor step');
  }
  train.updateBoarding(1,'station1',false,0,true);
  for(let frame=0;frame<120;frame++)cutaway.update(camera,new THREE.Vector3(4,0,0),1/60);
  for(const panel of panels){assert.equal(panel.material.opacity,1);assert.equal(panel.castShadow,true);assert.equal(panel.material.depthWrite,true);}
 }
 const original=createCarmelitTrain(0);original.updateBoarding(1,'station1',true,0,true);
 assert.ok(original.roofEdges.every(edge=>edge.userData.viewOpacity===undefined),'original level keeps its existing roof treatment');
});

test('wheel grip accepts broad touches, preserves direction and suppresses hub jitter',async()=>{
 const {createWheelGrip}=await import('./mobile-interaction.js');
 const targets=[{id:'wheel',x:100,y:100,radius:84},{id:'cabinet',x:190,y:100,radius:28}];
 assert.equal(closestTouchTarget({x:100,y:175},targets,()=>true).id,'wheel');
 assert.equal(closestTouchTarget({x:100,y:185},targets,()=>true),null);
 assert.equal(closestTouchTarget({x:180,y:100},targets,()=>true).id,'cabinet');
 assert.equal(closestTouchTarget({x:100,y:175},targets,()=>false),null,'bigger grip cannot reach through a wall');
 for(const direction of [-1,1]){
  const grip=createWheelGrip({x:172,y:100},{x:100,y:100});let total;
  for(let i=1;i<=48;i++)total=grip.move({x:100+72*Math.cos(direction*i*Math.PI/48),y:100+72*Math.sin(direction*i*Math.PI/48)});
  assert.ok(Math.abs(total-direction*Math.PI)<.01,'large finger arc turns the wheel either way');
  total=grip.move({x:300,y:300});assert.ok(Number.isFinite(total),'gesture keeps working outside original hit area');
 }
 const jitter=createWheelGrip({x:101,y:100},{x:100,y:100});
 assert.ok(Math.abs(jitter.move({x:99,y:101}))<.01,'crossing hub does not jump half a revolution');
});

test('nearby floor taps snap to reachable ground without crossing walls, rails or closed gates',()=>{
 const root=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(.12,1,4));wall.position.set(0,.5,0);root.add(wall);
 const guard=createWalkGuard([root]),surfaces=[{x:0,y:0,z:0,w:4,d:4,id:'deck'}],walker=createFloorWalker(surfaces,guard);
 const from=new THREE.Vector3(-1,0,0);
 const nearWall=walker.nearby(from,new THREE.Vector3(.05,0,0));assert.ok(nearWall);
 let prior=from;for(const p of nearWall.points){assert.ok(p.x<-.20);assert.equal(guard.segmentBlocker(prior,p),null);assert.ok(walker.supported(prior,p));prior=p;}
 const edge=walker.nearby(from,new THREE.Vector3(-2.12,0,.6));assert.ok(edge);assert.ok(edge.points.at(-1).x>=-1.85,'edge miss lands inside body clearance');
 assert.equal(walker.nearby(from,new THREE.Vector3(1,0,0)),null,'cannot select a floor across a sealed wall');
 assert.equal(walker.nearby(from,new THREE.Vector3(-3,0,0)),null,'distant empty space is silently ignored');
 const layout=createMechanicLayout(2,{serviceStairX:3.8});layout.updateGates([false,false,false]);
 const station=createSteppedStation(layout),physical=createWalkGuard([layout.root,station.root]),real=createFloorWalker(layout.surfaces,physical,{waypoints:[...layout.stairPaths.values()].flat()});
 const result=real.nearby(new THREE.Vector3(...layout.floors.dockNear),new THREE.Vector3(...layout.stairPaths.get('dockNear')[6]));
 assert.equal(result,null,'miss tolerance does not bypass locked staircase');
});

test('shadow scheduling caches idle frames and reduces underground refreshes without slowing movement',async()=>{
 const {createShadowSchedule}=await import('./mobile-performance.js');
 const schedule=createShadowSchedule();assert.equal(schedule.update(1/60),true);
 assert.equal(schedule.update(1/60),false,'static scene reuses its shadow map');
 let underground=0;
 for(let i=0;i<60;i++)if(schedule.update(1/60,{moving:true,depth:1}))underground++;
 assert.ok(underground>=10&&underground<=12,`underground shadow refreshes ${underground} per 60 movement frames`);
 assert.equal(schedule.update(1/60,{moving:true,depth:0}),true,'surface movement refreshes every frame');
 for(let i=0;i<60;i++)schedule.update(1/60,{depth:0});
 assert.equal(schedule.update(1/60,{depth:0}),false,'cached after doors and gait settle');
});

test('underground resolution uses stable thresholds and restores surface detail',async()=>{
 const {createUndergroundResolution}=await import('./mobile-performance.js');
 const ratio=createUndergroundResolution(1.5);
 assert.equal(ratio(0),1.5);assert.equal(ratio(.6),1.5);assert.equal(ratio(.8),1);
 assert.equal(ratio(.6),1,'no repeated buffer resizing around the entry threshold');
 assert.equal(ratio(.2),1.5,'surface resolution returns after ascending');
 assert.equal(createUndergroundResolution(.8)(1),.8,'never upscale low-resolution devices');
});
