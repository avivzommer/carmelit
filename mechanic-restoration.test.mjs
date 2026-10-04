import test from 'node:test';
import assert from 'node:assert/strict';
import {createRestoration} from './mechanic-restoration.js';
import {createMechanicLayout} from './mechanic-layout.js';
for(const near of [-1,1])test(`departure reveal and route guide point to the correct train on side ${near}`,()=>{
 const {floors,stairPaths}=createMechanicLayout(near===1?2:1);
 const reveal=createRestoration({near,floors,stairPaths});
 reveal.update([true,true,false],3,true);
 assert.equal(reveal.opened,false);assert.equal(reveal.shutter.scale.y,1);
 assert.ok(reveal.returnRoute.every(p=>!p.mesh.visible));
 reveal.update([true,true,true],.9,true);assert.ok(reveal.shutter.scale.y<1&&reveal.shutter.scale.y>.015);
 reveal.update([true,true,true],1.5,true);assert.equal(reveal.opened,true);
 assert.ok(reveal.returnRoute.every(p=>p.mesh.visible));assert.equal(Math.sign(reveal.boarding.position.x),near);
 assert.equal(Math.sign(reveal.portal.position.x),near);
 reveal.update([true,true,true],20,false);assert.equal(reveal.opened,true);assert.equal(reveal.boarding.visible,false);
 assert.ok(reveal.returnRoute.filter(p=>p.segment===reveal.boardingSegment).every(p=>!p.mesh.visible));
 assert.ok(reveal.returnRoute.filter(p=>p.segment<reveal.boardingSegment).every(p=>p.mesh.visible));
 reveal.reset();assert.equal(reveal.opened,false);assert.equal(reveal.shutter.scale.y,1);assert.ok(reveal.railLights.every(p=>!p.mesh.visible));
});

test('the far tunnel gates open with the repair reveal and close again on restart',()=>{
 const {floors,stairPaths}=createMechanicLayout(2);
 const reveal=createRestoration({near:1,floors,stairPaths,terminalZ:-6.10});
 assert.equal(reveal.portal,null,'the upper line has no duplicate freestanding gate');
 assert.equal(reveal.shutter,null);
 assert.equal(reveal.terminalShutters.length,2);
 reveal.update([true,true,false],5,true);assert.ok(reveal.terminalShutters.every(s=>s.visible&&s.scale.y===1));
 reveal.update([true,true,true],1,true);assert.ok(reveal.terminalShutters.every(s=>s.visible&&s.scale.y<1));
 reveal.update([true,true,true],2,true);assert.equal(reveal.opened,true);assert.ok(reveal.terminalShutters.every(s=>!s.visible));
 assert.ok(reveal.railLights.at(-1).mesh.position.z<reveal.terminal.position.z,'the lit route reaches the final gate');
 reveal.reset();assert.ok(reveal.terminalShutters.every(s=>s.visible&&s.scale.y===1));assert.equal(reveal.opened,false);
});

test('terminal stays closed until the repair current reaches its indicator',()=>{
 const layout=createMechanicLayout(2);
 const reveal=createRestoration({near:1,floors:layout.floors,stairPaths:layout.stairPaths,terminalZ:-6.10});
 reveal.update([true,true,true],2.2,true,false);
 assert.ok(reveal.terminalShutters.every(s=>s.visible&&s.scale.y===1));
 reveal.update([true,true,true],.7,true,true);
 assert.ok(reveal.terminalShutters.every(s=>s.visible&&s.scale.y<1));
 reveal.update([true,true,true],1,true,true);
 assert.equal(reveal.opened,true);
});
