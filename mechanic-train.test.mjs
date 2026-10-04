import test from 'node:test';
import assert from 'node:assert/strict';
import {createMechanicJourney} from './mechanic-state.mjs';
import {createCarmelitTrain} from './mechanic-train.js';

for(const chapter of [1,2]){
 test(`chapter ${chapter}: train exit cues match playable landings at every stop`,()=>{
  const game=createMechanicJourney(chapter),near=chapter===2?1:-1;
  const sideFor={station1:near,station2Near:near,station2Far:-near,dockNear:near,dockFar:-near};
  for(const stop of [0,1,2])for(const car of ['carA','carB']){
   game.state.stop=stop;
   const train=createCarmelitTrain(car==='carA'?0:1),landing=game.landingFor(car),side=sideFor[landing]||0;
   train.updateBoarding(side,landing,true,0,true);
   assert.equal(train.doors.filter(d=>d.cue.visible).length,landing?1:0);
   for(const door of train.doors){
    assert.equal(door.step.visible,Boolean(landing&&door.side===side));
    if(door.cue.visible){
     assert.equal(Math.sign(door.step.position.x),side);
     door.cue.traverse(o=>{if(o.isMesh)assert.equal(o.userData.destination,landing);});
     assert.ok(door.leaves.every(({leaf})=>Math.abs(leaf.position.z)>.5));
     // The cue boards the carriage when clicked from the platform.
     train.updateBoarding(side,landing,false,0,true);
     door.cue.traverse(o=>{if(o.isMesh)assert.equal(o.userData.destination,car);});
    }
   }
  }
 });
}
test('boarding cues disappear during train movement and departure',()=>{
 const game=createMechanicJourney(),train=createCarmelitTrain(0);
 game.state.pressed=[true,false,false];
 assert.equal(game.landingFor('carA'),'station1');
 for(const type of ['drag','slide']){
  game.state.motion={type};assert.equal(game.landingFor('carA'),null);
  train.updateBoarding(0,game.landingFor('carA'),true,0,true);
  assert.ok(train.doors.every(d=>!d.step.visible&&!d.cue.visible));
 }
 game.state.motion={type:'walk'};assert.equal(game.landingFor('carA'),'station1');
 game.state.motion=null;game.state.complete=true;assert.equal(game.landingFor('carA'),null);
});
test('both carriages retain three independently clickable drag grips',()=>{
 for(const index of [0,1]){
  const train=createCarmelitTrain(index),grips=[];
  train.root.traverse(o=>{if(o.userData.grip!==undefined)grips.push(o);});
  assert.equal(grips.length,3);assert.ok(grips.every(o=>o.userData.grip===index));
 }
});
