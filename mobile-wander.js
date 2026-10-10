import * as THREE from './vendor/three.module.js';
// Walk only on actual deck footprints, with body clearance checked at every edge.
export function createFloorWalker(surfaces,guard,{waypoints=[]}={}){
 const pitch=.18,anchors=waypoints.map(p=>new THREE.Vector3(...p));
 function floor(x,z,nearY){
  const ys=surfaces.filter(s=>Math.abs(x-s.x)<=s.w/2-.12&&Math.abs(z-s.z)<=s.d/2+.012).map(s=>s.y);
  ys.sort((a,b)=>Math.abs(a-nearY)-Math.abs(b-nearY));return ys.find(y=>Math.abs(y-nearY)<.15);
 }
 function supported(a,b){
  const n=Math.max(1,Math.ceil(a.distanceTo(b)/.07));let y=a.y;
  for(let i=0;i<=n;i++){const p=a.clone().lerp(b,i/n),next=floor(p.x,p.z,y);if(next===undefined||Math.abs(next-p.y)>.14)return false;y=next;}return true;
 }
 function path(from,to){
  guard.refresh();
  if(supported(from,to)&&!guard.segmentBlocker(from,to))return [to.clone()];
  const start={p:from.clone(),cost:0,parent:null},open=[start],seen=new Map();
  const key=p=>`${Math.round(p.x/pitch)},${Math.round(p.z/pitch)},${Math.round(p.y*100)}`;
  seen.set(key(from),0);
  for(let count=0;open.length&&count<6000;count++){
   open.sort((a,b)=>a.cost+a.p.distanceTo(to)-b.cost-b.p.distanceTo(to));const node=open.shift();
   if(node.p.distanceTo(to)<.3&&supported(node.p,to)&&!guard.segmentBlocker(node.p,to)){
    const points=[to.clone()];for(let n=node;n.parent;n=n.parent)points.unshift(n.p);return points;
   }
   const neighbors=[];
   anchors.forEach((p,i)=>{if(p.distanceTo(node.p)<.46)neighbors.push({p,k:`stair:${i}`});});
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const x=node.p.x+dx*pitch,z=node.p.z+dz*pitch,y=floor(x,z,node.p.y);if(y===undefined)continue;
    const p=new THREE.Vector3(x,y,z);neighbors.push({p,k:key(p)});
   }
   for(const {p,k}of neighbors){
    const cost=node.cost+node.p.distanceTo(p);
    if(cost>24||(seen.get(k)??Infinity)<=cost||!supported(node.p,p)||guard.segmentBlocker(node.p,p))continue;
    seen.set(k,cost);open.push({p,cost,parent:node});
   }
  }
  return null;
 }
 return {path,supported};
}
