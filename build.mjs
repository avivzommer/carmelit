import {mkdir,copyFile,cp,readdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist');
for(const name of await readdir('.')){
 if((/\.(js|mjs|html|css)$/.test(name))&&!name.endsWith('.test.mjs')&&name!=='build.mjs')await copyFile(name,`dist/${name}`);
}
await cp('vendor','dist/vendor',{recursive:true});
