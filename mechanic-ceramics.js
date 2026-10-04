import * as THREE from './vendor/three.module.js';

// World-sized ceramic courses stay consistent across differently sized surfaces.
export function ceramicMaterial(color,{axes='xy',pitch=.26,pattern='plain'}={}){
 const mat=new THREE.MeshStandardMaterial({color,roughness:.76});
 mat.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 ceramicPosition;\nvarying vec3 ceramicNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nceramicPosition=(modelMatrix*vec4(position,1.0)).xyz;ceramicNormal=mat3(modelMatrix)*normal;');
  shader.fragmentShader='varying vec3 ceramicPosition;\nvarying vec3 ceramicNormal;\n'+shader.fragmentShader;
  const colors=pattern==='yellow'?'float motif=mod(cell.x+floor(cell.y/2.0),5.0); vec3 tile=motif<2.0?vec3(.91,.66,.16):vec3(.91,.89,.80); diffuseColor.rgb=tile;':'';
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 ceramicUV=${axes==='auto'?'(abs(ceramicNormal.y)>.5?ceramicPosition.xz:abs(ceramicNormal.x)>.5?ceramicPosition.zy:ceramicPosition.xy)':`ceramicPosition.${axes}`}/${pitch.toFixed(3)};
   vec2 cell=floor(ceramicUV);vec2 joint=fract(ceramicUV);
   ${colors}
   float groutLine=1.0-smoothstep(.014,.035,min(min(joint.x,1.0-joint.x),min(joint.y,1.0-joint.y)));
   diffuseColor.rgb*=1.0-.40*groutLine;
   diffuseColor.rgb*=.97+.03*sin(cell.x*13.1+cell.y*8.7);
  `);
 };
 mat.customProgramCacheKey=()=>`ceramics-${axes}-${pitch}-${pattern}`;
 return mat;
}
