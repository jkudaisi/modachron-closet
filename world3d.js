import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

const root=document.documentElement;
init();
async function init(){
const MC=window.MC||{t:0,stop:0,look:0};
const cv=document.getElementById('world');
const Q=new URLSearchParams(location.search);
const mobile=matchMedia('(max-width: 760px)').matches||matchMedia('(pointer: coarse)').matches;
let r;
try{r=new THREE.WebGLRenderer({canvas:cv,antialias:!mobile&&!Q.has('q'),powerPreference:'high-performance'})}catch(e){root.classList.add('lite');return}
const maxDpr=Math.min(devicePixelRatio,mobile?1.5:1.75);let dpr=maxDpr;r.setPixelRatio(dpr);
r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.0;
r.shadowMap.enabled=!mobile&&!Q.has('q');r.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0d0b09);scene.fog=new THREE.Fog(0x0d0b09,10,24);
const pm=new THREE.PMREMGenerator(r);
scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.3;
if(!mobile&&!Q.has('nohdr'))new RGBELoader().load('hdri/lounge_1k.hdr',t=>{const e=pm.fromEquirectangular(t).texture;t.dispose();scene.environment=e;scene.environmentIntensity=.55});
const cam=new THREE.PerspectiveCamera(mobile?60:44,1,.05,60);
const clock=new THREE.Clock();
const U={uTime:{value:0},uWind:{value:0}};
const groups=[];for(let i=0;i<9;i++){const g=new THREE.Group();scene.add(g);groups.push(g)}
const draco=new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
const gl=new GLTFLoader().setDRACOLoader(draco);
const loadGLB=u=>new Promise((res,rej)=>gl.load(u,g=>res(g.scene),undefined,rej));
const firstGeo=o=>{let g=null;o.traverse(m=>{if(m.isMesh&&!g)g=m.geometry});return g};

// ---------- PBR textures (Poly Haven CC0) ----------
const TS=(mobile||Q.has('t512'))?512:1024;const tl=new THREE.TextureLoader();const texCache={};
function pbr(name,rep=1,color=0xffffff,extra={}){if(Q.has('notex'))return new THREE.MeshStandardMaterial({color,...extra});
  const ld=(k,srgb)=>{const key=name+k;if(!texCache[key]){const t=tl.load(`tex/${name}_${k}_${TS}.webp`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Q.has('an1')?1:(mobile?2:8);if(srgb)t.colorSpace=THREE.SRGBColorSpace;texCache[key]=t}const t=texCache[key];return t};
  const m=new THREE.MeshStandardMaterial({map:Q.has('nodiff')?null:ld('diff',1),normalMap:Q.has('nonor')?null:ld('nor'),roughnessMap:Q.has('rmap')?ld('rough'):null,color,...extra});
  m.userData.rep=rep;[m.map,m.normalMap,m.roughnessMap].forEach(t=>t&&t.repeat.set(rep,rep));return m}
function sway(m,amp=1){m.onBeforeCompile=s=>{s.uniforms.uTime=U.uTime;s.uniforms.uWind=U.uWind;
  s.vertexShader='uniform float uTime;uniform float uWind;\n'+s.vertexShader.replace('#include <begin_vertex>',
  `#include <begin_vertex>
   float hem=clamp(-position.y,0.,1.2);
   #ifdef USE_INSTANCING
   float ph=instanceMatrix[3].z*3.1+instanceMatrix[3].x;
   #else
   float ph=0.;
   #endif
   transformed.x+=(sin(uTime*1.3+ph+position.y*2.)*0.006+uWind*0.025)*hem*${amp.toFixed(2)};
   transformed.z+=cos(uTime*1.1+ph*1.3)*0.005*hem*${amp.toFixed(2)};`)};m.customProgramCacheKey=()=>'sway'+amp;return m}
const walnut=pbr('black_walnut_veneer_01',2.5,0x6e5444,{roughness:.55});
const walnutDark=pbr('black_walnut_veneer_01',2.5,0x4a3830,{roughness:.5});
const interior=new THREE.MeshStandardMaterial({color:0x17120e,roughness:.7});
const brass=new THREE.MeshStandardMaterial({color:0xd9a441,metalness:1,roughness:.25});
const chrome=new THREE.MeshStandardMaterial({color:0xcfc8bc,metalness:1,roughness:.18});
const led=new THREE.MeshBasicMaterial({color:0xffd29a,toneMapped:false});
const FABRIC={tee:['cotton_jersey',2.2],longsleeve:['jersey_melange',2.2],hoodie:['knitted_fleece',2],jacket:['denim_fabric',2],coat:['caban',2],dress:['rough_linen',2.2],skirt:['ribbed_corduroy',2.4],pants:['denim_fabric',2]};
const fabMat={};for(const k in FABRIC){fabMat[k]=sway(pbr(FABRIC[k][0],FABRIC[k][1],0xffffff,{side:THREE.DoubleSide,roughness:1}),k==='coat'||k==='jacket'?.5:1)}
const PAL={tee:[0xf3efe7,0x2b2b2b,0xc9b79c,0x6e7f96,0xd9c9b0,0x8a3b2e],longsleeve:[0xbfb6a8,0x3d4a5c,0xe8e2d6,0x5a6b4f],hoodie:[0x9a9490,0x2f3b2f,0xd8cdb8,0x3a3a40],jacket:[0x8fa3c0,0x3b4a63,0x2a2a2e,0xc9b48a],coat:[0x6b5a48,0x2d3440,0x1d1d1f,0xb9a48a,0x5a2330],dress:[0x1c1c1c,0xd8c4a8,0x6b2433,0x9aa38a],skirt:[0x6b4a34,0x2b2b2b,0xc9a86b],pants:[0x3b4a63,0x2a2a2e,0x8fa3c0,0xb9ad98]};

// ---------- room shell ----------
const W=3.2,Z0=6,Z1=-24,H=3;
const floorM=pbr('herringbone_parquet',1,0x8c735f,{roughness:.6});[floorM.map,floorM.normalMap].forEach(t=>t&&t.repeat.set(3,15));
const floor=new THREE.Mesh(new THREE.PlaneGeometry(W*2,Z0-Z1),floorM);floor.rotation.x=-Math.PI/2;floor.position.z=(Z0+Z1)/2;floor.receiveShadow=true;scene.add(floor);
const ceilM=new THREE.MeshStandardMaterial({color:0x2a2622,roughness:.95});
const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W*2,Z0-Z1),ceilM);ceil.rotation.x=Math.PI/2;ceil.position.set(0,H,(Z0+Z1)/2);scene.add(ceil);
const wallM=new THREE.MeshStandardMaterial({color:0x221d18,roughness:.9});
[-W,W].forEach(x=>{const w=new THREE.Mesh(new THREE.PlaneGeometry(Z0-Z1,H),wallM);w.position.set(x,H/2,(Z0+Z1)/2);w.rotation.y=x<0?Math.PI/2:-Math.PI/2;scene.add(w)});
const backW=new THREE.Mesh(new THREE.PlaneGeometry(W*2,H),wallM);backW.position.set(0,H/2,Z1);scene.add(backW);
// recessed downlights
const dlGeo=new THREE.CircleGeometry(.06,20);const dl=new THREE.InstancedMesh(dlGeo,led,40);{let k=0;const m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0));
 for(let z=Z0-1;z>Z1;z-=1.5)for(const x of[-1.1,1.1]){if(k<40){m.compose(new THREE.Vector3(x,H-.005,z),q,new THREE.Vector3(1,1,1));dl.setMatrixAt(k++,m)}}dl.count=k}scene.add(dl);
