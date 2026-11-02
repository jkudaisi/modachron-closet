import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

const root=document.documentElement;
init();
function init(){
const MC=window.MC||{t:0,stop:0,look:0};
const cv=document.getElementById('world');
const mobile=matchMedia('(max-width: 760px)').matches||matchMedia('(pointer: coarse)').matches;
const Q=new URLSearchParams(location.search);
let r;
try{r=new THREE.WebGLRenderer({canvas:cv,antialias:!mobile,powerPreference:'high-performance'})}catch(e){root.classList.add('lite');return}
const maxDpr=Math.min(devicePixelRatio,mobile?1.5:1.75);let dpr=maxDpr;r.setPixelRatio(dpr);
r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.95;
r.shadowMap.enabled=!mobile;r.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b0a09);scene.fog=new THREE.Fog(0x0b0a09,9,26);
const pm=new THREE.PMREMGenerator(r);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.35;
const cam=new THREE.PerspectiveCamera(mobile?58:42,1,.05,80);
const clock=new THREE.Clock();
const U={uTime:{value:0},uWind:{value:0}};
const groups=[];for(let i=0;i<9;i++){const g=new THREE.Group();scene.add(g);groups.push(g)}

// ---------- materials ----------
function fabricTex(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#808080';x.fillRect(0,0,128,128);
  for(let i=0;i<128;i+=2){x.fillStyle=`rgba(${i%4?255:0},${i%4?255:0},${i%4?255:0},.08)`;x.fillRect(0,i,128,1);x.fillRect(i,0,1,128)}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);return t}
const fabBump=fabricTex();
function sway(m){m.onBeforeCompile=s=>{s.uniforms.uTime=U.uTime;s.uniforms.uWind=U.uWind;
  s.vertexShader='uniform float uTime;uniform float uWind;\n'+s.vertexShader.replace('#include <begin_vertex>',
  `#include <begin_vertex>
   float hem=clamp(-position.y,0.,1.4);
   transformed.x+=sin(uTime*1.7+position.y*3.+position.x*2.)*0.012*hem+uWind*hem*0.05;
   transformed.z+=cos(uTime*1.3+position.y*2.5)*0.01*hem;`)};return m}
const fabric=(c,sheen=.5)=>sway(new THREE.MeshPhysicalMaterial({color:c,roughness:.82,sheen,sheenRoughness:.6,sheenColor:new THREE.Color(0xffffff),bumpMap:fabBump,bumpScale:.6}));
const brass=new THREE.MeshStandardMaterial({color:0xFFBB00,metalness:.9,roughness:.28});
const chrome=new THREE.MeshStandardMaterial({color:0xd9d4c8,metalness:1,roughness:.2});
const wood=new THREE.MeshStandardMaterial({color:0x2a1d14,roughness:.55,metalness:.05});
const lacquer=new THREE.MeshPhysicalMaterial({color:0x151412,roughness:.35,clearcoat:.6});

// ---------- garments (procedural) ----------
const SH={
 tee:[[-.12,0],[0,-.04],[.12,0],[.3,-.1],[.25,-.24],[.18,-.2],[.18,-.62],[-.18,-.62],[-.18,-.2],[-.25,-.24],[-.3,-.1]],
 jacket:[[-.11,0],[0,-.05],[.11,0],[.3,-.08],[.36,-.6],[.27,-.62],[.22,-.26],[.22,-.68],[-.22,-.68],[-.22,-.26],[-.27,-.62],[-.36,-.6],[-.3,-.08]],
 coat:[[-.11,0],[0,-.06],[.11,0],[.31,-.08],[.37,-.66],[.28,-.68],[.24,-.3],[.27,-1.0],[-.27,-1.0],[-.24,-.3],[-.28,-.68],[-.37,-.66],[-.31,-.08]],
 pants:[[-.19,0],[.19,0],[.22,-.95],[.05,-.95],[0,-.25],[-.05,-.95],[-.22,-.95]],
 skirt:[[-.18,0],[.18,0],[.27,-.5],[-.27,-.5]],
};
function garmentGeo(kind,depth=.035,wrap=1.1){const s=new THREE.Shape();SH[kind].forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:4,steps:1});
  g.translate(0,0,-depth/2);
  // subdivide-ish wrap: bend around body
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,p.getZ(i)-x*x*wrap)}
  g.computeVertexNormals();return g}
const GEO={};for(const k in SH)GEO[k]=garmentGeo(k,k==='pants'||k==='skirt'?.05:.035,k==='pants'?.6:1.1);
function shoeGeo(){const s=new THREE.Shape();[[0,0],[.26,0],[.27,.04],[.2,.07],[.12,.07],[.06,.12],[0,.12]].forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
  const g=new THREE.ExtrudeGeometry(s,{depth:.09,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2});g.translate(-.13,0,-.045);g.rotateY(Math.PI/2);return g}
GEO.shoe=shoeGeo();
function garment(kind,color,opts={}){
  if(kind==='shoe'){const grp=new THREE.Group();const m=new THREE.MeshStandardMaterial({color,roughness:.5});
    const sole=new THREE.MeshStandardMaterial({color:0xe8e2d6,roughness:.7});
    [-.08,.08].forEach(x=>{const a=new THREE.Mesh(GEO.shoe,m);a.position.x=x;a.castShadow=true;grp.add(a);const so=new THREE.Mesh(new THREE.BoxGeometry(.1,.02,.28),sole);so.position.set(x,.005,0);grp.add(so)});return grp}
  const mesh=new THREE.Mesh(GEO[kind],fabric(color,opts.sheen??.5));mesh.castShadow=true;
  if(opts.trim){const t=new THREE.Mesh(new THREE.BoxGeometry(.42,.03,.05),new THREE.MeshStandardMaterial({color:opts.trim,roughness:.8}));t.position.set(0,kind==='coat'?-.99:-.66,.02);mesh.add(t)}
  return mesh}
