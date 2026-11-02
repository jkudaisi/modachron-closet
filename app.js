(()=>{
const root=document.documentElement,lite=()=>root.classList.contains('lite');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
// smooth scroll
let lenis=null;
const coarse=matchMedia('(pointer: coarse)').matches||'ontouchstart' in window;
if(!reduced&&!coarse&&window.Lenis){lenis=new Lenis({lerp:.09});const raf=t=>{lenis.raf(t);requestAnimationFrame(raf)};requestAnimationFrame(raf);
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();lenis.scrollTo(t,{offset:-10})}}));}
// stop progress, shared with world.js
const stops=[...document.querySelectorAll('.stop')];const prog=document.getElementById('prog');
const MC=window.MC={stop:0,t:0,look:0};
const stills=[...document.querySelectorAll('.stills i')];
let geo=[],vh0=innerHeight,lastW=innerWidth,maxS=1;
function layout(){vh0=innerHeight;geo=stops.map(r=>{const b=r.getBoundingClientRect();return[b.top+scrollY,b.height]});maxS=Math.max(1,document.documentElement.scrollHeight-vh0)}
let ticking=false;
function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(()=>{ticking=false;measure()})}}
function measure(){const mid=scrollY+vh0*.5;let t=0;
  for(let i=0;i<stops.length;i++){const top=geo[i][0],h=geo[i][1];
    if(mid>=top&&mid<top+h){t=i+(mid-top)/h;break}if(i===stops.length-1&&mid>=top+h)t=stops.length}
  MC.t=Math.max(0,t-.5);MC.stop=Math.min(stops.length-1,Math.round(MC.t));
  prog.style.transform='scaleX('+Math.min(1,scrollY/maxS)+')';
  if(lite())stills.forEach((s,i)=>s.classList.toggle('on',i===MC.stop));}
addEventListener('scroll',onScroll,{passive:true});
addEventListener('resize',()=>{if(coarse&&innerWidth===lastW)return;lastW=innerWidth;layout();measure()});
addEventListener('load',()=>{layout();measure()});layout();measure();
// 3D toggle
const tg=document.getElementById('toggle3d');
const sync=()=>{tg.textContent=lite()?'3D off':'3D on';tg.setAttribute('aria-pressed',!lite())};sync();
tg.onclick=()=>{const off=!lite();localStorage.setItem('mc3d',off?'off':'on');location.reload()};
// hero look chips
const descs=['a rain-ready look','a light sunny-day look','a warm cold-weather look','an evening look'];
document.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{MC.look=+b.dataset.look;
  document.querySelectorAll('.chips button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  document.getElementById('lookDesc').textContent='The mannequin is wearing '+descs[MC.look]+'.';
  dispatchEvent(new CustomEvent('mc-look',{detail:MC.look}))});
// closet identity profile
const looks=[
 {img:'look1',n:'Pattern play',s:'Warm, out with friends',casual:-1,fit:-.5,color:1},
 {img:'look3',n:'Soft tailoring',s:'Cool morning, coffee then work',casual:.5,fit:-1,color:.3},
 {img:'look6',n:'Clean black',s:'Evening, gallery opening',casual:.5,fit:1,color:-1},
 {img:'look4',n:'Statement coat',s:'Cold and clear, city day',casual:.8,fit:-.3,color:1},
 {img:'look7',n:'Prep layers',s:'Mild, campus run',casual:-.3,fit:-.5,color:.6},
 {img:'look8',n:'Stair-side varsity',s:'Breezy, weekend',casual:-1,fit:-1,color:.2},
];MC.looks=looks;
const prof={casual:0,fit:0,color:0};
function setBars(){const p=v=>50+Math.max(-1,Math.min(1,v/3))*45+'%';
  document.getElementById('pCasual').style.left=p(prof.casual);document.getElementById('pFit').style.left=p(prof.fit);document.getElementById('pColor').style.left=p(prof.color)}
