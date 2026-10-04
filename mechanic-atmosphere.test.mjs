import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './vendor/three.module.js';
import {createMechanicLayout} from './mechanic-layout.js';
import {createSteppedStation} from './mechanic-station.js';
import {createUndergroundAtmosphere} from './mechanic-atmosphere.js';

function setup(){
 const layout=createMechanicLayout(2),station=createSteppedStation(layout),scene=new THREE.Scene();scene.add(layout.root,station.root);
 const ambient=new THREE.HemisphereLight(0xfff7e3,0x7285a3,2.1),sunlight=new THREE.DirectionalLight(0xfff0d4,3.4),fill=new THREE.DirectionalLight(0xd7e7ff,.65);
 const renderer={toneMappingExposure:1.18};let backdrop=0;
 const atmosphere=createUndergroundAtmosphere({scene,renderer,ambient,sunlight,fill,passages:layout.passages,onChange:value=>backdrop=value});
 const settle=(point,restored=true)=>{for(let i=0;i<360;i++)station.update([true,true,true],1/60,atmosphere.update(new THREE.Vector3(...point),1/60,{restored}));};
 return {layout,station,ambient,sunlight,fill,renderer,atmosphere,settle,get backdrop(){return backdrop;}};
}

test('both basement routes smoothly lose daylight while keeping warm task lighting, then restore on exit',()=>{
 const h=setup(),surface={sky:h.ambient.color.clone(),ground:h.ambient.groundColor.clone(),fill:h.fill.color.clone()};
 for(const point of [h.layout.floors.repair,[0,2.2,-5.6]]){
  h.atmosphere.reset();h.atmosphere.update(new THREE.Vector3(...point),1/60);
  assert.ok(h.sunlight.intensity>1.3&&h.sunlight.intensity<1.45,'a stair entry must not flash from light to dark');
  h.settle(point);
  assert.ok(h.sunlight.intensity<.4&&h.ambient.intensity<.6,'underground must remove most of the daylight');
  assert.ok(h.ambient.intensity>.3&&h.fill.intensity>.15,'retain enough fill to distinguish unlit geometry');
  assert.ok(h.atmosphere.workLight.intensity>.5,'mechanic and immediate path keep a warm work light');
  assert.ok(h.backdrop>.99,'the bright background must not wash out the basement');
  assert.ok(h.station.passageScenery.localLights.every(({light})=>light.intensity>1),'powered fixtures illuminate floors, not only their own bulbs');
  h.settle(h.layout.floors.entrance);
  assert.equal(h.sunlight.intensity,3.4);assert.equal(h.ambient.intensity,2.1);assert.equal(h.fill.intensity,.65);
  assert.equal(h.renderer.toneMappingExposure,1.18);assert.equal(h.backdrop,0);assert.equal(h.atmosphere.workLight.intensity,0);
  assert.ok(h.ambient.color.equals(surface.sky)&&h.ambient.groundColor.equals(surface.ground)&&h.fill.color.equals(surface.fill));
 }
});

test('lighting follows descent depth, ignores low outdoor platforms, and resets even while underground',()=>{
 const h=setup();
 h.settle(h.layout.floors.entrance);assert.equal(h.atmosphere.strength,0,'height alone does not identify a basement');
 h.settle(h.layout.stairPaths.get('dockNear')[3]);const shallow=h.atmosphere.strength;
 h.settle(h.layout.floors.repair);assert.ok(shallow>0&&shallow<h.atmosphere.strength,'descent progressively dims lighting');
 h.atmosphere.reset();h.station.reset();
 assert.equal(h.backdrop,0);assert.equal(h.sunlight.intensity,1.45);assert.equal(h.atmosphere.workLight.intensity,0);
 assert.ok(h.station.passageScenery.localLights.every(({light})=>light.intensity<.5),'restart clears restored power from local lamps');
});

 test('unrepaired station starts dimmer than restored station and remains brighter than the basement',()=>{
 const h=setup();h.settle(h.layout.floors.entrance,false);const dim=h.ambient.intensity+h.sunlight.intensity;
 h.settle(h.layout.floors.repair,false);assert.ok(h.ambient.intensity+h.sunlight.intensity<dim*.5);
 h.settle(h.layout.floors.entrance,true);assert.ok(h.ambient.intensity+h.sunlight.intensity>dim*1.7);
 h.settle(h.layout.floors.repair,true);
 for(let i=0;i<180;i++)h.atmosphere.update(new THREE.Vector3(...h.layout.floors.repair),1/60,{restored:true,surfaceReveal:1});
 assert.ok(h.sunlight.intensity>3.3,'the reveal restores the upper-level lighting while the player remains underground');
 h.settle(h.layout.floors.repair,true);assert.ok(h.sunlight.intensity<.4,'the basement mood returns after the reveal');
});