// cove LED along ceiling edge
[-W+.62,W-.62].forEach(x=>{const s=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,Z0-Z1),led);s.position.set(x,H-.02,(Z0+Z1)/2);scene.add(s)});
scene.add(new THREE.HemisphereLight(0xfff1e0,0x20160f,.25));
const pts=[0,1].map(()=>{const p=new THREE.PointLight(0xffd6a8,7,7,2);scene.add(p);return p});
const key=new THREE.SpotLight(0xfff0dc,14,9,.6,.8,1.4);key.position.set(0,H-.05,4);key.castShadow=!mobile;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0003;key.shadow.radius=4;scene.add(key);scene.add(key.target);

// ---------- cabinetry (instanced) ----------
const DEPTH=.6,UW=1.0,UH=2.6;
const parts={};const M4=new THREE.Matrix4(),QQ=new THREE.Quaternion(),VV=new THREE.Vector3(),SS=new THREE.Vector3(1,1,1);
function addPart(name,geo,mat,mtx,col){(parts[name]=parts[name]||{geo,mat,list:[]}).list.push([mtx.clone(),col])}
function flushParts(){for(const k in parts){const p=parts[k];const im=new THREE.InstancedMesh(p.geo,p.mat,p.list.length);p.list.forEach(([m,c],i)=>{im.setMatrixAt(i,m);if(c!=null)im.setColorAt(i,new THREE.Color(c))});im.castShadow=false;im.receiveShadow=true;scene.add(im);p.mesh=im}}
const G={side:new THREE.BoxGeometry(DEPTH,UH,.025),shelf:new THREE.BoxGeometry(DEPTH-.02,.025,UW-.03),back:new THREE.BoxGeometry(.02,UH,UW),rod:new THREE.CylinderGeometry(.013,.013,UW-.04,10),
 drawer:new RoundedBoxGeometry(.04,.22,UW-.05,2,.008),handle:new THREE.BoxGeometry(.03,.012,.22),ledbar:new THREE.BoxGeometry(.015,.008,UW-.06),
 fold:new RoundedBoxGeometry(.34,.07,.3,1,.025),shoebox:new RoundedBoxGeometry(.32,.12,.2,1,.006),shoeshelf:new THREE.BoxGeometry(DEPTH-.06,.02,UW-.04)};
const foldM=pbr('jersey_melange',1.6,0xffffff,{roughness:1});
const boxM=new THREE.MeshStandardMaterial({color:0xd8c9b0,roughness:.8});
// hanging garments collected in chunks
const garmentSlots=[];// {type,mtx,col,chunk}
function hang(type,x,y,z,facing,col,chunk){const m=new THREE.Matrix4();QQ.setFromEuler(new THREE.Euler(0,facing+(Math.random()-.5)*.12,0));m.compose(VV.set(x,y,z),QQ,SS);garmentSlots.push({type,m,col,chunk})}
const rnd=(a)=>a[Math.floor(Math.random()*a.length)];
const SKIPR=[[-3.6,-6.4],[-18.6,-20.6]];// window, mirror on right wall
const PATTERN=['A','B','C','B','D','A','B','E'];
const dens=mobile?.17:.125;
const units=[];
[-1,1].forEach(side=>{let u=0;for(let zc=Z0-.8;zc>Z1+.5;zc-=UW,u++){
  if(side>0&&SKIPR.some(([a,b])=>zc<a&&zc>b))continue;
  if(side<0&&zc<-20.6&&zc>-22.4)continue;// lounge nook
  const type=PATTERN[(u+(side>0?3:0))%PATTERN.length];const x=side*(W-DEPTH/2);const facing=side<0?Math.PI/2:-Math.PI/2;const inner=side*(W-DEPTH);
  const chunk=Math.max(0,Math.min(8,Math.round((Z0-1.5-zc)/3.3)));
  units.push({zc,side,type});
  // carcass
  [zc+UW/2,zc-UW/2].forEach(z=>{M4.makeTranslation(x,UH/2,z);addPart('side',G.side,walnut,M4)});
  M4.makeTranslation(side*(W-.01),UH/2,zc);addPart('back',G.back,interior,M4);
  M4.makeTranslation(x,UH-.012,zc);addPart('shelf',G.shelf,walnut,M4);
  M4.makeTranslation(x,.06,zc);addPart('shelf',G.shelf,walnut,M4);
  M4.makeTranslation(inner+side*.02,UH-.04,zc);addPart('led',G.ledbar,led,M4);
  const rodAt=(y)=>{M4.makeRotationX(Math.PI/2).setPosition(x,y,zc);addPart('rod',G.rod,chrome,M4)};
  if(type==='A'){rodAt(2.05);const ty=['coat','dress','coat','dress'];for(let z=zc+UW/2-.08;z>zc-UW/2+.05;z-=dens*1.1)hang(rnd(ty),x,2.04,z,facing,rnd(PAL[ty[0]]),chunk)}
  if(type==='B'){rodAt(2.05);rodAt(1.05);M4.makeTranslation(x,1.6,zc);addPart('shelf',G.shelf,walnut,M4);
    const up=['tee','longsleeve','hoodie','jacket'],lo=['pants','skirt'];
    for(let z=zc+UW/2-.08;z>zc-UW/2+.05;z-=dens){const t=rnd(up);hang(t,x,2.04,z,facing,rnd(PAL[t]),chunk)}
    for(let z=zc+UW/2-.08;z>zc-UW/2+.05;z-=dens*1.2){const t=rnd(lo);hang(t,x,1.04,z,facing,rnd(PAL[t]),chunk)}}
  if(type==='C'){for(let s=0;s<6;s++){const y=.42+s*.36;M4.makeTranslation(x,y,zc);addPart('shelf',G.shelf,walnut,M4);
    for(const dz of[-.3,0,.3]){const n=1+Math.floor(Math.random()*4);const c=rnd([0xf3efe7,0xc9b79c,0x3d4a5c,0x6da87f,0x8a7a66,0x2b2b2b,0xd8cdb8,0x5a2330,0x9aa38a]);
      for(let k=0;k<n;k++){M4.makeRotationY((Math.random()-.5)*.08).setPosition(x+side*.02,y+.05+k*.072,zc+dz);addPart('fold',G.fold,foldM,M4,new THREE.Color(c).offsetHSL(0,0,(Math.random()-.5)*.05).getHex())}}}}
  if(type==='D'){for(let s=0;s<5;s++){const y=.3+s*.42;const m=new THREE.Matrix4().makeRotationZ(side*-.18).setPosition(x,y,zc);addPart('sshelf',G.shoeshelf,walnut,m);
      for(const dz of[-.24,.24])units.push({shoe:true,x:x+side*.03,y:y+.05,z:zc+dz,side});}
    for(const dz of[-.25,.25]){M4.makeTranslation(x,UH-.09,zc+dz);addPart('sbox',G.shoebox,boxM,M4)}}
  if(type==='E'){for(let s=0;s<4;s++){M4.makeTranslation(inner+side*.02,.2+s*.24,zc);addPart('drawer',G.drawer,walnut,M4);M4.makeTranslation(inner-side*.005,.24+s*.24,zc);addPart('handle',G.handle,brass,M4)}
    M4.makeTranslation(x,1.08,zc);addPart('shelf',G.shelf,walnut,M4);rodAt(2.05);for(let z=zc+UW/2-.08;z>zc-UW/2+.05;z-=dens){const t=rnd(['tee','longsleeve']);hang(t,x,2.04,z,facing,rnd(PAL[t]),chunk)}}
}});
flushParts();