MC.apply=(L,dir)=>{const s=dir>0?1:-1;prof.casual+=L.casual*s;prof.fit+=L.fit*s;prof.color+=L.color*s;setBars()};setBars();
// 2D deck (lite mode only)
const deck=document.getElementById('deck');let i=0;
function make(k){const L=looks[k%looks.length],el=document.createElement('div');el.className='card';
  el.innerHTML='<img alt="" draggable="false" src="img/'+L.img+'.webp"><span class="shade"></span><span class="stamp l">LOVE</span><span class="stamp r">NOPE</span><span class="tag"></span><span class="sub"></span>';
  el.querySelector('.tag').textContent=L.n;el.querySelector('.sub').textContent=L.s;el.setAttribute('aria-label','Demo look: '+L.n);el._l=L;return el}
function fill(){while(deck.children.length<3)deck.prepend(make(i++));
  [...deck.children].forEach((c,j,a)=>{const d=a.length-1-j;c.style.transform=`translateY(${d*10}px) scale(${1-d*.04})`;c.style.transition='transform .4s'});bind(deck.lastElementChild)}
function swipe2d(el,dir){MC.apply(el._l,dir);el.style.transition='transform .45s ease-in,opacity .45s';el.style.transform=`translateX(${dir*140}%) rotate(${dir*25}deg)`;el.style.opacity=0;setTimeout(()=>{el.remove();fill()},420)}
function bind(el){if(el._b)return;el._b=1;let sx=0,dx=0,down=false;
  el.addEventListener('pointerdown',e=>{down=true;sx=e.clientX;el.setPointerCapture(e.pointerId);el.style.transition='none'});
  el.addEventListener('pointermove',e=>{if(!down)return;dx=e.clientX-sx;el.style.transform=`translateX(${dx}px) rotate(${dx/18}deg)`;el.querySelector('.l').style.opacity=Math.max(0,dx/120);el.querySelector('.r').style.opacity=Math.max(0,-dx/120)});
  const up=()=>{if(!down)return;down=false;if(Math.abs(dx)>90)swipe2d(el,Math.sign(dx));else{el.style.transition='transform .3s';el.style.transform='';el.querySelectorAll('.stamp').forEach(s=>s.style.opacity=0)}dx=0};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
if(lite())fill();
const sw=dir=>{if(lite())swipe2d(deck.lastElementChild,dir);else dispatchEvent(new CustomEvent('mc-swipe',{detail:dir}))};
document.getElementById('btnYes').onclick=()=>sw(1);document.getElementById('btnNo').onclick=()=>sw(-1);
// fit card
const fc=document.querySelector('.fitcard');if(fc){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){fc.classList.add('on');document.getElementById('ring').classList.add('on');io.disconnect()}}),{threshold:.3});io.observe(fc)}
// creator form: real endpoint is same-origin /api/creator-apply on modachron.com, preview hands off
const f=document.getElementById('apply'),msg=document.getElementById('formMsg');
const live=/(^|\.)modachron\.com$/.test(location.hostname);
const v=id=>document.getElementById(id);
f.addEventListener('submit',async e=>{e.preventDefault();msg.textContent='';
  const fullName=v('cName').value.trim(),handle=v('cHandle').value.trim().replace(/^@/,''),platform=v('cPlat').value,email=v('cEmail').value.trim().toLowerCase();
  if(!fullName)return msg.textContent='Please enter your full name.';
  if(!handle)return msg.textContent='Please enter your handle.';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return msg.textContent='Please enter a valid email address.';
  if(!live){msg.textContent='Preview build: taking you to the live application form on modachron.com.';setTimeout(()=>location.href='https://modachron.com/creators',1200);return}
  const b=f.querySelector('button');b.disabled=true;
  try{const r=await fetch('/api/creator-apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName,handle,platform,email})});
    const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||'Failed to submit your application.');
    f.reset();msg.textContent='Application received. We will be in touch within 48 hours.'}
  catch(err){msg.textContent=err.message||'Something went wrong. Please try again.'}finally{b.disabled=false}});
})();
