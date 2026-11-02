(()=>{
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
// flat vector garments (viewBox 100x100)
const G={
 jacket:(c,t='#f3efe7')=>`<svg viewBox="0 0 100 100"><path d="M30 12 L42 8 Q50 14 58 8 L70 12 L90 30 L84 78 L74 76 L74 92 L26 92 L26 76 L16 78 L10 30Z" fill="${c}"/><path d="M10 30 L16 78 L26 76 L26 40Z M90 30 L84 78 L74 76 L74 40Z" fill="${t}" opacity=".9"/><rect x="26" y="86" width="48" height="6" fill="${t}"/><path d="M50 14 V92" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/><g fill="#fff">${[30,42,54,66,78].map(y=>`<circle cx="53" cy="${y}" r="1.4"/>`).join('')}</g></svg>`,
 tee:(c)=>`<svg viewBox="0 0 100 100"><path d="M34 14 Q50 22 66 14 L90 28 L80 44 L70 40 L70 90 L30 90 L30 40 L20 44 L10 28Z" fill="${c}"/><path d="M38 46 h24 v18 h-24z" fill="rgba(0,0,0,.18)" rx="2"/></svg>`,
 sweater:(c)=>`<svg viewBox="0 0 100 100"><path d="M36 12 Q50 20 64 12 L88 26 L92 82 L80 84 L72 40 L72 90 L28 90 L28 40 L20 84 L8 82 L12 26Z" fill="${c}"/><path d="M28 84 h44 v6 h-44z M8 78 l12 2 M80 80 l12 -2" stroke="rgba(0,0,0,.2)" stroke-width="3"/></svg>`,
 coat:(c)=>`<svg viewBox="0 0 100 100"><path d="M34 6 L50 16 L66 6 L86 18 L92 90 L78 90 L74 50 L74 98 L26 98 L26 50 L22 90 L8 90 L14 18Z" fill="${c}"/><path d="M50 16 L40 50 L50 98 M50 16 L60 50" stroke="rgba(0,0,0,.25)" stroke-width="1.6" fill="none"/></svg>`,
 cargo:(c)=>`<svg viewBox="0 0 100 100"><path d="M28 4 H72 L78 96 H56 L50 34 L44 96 H22Z" fill="${c}"/><rect x="24" y="50" width="12" height="14" rx="2" fill="rgba(0,0,0,.2)"/><rect x="64" y="50" width="12" height="14" rx="2" fill="rgba(0,0,0,.2)"/><path d="M28 10 H72" stroke="rgba(0,0,0,.25)" stroke-width="2"/></svg>`,
 jeans:(c)=>`<svg viewBox="0 0 100 100"><path d="M30 4 H70 L76 96 H56 L50 30 L44 96 H24Z" fill="${c}"/><path d="M30 10 H70 M50 10 V30" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/></svg>`,
 sneaker:(c)=>`<svg viewBox="0 0 100 60"><path d="M6 40 Q8 18 24 16 L40 24 Q60 30 82 32 Q96 36 94 46 L6 48Z" fill="${c}"/><rect x="4" y="46" width="92" height="7" rx="3" fill="#e8e2d6"/><path d="M30 22 l6 8 M38 24 l5 8 M46 26 l4 8" stroke="rgba(255,255,255,.5)" stroke-width="2"/></svg>`,
 boot:(c)=>`<svg viewBox="0 0 100 60"><path d="M20 2 H46 V30 Q70 32 86 38 Q96 42 94 50 H18Z" fill="${c}"/><rect x="16" y="49" width="80" height="7" rx="2" fill="#2a2420"/></svg>`,
};
const outfits=[
 {t:"Today's Perfect Outfit",s:'Casual \u2022 Winter',top:G.jacket('#FFBB00'),mid:G.tee('#d8c7a3'),bot:G.cargo('#55575c'),shoe:G.sneaker('#2b2b2e')},
 {t:'Cozy Fall Stroll',s:'Casual \u2022 Fall',top:G.sweater('#2f6b47'),mid:G.tee('#e9e7e2'),bot:G.cargo('#c9b48a'),shoe:G.sneaker('#1d1d1f')},
 {t:'Rainy Day Layers',s:'Smart \u2022 Rain',top:G.coat('#2d3440'),mid:G.sweater('#c9b79c'),bot:G.jeans('#3b4a63'),shoe:G.boot('#3a2a1c')},
 {t:'Evening Plans',s:'Formal \u2022 Fall',top:G.coat('#1a1a1a'),mid:G.tee('#f3efe7'),bot:G.jeans('#222226'),shoe:G.boot('#111')},
];
const ic={
 home:'<path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4Z"/>',
 closet:'<path d="M8 4 L4 7 L6 11 L8 10 V20 H16 V10 L18 11 L20 7 L16 4 Q12 7 8 4Z"/>',
 cal:'<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10 H20 M8 3 V7 M16 3 V7"/>',
 prof:'<circle cx="12" cy="8" r="4"/><path d="M4 21 Q12 12 20 21"/>',
 x:'<path d="M6 6 L18 18 M18 6 L6 18"/>',redo:'<path d="M5 12 A7 7 0 1 0 8 6.5 M5 4 V9 H10"/>',
 heart:'<path d="M12 20 L4 12 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 20 12Z"/>',bm:'<path d="M7 4 H17 V20 L12 16 L7 20Z"/>',

};
const svg=(p,cls='')=>`<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const status=()=>`<div class="sb"><b>9:41</b><span><i></i><i></i><i></i><em></em></span></div>`;
const tabs=(on)=>`<nav class="tb">${[['home','Home'],['closet','Closet'],['cal','Calendar'],['prof','Profile']].map(([k,l])=>`<span class="${k===on?'on':''}">${svg(ic[k])}${l}</span>`).join('')}</nav><div class="hb"></div>`;
const greet=(sub)=>`<header class="gr"><span class="av"><img src="img/moda_white_logo.png" alt=""></span><div><b>Good morning!</b><small>${sub}</small></div></header>`;
const fitHTML=o=>`<div class="fl"><div class="g top">${o.top}</div><div class="g mid">${o.mid}</div><div class="g bot">${o.bot}</div><div class="g shoe">${o.shoe}</div></div>`;
const outfitCard=(o,chip='')=>`<div class="oc">${chip}<span class="bmk">${svg(ic.bm)}</span><div class="ocimg">${fitHTML(o)}</div><div class="oct"><b>${o.t}</b><small>${o.s}</small></div></div><div class="acts"><span>${svg(ic.x)}</span><span>${svg(ic.redo)}</span><span class="h">${svg(ic.heart)}</span></div>`;
const wx=[['\u2602','Rain','12\u00b0'],['\u2600','Sunny','24\u00b0'],['\u2744','Snow','-2\u00b0'],['\u2601','Cloudy','16\u00b0']];
const screens={
 home:()=>`${status()}${greet('Today')}${outfitCard(outfits[0])}${tabs('home')}`,
 weather:()=>`${status()}${greet('Today')}${outfitCard(outfits[2],`<span class="wx"><i>${wx[0][0]}</i><b>${wx[0][2]}</b>${wx[0][1]}</span>`)}${tabs('home')}`,
 calendar:()=>`${status()}<header class="hd"><b>Calendar</b><small>Plan your week</small></header>
  <div class="wk">${['M','T','W','T','F','S','S'].map((d,i)=>`<span class="${i===2?'on':''}"><small>${d}</small><b>${10+i}</b>${[1,2,4].includes(i)?'<i></i>':''}</span>`).join('')}</div>
  <div class="ev"><span class="bar"></span><div><small>2:00 PM</small><b class="evt">Work meeting</b><em class="evs">Smart casual</em></div></div>
  <div class="mini"><div class="ocimg">${fitHTML(outfits[3])}</div><div><b class="mt">Evening Plans</b><small>Planned outfit</small></div></div>${tabs('cal')}`,
 shop:()=>`${status()}<header class="hd"><b>ModaShop</b><small>Coming soon</small></header><div class="pages">
  <div class="pg p0"><div class="grid">${[G.jacket('#FFBB00'),G.sweater('#2f6b47'),G.coat('#2d3440'),G.tee('#d8c7a3'),G.jeans('#3b4a63'),G.sneaker('#2b2b2e')].map((g,i)=>`<div class="cl${i===2?' lst':''}">${g}${i===2?'<span class="badge">Listed</span>':''}</div>`).join('')}</div><p class="cap">Your closet</p></div>
  <div class="pg p1"><div class="sr"><div class="ocimg"><div class="fl one">${G.coat('#2d3440')}</div></div><div class="oct"><b>Sell Review</b><small>Wool overcoat • Not worn lately</small></div></div><div class="acts"><span>${svg(ic.x)}</span><span class="h sell">Sell</span></div><p class="cap">Keep or sell?</p></div>
  <div class="pg p2"><div class="sr"><div class="ocimg"><div class="fl one">${G.jacket('#FFBB00')}</div><span class="pick">Picked for your closet</span></div><div class="oct"><b>Varsity jacket</b><small>Goes with pieces you own</small></div></div><span class="offer">Make an offer</span><div class="nt"><b>New offer</b>Accept, decline or counter</div></div>
  <div class="pg p3"><div class="sold"><span class="chk">✓</span><b>You sold it!</b><small>Next, set up how you get paid.</small><span class="offer">Set up payouts</span></div><div class="nt sm"><b>Shipped</b>Your item is on the way</div></div>
 </div>${tabs('closet')}`,
 style:()=>`${status()}${greet('Today')}${outfitCard(outfits[1])}${tabs('home')}`,
};
document.querySelectorAll('.phone-ui').forEach(el=>{
  const k=el.dataset.screen;el.innerHTML=`<div class="scr s-${k}">${screens[k]()}</div><span class="isl"></span>`;
  el.setAttribute('role','img');
});
if(reduced){document.querySelectorAll('.s-shop').forEach(s=>s.dataset.p=2);return;}
const onView=(el,fn)=>{let id=null;new IntersectionObserver(es=>{const v=es[0].isIntersecting;if(v&&!id)id=fn();if(!v&&id){clearInterval(id);id=null}}).observe(el)};
const swap=(scr,list,ms,extra)=>{let i=0;return setInterval(()=>{const c=scr.querySelector('.oc');c.classList.add('out');
  setTimeout(()=>{i=(i+1)%list.length;const o=list[i];c.querySelector('.ocimg').innerHTML=fitHTML(o);c.querySelector('.oct b').textContent=o.t;c.querySelector('.oct small').textContent=o.s;extra&&extra(i,c);c.classList.remove('out')},350)},ms)};
document.querySelectorAll('.s-weather').forEach(s=>onView(s,()=>swap(s,[outfits[2],outfits[1],outfits[0],outfits[3]],2600,(i,c)=>{const w=wx[i];c.querySelector('.wx').innerHTML=`<i>${w[0]}</i><b>${w[2]}</b>${w[1]}`})));
document.querySelectorAll('.s-style,.s-home').forEach((s,n)=>onView(s,()=>swap(s,n?outfits:[outfits[1],outfits[3],outfits[0],outfits[2]],3000)));
const evs=[['2:00 PM','Work meeting','Smart casual',3],['7:30 PM','Dinner','Dressy',3],['9:00 AM','Travel day','Comfortable layers',2],['11:00 AM','Brunch','Relaxed',1]];
document.querySelectorAll('.s-calendar').forEach(s=>onView(s,()=>{let i=0;return setInterval(()=>{i=(i+1)%evs.length;const e=evs[i],ev=s.querySelector('.ev');ev.classList.add('out');
  setTimeout(()=>{ev.querySelector('small').textContent=e[0];ev.querySelector('.evt').textContent=e[1];ev.querySelector('.evs').textContent=e[2];
  s.querySelector('.mini .ocimg').innerHTML=fitHTML(outfits[e[3]]);s.querySelector('.mt').textContent=outfits[e[3]].t;
  s.querySelectorAll('.wk span').forEach((d,j)=>d.classList.toggle('on',j===[2,2,4,5][i]));ev.classList.remove('out')},300)},2800)}));
document.querySelectorAll('.s-shop').forEach(s=>{s.dataset.p=0;onView(s,()=>{let i=0;return setInterval(()=>{i=(i+1)%4;s.dataset.p=i},2600)})});
})();
