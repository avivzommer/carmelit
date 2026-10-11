import * as THREE from './vendor/three.module.js';
// Walk only on actual deck footprints, with body clearance checked at every edge.
export function createFloorWalker(surfaces,guard,{waypoints=[]}={}){
 const pitch=.18,anchors=waypoints.map(p=>new THREE.Vector3(...p));
 function floor(x,z,nearY){
  let best,delta=.15;
  for(const s of surfaces){const dy=Math.abs(s.y-nearY);if(dy<delta&&Math.abs(x-s.x)<=s.w/2-.12&&Math.abs(z-s.z)<=s.d/2+.012){best=s.y;delta=dy;}}return best;
 }
 function supported(a,b){
  const n=Math.max(1,Math.ceil(a.distanceTo(b)/.07));let y=a.y;
  for(let i=0;i<=n;i++){const p=a.clone().lerp(b,i/n),next=floor(p.x,p.z,y);if(next===undefined||Math.abs(next-p.y)>.14)return false;y=next;}return true;
 }
 function path(from,to,{tolerance=0}={}){
  guard.refresh();
  if(supported(from,to)&&!guard.segmentBlocker(from,to))return [to.clone()];
  // A heap avoids repeatedly sorting thousands of nodes after an imprecise tap.
  const open=[],seen=new Map();
  function push(node){node.rank=node.cost+node.p.distanceTo(to);open.push(node);let i=open.length-1;while(i){const parent=(i-1)>>1;if(open[parent].rank<=node.rank)break;open[i]=open[parent];i=parent;}open[i]=node;}
  function pop(){const first=open[0],last=open.pop();if(open.length){let i=0;while(i*2+1<open.length){let child=i*2+1;if(child+1<open.length&&open[child+1].rank<open[child].rank)child++;if(last.rank<=open[child].rank)break;open[i]=open[child];i=child;}open[i]=last;}return first;}
  const start={p:from.clone(),cost:0,parent:null};push(start);
  let nearest=null,nearestDistance=tolerance;
  const reconstruct=node=>{const points=[];for(let n=node;n.parent;n=n.parent)points.unshift(n.p.clone());return points.length?points:[from.clone()];};
  const key=p=>`${Math.round(p.x/pitch)},${Math.round(p.z/pitch)},${Math.round(p.y*100)}`;
  seen.set(key(from),0);
  for(let count=0;open.length&&count<(tolerance?1200:6000);count++){
   const node=pop();
   if(node.cost>(seen.get(node.key??key(node.p))??Infinity))continue;
   const distance=node.p.distanceTo(to);
   if(distance<nearestDistance){nearest=node;nearestDistance=distance;}
   if(distance<.3&&supported(node.p,to)&&!guard.segmentBlocker(node.p,to)){
    return [...reconstruct(node),to.clone()];
   }
   // Prefer the requested point. Only settle nearby when its final approach is
   // blocked, without ever stepping through the obstruction at the tap itself.
   if(tolerance&&distance<Math.min(.28,tolerance))return reconstruct(node);
   const neighbors=[];
   anchors.forEach((p,i)=>{if(p.distanceTo(node.p)<.46)neighbors.push({p,k:`stair:${i}`});});
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const x=node.p.x+dx*pitch,z=node.p.z+dz*pitch,y=floor(x,z,node.p.y);if(y===undefined)continue;
    const p=new THREE.Vector3(x,y,z);neighbors.push({p,k:key(p)});
   }
   for(const {p,k}of neighbors){
    const cost=node.cost+node.p.distanceTo(p);
    if(cost>24||(seen.get(k)??Infinity)<=cost||!supported(node.p,p)||guard.segmentBlocker(node.p,p))continue;
    seen.set(k,cost);push({p,cost,parent:node,key:k});
   }
  }
  return nearest?reconstruct(nearest):null;
 }
 function nearby(from,to,{tolerance=.5}={}){
  const candidates=surfaces.map(s=>new THREE.Vector3(
   THREE.MathUtils.clamp(to.x,s.x-s.w/2+.16,s.x+s.w/2-.16),s.y,
   THREE.MathUtils.clamp(to.z,s.z-s.d/2+.004,s.z+s.d/2-.004)))
   .filter(p=>p.distanceTo(to)<=tolerance).sort((a,b)=>a.distanceToSquared(to)-b.distanceToSquared(to));
  // One search, even if the tap is just outside the deck or inside scenery.
  const target=candidates[0]??to;
  const points=path(from,target,{tolerance});
  if(!points)return null;
  const end=points.at(-1),surface=surfaces.find(s=>Math.abs(s.y-end.y)<.02&&Math.abs(end.x-s.x)<=s.w/2&&Math.abs(end.z-s.z)<=s.d/2+.012);
  return {points,zone:surface?.id};
 }
 return {path,nearby,supported};
}
