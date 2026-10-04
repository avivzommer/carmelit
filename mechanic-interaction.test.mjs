import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import {createCarmelitTrain} from './mechanic-train.js';
import {createTrack,trackPoint,TRAIN_SLOPE,trainPosition,STATION_Y} from './mechanic-track.js';
import {createTrainPointer,snapTrainStop} from './mechanic-input.mjs';
import {createMechanicJourney} from './mechanic-state.mjs';
import {createRepairCabinet,repairPose} from './mechanic-repair.js';

function pointerHarness(index=0){
 const game=createMechanicJourney();game.state.pressed=[true,false,false];game.state.stop=1;
 let travel=1,clicks=[],captured=null;
 const pointer=createTrainPointer({available:()=>!game.state.motion,pick:()=>({trainIndex:index,destination:index?'carB':'carA'}),travel:()=>travel,
  begin:()=>game.beginDrag(),move:t=>travel=t,end:i=>{game.release(i);game.finishSlide();travel=i;},click:id=>clicks.push(id),blocked:()=>{},
  cancel:()=>{game.cancel();travel=game.state.stop;},capture:id=>captured=id,releaseCapture:()=>captured=null,axis:()=>({x:80,y:-100})});
 return {pointer,game,clicks,get travel(){return travel;},get captured(){return captured;}};
}
const event=(x,y,id=1)=>({button:0,pointerId:id,clientX:x,clientY:y});
test('dragging any train body moves it; a click still boards',()=>{
 const h=pointerHarness();h.pointer.down(event(0,0));h.pointer.up(event(0,0));assert.deepEqual(h.clicks,['carA']);assert.equal(h.travel,1);
 h.pointer.down(event(0,0));h.pointer.move(event(40,-50));assert.equal(h.travel,1.5);assert.equal(h.game.state.motion.type,'drag');
 h.pointer.up(event(40,-50));assert.equal(h.travel,2);assert.equal(h.game.state.motion,null);assert.equal(h.captured,null);
});
test('opposite train drags invert cable motion; a short deliberate drag reaches a stop',()=>{
 const h=pointerHarness(1);h.pointer.down(event(0,0));h.pointer.move(event(20,-25));assert.equal(h.travel,.75);
 h.pointer.up(event(20,-25));assert.equal(h.travel,0);assert.equal(snapTrainStop(0,.2),1);assert.equal(snapTrainStop(0,.02),0);
});
test('canceled gestures restore the settled position and ignore other pointers',()=>{
 const h=pointerHarness();h.pointer.down(event(0,0));h.pointer.move(event(40,-50,2));assert.equal(h.travel,1);
 h.pointer.move(event(40,-50));h.pointer.cancel();assert.equal(h.travel,1);assert.equal(h.game.state.motion,null);assert.equal(h.captured,null);
 h.pointer.down(event(0,0));h.pointer.up(event(0,0));assert.equal(h.clicks.length,1);
});
test('repair animation keeps controls locked until completion; reset cancels it',()=>{
 const g=createMechanicJourney();g.walk('station1');g.finishWalk();assert.equal(g.state.motion.type,'repair');assert.equal(g.state.pressed[0],false);
 assert.equal(g.beginDrag(),false);assert.equal(g.walk('carA'),false);assert.equal(g.finishRepair(),true);assert.equal(g.state.pressed[0],true);
 assert.equal(g.finishRepair(),false);assert.equal(g.beginDrag(),true);
 g.reset();g.walk('station1');g.finishWalk();g.reset();assert.equal(g.finishRepair(),false);assert.deepEqual(g.state.pressed,[false,false,false]);
});
test('cabinet opens, animates interior contacts, closes, and returns mechanic to pad',()=>{
 const c=createRepairCabinet(0);c.setProgress(0);assert.equal(Math.abs(c.hinge.rotation.y),0);
 const working=c.setProgress(.5);assert.ok(c.hinge.rotation.y<-1);assert.equal(working.working,true);assert.equal(working.approach,1);
 c.setProgress(1,true);assert.equal(Math.abs(c.hinge.rotation.y),0);assert.equal(c.lamp.material.emissiveIntensity,1.2);assert.equal(repairPose(1).approach,0);
 c.setProgress(0,false);assert.equal(c.lamp.material.emissiveIntensity,0);
});
test('inclined train geometry stays above the cables through its complete travel',()=>{
 const train=createCarmelitTrain(0),p=new THREE.Vector3();
 assert.equal(train.body.matrix.elements[9],-TRAIN_SLOPE);assert.ok(train.nose.matrix.elements[6]<0);
 for(const stop of [-.58,0,1,2,2.58]){
  train.root.position.copy(trainPosition(0,stop));train.root.updateMatrixWorld(true);
  let clearance=Infinity;
  train.root.traverse(o=>{if(!o.isMesh)return;const positions=o.geometry.attributes.position;for(let i=0;i<positions.count;i++){
   p.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);clearance=Math.min(clearance,p.y-trackPoint(p.x,p.z).y);
  }});
  assert.ok(clearance>.025,`minimum cable clearance ${clearance}`);
 }
});
test('cable fade is evaluated across fragments so the middle stays opaque',()=>{
 const cable=createTrack(0,.028,0x253940),shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};
 cable.material.onBeforeCompile(shader);
 assert.match(shader.vertexShader,/trackDistance=position.y/);assert.doesNotMatch(shader.vertexShader,/smoothstep/);
 assert.match(shader.fragmentShader,/diffuseColor.a\*=smoothstep/);assert.ok(shader.uniforms.trackLength.value>9);
});
test('boarding across the power pad repairs it before continuing to the train',()=>{
 const g=createMechanicJourney();
 assert.deepEqual(g.walk('carA'),['entrance','station1']);g.finishWalk();
 assert.equal(g.state.motion.type,'repair');assert.equal(g.state.motion.continueTo,'carA');assert.equal(g.beginDrag(),false);
 const destination=g.state.motion.continueTo;g.finishRepair();g.walk(destination);g.finishWalk();
 assert.equal(g.state.location,'carA');assert.equal(g.state.pressed[0],true);assert.equal(g.beginDrag(),true);
});

test('chassis, rails and motion share one gentle incline with aligned station stops',()=>{
 const train=createCarmelitTrain(0),forward=new THREE.Vector3(0,0,1).transformDirection(train.body.matrix);
 const railDirection=trackPoint(0,3).sub(trackPoint(0,0)).normalize();
 const travelDirection=trainPosition(0,0).sub(trainPosition(0,1)).normalize();
 assert.ok(forward.clone().cross(railDirection).length()<1e-10);
 assert.ok(forward.clone().cross(travelDirection).length()<1e-10);
 assert.ok(Math.atan(TRAIN_SLOPE)*180/Math.PI<25);
 for(let stop=0;stop<3;stop++)for(const index of [0,1]){
  const p=trainPosition(index,index?2-stop:stop);assert.equal(p.y,STATION_Y[stop]);
  assert.ok(Math.abs(p.y-trackPoint(p.x,p.z).y-.62)<1e-10);
 }
});