// garments: per chunk InstancedMeshes with hi/lo geometry
const TYPES=Object.keys(FABRIC);const GEO={},GEOLO={};
await Promise.all(TYPES.map(async t=>{GEO[t]=firstGeo(await loadGLB(`models/garments/${t}.glb`));GEOLO[t]=firstGeo(await loadGLB(`models/garments/${t}_lo.glb`))}));
const hangerGLB=await loadGLB('models/props/hanger.glb');const hangerGeo=[];hangerGLB.traverse(m=>m.isMesh&&hangerGeo.push(m.geometry));
const hangerWood=walnutDark;
const chunks=[];
for(let c=0;c<9;c++){const g=new THREE.Group();scene.add(g);const ch={g,meshes:[],center:new THREE.Vector3()};chunks.push(ch);
  const slots=garmentSlots.filter(s=>s.chunk===c);if(!slots.length)continue;
  let zs=0;slots.forEach(s=>zs+=s.m.elements[14]);ch.center.set(0,1.5,zs/slots.length);
  TYPES.forEach(t=>{const L=slots.filter(s=>s.type===t);if(!L.length)return;const im=new THREE.InstancedMesh(GEO[t],fabMat[t],L.length);
    L.forEach((s,i)=>{im.setMatrixAt(i,s.m);im.setColorAt(i,new THREE.Color(s.col))});im.receiveShadow=true;g.add(im);ch.meshes.push({im,t})});
  // hangers
  hangerGeo.forEach((hg,hi)=>{const im=new THREE.InstancedMesh(hg,hi===0?hangerWood:chrome,slots.length);slots.forEach((s,i)=>{const m=s.m.clone();m.multiply(new THREE.Matrix4().makeTranslation(0,.0,0));im.setMatrixAt(i,m)});g.add(im)})}
// shoes on D shelves
loadGLB('models/props/rubber_boots.glb').then(o=>{const L=units.filter(u=>u.shoe);const subs=[];o.updateMatrixWorld(true);o.traverse(m=>m.isMesh&&subs.push(m));
  const b=new THREE.Box3().setFromObject(o),sz=new THREE.Vector3();b.getSize(sz);const k=.3/Math.max(sz.x,sz.z);
  subs.forEach(sm=>{const im=new THREE.InstancedMesh(sm.geometry,sm.material,L.length);L.forEach((u,i)=>{const m=new THREE.Matrix4().compose(new THREE.Vector3(u.x,u.y-b.min.y*k,u.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,u.side<0?Math.PI/2:-Math.PI/2,u.side*-.18)),new THREE.Vector3(k,k,k));m.multiply(sm.matrixWorld);im.setMatrixAt(i,m)});scene.add(im)})}).catch(()=>{});
// decor on top of some units
const decor=[['wicker_basket_02',.35],['vintage_suitcase',.5],['fishermans_hat',.3]];
decor.forEach(([n,s],di)=>loadGLB(`models/props/${n}.glb`).then(o=>{const b=new THREE.Box3().setFromObject(o),sz=new THREE.Vector3();b.getSize(sz);const k=s/Math.max(sz.x,sz.z);
  units.filter((u,i)=>!u.shoe&&u.type&&(i+di*3)%7===0).slice(0,mobile?3:6).forEach(u=>{const c=o.clone(true);c.scale.setScalar(k);c.position.set(u.side*(W-DEPTH/2),UH-b.min.y*k,u.zc+(Math.random()-.5)*.3);c.rotation.y=Math.random()*6;scene.add(c)})}).catch(()=>{}));

// ---------- stop 0: dress form + real draped looks ----------
const MAN=new THREE.Vector3(mobile?0:.85,0,2.2);
const man=new THREE.Group();man.position.copy(MAN);man.rotation.y=-.25;groups[0].add(man);
const formM=pbr('rough_linen',1.5,0xe6dccb,{roughness:1});
const formGLB=await loadGLB('models/man/dressform.glb');const formGeo=firstGeo(formGLB);
const form=new THREE.Mesh(formGeo,formM);form.castShadow=true;man.add(form);
{const cap=new THREE.Mesh(new THREE.SphereGeometry(.05,20,12),brass);cap.position.y=1.82;man.add(cap);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.82,12),brass);pole.position.y=.41;man.add(pole);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.22,.26,.035,40),walnutDark);base.position.y=.018;base.castShadow=true;man.add(base);
 const rug=new THREE.Mesh(new THREE.CircleGeometry(1.25,64),pbr('wool_boucle',3,0xd9cbb6,{roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.y=.004;rug.receiveShadow=true;man.add(rug)}
const LOOKMAT=[['caban',0x9aa0a8],['cotton_jersey',0xf1ece2],['knitted_fleece',0x8a8f86],['rough_linen',0x1e1e22]];
const looks=[];
await Promise.all([0,1,2,3].map(async i=>{const o=await loadGLB(`models/man/look${i}.glb`);const m=pbr(LOOKMAT[i][0],2.2,LOOKMAT[i][1],{side:THREE.DoubleSide,roughness:1});
  o.traverse(c=>{if(c.isMesh){c.material=m;c.castShadow=true;c.receiveShadow=true}});o.visible=false;man.add(o);looks[i]={o,w:0,tw:0}}));
// boots for rain look
let rainBoots=null;loadGLB('models/props/rubber_boots.glb').then(o=>{const b=new THREE.Box3().setFromObject(o),sz=new THREE.Vector3();b.getSize(sz);const k=.32/Math.max(sz.x,sz.z);o.scale.setScalar(k);o.position.set(.42,-b.min.y*k,.25);o.rotation.y=-.6;man.add(o);rainBoots=o}).catch(()=>{});
let curLook=0;looks[0].tw=1;
function setLook(n){curLook=n;looks.forEach((l,i)=>l.tw=i===n?1:0)}
addEventListener('mc-look',e=>setLook(e.detail));setLook(MC.look||0);
function updateMannequin(dt){looks.forEach(l=>{const sp=l.tw>l.w?1.6:2.6;l.w+=(l.tw-l.w)*Math.min(1,dt*sp);const e=l.w*l.w*(3-2*l.w);l.o.visible=l.w>.02;
  l.o.position.y=(1-e)*(l.tw>0?.55:.35);l.o.scale.setScalar(.97+.03*e)});if(rainBoots)rainBoots.visible=curLook===0}
// a freestanding rail behind the form with real garments
{const rail=new THREE.Group();rail.position.set(MAN.x-.2,0,MAN.z-1.7);groups[0].add(rail);
 [-.9,.9].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,1.75,10),brass);p.position.set(x,.875,0);rail.add(p);const f=new THREE.Mesh(new THREE.BoxGeometry(.04,.02,.5),brass);f.position.set(x,.01,0);rail.add(f)});
 const bar=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,1.84,10),brass);bar.rotation.z=Math.PI/2;bar.position.y=1.75;rail.add(bar);
 ['coat','tee','hoodie','dress','jacket','longsleeve'].forEach((t,i)=>{const m=new THREE.Mesh(GEO[t],fabMat[t].clone());m.material.color.set(PAL[t][i%PAL[t].length]);m.position.set(-.75+i*.3,1.74,0);m.rotation.y=Math.PI/2+(Math.random()-.5)*.2;m.receiveShadow=true;m.castShadow=!mobile;rail.add(m);
  hangerGeo.forEach((hg,hi)=>{const h=new THREE.Mesh(hg,hi?chrome:hangerWood);h.position.copy(m.position);h.rotation.copy(m.rotation);rail.add(h)})})}

