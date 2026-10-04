import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import {createDepartureRunout} from './mechanic-runout.js';
import {trainPosition,departureTravel} from './mechanic-track.js';

test('departure foundation and rails cover the departing train beyond the terminal',()=>{
 const runout=createDepartureRunout();runout.updateMatrixWorld(true);
 const foundation=runout.children[0],bounds=new THREE.Box3().setFromObject(foundation);
 const last=trainPosition(1,departureTravel(0,2));
 assert.ok(bounds.max.z>=-6.72,'foundation joins the existing station');
 assert.ok(bounds.min.z<last.z,'foundation extends beyond the final train position');
 assert.ok(bounds.min.x<last.x-.55&&bounds.max.x>last.x+.55,'both wheel lines have track underneath');
 const rails=runout.children.filter(m=>m.geometry.type==='CylinderGeometry');
 assert.equal(rails.length,6);
 for(const rail of rails){const b=new THREE.Box3().setFromObject(rail);assert.ok(b.min.z<last.z&&b.max.z>=-6.72);}
});