function hanger(){const g=new THREE.Group();const hook=new THREE.Mesh(new THREE.TorusGeometry(.045,.007,6,16,Math.PI*1.3),brass);hook.position.y=.09;hook.rotation.z=-.3;g.add(hook);
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(.007,.007,.62,6),brass);bar.rotation.z=Math.PI/2;bar.position.y=.01;g.add(bar);return g}

// ---------- room ----------
function floorTex(){const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');
  for(let i=0;i<16;i++){const l=26+Math.random()*10;x.fillStyle=`rgb(${l+14},${l+4},${l-6})`;x.fillRect(i*32,0,32,512);x.fillStyle='rgba(0,0,0,.35)';x.fillRect(i*32,0,1,512);
    for(let k=0;k<40;k++){x.fillStyle=`rgba(255,220,180,${Math.random()*.03})`;x.fillRect(i*32+Math.random()*32,Math.random()*512,1,30+Math.random()*80)}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,8);t.anisotropy=8;return t}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(11,34),new THREE.MeshStandardMaterial({map:floorTex(),roughness:.38,metalness:.0}));
floor.rotation.x=-Math.PI/2;floor.position.z=-7;floor.receiveShadow=true;scene.add(floor);
const wallM=new THREE.MeshStandardMaterial({color:0x1a1816,roughness:.9});
[-5,5].forEach(x=>{const w=new THREE.Mesh(new THREE.PlaneGeometry(34,4.4),wallM);w.position.set(x,2.2,-7);w.rotation.y=x<0?Math.PI/2:-Math.PI/2;scene.add(w)});
const back=new THREE.Mesh(new THREE.PlaneGeometry(10,4.4),wallM);back.position.set(0,2.2,-23.5);scene.add(back);
// shelving on walls (instanced cubbies)
{const n=2*3*9,geo=new THREE.BoxGeometry(.5,.03,1.6),im=new THREE.InstancedMesh(geo,wood,n);let k=0;const m=new THREE.Matrix4();
 [-4.75,4.75].forEach(x=>{for(let row=0;row<3;row++)for(let i=0;i<9;i++){m.makeTranslation(x,2.9+row*.45,4-i*3.1);im.setMatrixAt(k++,m)}});scene.add(im);
 // folded stacks
 const fold=new THREE.InstancedMesh(new THREE.BoxGeometry(.38,.09,.42),new THREE.MeshStandardMaterial({roughness:.9}),120);const col=new THREE.Color();let f=0;
 const pal=[0xc9b79c,0x3d4a5c,0x6da87f,0xe8e2d6,0x5a2330,0x2b2b2b,0xFFBB00,0x8a7a66];
 [-4.72,4.72].forEach(x=>{for(let row=0;row<3;row++)for(let i=0;i<9;i++){if((i+row)%3===1)continue;const h=1+Math.floor(Math.random()*3);for(let s=0;s<h&&f<120;s++){m.makeTranslation(x,2.96+row*.45+s*.095,4-i*3.1+(Math.random()-.5)*.6);fold.setMatrixAt(f,m);fold.setColorAt(f++,col.set(pal[(i*3+row+s)%pal.length]))}}});
 fold.count=f;scene.add(fold)}
// light strips
const stripM=new THREE.MeshBasicMaterial({color:0xffc26a});
[-4.95,4.95].forEach(x=>{const s=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,33),stripM);s.position.set(x,4.15,-7);scene.add(s);const s2=s.clone();s2.position.y=.04;s2.scale.set(1,1,1);scene.add(s2)});
scene.add(new THREE.HemisphereLight(0xffeedd,0x1a1410,.35));
const key=new THREE.SpotLight(0xfff0d8,16,14,.5,.7,1.4);key.position.set(0,4.2,4);key.castShadow=!mobile;key.shadow.mapSize.set(1024,1024);key.shadow.bias=-.0004;scene.add(key);scene.add(key.target);
const goldL=new THREE.PointLight(0xffbb00,6,8,1.8);scene.add(goldL);
for(let z=4;z>-24;z-=7){const p=new THREE.PointLight(0xffc98a,3.5,9,2);p.position.set(0,3.8,z);scene.add(p)}

// ---------- stop 0: mannequin + outfit builder ----------
const MAN=new THREE.Vector3(mobile?0:1.15,0,2);
const man=new THREE.Group();man.position.copy(MAN);groups[0].add(man);
{const prof=[[0,0],[.12,0],[.19,.06],[.2,.16],[.17,.3],[.15,.42],[.19,.56],[.215,.68],[.2,.78],[.13,.86],[.06,.9],[.05,.98],[0,.98]].map(([x,y])=>new THREE.Vector2(x*1.05,y));
 const torso=new THREE.Mesh(new THREE.LatheGeometry(prof,40),new THREE.MeshPhysicalMaterial({color:0xd8cdb8,roughness:.9,sheen:.4}));torso.scale.set(1.18,1,.8);torso.position.y=.82;torso.castShadow=true;man.add(torso);
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.055,20,12),brass);cap.position.y=1.82;man.add(cap);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.82,12),brass);pole.position.y=.41;man.add(pole);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.24,.28,.04,32),lacquer);base.position.y=.02;base.receiveShadow=true;man.add(base);
 const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.15,.06,48),new THREE.MeshStandardMaterial({color:0x121110,roughness:.4}));plinth.position.y=-.01;plinth.receiveShadow=true;man.add(plinth);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.12,.008,6,96),new THREE.MeshBasicMaterial({color:0xffbb00}));ring.rotation.x=Math.PI/2;ring.position.y=.03;man.add(ring)}