// ---------- stop 1: 3D swipe deck on a walnut table ----------
const TABLE=new THREE.Vector3(mobile?-.6:-1.3,0,-1.2);
{const top=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.04,48),walnut);top.position.set(TABLE.x,.78,TABLE.z);top.receiveShadow=true;top.castShadow=true;groups[1].add(top);
 const leg=new THREE.Mesh(new THREE.CylinderGeometry(.04,.14,.76,20),brass);leg.position.set(TABLE.x,.38,TABLE.z);groups[1].add(leg)}
const lookTex=(MC.looks||[]).map(L=>{const t=tl.load('img/'+L.img+'.webp');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t});
const cardGeo=new RoundedBoxGeometry(.36,.48,.008,2,.004);const edgeM=new THREE.MeshStandardMaterial({color:0xf3efe7,roughness:.6});
const cards=[];let deckIdx=0;
for(let i=0;i<4;i++){const mats=[edgeM,edgeM,edgeM,edgeM,new THREE.MeshStandardMaterial({map:lookTex[deckIdx%lookTex.length],roughness:.5}),edgeM];
  const c=new THREE.Mesh(new THREE.BoxGeometry(.36,.48,.008),mats);c.userData={li:deckIdx++,state:'stack',v:new THREE.Vector3(),spin:0,dx:0};c.castShadow=true;groups[1].add(c);cards.unshift(c)}
function layoutStack(dt){cards.forEach((c,i)=>{const d=cards.length-1-i;if(c.userData.state!=='stack')return;
  const tp=new THREE.Vector3(TABLE.x,1.06+(cards.length-d)*.004,TABLE.z+.04-d*.012);c.position.lerp(tp,Math.min(1,dt*8));const dx=c.userData.dx;
  c.rotation.set(-.3,.42+(d?d*.03:dx*.6),d?(d%2?.04:-.03):-dx*.35);c.position.x+=d?0:dx*.45;c.position.y+=d?0:Math.abs(dx)*.07;
  const em=c.material[4].emissive;if(!d){if(dx>=0)em.setRGB(dx*.15,dx*.35,dx*.1);else em.setRGB(-dx*.5,-dx*.1,-dx*.08)}else em.setRGB(0,0,0)})}
function fling(dir){const c=cards[cards.length-1];if(!c||c.userData.state!=='stack')return;c.userData.state='fly';
  const right=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0);c.userData.v.copy(right).multiplyScalar(dir*3.6).add(new THREE.Vector3(0,1.4,-.5));c.userData.spin=dir*5;c.userData.life=0;
  const L=MC.looks&&MC.looks[c.userData.li%MC.looks.length];if(L&&MC.apply)MC.apply(L,dir)}
function updateCards(dt){layoutStack(dt);cards.slice().forEach(c=>{if(c.userData.state!=='fly')return;const u=c.userData;u.life+=dt;
  c.position.addScaledVector(u.v,dt);u.v.y-=4.5*dt;c.rotation.z-=u.spin*dt*.6;c.rotation.y+=u.spin*dt*.4;
  if(u.life>1.1){u.state='stack';u.dx=0;c.material[4].map=lookTex[deckIdx%lookTex.length];u.li=deckIdx++;c.material[4].needsUpdate=true;cards.splice(cards.indexOf(c),1);cards.unshift(c);c.position.set(TABLE.x,.95,TABLE.z)}})}
addEventListener('mc-swipe',e=>fling(e.detail));
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let drag=null;const mouse={x:0,y:0,tx:0,ty:0};
cv.style.touchAction='pan-y';
const pick=e=>{ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,cam);return ray};
document.addEventListener('pointerdown',e=>{if(e.target!==cv&&!e.target.closest('.stop'))return;if(e.target.closest('.panel'))return;if(Math.abs(MC.t-1)>.6)return;const top=cards[cards.length-1];
  if(pick(e).intersectObject(top).length){drag={x:e.clientX};document.body.style.cursor='grabbing'}});
addEventListener('pointermove',e=>{mouse.tx=e.clientX/innerWidth*2-1;mouse.ty=e.clientY/innerHeight*2-1;
  if(drag){cards[cards.length-1].userData.dx=Math.max(-1.2,Math.min(1.2,(e.clientX-drag.x)/220))}
  else if(Math.abs(MC.t-1)<.6&&!mobile){document.body.style.cursor=pick(e).intersectObject(cards[cards.length-1]).length?'grab':''}},{passive:true});
addEventListener('pointerup',()=>{if(!drag)return;const top=cards[cards.length-1],dx=top.userData.dx;drag=null;document.body.style.cursor='';if(Math.abs(dx)>.45)fling(Math.sign(dx));else top.userData.dx=0});

