import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import {createMechanicLayout} from './mechanic-layout.js';
import {createSteppedStation} from './mechanic-station.js';
import {createCarmelitTrain} from './mechanic-train.js';
import {createRepairCabinet} from './mechanic-repair.js';
import {createWalkGuard} from './mechanic-clearance.js';
import {createPlatformWheel,createCabControls,wheelTravel,carriageStep} from './mobile-machinery.js';
import {createFloorWalker} from './mobile-wander.js';
import {createMechanicJourney} from './mechanic-state.mjs';
import {trainPosition} from './mechanic-track.js';

test('wheel direction reverses carts, allows wrong-way travel and clamps endpoints',()=>{
 assert.equal(wheelTravel(1,Math.PI,0),2);assert.equal(wheelTravel(1,Math.PI,1),0);
 assert.equal(wheelTravel(1,-Math.PI,0),0);assert.equal(wheelTravel(1,-Math.PI,1),2);
 assert.equal(wheelTravel(1,8*Math.PI,0),2);
 assert.equal(carriageStep(1,1,true),0);assert.equal(carriageStep(1,0,true),2);
});
test('physical wheel approaches remain clear while both carts move, and deck wandering avoids cabinets',()=>{
 const layout=createMechanicLayout(2),station=createSteppedStation(layout);layout.serviceWheel.visible=false;
 const trains=[0,1].map(i=>createCarmelitTrain(i));trains.forEach(createCabControls);
 const cabinets=['station1','station2Far','repair'].map((id,i)=>{const c=createRepairCabinet(i);c.root.position.copy(layout.cabinetPosition(id));return c;});
 const specs=[['station1',4.4,4.1,3.95,4.1],['station2Far',-3.85,-2.65,-3.35,-2.65],['station2Near',3.85,-2.65,3.35,-2.65],['dockFar',-3.42,.4,-2.95,.35],['dockNear',3.42,.4,2.95,.35]];
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