const LOOKS=[ // rain, sunny, cold, evening
 [['coat',0x2d3440],['tee',0xc9b79c],['pants',0x3b4a63],['shoe',0x3a2a1c]],
 [['tee',0xf3efe7],['jacket',0x6da87f,{trim:0xf3efe7}],['skirt',0xc9a86b],['shoe',0xe8e2d6]],
 [['jacket',0xFFBB00,{trim:0xf3efe7}],['tee',0x2f6b47],['pants',0x55575c],['shoe',0x2b2b2e]],
 [['coat',0x141414,{sheen:.9}],['tee',0x5a2330],['pants',0x1d1d1f],['shoe',0x111111]],
];
// worn transforms per slot index; outer layer sits in front
const WORN=[{y:1.78,z:.17,s:1},{y:1.8,z:.2,s:1.04},{y:.98,z:.1,s:1},{y:0,z:.55,s:1}];
const slots=[];LOOKS.forEach((L,li)=>L.forEach(([k,c,o],si)=>{const m=garment(k,c,o);man.add(m);
  // outer slot: whichever of top/layer is coat/jacket goes in front
  let wi=si;if(si<2){const outer=['coat','jacket'].includes(k);wi=outer?1:0}
  slots.push({m,li,si,wi,w:0,tw:0,delay:si*.18,ph:Math.random()*6.28,k})}));
let curLook=-1;function setLook(n){curLook=n;const now=clock.elapsedTime;slots.forEach(s=>{s.tw=s.li===n?1:0;s.start=now+(s.li===n?.35+s.delay:0)})}
addEventListener('mc-look',e=>setLook(e.detail));
setTimeout(()=>setLook(MC.look||0),500);
const tmpV=new THREE.Vector3();
function updateMannequin(dt,t){slots.forEach((s,i)=>{if(t>(s.start||0))s.w+=(s.tw-s.w)*Math.min(1,dt*5);
  const e=s.w*s.w*(3-2*s.w);const a=t*.25+i*(6.283/slots.length)+s.ph*.1;const R=1.35+(i%3)*.18;
  const ox=Math.cos(a)*R,oz=Math.sin(a)*R*.8,oy=.7+((i*37)%10)/10*1.3+Math.sin(t*.8+i)*.06;
  const W=WORN[s.wi];
  s.m.position.set(ox*(1-e),oy*(1-e)+W.y*e,oz*(1-e)+W.z*e);
  const sc=(.42+.58*e)*W.s;s.m.scale.setScalar(sc);
  s.m.rotation.set(0,(1-e)*(a*1.5),(1-e)*Math.sin(t+i)*.3)})}

// ---------- stop 1: 3D swipe deck ----------
const TABLE=new THREE.Vector3(mobile?-1.2:-2.4,0,-2.2);
{const top=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,.05,48),lacquer);top.position.set(TABLE.x,.92,TABLE.z);top.receiveShadow=true;groups[1].add(top);
 const leg=new THREE.Mesh(new THREE.CylinderGeometry(.06,.18,.9,16),brass);leg.position.set(TABLE.x,.45,TABLE.z);groups[1].add(leg)}
const tl=new THREE.TextureLoader();const lookTex=(MC.looks||[]).map(L=>{const t=tl.load('img/'+L.img+'.webp');t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t});
const cardGeo=new THREE.BoxGeometry(.42,.56,.012);const edgeM=new THREE.MeshStandardMaterial({color:0x1b1a18,roughness:.6});
const cards=[];let deckIdx=0;
function cardMat(i){return new THREE.MeshStandardMaterial({map:lookTex[i%lookTex.length],roughness:.45,emissive:0x000000})}
for(let i=0;i<4;i++){const mats=[edgeM,edgeM,edgeM,edgeM,cardMat(deckIdx),edgeM];const c=new THREE.Mesh(cardGeo,mats);c.userData={li:deckIdx++,state:'stack',v:new THREE.Vector3(),spin:0,dx:0};c.castShadow=true;groups[1].add(c);cards.unshift(c)}
// cards[cards.length-1] is top
function layoutStack(dt){cards.forEach((c,i)=>{const d=cards.length-1-i;if(c.userData.state!=='stack')return;
  const tp=new THREE.Vector3(TABLE.x,1.24+(cards.length-d)*.004,TABLE.z+.05-d*.012);
  c.position.lerp(tp,Math.min(1,dt*8));const dx=c.userData.dx;
  c.rotation.set(-.32+(d?0:Math.abs(dx)*-.1),TABLE.x<0?.45:-.2+(d?d*.03:dx*.6),d?(d%2?.04:-.03):-dx*.35);
  c.position.x+=d?0:dx*.5;c.position.y+=d?0:Math.abs(dx)*.08;
  const em=c.material[4].emissive;if(!d){em.setRGB(dx>0?dx*.25:0,dx>0?dx*.5:0,0);if(dx<0)em.setRGB(-dx*.6,-dx*.12,-dx*.1)}else em.setRGB(0,0,0)})}
function fling(dir){const c=cards[cards.length-1];if(!c||c.userData.state!=='stack')return;c.userData.state='fly';
  const right=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0);c.userData.v.copy(right).multiplyScalar(dir*4.2).add(new THREE.Vector3(0,1.6,-.6));c.userData.spin=dir*5;c.userData.life=0;
  const L=MC.looks&&MC.looks[c.userData.li%MC.looks.length];if(L&&MC.apply)MC.apply(L,dir)}
function updateCards(dt){layoutStack(dt);cards.slice().forEach(c=>{if(c.userData.state!=='fly')return;const u=c.userData;u.life+=dt;
  c.position.addScaledVector(u.v,dt);u.v.y-=4.5*dt;c.rotation.z-=u.spin*dt*.6;c.rotation.y+=u.spin*dt*.4;
  if(u.life>1.1){u.state='stack';u.dx=0;c.material[4].map=lookTex[deckIdx%lookTex.length];u.li=deckIdx++;c.material[4].needsUpdate=true;
    cards.splice(cards.indexOf(c),1);cards.unshift(c);c.position.set(TABLE.x,1.1,TABLE.z)}})}