// ---------- stop 2: weather window ----------
const WIN=new THREE.Vector3(W-.02,1.55,-5);
const skyM=new THREE.ShaderMaterial({uniforms:{uTime:U.uTime,uMode:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform float uTime;uniform float uMode;varying vec2 vUv;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
 void main(){vec3 rain=mix(vec3(.16,.18,.21),vec3(.36,.39,.44),vUv.y);vec3 sun=mix(vec3(.98,.78,.48),vec3(.42,.64,.92),vUv.y);vec3 snow=mix(vec3(.66,.7,.76),vec3(.86,.88,.92),vUv.y);vec3 eve=mix(vec3(.5,.22,.14),vec3(.06,.06,.16),vUv.y);
 float m=uMode;vec3 c=m<1.?mix(rain,sun,m):m<2.?mix(sun,snow,m-1.):mix(snow,eve,min(m-2.,1.));
 c+=vec3(1.,.85,.5)*smoothstep(.1,.0,distance(vUv,vec2(.68,.74)))*(1.-min(1.,abs(m-1.)));
 float sky=vUv.y-.18-.05*sin(vUv.x*7.)-.03*sin(vUv.x*23.);float bld=step(sky,0.)+step(vUv.y,.34)*step(.5,fract(vUv.x*9.))*step(.2,h(vec2(floor(vUv.x*9.),1.)));
 vec3 city=c*.28;float win=step(.85,h(floor(vUv*vec2(90.,60.))))*max(.15,max(0.,m-2.)*1.3);c=mix(c,city+vec3(1.,.8,.5)*win*.6,clamp(bld,0.,1.));
 c+=step(.997,h(floor(vUv*160.)))*max(0.,m-2.);gl_FragColor=vec4(c,1.);}`});
{const g=groups[2];const sky=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.2),skyM);sky.position.copy(WIN);sky.rotation.y=-Math.PI/2;g.add(sky);
 const fr=walnutDark;[[0,1.12,2.7,.1],[0,-1.12,2.7,.1],[1.3,0,.1,2.3],[-1.3,0,.1,2.3],[0,0,.05,2.25],[0,.3,2.6,.04]].forEach(([z,y,w,h])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(.14,h,w),fr);b.position.set(WIN.x-.06,WIN.y+y,WIN.z+z);g.add(b)});
 const sill=new THREE.Mesh(new THREE.BoxGeometry(.4,.04,2.8),walnut);sill.position.set(WIN.x-.2,WIN.y-1.16,WIN.z);g.add(sill);
 const glass=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.2),new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.08,roughness:.05,metalness:0}));glass.position.set(WIN.x-.04,WIN.y,WIN.z);glass.rotation.y=-Math.PI/2;g.add(glass)}
const NP=mobile?400:1000,pg=new THREE.BufferGeometry(),pp=new Float32Array(NP*3);for(let i=0;i<NP;i++){pp[i*3]=WIN.x+.03;pp[i*3+1]=WIN.y+(Math.random()-.5)*2.1;pp[i*3+2]=WIN.z+(Math.random()-.5)*2.5}
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));const ptM=new THREE.PointsMaterial({color:0xcfd8e6,size:.014,transparent:true,opacity:.7,depthWrite:false});const precip=new THREE.Points(pg,ptM);groups[2].add(precip);
const shaft=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.4,4,24,1,true),new THREE.MeshBasicMaterial({color:0xffd89a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
shaft.position.set(WIN.x-1.8,.9,WIN.z);shaft.rotation.z=-Math.PI/2.5;groups[2].add(shaft);
// garment on a wall hook beside the window, swaps with weather
const wxT=[['coat',0x4a5568],['tee',0xf1ece2],['hoodie',0x8a8f86],['dress',0x1e1e22]];
const wxG=wxT.map(([t,c])=>{const m=new THREE.Mesh(GEO[t],fabMat[t].clone());m.material.color.set(c);m.position.set(W-.22,2.0,WIN.z+1.75);m.rotation.y=-Math.PI/2+.5;m.castShadow=!mobile;groups[2].add(m);
  hangerGeo.forEach((hg,hi)=>{const h=new THREE.Mesh(hg,hi?chrome:hangerWood);m.add(h)});return m});
{const hk=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.25,8),brass);hk.rotation.z=Math.PI/2;hk.position.set(W-.12,2.1,WIN.z+1.75);groups[2].add(hk)}
let wxShown=0;
function updateWeather(dt,t){const near=Math.abs(MC.t-2)<1.2;const target=near?Math.floor((t/3.2)%4):0;
  wxShown+=(target-wxShown)*(Math.abs(target-wxShown)>2?1:Math.min(1,dt*2));skyM.uniforms.uMode.value=wxShown;
  const snow=target===2,rain=target===0;ptM.opacity=rain||snow?.7:0;ptM.size=snow?.03:.012;
  const a=pg.attributes.position;for(let i=0;i<NP;i++){let y=a.getY(i)-dt*(snow?.3:2.4);if(y<WIN.y-1.05)y=WIN.y+1.05;a.setY(i,y)}a.needsUpdate=true;
  shaft.material.opacity+=(((target===1)?.06:0)-shaft.material.opacity)*dt*3;
  wxG.forEach((m,i)=>{const s=THREE.MathUtils.lerp(m.scale.x,i===target?1:.001,Math.min(1,dt*5));m.scale.setScalar(s);m.visible=s>.01})}

// ---------- stop 3: closet island with drawers + phone ----------
function screenTex(draw){const c=document.createElement('canvas');c.width=256;c.height=520;const x=c.getContext('2d');const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.userData={x,draw};draw(x,0);t.needsUpdate=true;return t}
function rr(x,X,Y,W_,H_,R){x.beginPath();x.roundRect(X,Y,W_,H_,R);x.fill()}
const calTex=screenTex((x,k)=>{x.fillStyle='#232323';x.fillRect(0,0,256,520);x.fillStyle='#fff';x.font='700 22px Inter,sans-serif';x.fillText('Calendar',20,62);x.fillStyle='#9a9a9a';x.font='13px Inter,sans-serif';x.fillText('Plan your week',20,82);
  x.fillStyle='#2f2f2f';rr(x,14,100,228,62,14);['M','T','W','T','F','S','S'].forEach((d,i)=>{const on=i===k%4+1;if(on){x.fillStyle='#FFBB00';rr(x,20+i*32,106,28,50,10)}x.fillStyle=on?'#141414':'#bbb';x.font='11px Inter';x.fillText(d,30+i*32,124);x.font='700 14px Inter';x.fillText(String(10+i),27+i*32,146)});
  const ev=[['2:00 PM','Work meeting'],['7:30 PM','Dinner'],['9:00 AM','Travel day'],['11:00 AM','Brunch']][k%4];x.fillStyle='#2f2f2f';rr(x,14,176,228,70,14);x.fillStyle='#6da87f';x.fillRect(24,188,4,46);x.fillStyle='#FFBB00';x.font='600 12px Inter';x.fillText(ev[0],38,200);x.fillStyle='#fff';x.font='700 17px Inter';x.fillText(ev[1],38,224);
  x.fillStyle='#2f2f2f';rr(x,14,260,228,200,16);x.fillStyle='#4a5568';rr(x,60,280,70,100,10);x.fillStyle='#f1ece2';rr(x,140,290,56,70,8);x.fillStyle='#fff';x.font='600 12px Inter';x.fillText('Planned outfit',24,486)});
function phone(tex){const g=new THREE.Group();const body=new THREE.Mesh(new RoundedBoxGeometry(.075,.155,.008,2,.006),new THREE.MeshStandardMaterial({color:0x1a1a1a,metalness:.8,roughness:.25}));g.add(body);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(.068,.146),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));scr.position.z=.0045;g.add(scr);return g}
const ISL=new THREE.Vector3(mobile?0:-.3,0,-9);
const island=new THREE.Group();island.position.copy(ISL);groups[3].add(island);
const drawers=[];
{const body=new THREE.Mesh(new RoundedBoxGeometry(1.5,.88,.75,2,.01),walnutDark);body.position.y=.46;body.castShadow=true;body.receiveShadow=true;island.add(body);
 const plinth=new THREE.Mesh(new THREE.BoxGeometry(1.44,.06,.7),interior);plinth.position.y=.03;island.add(plinth);
 const top=new THREE.Mesh(new THREE.BoxGeometry(1.56,.03,.81),new THREE.MeshPhysicalMaterial({color:0x1a1612,roughness:.05,metalness:0,clearcoat:1,transmission:0}));top.position.y=.915;island.add(top);
 const days=['M','T','W','T','F','S','S'];
 for(let i=0;i<4;i++){const d=new THREE.Group();d.position.set(0,.2+i*.2,.38);island.add(d);
   const front=new THREE.Mesh(new RoundedBoxGeometry(1.42,.18,.03,2,.006),walnut);d.add(front);
   const pull=new THREE.Mesh(new THREE.BoxGeometry(.28,.014,.02),brass);pull.position.set(0,0,.024);d.add(pull);
   const tray=new THREE.Mesh(new THREE.BoxGeometry(1.36,.14,.6),interior);tray.position.set(0,-.01,-.31);d.add(tray);
   const colors=[[0xf1ece2,0x8fa3c0,0x2b2b2b],[0xc9b79c,0x5a2330,0xe8e2d6],[0x3d4a5c,0xd8cdb8,0x6da87f],[0x1e1e22,0xb9a48a,0xf3efe7]][i];
   colors.forEach((c,j)=>{const f=new THREE.Mesh(G.fold,foldM.clone());f.material.color.set(c);f.rotation.y=Math.PI/2;f.position.set(-.42+j*.42,.03,-.3);d.add(f)});
   drawers.push(d)}
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,.05,20),brass);lamp.position.set(.55,.955,-.15);island.add(lamp)}
const calPhone=phone(calTex);calPhone.position.set(-.1,.935,.05);calPhone.rotation.set(-Math.PI/2+.25,0,.25);calPhone.scale.setScalar(2.1);island.add(calPhone);
let calK=0,calNext=0;
function updateCalendar(dt,t){const near=Math.abs(MC.t-3)<1.2;if(near&&t>calNext){calNext=t+2.6;calK++;calTex.userData.draw(calTex.userData.x,calK);calTex.needsUpdate=true}
  drawers.forEach((d,i)=>{d.position.z+=(((near&&calK%4===i)?.78:.38)-d.position.z)*Math.min(1,dt*3)})}

// ---------- stop 4: wear what you own (pieces slide off the wall rail) ----------
const WEAR=[{t:'jacket',c:0x8fa3c0},{t:'tee',c:0xf3efe7},{t:'pants',c:0x3b4a63}];
const wearG=WEAR.map((w,i)=>{const m=new THREE.Mesh(GEO[w.t],fabMat[w.t].clone());m.material.color.set(w.c);m.material.emissive=new THREE.Color(0);m.castShadow=!mobile;groups[4].add(m);
  hangerGeo.forEach((hg,hi)=>m.add(new THREE.Mesh(hg,hi?chrome:hangerWood)));
  m.userData.home=new THREE.Vector3(-W+DEPTH/2,i===2?1.04:2.04,-12.2-i*.35);m.userData.front=new THREE.Vector3(-1.1+i*.55,i===2?1.55:2.05,-11.6);return m});
const wearRail=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.9,10),brass);wearRail.rotation.z=Math.PI/2;wearRail.position.set(-.55,2.07,-11.6);groups[4].add(wearRail);
function updateWear(dt){const w=THREE.MathUtils.smoothstep(1-Math.abs(MC.t-4),0,.55);wearRail.scale.set(1,Math.max(.001,w),1);wearRail.visible=w>.05;
  wearG.forEach((m,i)=>{m.position.lerpVectors(m.userData.home,m.userData.front,w);m.rotation.y=THREE.MathUtils.lerp(Math.PI/2,0,w);m.material.emissive.setRGB(.05*w,.035*w,0)})}

// ---------- stop 5: ModaShop rail ----------
const SHOP=new THREE.Vector3(mobile?-.2:.6,0,-15.6);
function signTex(lines,w=512,h=256,bg='#FFBB00',fg='#141414'){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=bg;rr(x,0,0,w,h,28);x.fillStyle=fg;x.textAlign='center';
  lines.forEach(([t,f,y])=>{x.font=f;x.fillText(t,w/2,y)});const T=new THREE.CanvasTexture(c);T.colorSpace=THREE.SRGBColorSpace;return T}
let listedTag;
const shopTex=screenTex((x,k)=>{x.fillStyle='#232323';x.fillRect(0,0,256,520);x.fillStyle='#fff';x.font='700 22px Inter';x.fillText('ModaShop',20,62);x.fillStyle='#FFBB00';x.font='600 13px Inter';x.fillText('Coming soon',20,82);const step=k%4;
  if(step===0){['#4a5568','#2f6b47','#8fa3c0','#d8c7a3','#3b4a63','#2b2b2e'].forEach((c,i)=>{x.fillStyle='#2f2f2f';rr(x,16+(i%2)*116,100+Math.floor(i/2)*120,108,110,12);x.fillStyle=c;rr(x,44+(i%2)*116,122+Math.floor(i/2)*120,52,66,8)});x.fillStyle='#FFBB00';rr(x,22,226,56,20,6);x.fillStyle='#141414';x.font='800 11px Inter';x.fillText('Listed',32,240)}
  if(step===1){x.fillStyle='#2f2f2f';rr(x,16,100,224,300,16);x.fillStyle='#4a5568';rr(x,78,130,100,170,10);x.fillStyle='#fff';x.font='700 17px Inter';x.fillText('Sell Review',30,340);x.fillStyle='#9a9a9a';x.font='12px Inter';x.fillText('Keep or sell?',30,362);x.fillStyle='#6da87f';rr(x,140,420,90,40,20);x.fillStyle='#fff';x.font='700 14px Inter';x.fillText('Sell',170,446)}
  if(step===2){x.fillStyle='#2f2f2f';rr(x,16,100,224,250,16);x.fillStyle='#8fa3c0';rr(x,78,124,100,130,10);x.fillStyle='#fff';x.font='700 16px Inter';x.fillText('Denim jacket',30,290);x.fillStyle='#9a9a9a';x.font='12px Inter';x.fillText('Picked for your closet',30,312);x.fillStyle='#FFBB00';rr(x,16,366,224,40,14);x.fillStyle='#141414';x.font='800 14px Inter';x.fillText('Make an offer',78,392);x.fillStyle='#f3efe7';rr(x,16,420,224,54,12);x.fillStyle='#141414';x.font='700 13px Inter';x.fillText('New offer',30,442);x.font='12px Inter';x.fillText('Accept, decline or counter',30,462)}
  if(step===3){x.fillStyle='#6da87f';x.beginPath();x.arc(128,190,44,0,7);x.fill();x.fillStyle='#fff';x.font='900 44px Inter';x.fillText('\u2713',112,206);x.font='800 22px Inter';x.fillText('You sold it!',64,280);x.fillStyle='#bbb';x.font='12px Inter';x.fillText('Next, set up how you get paid.',38,304);x.fillStyle='#FFBB00';rr(x,40,330,176,40,14);x.fillStyle='#141414';x.font='800 13px Inter';x.fillText('Set up payouts',78,355)}});
{const base=new THREE.Group();base.position.copy(SHOP);base.rotation.y=.35;groups[5].add(base);
 [-.95,.95].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,1.9,10),brass);p.position.set(x,.95,0);base.add(p);const f=new THREE.Mesh(new THREE.BoxGeometry(.04,.02,.55),brass);f.position.set(x,.01,0);base.add(f)});
 const bar=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,1.94,10),brass);bar.rotation.z=Math.PI/2;bar.position.y=1.9;base.add(bar);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(.7,.35),new THREE.MeshBasicMaterial({map:signTex([['ModaShop','900 84px Montserrat, sans-serif',120],['COMING SOON','800 44px Montserrat, sans-serif',200]]),toneMapped:false}));sign.position.set(0,2.25,0);base.add(sign);
 const rail=[['jacket',0x8fa3c0],['tee',0xd8c7a3],['coat',0x4a5568],['skirt',0x5a2330],['hoodie',0x2f6b47],['dress',0xd8c4a8]];
 rail.forEach(([t,c],i)=>{const m=new THREE.Mesh(GEO[t],fabMat[t].clone());m.material.color.set(c);m.position.set(-.8+i*.32,1.89,0);m.rotation.y=Math.PI/2+(Math.random()-.5)*.2;m.castShadow=!mobile;base.add(m);
  hangerGeo.forEach((hg,hi)=>{const h=new THREE.Mesh(hg,hi?chrome:hangerWood);h.position.copy(m.position);h.rotation.copy(m.rotation);base.add(h)});
  if(i===2){listedTag=new THREE.Group();const tag=new THREE.Mesh(new THREE.PlaneGeometry(.12,.055),new THREE.MeshBasicMaterial({map:signTex([['Listed','900 120px Montserrat, sans-serif',170]],512,240),toneMapped:false,side:THREE.DoubleSide}));tag.position.y=-.05;listedTag.add(tag);
   listedTag.position.set(m.position.x,1.82,.2);base.add(listedTag)}});
 const sp=phone(shopTex);sp.position.set(1.25,1.25,.15);sp.rotation.y=-.3;sp.scale.setScalar(2.4);base.add(sp);
 const stand=new THREE.Mesh(new THREE.CylinderGeometry(.012,.1,1.07,12),brass);stand.position.set(1.25,.53,.15);base.add(stand)}
let shopK=0,shopNext=0;
function updateShop(dt,t){if(listedTag)listedTag.rotation.z=Math.sin(t*2.2)*.2;if(Math.abs(MC.t-5)<1.2&&t>shopNext){shopNext=t+2.6;shopK++;shopTex.userData.draw(shopTex.userData.x,shopK);shopTex.needsUpdate=true}}

// ---------- stop 6: full-length mirror ----------
const MIR=new THREE.Vector3(W-.45,0,-19.9);
const ringTex=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const T=new THREE.CanvasTexture(c);T.colorSpace=THREE.SRGBColorSpace;T.userData={x:c.getContext('2d')};return T})();
function drawRing(v){const x=ringTex.userData.x;x.clearRect(0,0,256,256);x.lineWidth=14;x.lineCap='round';x.strokeStyle='rgba(255,255,255,.18)';x.beginPath();x.arc(128,128,96,0,7);x.stroke();
  x.strokeStyle='#FFBB00';x.beginPath();x.arc(128,128,96,-Math.PI/2,-Math.PI/2+Math.PI*2*v*.71);x.stroke();x.fillStyle='#fff';x.textAlign='center';x.font='900 72px Montserrat, sans-serif';x.fillText(String(Math.round(71*v)),128,146);
  x.font='600 18px Inter';x.fillStyle='#FFBB00';x.fillText('EXAMPLE',128,188);ringTex.needsUpdate=true}
drawRing(0);
const mir=new THREE.Group();mir.position.copy(MIR);mir.rotation.y=-Math.PI/2+.75;groups[6].add(mir);
let glass;
{const fw=.9,fh=2.1;const frameM=walnutDark;
 [[0,fh+.04,fw+.12,.08],[0,.02,fw+.12,.06],[-(fw/2+.03),fh/2+.02,.06,fh+.08],[(fw/2+.03),fh/2+.02,.06,fh+.08]].forEach(([x,y,w,h])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,.06),frameM);b.position.set(x,y,0);b.castShadow=true;mir.add(b)});
 if(!mobile){glass=new Reflector(new THREE.PlaneGeometry(fw,fh),{textureWidth:512,textureHeight:1024,color:0xb8b2a8});}
 else glass=new THREE.Mesh(new THREE.PlaneGeometry(fw,fh),new THREE.MeshStandardMaterial({color:0x8d8a85,metalness:1,roughness:.04}));
 glass.position.set(0,fh/2+.04,.005);mir.add(glass);
 const ring=new THREE.Mesh(new THREE.PlaneGeometry(.32,.32),new THREE.MeshBasicMaterial({map:ringTex,transparent:true,toneMapped:false,depthWrite:false}));ring.position.set(.22,1.85,.02);mir.add(ring);
 const rug=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.1),pbr('wool_boucle',2.5,0xbfae96,{roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(MIR.x-1.2,.004,MIR.z);rug.receiveShadow=true;groups[6].add(rug)}
const man2=new THREE.Group();man2.position.set(MIR.x-1.15,0,MIR.z+.35);man2.rotation.y=Math.PI/2+.5;groups[6].add(man2);
{const f2=new THREE.Mesh(formGeo,formM);man2.add(f2);const p2=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.82,12),brass);p2.position.y=.41;man2.add(p2);const b2=new THREE.Mesh(new THREE.CylinderGeometry(.22,.26,.035,40),walnutDark);b2.position.y=.018;man2.add(b2)}
const man2Looks=looks.map(l=>{const c=l.o.clone(true);c.visible=false;man2.add(c);return c});
let ringV=0;
function updateMirror(dt){const tg=Math.abs(MC.t-6)<.7?1:0;const nv=ringV+(tg-ringV)*Math.min(1,dt*1.6);if(Math.abs(nv-ringV)>.002){ringV=nv;drawRing(ringV)}
  man2Looks.forEach((c,i)=>{c.visible=looks[i].o.visible;c.position.copy(looks[i].o.position);c.scale.copy(looks[i].o.scale)})}

// ---------- stop 7: creators lounge ----------
const LOUNGE=new THREE.Vector3(mobile?-.6:-1.7,0,-21.6);
{const g=groups[7];const rl=new THREE.Mesh(new THREE.TorusGeometry(.32,.025,12,64),new THREE.MeshBasicMaterial({color:0xfff3dc,toneMapped:false}));rl.position.set(LOUNGE.x-.7,1.55,LOUNGE.z-.5);rl.rotation.y=.7;g.add(rl);
 const st=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.22,8),chrome);st.position.set(LOUNGE.x-.7,.6,LOUNGE.z-.5);g.add(st);
 const ph=phone(signTex([['Creator','800 52px Montserrat',220],['program','800 52px Montserrat',290]],256,520,'#141414','#FFBB00'));ph.position.set(LOUNGE.x-.7,1.55,LOUNGE.z-.5);ph.rotation.y=.7;ph.scale.setScalar(2.4);g.add(ph);
 const pl=new THREE.PointLight(0xfff0d8,3,3.5,2);pl.position.set(LOUNGE.x-.4,1.5,LOUNGE.z-.2);g.add(pl);
 const rug=new THREE.Mesh(new THREE.CircleGeometry(1.3,64),pbr('wool_boucle',3,0xa89478,{roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(LOUNGE.x+.2,.005,LOUNGE.z+.2);rug.receiveShadow=true;g.add(rug)}

// ---------- lazy props near stops, disposed when far ----------
const lazy=[{n:'Ottoman_01',stop:7,size:.85,place:o=>o.position.set(LOUNGE.x+.25,0,LOUNGE.z+.25)},{n:'vintage_suitcase',stop:7,size:.6,place:o=>{o.position.set(LOUNGE.x+1.1,0,LOUNGE.z-.4);o.rotation.y=.8}},{n:'drawer_cabinet',stop:3,size:1.0,height:true,place:o=>{o.position.set(-W+.35,0,-7.4);o.rotation.y=Math.PI/2}}];
function disposeObj(o){o.traverse(m=>{if(m.isMesh){m.geometry.dispose();(Array.isArray(m.material)?m.material:[m.material]).forEach(mt=>{for(const k in mt)if(mt[k]&&mt[k].isTexture)mt[k].dispose();mt.dispose()})}})}
function updateLazy(){lazy.forEach(L=>{const near=Math.abs(MC.t-L.stop)<2.2;
  if(near&&!L.obj&&!L.loading){L.loading=true;loadGLB(`models/props/${L.n}.glb`).then(o=>{L.loading=false;if(Math.abs(MC.t-L.stop)>=2.2){disposeObj(o);return}
    const b=new THREE.Box3().setFromObject(o),sz=new THREE.Vector3();b.getSize(sz);const k=L.size/(L.height?sz.y:Math.max(sz.x,sz.z));o.scale.setScalar(k);L.place(o);o.position.y-=b.min.y*k;o.traverse(m=>{if(m.isMesh){m.castShadow=!mobile;m.receiveShadow=true}});scene.add(o);L.obj=o}).catch(()=>{L.loading=false})}
  if(!near&&L.obj&&Math.abs(MC.t-L.stop)>3.2){scene.remove(L.obj);disposeObj(L.obj);L.obj=null}})}

// ---------- camera path ----------
const S=[
 {c:[0,1.5,6.3],o:[MAN.x,1.3,MAN.z],s:1},
 {c:[.4,1.65,1.6],o:[TABLE.x,1.0,TABLE.z],s:-1},
 {c:[-.8,1.6,-2.2],o:[WIN.x,1.55,WIN.z+.3],s:1},
 {c:[1.9,1.55,-6.4],o:[ISL.x,.55,ISL.z],s:-1},
 {c:[.6,1.7,-9.4],o:[-.6,1.75,-11.8],s:1},
 {c:[-1.2,1.6,-12.6],o:[SHOP.x,1.45,SHOP.z],s:-1},
 {c:[-.9,1.55,-16.9],o:[MIR.x-.5,1.25,MIR.z+.2],s:1},
 {c:[.9,1.45,-18.6],o:[LOUNGE.x,1.0,LOUNGE.z],s:-1},
 {c:[0,6.2,7.5],o:[0,0,-8],s:0},
];
const camC=new THREE.CatmullRomCurve3(S.map(p=>new THREE.Vector3(...p.c)),false,'centripetal');
const tgts=S.map(p=>{const o=new THREE.Vector3(...p.o),c=new THREE.Vector3(...p.c);const fwd=o.clone().sub(c);const d=fwd.length();fwd.normalize();
  const right=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
  if(mobile)return o.clone().add(new THREE.Vector3(0,-d*.26,0));return o.clone().addScaledVector(right,-p.s*d*.24)});
if(mobile)camC.points.forEach((p,i)=>{if(i<8){const o=new THREE.Vector3(...S[i].o);p.copy(o.clone().add(p.clone().sub(o).multiplyScalar(1.12)))}});
const tgtC=new THREE.CatmullRomCurve3(tgts,false,'centripetal');
const camPos=new THREE.Vector3(),camTgt=new THREE.Vector3(),goalP=new THREE.Vector3(),goalT=new THREE.Vector3();
function pathAt(t){const n=S.length-1,f=Math.floor(t),fr=t-f;const e=fr*fr*fr*(fr*(fr*6-15)+10);const u=Math.min(n,f+e)/n;camC.getPoint(u,goalP);tgtC.getPoint(u,goalT)}
pathAt(MC.t);camPos.copy(goalP);camTgt.copy(goalT);

// ---------- post ----------
let usePost=false,composer=null,gtao=null,bokeh=null;
function size(){const w=innerWidth,h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();if(composer)composer.setSize(w,h)}
if(!mobile&&!Q.has('nopost')){composer=new EffectComposer(r);composer.addPass(new RenderPass(scene,cam));
  try{gtao=new GTAOPass(scene,cam,innerWidth/2,innerHeight/2);gtao.blendIntensity=.8;composer.addPass(gtao)}catch(e){gtao=null}
  bokeh=new BokehPass(scene,cam,{focus:4,aperture:.00012,maxblur:.004});composer.addPass(bokeh);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth/2,innerHeight/2),.32,.4,.92));composer.addPass(new OutputPass())}
size();addEventListener('resize',size);

// ---------- loop ----------
let lost=false;cv.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true});cv.addEventListener('webglcontextrestored',()=>{lost=false});
let lastScroll=scrollY,acc=0,fc=0,slow=0;window.__mcfps=[];
const fo3=new THREE.Vector3();
function frame(){const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;U.uTime.value=t;
  const sv=scrollY-lastScroll;lastScroll=scrollY;U.uWind.value+=(THREE.MathUtils.clamp(sv*.008,-1,1)+mouse.x*.25-U.uWind.value)*.05;
  mouse.x+=(mouse.tx-mouse.x)*.05;mouse.y+=(mouse.ty-mouse.y)*.05;
  pathAt(MC.t);camPos.lerp(goalP,Math.min(1,dt*3));camTgt.lerp(goalT,Math.min(1,dt*3));
  cam.position.copy(camPos);cam.position.x+=mouse.x*.12;cam.position.y+=-mouse.y*.06;cam.lookAt(camTgt);
  const fi=Math.min(7,Math.round(MC.t));fo3.set(...S[fi].o);key.target.position.lerp(fo3,Math.min(1,dt*2));key.position.lerp(new THREE.Vector3(fo3.x*.5,H-.05,fo3.z+1.6),Math.min(1,dt*2));
  if(bokeh)bokeh.uniforms.focus.value=cam.position.distanceTo(key.target.position);
  pts[0].position.set(0,H-.25,cam.position.z-2.5);pts[1].position.set(0,H-.25,cam.position.z-6);
  ceil.visible=dl.visible=MC.t<7.6;
  groups.forEach((g,i)=>g.visible=Math.abs(MC.t-i)<2.4||(i===0&&MC.t>7.3));
  chunks.forEach(ch=>{const d=Math.abs(ch.center.z-cam.position.z);const vis=MC.t>7.3||d<(mobile?8:10);ch.g.visible=vis;if(vis){const lo=d>(mobile?3:4)||MC.t>7.3;ch.meshes.forEach(m=>{const g=lo?GEOLO[m.t]:GEO[m.t];if(m.im.geometry!==g)m.im.geometry=g})}});
  if(groups[0].visible)updateMannequin(dt);
  if(groups[1].visible)updateCards(dt);
  if(groups[2].visible)updateWeather(dt,t);
  if(groups[3].visible)updateCalendar(dt,t);
  if(groups[4].visible)updateWear(dt);
  if(groups[5].visible)updateShop(dt,t);
  if(groups[6].visible)updateMirror(dt);
  if(glass&&glass.isReflector)glass.visible=Math.abs(MC.t-6)<1.6;
  updateLazy();
  (composer&&usePost)?composer.render(dt):r.render(scene,cam);
  acc+=dt;fc++;if(fc===60){const ms=acc/60*1000;window.__mcfps.push(1000/ms);if(composer&&!usePost&&ms<20)usePost=true;else if(usePost&&ms>45){usePost=false;composer=null}
    if(ms>26){slow++;if(slow>2&&gtao&&gtao.enabled){gtao.enabled=false;slow=0}else if(slow>2&&bokeh&&bokeh.enabled){bokeh.enabled=false;slow=0}else if(dpr>1){dpr=Math.max(1,dpr-.25);r.setPixelRatio(dpr);size()}}
    else if(ms<14&&dpr<maxDpr){slow=0;dpr=Math.min(maxDpr,dpr+.25);r.setPixelRatio(dpr);size()}acc=0;fc=0}
}
r.setAnimationLoop(()=>{if(!lost&&!document.hidden)frame()});
window.__mc={r,scene,info:()=>({tris:r.info.render.triangles,calls:r.info.render.calls,geos:r.info.memory.geometries,tex:r.info.memory.textures})};
}
