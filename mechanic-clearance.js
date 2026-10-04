import * as THREE from './vendor/three.module.js';

export const WALKER={radius:.15,height:.81,stepHeight:.16};
export const cabinetWorkOffset=new THREE.Vector3(.36,0,.45);

// Check actual triangles, not the bounding box of an arch (which includes its
// doorway). Swept samples prevent a slow frame from jumping through a thin wall.
export function createWalkGuard(roots){
 const meshes=[],bounds=new THREE.Box3(),body=new THREE.Box3(),triangle=new THREE.Triangle();
 for(const root of roots)root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.position&&!o.userData.visualEffect)meshes.push(o);});
 function blocker(point){
  body.min.set(point.x-WALKER.radius,point.y+WALKER.stepHeight,point.z-WALKER.radius);
  body.max.set(point.x+WALKER.radius,point.y+WALKER.height,point.z+WALKER.radius);
  for(const mesh of meshes){
   let visible=true;for(let o=mesh;o;o=o.parent)if(!o.visible){visible=false;break;}if(!visible)continue;
   const g=mesh.geometry;if(!g.boundingBox)g.computeBoundingBox();
   bounds.copy(g.boundingBox).applyMatrix4(mesh.matrixWorld);if(!bounds.intersectsBox(body))continue;
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
 function segmentBlocker(from,to){
  const count=Math.max(1,Math.ceil(from.distanceTo(to)/.06)),p=new THREE.Vector3();
  for(let i=0;i<=count;i++){const hit=blocker(p.lerpVectors(from,to,i/count));if(hit)return hit;}return null;
 }
 function refresh(){roots.forEach(root=>root.updateWorldMatrix(true,true));}
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
 const candidates=[],ray=new THREE.Raycaster(),clones=new Map(),bounds=new THREE.Box3();
 let active=null,strength=0;
 function inherited(mesh,key){for(let p=mesh;p;p=p.parent)if(p.userData[key]!==undefined)return p.userData[key];}
 for(const root of roots)root.traverse(mesh=>{if(mesh.isMesh&&!inherited(mesh,'alwaysVisible')){const cast=THREE.Mesh.prototype.raycast;candidates.push({mesh,cast,fade:1,materials:null,shadow:mesh.castShadow});}});
 function update(camera,feet,dt,{surfaceReveal=0}={}){
  const passage=passageAt(feet,passages);
  if(passage)active=passage;
  strength=THREE.MathUtils.damp(strength,passage?1-surfaceReveal:0,12,dt);
  if(strength<.001&&!passage){strength=0;active=null;}
  const head=feet.clone().add(new THREE.Vector3(0,.55,0)),direction=new THREE.Vector3();camera.getWorldDirection(direction);
  ray.set(head.clone().addScaledVector(direction,-40),direction);ray.far=39.8;
  for(const item of candidates){
   const {mesh,cast}=item;let visible=true;for(let p=mesh;p;p=p.parent)if(!p.visible){visible=false;break;}
   const protectedPassage=active&&inherited(mesh,'focusLayer')===active.id;
   const roof=inherited(mesh,'occupancyRoof'),hits=[];
   if(visible&&!protectedPassage&&!roof)cast.call(mesh,ray,hits);
   let target=protectedPassage?1:hits.length?.18:1;
   if(active&&!protectedPassage){
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
    bounds.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    if(bounds.max.y>active.floor+.10)target=Math.min(target,THREE.MathUtils.lerp(1,.09,strength));
   }
   target*=inherited(mesh,'viewOpacity')??1;
   if(inherited(mesh,'cutawayProtected'))target=1;
   const fade=THREE.MathUtils.damp(item.fade,target,14,dt);
   const settled=fade>.999?1:fade;
   if(settled===1&&item.fade===1)continue;item.fade=settled;mesh.userData.cutawayOpacity=settled;
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