addEventListener('mc-swipe',e=>fling(e.detail));
// drag
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let drag=null;
cv.style.touchAction='pan-y';
const pick=e=>{ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,cam);return ray}
document.addEventListener('pointerdown',e=>{if(e.target!==cv&&!e.target.closest('.stop'))return;if(Math.abs(MC.t-1)>.6)return;const top=cards[cards.length-1];
  if(pick(e).intersectObject(top).length){drag={x:e.clientX,id:e.pointerId};document.body.style.cursor='grabbing'}});
addEventListener('pointermove',e=>{mouse.tx=e.clientX/innerWidth*2-1;mouse.ty=e.clientY/innerHeight*2-1;
  if(drag){const top=cards[cards.length-1];top.userData.dx=Math.max(-1.2,Math.min(1.2,(e.clientX-drag.x)/220))}
  else if(Math.abs(MC.t-1)<.6){document.body.style.cursor=pick(e).intersectObject(cards[cards.length-1]).length?'grab':''}},{passive:true});
addEventListener('pointerup',()=>{if(!drag)return;const top=cards[cards.length-1],dx=top.userData.dx;drag=null;document.body.style.cursor='';
  if(Math.abs(dx)>.45)fling(Math.sign(dx));else top.userData.dx=0});
const mouse={x:0,y:0,tx:0,ty:0};

