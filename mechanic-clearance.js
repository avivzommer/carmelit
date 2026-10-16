import * as THREE from './vendor/three.module.js';

export const WALKER={radius:.15,height:.81,stepHeight:.16};
export const cabinetWorkOffset=new THREE.Vector3(.36,0,.45);

// Check actual triangles, not the bounding box of an arch (which includes its
// doorway). Swept samples prevent a slow frame from jumping through a thin wall.
export function createWalkGuard(roots){
 const meshes=[],body=new THREE.Box3(),triangle=new THREE.Triangle(),cells=new Map(),nearby=new Set(),cellSize=.8;
 for(const root of roots)root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.position&&!o.userData.visualEffect)meshes.push({mesh:o,bounds:new THREE.Box3(),matrix:null,keys:[]});});
 function visitCells(box,visit){for(let x=Math.floor(box.min.x/cellSize);x<=Math.floor(box.max.x/cellSize);x++)for(let y=Math.floor(box.min.y/cellSize);y<=Math.floor(box.max.y/cellSize);y++)for(let z=Math.floor(box.min.z/cellSize);z<=Math.floor(box.max.z/cellSize);z++)visit(`${x},${y},${z}`);}
 function blocker(point){
  body.min.set(point.x-WALKER.radius,point.y+WALKER.stepHeight,point.z-WALKER.radius);
  body.max.set(point.x+WALKER.radius,point.y+WALKER.height,point.z+WALKER.radius);
  nearby.clear();visitCells(body,key=>{for(const item of cells.get(key)||[])nearby.add(item);});
  for(const {mesh,bounds} of nearby){
   let visible=true;for(let o=mesh;o;o=o.parent)if(!o.visible){visible=false;break;}if(!visible)continue;
   const g=mesh.geometry;if(!bounds.intersectsBox(body))continue;
   const pos=g.attributes.position,index=g.index,count=index?index.count:pos.count;
   for(let i=0;i<count;i+=3){
    triangle.a.fromBufferAttribute(pos,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);
    triangle.b.fromBufferAttribute(pos,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
    triangle.c.fromBufferAttribute(pos,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
    if(body.intersectsTriangle(triangle))return mesh;
   }
  }
  return null;
 }
 // Sweep the whole walking body continuously. Point samples can miss a thin
 // tread stripe during planning and then catch it at a different frame cadence.
 const sweep=new THREE.Box3(),velocity=new THREE.Vector3(),center=new THREE.Vector3();
 const basis=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];
 const edges=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
 const axes=[...basis,new THREE.Vector3(),...Array.from({length:9},()=>new THREE.Vector3())];
 function intersectsSweep(){
  edges[0].subVectors(triangle.b,triangle.a);edges[1].subVectors(triangle.c,triangle.b);edges[2].subVectors(triangle.a,triangle.c);
  axes[3].crossVectors(edges[0],edges[1]);
  for(let e=0;e<3;e++)for(let a=0;a<3;a++)axes[4+e*3+a].crossVectors(edges[e],basis[a]);
  let enter=0,leave=1;
  for(const axis of axes){
   if(axis.lengthSq()<1e-20)continue;
   const a=triangle.a.dot(axis),b=triangle.b.dot(axis),c=triangle.c.dot(axis);
   const radius=WALKER.radius*(Math.abs(axis.x)+Math.abs(axis.z))+(WALKER.height-WALKER.stepHeight)/2*Math.abs(axis.y);
   const low=Math.min(a,b,c)-radius-center.dot(axis),high=Math.max(a,b,c)+radius-center.dot(axis),speed=velocity.dot(axis);
   if(Math.abs(speed)<1e-12){if(low>0||high<0)return false;continue;}
   const t0=low/speed,t1=high/speed;enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));
   if(enter>leave)return false;
  }
  return true;
 }
 function segmentBlocker(from,to){
  velocity.subVectors(to,from);center.copy(from);center.y+=(WALKER.height+WALKER.stepHeight)/2;
  sweep.min.set(Math.min(from.x,to.x)-WALKER.radius,Math.min(from.y,to.y)+WALKER.stepHeight,Math.min(from.z,to.z)-WALKER.radius);
  sweep.max.set(Math.max(from.x,to.x)+WALKER.radius,Math.max(from.y,to.y)+WALKER.height,Math.max(from.z,to.z)+WALKER.radius);
  nearby.clear();visitCells(sweep,key=>{for(const item of cells.get(key)||[])nearby.add(item);});
  for(const {mesh,bounds}of nearby){
   let visible=true;for(let p=mesh;p;p=p.parent)if(!p.visible){visible=false;break;}
   if(!visible||!bounds.intersectsBox(sweep))continue;
   const {geometry:g}=mesh,pos=g.attributes.position,index=g.index,count=index?index.count:pos.count;
   for(let i=0;i<count;i+=3){
    triangle.a.fromBufferAttribute(pos,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);
    triangle.b.fromBufferAttribute(pos,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
    triangle.c.fromBufferAttribute(pos,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
    if(intersectsSweep())return mesh;
   }
  }
  return null;
 }
 function refresh(){
  roots.forEach(root=>root.updateWorldMatrix(true,true));
  for(const item of meshes){const {mesh}=item;if(item.matrix?.equals(mesh.matrixWorld))continue;
   for(const key of item.keys){const bucket=cells.get(key);bucket.delete(item);if(!bucket.size)cells.delete(key);}item.keys.length=0;
   const g=mesh.geometry;if(!g.boundingBox)g.computeBoundingBox();item.bounds.copy(g.boundingBox).applyMatrix4(mesh.matrixWorld);
   (item.matrix??=new THREE.Matrix4()).copy(mesh.matrixWorld);
   visitCells(item.bounds,key=>{if(!cells.has(key))cells.set(key,new Set());cells.get(key).add(item);item.keys.push(key);});
  }
 }
 refresh();
 return {blocker,segmentBlocker,refresh};
}

// Obstructions still have collision. Only their rendering fades when they hide
// the mechanic, so a valid rear passage remains readable from this fixed camera.
export function passageAt(feet,passages){
 for(const passage of passages){
  if(feet.y>passage.entryHeight-.06)continue;
  for(let i=1;i<passage.points.length;i++){
   const line=new THREE.Line3(new THREE.Vector3(...passage.points[i-1]),new THREE.Vector3(...passage.points[i]));
   if(line.closestPointToPoint(feet,true,new THREE.Vector3()).distanceTo(feet)<.58)return passage;
  }
 }
 return null;
}
export function createPlayerCutaway(roots,{passages=[]}={}){
 const candidates=[],ray=new THREE.Raycaster(),clones=new Map(),hits=[];
 let active=null,strength=0;
 function inherited(mesh,key){for(let p=mesh;p;p=p.parent)if(p.userData[key]!==undefined)return p.userData[key];}
 for(const root of roots)root.traverse(mesh=>{if(mesh.isMesh&&!inherited(mesh,'alwaysVisible')){const cast=THREE.Mesh.prototype.raycast;candidates.push({mesh,cast,fade:1,materials:null,shadow:mesh.castShadow,bounds:new THREE.Box3(),matrix:null,layer:inherited(mesh,'focusLayer'),roof:inherited(mesh,'occupancyRoof'),protected:inherited(mesh,'cutawayProtected')});}});
 function update(camera,feet,dt,{surfaceReveal=0}={}){
  const passage=passageAt(feet,passages);
  if(passage)active=passage;
  const targetStrength=passage?1-surfaceReveal:0;
  strength=THREE.MathUtils.damp(strength,targetStrength,12,dt);
  if(Math.abs(strength-targetStrength)<.0001)strength=targetStrength;
  if(strength<.001&&!passage){strength=0;active=null;}
  const head=feet.clone().add(new THREE.Vector3(0,.55,0)),direction=new THREE.Vector3();camera.getWorldDirection(direction);
  ray.set(head.clone().addScaledVector(direction,-40),direction);ray.far=39.8;
  for(const item of candidates){
   const {mesh,cast}=item;let visible=true;for(let p=mesh;p;p=p.parent)if(!p.visible){visible=false;break;}
   const protectedPassage=active&&item.layer===active.id;
   hits.length=0;
   if(!item.matrix?.equals(mesh.matrixWorld)){
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    item.bounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);(item.matrix??=new THREE.Matrix4()).copy(mesh.matrixWorld);
   }
   const upperFade=active&&!protectedPassage&&item.bounds.max.y>active.floor+.10?THREE.MathUtils.lerp(1,.09,strength):1;
   // Once the entire upper level is ghosted, individual occlusion rays cannot
   // change its fade. Only the active passage needs detailed visibility work.
   if(upperFade>.18&&visible&&!protectedPassage&&!item.roof&&!item.protected&&ray.ray.intersectsBox(item.bounds))cast.call(mesh,ray,hits);
   let target=Math.min(protectedPassage?1:hits.length?.18:1,upperFade);
   target*=inherited(mesh,'viewOpacity')??1;
   if(item.protected)target=1;
   const fade=THREE.MathUtils.damp(item.fade,target,14,dt);
   const settled=Math.abs(fade-target)<.0001?target:fade;
   if(settled===item.fade)continue;item.fade=settled;mesh.userData.cutawayOpacity=settled;
   // Transparent roofs and the hidden upper floor must not cast opaque shadows
   // across the passage that is currently being played.
   mesh.castShadow=item.shadow&&settled>.95;
   if(!item.materials){
    const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    item.materials=originals.map(mat=>{
     const copy=mat.clone();clones.set(copy,mat);
     copy.onBeforeCompile=mat.onBeforeCompile;copy.customProgramCacheKey=()=>mat.customProgramCacheKey();
     // Keep train signals live, whether their owner retains the source material
     // or updates the material now attached to the mesh.
     copy.color=mat.color;
     if(mat.emissive){copy.emissive=mat.emissive;Object.defineProperty(copy,'emissiveIntensity',{get:()=>mat.emissiveIntensity,set:value=>mat.emissiveIntensity=value});}
     return copy;
    });
    mesh.material=Array.isArray(mesh.material)?item.materials:item.materials[0];
   }
   for(const mat of item.materials){
    const original=clones.get(mat),transparent=settled<1||original.transparent;
    mat.opacity=original.opacity*settled;
    if(mat.transparent!==transparent){mat.transparent=transparent;mat.needsUpdate=true;}
    mat.depthWrite=settled===1&&original.depthWrite;
   }
  }
 }
 return {update,get activePassage(){return active?.id||null;}};
}
