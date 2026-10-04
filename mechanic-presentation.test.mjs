import test from 'node:test';
import assert from 'node:assert/strict';
import {fittedView,restorationReveal,entranceFrame} from './mechanic-presentation.mjs';
import {createMechanicJourney} from './mechanic-state.mjs';
import {createMechanicLayout} from './mechanic-layout.js';
import {cabinetWorkOffset} from './mechanic-clearance.js';

test('whole scene remains between controls and caption on phones, landscape and desktop',()=>{
 const size={x:13.8,y:17.2},center={x:.3,y:-.7};
 for(const [width,height]of [[320,568],[360,640],[390,844],[430,932],[844,390],[667,375],[1280,720],[1536,1024]]){
  const inset={top:82,bottom:100,left:24,right:24},view=fittedView(size,center,width,height,inset);
  const x=p=>(p-view.left)/(view.right-view.left)*width,y=p=>(view.top-p)/(view.top-view.bottom)*height;
  assert.ok(x(center.x-size.x/2)>=inset.left&&x(center.x+size.x/2)<=width-inset.right);
  assert.ok(y(center.y+size.y/2)>=inset.top&&y(center.y-size.y/2)<=height-inset.bottom);
 }
});
test('restoration reveal shows station then returns underground, including reduced motion',()=>{
 for(const reduced of [false,true]){
  const {duration}=restorationReveal(0,reduced);
  assert.equal(restorationReveal(0,reduced).surfaceReveal,0);
  assert.equal(restorationReveal(duration*.5,reduced).surfaceReveal,1);
  assert.equal(restorationReveal(duration,reduced).surfaceReveal,0);
  assert.equal(restorationReveal(duration-.01,reduced).complete,false);
  assert.equal(restorationReveal(duration,reduced).complete,true);
 }
});
test('third repair locks walking and train input until the reveal finishes, and restart cancels it',()=>{
 const game=createMechanicJourney(2);
 Object.assign(game.state,{location:'repair',stop:1,pressed:[true,true,false],motion:{type:'repair',index:2}});
 game.finishRepair({reveal:true});assert.equal(game.state.motion.type,'reveal');
 assert.equal(game.walk(game.primary),false);assert.equal(game.beginDrag(),false);assert.equal(game.finishDeparture(),false);
 assert.ok(game.finishReveal());assert.ok(game.walk(game.primary));
 game.state.motion={type:'reveal'};game.reset();assert.equal(game.finishReveal(),false);assert.equal(game.state.motion,null);
});
test('both station repair markers coincide with the cabinet work position in both chapters',()=>{
 for(const chapter of [1,2]){const layout=createMechanicLayout(chapter);
  for(const id of ['station1','station2Far']){
   const work=layout.cabinetPosition(id).add(cabinetWorkOffset);
   assert.ok(work.toArray().every((value,i)=>Math.abs(value-layout.floors[id][i])<1e-8));
  }
 }
});

test('entrance resolves to an opaque settled stage and reduced motion skips camera travel',()=>{
 for(const reduced of [false,true]){
  const end=entranceFrame(entranceFrame(0,reduced).duration,reduced);
  assert.equal(end.complete,true);assert.equal(end.focus,0);assert.equal(end.opacity,1);
  assert.equal(end.arrival,1);assert.equal(end.step,1);
 }
 assert.equal(entranceFrame(0).opacity,0);
 assert.ok(entranceFrame(1.7).focus>.99);
 assert.equal(entranceFrame(.2,true).focus,0);
});