// ---------- stop 2: weather window ----------
const WIN=new THREE.Vector3(4.93,1.9,-6.5);
const skyM=new THREE.ShaderMaterial({uniforms:{uTime:U.uTime,uMode:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform float uTime;uniform float uMode;varying vec2 vUv;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
 void main(){vec3 rain=mix(vec3(.12,.14,.17),vec3(.3,.33,.38),vUv.y);vec3 sun=mix(vec3(.95,.7,.35),vec3(.35,.6,.95),vUv.y);vec3 snow=mix(vec3(.6,.64,.7),vec3(.82,.85,.9),vUv.y);vec3 eve=mix(vec3(.45,.18,.12),vec3(.05,.05,.14),vUv.y);
 float m=uMode;vec3 c=m<1.?mix(rain,sun,m):m<2.?mix(sun,snow,m-1.):mix(snow,eve,min(m-2.,1.));
 float sunDisc=smoothstep(.12,.0,distance(vUv,vec2(.7,.72)))*(1.-abs(m-1.));c+=vec3(1.,.85,.5)*sunDisc;
 float hills=step(vUv.y,.22+.05*sin(vUv.x*9.));c=mix(c,c*.35,hills);
 float stars=step(.997,h(floor(vUv*160.)))*max(0.,m-2.);c+=stars;
 gl_FragColor=vec4(c,1.);}`});
{const g=groups[2];const sky=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.4),skyM);sky.position.set(WIN.x+.4,WIN.y,WIN.z);sky.rotation.y=-Math.PI/2;g.add(sky);
 const fr=new THREE.MeshStandardMaterial({color:0x0f0e0d,roughness:.4,metalness:.4});
 [[0,1.15,1.9,.08],[0,-1.15,1.9,.08],[0,0,.06,2.3],[.93,0,.08,2.3],[-.93,0,.08,2.3],[0,.4,1.9,.04]].forEach(([z,y,w,h])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(.12,h,w),fr);b.position.set(WIN.x-.02,WIN.y+y,WIN.z+z);g.add(b)});
 // cut wall: place a dark box frame; wall behind is replaced by sky plane in front of wall
 sky.position.x=WIN.x-.03;}
const N=mobile?500:1200,pg=new THREE.BufferGeometry(),pp=new Float32Array(N*3);for(let i=0;i<N;i++){pp[i*3]=WIN.x-.05;pp[i*3+1]=WIN.y+(Math.random()-.5)*2.2;pp[i*3+2]=WIN.z+(Math.random()-.5)*1.8}
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));const ptM=new THREE.PointsMaterial({color:0xcfd8e6,size:.018,transparent:true,opacity:.8,depthWrite:false});const precip=new THREE.Points(pg,ptM);groups[2].add(precip);
const shaft=new THREE.Mesh(new THREE.ConeGeometry(1.4,4.5,24,1,true),new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
shaft.position.set(WIN.x-2,1.5,WIN.z);shaft.rotation.z=-Math.PI/2.6;groups[2].add(shaft);
const wxCoats=[['coat',0x2d3440],['tee',0xf3efe7],['jacket',0xFFBB00,{trim:0xf3efe7}],['coat',0x141414]].map(([k,c,o])=>{const m=garment(k,c,o);const h=hanger();h.add(m);m.position.y=0;
  h.position.set(4.35,2.55,WIN.z+1.45);h.rotation.y=-Math.PI/2+.25;groups[2].add(h);return h});
const hook=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.4,8),brass);hook.rotation.z=Math.PI/2;hook.position.set(4.75,2.7,WIN.z+1.45);groups[2].add(hook);
let wxMode=0,wxShown=0;
function updateWeather(dt,t){const near=Math.abs(MC.t-2)<1.2;if(near)wxMode=(t/3.2)%4;const target=Math.floor(wxMode);
  wxShown+=(target-wxShown)*(Math.abs(target-wxShown)>2?1:Math.min(1,dt*2));skyM.uniforms.uMode.value=wxShown;
  const snow=target===2,rain=target===0;ptM.opacity=rain||snow?.8:0;ptM.size=snow?.035:.016;
  const a=pg.attributes.position;for(let i=0;i<N;i++){let y=a.getY(i)-dt*(snow?.35:2.6);if(snow)a.setZ(i,a.getZ(i)+Math.sin(t+i)*.002);if(y<WIN.y-1.1)y=WIN.y+1.1;a.setY(i,y)}a.needsUpdate=true;
  shaft.material.opacity+=(((target===1)?.09:0)-shaft.material.opacity)*dt*3;
  wxCoats.forEach((h,i)=>{const on=i===target;h.scale.setScalar(THREE.MathUtils.lerp(h.scale.x,on?1:.001,Math.min(1,dt*6)))})}

// ---------- stop 3: calendar dresser + phone ----------
const DRESSER=new THREE.Vector3(-4.45,0,-9.5);
function screenTex(draw){const c=document.createElement('canvas');c.width=256;c.height=520;const x=c.getContext('2d');const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.userData={c,x,draw};draw(x,0);t.needsUpdate=true;return t}
function rr(x,X,Y,W,H,R){x.beginPath();x.roundRect(X,Y,W,H,R);x.fill()}
const calTex=screenTex((x,k)=>{x.fillStyle='#232323';x.fillRect(0,0,256,520);x.fillStyle='#fff';x.font='700 22px Inter,sans-serif';x.fillText('Calendar',20,62);x.fillStyle='#9a9a9a';x.font='13px Inter,sans-serif';x.fillText('Plan your week',20,82);
  x.fillStyle='#2f2f2f';rr(x,14,100,228,62,14);['M','T','W','T','F','S','S'].forEach((d,i)=>{const on=i===k%7;if(on){x.fillStyle='#FFBB00';rr(x,20+i*32,106,28,50,10)}x.fillStyle=on?'#141414':'#bbb';x.font='11px Inter';x.fillText(d,30+i*32,124);x.font='700 14px Inter';x.fillText(String(10+i),27+i*32,146)});
  const ev=[['2:00 PM','Work meeting'],['7:30 PM','Dinner'],['9:00 AM','Travel day'],['11:00 AM','Brunch']][k%4];x.fillStyle='#2f2f2f';rr(x,14,176,228,70,14);x.fillStyle='#6da87f';x.fillRect(24,188,4,46);x.fillStyle='#FFBB00';x.font='600 12px Inter';x.fillText(ev[0],38,200);x.fillStyle='#fff';x.font='700 17px Inter';x.fillText(ev[1],38,224);
  x.fillStyle='#2f2f2f';rr(x,14,260,228,200,16);x.fillStyle='#FFBB00';rr(x,60,280,70,90,10);x.fillStyle='#c9b79c';rr(x,140,290,56,70,8);x.fillStyle='#3b4a63';rr(x,80,375,50,70,8);x.fillStyle='#fff';x.font='600 12px Inter';x.fillText('Planned outfit',24,486)});
function phone(tex){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.2,.41,.016),new THREE.MeshStandardMaterial({color:0x222222,metalness:.7,roughness:.3}));g.add(body);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(.184,.39),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));scr.position.z=.0085;g.add(scr);return g}
const calPhone=phone(calTex);groups[3].add(calPhone);
const drawerSlides=[];
{const g=groups[3];// procedural day-drawer unit sits beside model; drawers slide per day
 const unit=new THREE.Group();unit.position.set(-4.5,0,-7.6);unit.rotation.y=Math.PI/2;g.add(unit);
 const carc=new THREE.Mesh(new THREE.BoxGeometry(.9,1.2,.5),lacquer);carc.position.y=.6;unit.add(carc);
 for(let i=0;i<4;i++){const d=new THREE.Mesh(new THREE.BoxGeometry(.84,.25,.46),wood);d.position.set(0,.18+i*.28,.03);unit.add(d);const knob=new THREE.Mesh(new THREE.SphereGeometry(.02,10,8),brass);knob.position.set(0,0,.24);d.add(knob);drawerSlides.push(d)}
 const fold=new THREE.Mesh(new THREE.BoxGeometry(.5,.06,.3),new THREE.MeshStandardMaterial({color:0xFFBB00,roughness:.9}));fold.position.y=.1;drawerSlides[3].add(fold)}
let calK=0,calNext=0;
function updateCalendar(dt,t){const near=Math.abs(MC.t-3)<1.2;if(near&&t>calNext){calNext=t+2.6;calK++;const T=calTex;T.userData.draw(T.userData.x,calK);T.needsUpdate=true}
  drawerSlides.forEach((d,i)=>{d.position.z+=(((near&&calK%4===i)?.32:.03)-d.position.z)*Math.min(1,dt*4)})}

// ---------- stop 4: wear what you own rails ----------
const railGarms=[];
{const kinds=['tee','jacket','coat','tee','skirt','jacket','tee','coat','pants','tee','jacket','tee'];const cols=[0xc9b79c,0x3d4a5c,0x2d3440,0xe8e2d6,0x5a2330,0x6da87f,0x2b2b2b,0x8a7a66,0x3b4a63,0xFFBB00,0x2f6b47,0xf3efe7];
 [-4.25,4.25].forEach((x,side)=>{const rail=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,6.5,10),chrome);rail.rotation.x=Math.PI/2;rail.position.set(x,2.45,-13.2);groups[4].add(rail);
  for(let i=0;i<12;i++){const k=kinds[(i+side*5)%12];const h=hanger();const m=garment(k,cols[(i*5+side*3)%12]);h.add(m);
    const z=-10.2-i*.52;h.position.set(x,2.4,z);h.rotation.y=x<0?Math.PI/2:-Math.PI/2;groups[4].add(h);railGarms.push({h,home:h.position.clone(),rot:h.rotation.y,i,side,m})}});}
const pickIdx=[16,5,21];// pieces that slide forward into an outfit
const FRONT=[new THREE.Vector3(-.55,2.2,-12.4),new THREE.Vector3(0,2.25,-12.6),new THREE.Vector3(.55,2.2,-12.4)];
function updateRails(dt,t){const w=THREE.MathUtils.smoothstep(1-Math.abs(MC.t-4),0,.55);
  railGarms.forEach((g,i)=>{const k=pickIdx.indexOf(i);g.h.rotation.z=Math.sin(t*1.1+i)*.02+U.uWind.value*.4;
    if(k<0)return;g.h.position.lerpVectors(g.home,FRONT[k],w);g.h.rotation.y=THREE.MathUtils.lerp(g.rot,0,w);
    g.m.material.emissive=g.m.material.emissive||new THREE.Color();g.m.material.emissive.setRGB(.07*w,.045*w,0)})}

// ---------- stop 5: ModaShop rail ----------
const SHOP=new THREE.Vector3(mobile?-1.4:-2.5,0,-17.6);
function signTex(lines,w=512,h=256,bg='#FFBB00',fg='#141414'){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=bg;rr(x,0,0,w,h,28);x.fillStyle=fg;x.textAlign='center';
  lines.forEach(([t,f,y])=>{x.font=f;x.fillText(t,w/2,y)});const T=new THREE.CanvasTexture(c);T.colorSpace=THREE.SRGBColorSpace;return T}
let listedTag;
const shopPhoneTex=screenTex((x,k)=>{x.fillStyle='#232323';x.fillRect(0,0,256,520);x.fillStyle='#fff';x.font='700 22px Inter';x.fillText('ModaShop',20,62);x.fillStyle='#FFBB00';x.font='600 13px Inter';x.fillText('Coming soon',20,82);
  const step=k%4;
  if(step===0){const cs=['#FFBB00','#2f6b47','#2d3440','#d8c7a3','#3b4a63','#2b2b2e'];cs.forEach((c,i)=>{x.fillStyle='#2f2f2f';rr(x,16+(i%2)*116,100+Math.floor(i/2)*120,108,110,12);x.fillStyle=c;rr(x,44+(i%2)*116,122+Math.floor(i/2)*120,52,66,8)});x.fillStyle='#FFBB00';rr(x,22,226,56,20,6);x.fillStyle='#141414';x.font='800 11px Inter';x.fillText('Listed',32,240)}
  if(step===1){x.fillStyle='#2f2f2f';rr(x,16,100,224,300,16);x.fillStyle='#2d3440';rr(x,78,130,100,170,10);x.fillStyle='#fff';x.font='700 17px Inter';x.fillText('Sell Review',30,340);x.fillStyle='#9a9a9a';x.font='12px Inter';x.fillText('Keep or sell?',30,362);x.fillStyle='#6da87f';rr(x,140,420,90,40,20);x.fillStyle='#fff';x.font='700 14px Inter';x.fillText('Sell',170,446)}
  if(step===2){x.fillStyle='#2f2f2f';rr(x,16,100,224,250,16);x.fillStyle='#FFBB00';rr(x,78,124,100,130,10);x.fillStyle='#fff';x.font='700 16px Inter';x.fillText('Varsity jacket',30,290);x.fillStyle='#9a9a9a';x.font='12px Inter';x.fillText('Picked for your closet',30,312);x.fillStyle='#FFBB00';rr(x,16,366,224,40,14);x.fillStyle='#141414';x.font='800 14px Inter';x.fillText('Make an offer',78,392);x.fillStyle='#f3efe7';rr(x,16,420,224,54,12);x.fillStyle='#141414';x.font='700 13px Inter';x.fillText('New offer',30,442);x.font='12px Inter';x.fillText('Accept, decline or counter',30,462)}
  if(step===3){x.fillStyle='#6da87f';x.beginPath();x.arc(128,190,44,0,7);x.fill();x.fillStyle='#fff';x.font='900 44px Inter';x.fillText('\u2713',112,206);x.font='800 22px Inter';x.fillText('You sold it!',64,280);x.fillStyle='#bbb';x.font='12px Inter';x.fillText('Next, set up how you get paid.',38,304);x.fillStyle='#FFBB00';rr(x,40,330,176,40,14);x.fillStyle='#141414';x.font='800 13px Inter';x.fillText('Set up payouts',78,355)}});
{const g=groups[5];const base=new THREE.Group();base.position.copy(SHOP);g.add(base);
 [-1,1].forEach(s=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,2.2,10),brass);p.position.set(s*1.05,1.1,0);base.add(p);const f=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.02,20),brass);f.position.set(s*1.05,.01,0);base.add(f)});
 const bar=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,2.15,10),brass);bar.rotation.z=Math.PI/2;bar.position.y=2.15;base.add(bar);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(.9,.45),new THREE.MeshBasicMaterial({map:signTex([['ModaShop','900 84px Montserrat, sans-serif',120],['COMING SOON','800 44px Montserrat, sans-serif',200]]),toneMapped:false}));sign.position.set(0,2.55,0);base.add(sign);
 [['jacket',0xFFBB00,{trim:0xf3efe7}],['tee',0xd8c7a3],['coat',0x2d3440],['skirt',0x5a2330],['jacket',0x2f6b47]].forEach(([k,c,o],i)=>{const h=hanger();h.add(garment(k,c,o));h.position.set(-.8+i*.4,2.1,0);h.rotation.y=-.5;base.add(h);
   if(i===2){listedTag=new THREE.Group();const tag=new THREE.Mesh(new THREE.PlaneGeometry(.16,.07),new THREE.MeshBasicMaterial({map:signTex([['Listed','900 120px Montserrat, sans-serif',170]],512,240),toneMapped:false,side:THREE.DoubleSide}));tag.position.y=-.06;listedTag.add(tag);
     const str=new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,.06,4),new THREE.MeshBasicMaterial({color:0xffffff}));str.position.y=-.01;listedTag.add(str);listedTag.position.set(.2,-.12,.08);h.add(listedTag)}});
 const sp=phone(shopPhoneTex);sp.position.set(1.45,1.15,.2);sp.rotation.y=-.45;sp.scale.setScalar(1.4);base.add(sp);
 const stand=new THREE.Mesh(new THREE.CylinderGeometry(.015,.12,1.0,12),brass);stand.position.set(1.45,.5,.2);base.add(stand)}
let shopK=0,shopNext=0;
function updateShop(dt,t){if(listedTag)listedTag.rotation.z=Math.sin(t*2.2)*.25;if(Math.abs(MC.t-5)<1.2&&t>shopNext){shopNext=t+2.6;shopK++;shopPhoneTex.userData.draw(shopPhoneTex.userData.x,shopK);shopPhoneTex.needsUpdate=true}}

// ---------- stop 6: fit check mirror ----------
const MIR=new THREE.Vector3(mobile?1.2:2.4,0,-20.6);
const ringTex=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const T=new THREE.CanvasTexture(c);T.colorSpace=THREE.SRGBColorSpace;T.userData={c,x:c.getContext('2d'),v:0};return T})();
function drawRing(v){const x=ringTex.userData.x;x.clearRect(0,0,256,256);x.lineWidth=16;x.lineCap='round';x.strokeStyle='rgba(255,255,255,.15)';x.beginPath();x.arc(128,128,96,0,7);x.stroke();
  x.strokeStyle='#FFBB00';x.beginPath();x.arc(128,128,96,-Math.PI/2,-Math.PI/2+Math.PI*2*v*.71);x.stroke();x.fillStyle='#fff';x.textAlign='center';x.font='900 72px Montserrat, sans-serif';x.fillText(String(Math.round(71*v)),128,146);
  x.font='600 18px Inter';x.fillStyle='#FFBB00';x.fillText('EXAMPLE',128,188);ringTex.needsUpdate=true}
drawRing(0);
const mirGroup=new THREE.Group();mirGroup.position.copy(MIR);mirGroup.rotation.y=-.35;groups[6].add(mirGroup);
let glass;
{const frame=new THREE.Mesh(new THREE.TorusGeometry(1,.045,12,64),brass);frame.scale.set(.52,1,1);frame.position.y=1.3;mirGroup.add(frame);
 if(!mobile){glass=new Reflector(new THREE.CircleGeometry(1,48),{textureWidth:512*Math.min(dpr,1.5),textureHeight:1024*Math.min(dpr,1.5),color:0x9a9488});glass.scale.set(.5,.98,1);glass.position.set(0,1.3,-.01);mirGroup.add(glass)}
 else{glass=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshStandardMaterial({color:0x3a3a40,metalness:1,roughness:.08}));glass.scale.set(.5,.98,1);glass.position.set(0,1.3,-.01);mirGroup.add(glass)}
 const feet=new THREE.Mesh(new THREE.BoxGeometry(.7,.04,.35),brass);feet.position.y=.02;mirGroup.add(feet);
 const ring=new THREE.Mesh(new THREE.PlaneGeometry(.42,.42),new THREE.MeshBasicMaterial({map:ringTex,transparent:true,toneMapped:false,depthWrite:false}));ring.position.set(0,1.82,.03);mirGroup.add(ring);
 // a second dress form in front of the mirror wearing the current look (for reflection)
}
const man2=man.clone(true);man2.position.set(MIR.x-.9,0,MIR.z+1.4);man2.rotation.y=Math.PI-.5;man2.scale.setScalar(.92);groups[6].add(man2);
let ringV=0;
function updateMirror(dt){const tgt=Math.abs(MC.t-6)<.7?1:0;const nv=ringV+(tgt-ringV)*Math.min(1,dt*1.6);if(Math.abs(nv-ringV)>.002){ringV=nv;drawRing(ringV)}
  // mirror the outfit of man onto man2
  man2.children.forEach((c,i)=>{const s=man.children[i];if(s){c.position.copy(s.position);c.rotation.copy(s.rotation);c.scale.copy(s.scale)}})}

// ---------- stop 7: creators lounge ----------
const LOUNGE=new THREE.Vector3(mobile?-1:-2.6,0,-21.4);
{const g=groups[7];const rl=new THREE.Mesh(new THREE.TorusGeometry(.42,.035,12,64),new THREE.MeshBasicMaterial({color:0xfff3dc,toneMapped:false}));rl.position.set(LOUNGE.x-.6,1.65,LOUNGE.z-.6);rl.rotation.y=.6;g.add(rl);
 const st=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,1.25,8),chrome);st.position.set(LOUNGE.x-.6,.62,LOUNGE.z-.6);g.add(st);
 const pl=new THREE.PointLight(0xfff0d8,5,4,2);pl.position.set(LOUNGE.x-.4,1.6,LOUNGE.z-.2);g.add(pl);
 const ph=phone(signTex([['Creator','800 60px Montserrat',220],['program','800 60px Montserrat',290]],256,520,'#141414','#FFBB00'));ph.position.set(LOUNGE.x-.6,1.65,LOUNGE.z-.6);ph.rotation.y=.6;ph.scale.setScalar(.9);g.add(ph);
 const rug=new THREE.Mesh(new THREE.CircleGeometry(1.4,48),new THREE.MeshStandardMaterial({color:0x2b2218,roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(LOUNGE.x+.3,.006,LOUNGE.z+.3);rug.receiveShadow=true;g.add(rug)}

// ---------- CC0 models (Poly Haven), lazy ----------
const gl=new GLTFLoader();const loaded={};
function loadModel(name,stop,fn){if(loaded[name])return;loaded[name]=1;gl.load(`models/${name}/${name}.gltf`,g=>{const o=g.scene;o.traverse(m=>{if(m.isMesh){m.castShadow=!mobile;m.receiveShadow=true}});
  const b=new THREE.Box3().setFromObject(o),s=new THREE.Vector3();b.getSize(s);fn(o,s,b);groups[stop].add(o)},undefined,()=>{})}
function lazy(){if(MC.t>1.2)loadModel('drawer_cabinet',3,(o,s)=>{const k=1.05/s.y;o.scale.setScalar(k);o.position.copy(DRESSER);o.rotation.y=Math.PI/2;
    calPhone.position.set(DRESSER.x+.1,s.y*k+.22,DRESSER.z);calPhone.rotation.set(-.15,Math.PI/2,0)});
  if(MC.t>4.2)loadModel('ornate_mirror_01',6,(o,s)=>{const k=.8/Math.max(s.x,s.y);o.scale.setScalar(k);o.position.set(MIR.x-1.6,1.9,-23.45);});
  if(MC.t>5.2)loadModel('Ottoman_01',7,(o,s)=>{const k=.9/Math.max(s.x,s.z);o.scale.setScalar(k);o.position.set(LOUNGE.x+.3,0,LOUNGE.z+.3)})}
calPhone.position.set(DRESSER.x+.1,1.3,DRESSER.z);calPhone.rotation.set(-.15,Math.PI/2,0);

// ---------- camera path ----------
const S=[ // cam, focus, side(+1 object on right of screen)
 {c:[0,1.55,7.6],o:[MAN.x,1.25,MAN.z],s:1},
 {c:[-.4,1.95,1.2],o:[TABLE.x,1.15,TABLE.z],s:-1},
 {c:[.6,1.75,-3.4],o:[WIN.x,1.8,WIN.z+.4],s:1},
 {c:[-.6,1.6,-6.4],o:[DRESSER.x,1.1,DRESSER.z+.8],s:-1},
 {c:[0,1.85,-8.6],o:[0,2.1,-12.6],s:1},
 {c:[.6,1.8,-14],o:[SHOP.x,1.7,SHOP.z],s:-1},
 {c:[-.4,1.65,-17],o:[MIR.x,1.4,MIR.z],s:1},
 {c:[.5,1.5,-18.2],o:[LOUNGE.x,1.1,LOUNGE.z],s:-1},
 {c:[0,7.4,7],o:[0,0,-9],s:0},
];
const camC=new THREE.CatmullRomCurve3(S.map(p=>new THREE.Vector3(...p.c)),false,'centripetal');
const tgts=S.map(p=>{const o=new THREE.Vector3(...p.o),c=new THREE.Vector3(...p.c);const fwd=o.clone().sub(c);const d=fwd.length();fwd.normalize();
  const right=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();
  if(mobile)return o.clone().add(new THREE.Vector3(0,-d*.24,0));return o.clone().addScaledVector(right,-p.s*d*.24)});
if(mobile){camC.points.forEach((p,i)=>{const o=new THREE.Vector3(...S[i].o);if(i<8)p.copy(o.clone().add(p.clone().sub(o).multiplyScalar(1.12)))})}
const tgtC=new THREE.CatmullRomCurve3(tgts,false,'centripetal');
const camPos=new THREE.Vector3(),camTgt=new THREE.Vector3(),goalP=new THREE.Vector3(),goalT=new THREE.Vector3();
function pathAt(t){const n=S.length-1,f=Math.floor(t),fr=t-f;const e=fr*fr*fr*(fr*(fr*6-15)+10);const u=Math.min(n,f+e)/n;camC.getPoint(u,goalP);tgtC.getPoint(u,goalT)}
pathAt(MC.t);camPos.copy(goalP);camTgt.copy(goalT);

// ---------- post ----------
let composer=null;
function size(){const w=innerWidth,h=innerHeight;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();if(composer)composer.setSize(w,h)}
if(!mobile&&!Q.has('nopost')){composer=new EffectComposer(r);composer.addPass(new RenderPass(scene,cam));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth/2,innerHeight/2),.4,.45,.92));composer.addPass(new OutputPass())}
size();addEventListener('resize',size);

// ---------- loop ----------
let lost=false;cv.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true});cv.addEventListener('webglcontextrestored',()=>{lost=false});
let lastScroll=scrollY,acc=0,fc=0;window.__mcfps=[];
function frame(){const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;U.uTime.value=t;
  const sv=(scrollY-lastScroll);lastScroll=scrollY;U.uWind.value+=(THREE.MathUtils.clamp(sv*.01,-1,1)+mouse.x*.3-U.uWind.value)*.05;
  mouse.x+=(mouse.tx-mouse.x)*.05;mouse.y+=(mouse.ty-mouse.y)*.05;
  pathAt(MC.t);camPos.lerp(goalP,Math.min(1,dt*3.2));camTgt.lerp(goalT,Math.min(1,dt*3.2));
  cam.position.copy(camPos);cam.position.x+=mouse.x*.18;cam.position.y+=-mouse.y*.1;cam.lookAt(camTgt);
  // spotlight follows focus
  const fi=Math.min(7,Math.round(MC.t)),fo=S[fi].o;key.target.position.lerp(new THREE.Vector3(...fo),Math.min(1,dt*2));key.position.lerp(new THREE.Vector3(fo[0]*.6,4.2,fo[2]+3),Math.min(1,dt*2));
  goldL.position.set(fo[0],2.4,fo[2]+1.2);goldL.intensity=MC.t>7.5?10:3;
  groups.forEach((g,i)=>g.visible=Math.abs(MC.t-i)<2.4||(i===0&&MC.t>7.4)||(i===6&&MC.t>7.4));
  if(groups[0].visible)updateMannequin(dt,t);
  if(groups[1].visible)updateCards(dt);
  if(groups[2].visible)updateWeather(dt,t);
  if(groups[3].visible)updateCalendar(dt,t);
  if(groups[4].visible)updateRails(dt,t);
  if(groups[5].visible)updateShop(dt,t);
  if(groups[6].visible)updateMirror(dt);
  if(glass&&glass.isReflector)glass.visible=groups[6].visible&&Math.abs(MC.t-6)<1.6;
  lazy();
  composer?composer.render(dt):r.render(scene,cam);
  // adaptive resolution
  acc+=dt;fc++;if(fc===60){const ms=acc/60*1000;window.__mcfps.push(1000/ms);if(ms>24&&dpr>1){dpr=Math.max(1,dpr-.25);r.setPixelRatio(dpr);size()}else if(ms<14&&dpr<maxDpr){dpr=Math.min(maxDpr,dpr+.25);r.setPixelRatio(dpr);size()}acc=0;fc=0}
}
r.setAnimationLoop(()=>{if(!lost&&!document.hidden)frame()});
window.__mc={r,scene};
}
