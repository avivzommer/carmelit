import test from 'node:test';
import assert from 'node:assert/strict';
import {createMechanicJourney} from './mechanic-state.mjs';
const walk=(g,id)=>{let target=id;while(target){assert.ok(g.walk(target),`walk to ${target}`);g.finishWalk();target=g.state.motion?.continueTo;if(g.state.motion?.type==='repair')g.finishRepair();}};
const move=(g,i)=>{assert.ok(g.beginDrag());assert.ok(g.release(i));g.finishSlide();};
for(const chapter of [1,2]){
 test(`chapter ${chapter}: repair both stations, transfer trains, restore cable and depart`,()=>{
  const g=createMechanicJourney(chapter);
  assert.equal(g.beginDrag(),false);
  walk(g,'station1');walk(g,g.primary);move(g,g.high);walk(g,'station2Far');
  assert.deepEqual(g.state.pressed,[true,true,false]);
  assert.equal(g.walk('repair'),false);
  move(g,g.low);walk(g,g.secondary);move(g,1);walk(g,'repair');
  assert.deepEqual(g.state.pressed,[true,true,true]);assert.equal(g.state.complete,false);
  walk(g,g.primary);move(g,g.high);assert.equal(g.state.complete,false);assert.equal(g.state.motion.type,'departure');
  assert.ok(g.finishDeparture());assert.equal(g.state.complete,true);
  assert.equal(g.beginDrag(),false);assert.equal(g.walk('entrance'),false);
  g.reset();assert.deepEqual(g.state,createMechanicJourney(chapter).state);
 });
 test(`chapter ${chapter}: every reachable configuration can complete`,t=>{
  const first=createMechanicJourney(chapter).state,key=JSON.stringify,states=new Map([[key(first),first]]),queue=[first],edges=new Map();
  const nodes=['entrance','station1','station2Near','station2Far','dockNear','dockFar','repair','carA','carB'];
  for(let n=0;n<queue.length;n++){
   const state=queue[n],out=[];
   for(const action of [...nodes,0,1,2]){
    const g=createMechanicJourney(chapter);Object.assign(g.state,state);
    if(typeof action==='number'){if(!g.beginDrag()||!g.release(action))continue;g.finishSlide();}
    else {if(!g.walk(action))continue;g.finishWalk();if(g.state.motion?.type==='repair')g.finishRepair();}
    if(g.state.motion?.type==='departure')g.finishDeparture();
    const next={...g.state},id=key(next);out.push(id);if(!states.has(id)){states.set(id,next);queue.push(next);}
   }edges.set(key(state),out);
  }
  const good=new Set([...states].filter(([,s])=>s.complete).map(([id])=>id));let changed=true;
  while(changed){changed=false;for(const[id,out]of edges)if(!good.has(id)&&out.some(x=>good.has(x))){good.add(id);changed=true;}}
  assert.equal(good.size,states.size);t.diagnostic(`${states.size} configurations remain solvable.`);
 });
}
test('walking, dragging, repair arrival and cancellation have distinct states',()=>{
 const g=createMechanicJourney();g.walk('station1');assert.equal(g.state.pressed[0],false);assert.equal(g.beginDrag(),false);g.finishWalk();assert.equal(g.beginDrag(),false);assert.ok(g.finishRepair());
 assert.ok(g.beginDrag());assert.equal(g.walk('carA'),false);assert.equal(g.release(3),false);assert.ok(g.cancel());assert.equal(g.state.stop,0);
 g.beginDrag();g.release(2);assert.equal(g.walk('station2Far'),false);g.reset();assert.equal(g.finishSlide(),false);
});
test('victory waits for the final tunnel journey and restarting cancels it',()=>{
 const g=createMechanicJourney(2);assert.equal(g.finishDeparture(),false);
 Object.assign(g.state,{pressed:[true,true,true],location:g.primary,stop:1});
 move(g,g.high);assert.equal(g.state.complete,false);assert.equal(g.state.motion.type,'departure');
 assert.equal(g.beginDrag(),false);assert.equal(g.walk('station2Near'),false);assert.equal(g.landingFor(g.primary),null);
 g.reset();assert.equal(g.finishDeparture(),false);assert.equal(g.state.complete,false);
 Object.assign(g.state,{pressed:[true,true,true],location:g.primary,stop:1});move(g,g.high);
 assert.equal(g.finishDeparture(),true);assert.equal(g.state.complete,true);assert.equal(g.finishDeparture(),false);
});
for(const chapter of [1,2]){
 test(`chapter ${chapter}: aligned middle landing allows exit before cable repair`,()=>{
  const g=createMechanicJourney(chapter);
  walk(g,'station1');walk(g,g.primary);move(g,1);
  assert.deepEqual(g.state.pressed,[true,false,false]);
  walk(g,'dockNear');
  assert.equal(g.walk('repair'),false,'round gate stays shut until cable repair');
  walk(g,g.primary);move(g,g.high);walk(g,'station2Far');
  move(g,g.low);walk(g,g.secondary);move(g,1);walk(g,'dockFar');walk(g,'repair');
  walk(g,'dockNear');walk(g,g.primary);move(g,g.high);g.finishDeparture();
  assert.equal(g.state.complete,true);
 });
 test(`chapter ${chapter}: both middle train exits follow alignment, not repair progress`,()=>{
  const g=createMechanicJourney(chapter);walk(g,'station1');move(g,1);
  const edges=g.connections();
  assert.ok(edges.some(([a,b])=>a===g.primary&&b==='dockNear'));
  assert.ok(edges.some(([a,b])=>a===g.secondary&&b==='dockFar'));
  assert.equal(edges.some(pair=>pair.includes('repair')),false);
  move(g,2);
  assert.equal(g.connections().some(pair=>pair.includes('dockNear')||pair.includes('dockFar')),false);
 });
}
