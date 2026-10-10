import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import {createMechanicLayout} from './mechanic-layout.js';
import {createSteppedStation} from './mechanic-station.js';
import {createCarmelitTrain} from './mechanic-train.js';
import {createRepairCabinet} from './mechanic-repair.js';
import {createWalkGuard,createPlayerCutaway} from './mechanic-clearance.js';
import {createPlatformWheel,createCabControls,addCabinetWrench,wheelTravel,carriageStep} from './mobile-machinery.js';
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
 const layout=createMechanicLayout(2,{serviceStairX:3.8}),station=createSteppedStation(layout);layout.serviceWheel.visible=false;
 const trains=[0,1].map(i=>createCarmelitTrain(i,{fullRoofCutaway:true}));trains.forEach(createCabControls);
 const cabinets=['station1','station2Far','repair'].map((id,i)=>{const c=createRepairCabinet(i);c.root.position.copy(layout.cabinetPosition(id));addCabinetWrench(c);return c;});
 const specs=[['station1',4.4,4.1,3.90,4.1],['station2Far',-3.85,-2.65,-3.35,-2.65],['station2Near',3.85,-2.65,3.35,-2.65],['dockFar',-3.42,.4,-2.90,.35],['dockNear',3.42,.4,2.90,.35]];
 const wheels=specs.map(([id,x,z],i)=>createPlatformWheel(new THREE.Vector3(x,layout.floors[id][1],z),i));
 const guard=createWalkGuard([layout.root,station.root,...trains.map(t=>t.root),...cabinets.map(c=>c.root),...wheels.map(w=>w.root)]);
 const walker=createFloorWalker(layout.surfaces,guard);layout.updateGates([true,true,true]);
 for(let t=0;t<=2;t+=.1){trains.forEach((train,i)=>{train.root.position.copy(trainPosition(i,t));train.updateBoarding(0,null,false,0,true);});guard.refresh();
  for(const [id,,,x,z]of specs)assert.equal(Boolean(guard.blocker(new THREE.Vector3(x,layout.floors[id][1],z))),false,`${id} wheel approach must clear moving trains`);
 }
 for(const [id,,,x,z]of specs){
  const from=new THREE.Vector3(...layout.floors[id]),to=new THREE.Vector3(x,from.y,z),points=walker.path(from,to);
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
