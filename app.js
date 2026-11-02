/* Static concept archive. No prices, inventory, checkout or ordering. */
const grid = document.querySelector('#productGrid');
const dialog = document.querySelector('#productDialog');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const categoryNames = {chocolate:'초콜릿',cookie:'쿠키',tea:'차'};
let currentFilter = 'all';
let currentPage = '';
let lastOpener = null;
let openProductId = null;
let revealObserver;
let logoRun = 0;
const logoPaths = [...document.querySelectorAll('.logo-trace')];
const logoTimings = [[0,1100],[900,250],[1100,650],[1650,400],[1950,450],[2300,300],[2550,250]];
const logoAsset = new Image();
logoAsset.src = document.querySelector('.brand-drawing image').getAttribute('href');
// Wait for the original artwork, including on a slow first visit.
const logoReady = logoAsset.decode().then(()=>true,()=>false);
function stopBrandLogo() {
  logoRun++;
  logoPaths.forEach(path=>path.getAnimations().forEach(animation=>animation.cancel()));
}
async function playBrandLogo(explicit = false) {
  stopBrandLogo();
  const run = logoRun;
  if (motionPreference.matches && !explicit) return;
  const ready = await logoReady;
  if (!ready || run !== logoRun || currentPage !== 'brand' || document.hidden) return;
  // Two painted frames keep the first stroke visible after route changes.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if (run !== logoRun || currentPage !== 'brand' || document.hidden) return;
  logoPaths.forEach((path,index)=>{
    const [delay,duration] = logoTimings[index];
    path.animate([{strokeDashoffset:100},{strokeDashoffset:0}], {
      delay:delay+180,duration,easing:'ease-out',fill:'backwards'
    });
  });
}
motionPreference.addEventListener('change',()=>{
  if (motionPreference.matches) stopBrandLogo();
  else if (currentPage === 'brand') playBrandLogo();
});
document.addEventListener('visibilitychange',()=>{
  if (document.hidden) stopBrandLogo();
  else if (currentPage === 'brand') playBrandLogo();
});

function imageWindow(p, crop = p.crop, alt = p.alt, thumb = false) {
  const [x,y,w,h] = crop;
  const width = thumb ? Math.min(1,w/h)*100 : 100;
  return `<span class="image-window" style="--ratio:${w}/${h};--source-width:${w}px;width:${width}%"><img src="${p.image}" alt="${alt}" width="${p.size[0]}" height="${p.size[1]}" style="width:${p.size[0]/w*100}%;left:${-x/w*100}%;top:${-y/h*100}%" loading="lazy" decoding="async"></span>`;
}

function productCard(p, home = false) {
  const article = document.createElement('article');
  article.className = home ? 'selected-card reveal-target' : 'product-card reveal-target';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'product-card-button';
  button.dataset.product = p.id;
  button.setAttribute('aria-label', `${p.name} 기획 상세 보기`);
  button.innerHTML = `<span class="product-image">${imageWindow(p,p.crop,p.alt,true)}<span class="image-arrow" aria-hidden="true">↗</span></span><div class="product-meta"><div class="product-heading">${home?'<h3>':'<h2>'}${p.name}${home?'</h3>':'</h2>'}<span class="micro">${categoryNames[p.category]}</span></div><span class="product-lead">${p.lead}</span><span class="product-english">${p.en}</span></div>`;
  button.addEventListener('click',()=>openProduct(p,button));
  article.append(button);
  return article;
}

function renderProducts(filter = 'all') {
  currentFilter = ['chocolate','cookie','tea'].includes(filter) ? filter : 'all';
  const listed = currentFilter === 'all' ? products : products.filter(p=>p.category===currentFilter);
  document.querySelector('#shopCount').textContent = `${currentFilter==='all'?'전체':categoryNames[currentFilter]} ${listed.length}개`;
  document.querySelectorAll('[data-filter]').forEach(button=>{
    const selected = button.dataset.filter === currentFilter;
    button.classList.toggle('is-active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  grid.replaceChildren(...listed.map(p=>productCard(p)));
}

function openProduct(p, opener = null) {
  if (!dialog.open) lastOpener = opener || document.activeElement;
  openProductId = p.id;
  document.querySelector('#dialogContent').innerHTML = `
    <header class="detail-heading"><p class="eyebrow">${categoryNames[p.category]} / 기획 시안</p><h1 id="dialogTitle">${p.name}</h1><p class="detail-lead">${p.lead}</p><p class="micro">${p.en}</p></header>
    <figure class="detail-hero">${imageWindow(p)}<figcaption>${p.id==='cookie-tower'?'완성된 모습 · 투명 돔 안에 세운 쿠키탑.':'대표 장면 · 제품과 패키지 기획 시안.'}</figcaption></figure>
    <div class="detail-introduction"><p>${p.description}</p></div>
    <div class="detail-notes"><section><p class="eyebrow">01 / 출발점</p><h2>어디에서 시작했나요?</h2><p>${p.motif}</p></section><section><p class="eyebrow">02 / 제품과 패키지</p><h2>어떻게 옮겼나요?</h2><p>${p.interpretation}</p></section></div>
    <div class="detail-gallery">${p.details.map((d,i)=>`<section class="detail-section"><div><p class="eyebrow">${String(i+3).padStart(2,'0')} / 디테일</p><h2>${d.title}</h2><p>${d.text}</p></div><figure>${imageWindow(p,d.crop,d.alt)}<figcaption>${d.alt}</figcaption></figure></section>`).join('')}</div>
    <aside class="detail-disclaimer"><h2>현재는 기획 시안입니다.</h2><p>이미지는 제품과 패키지의 방향을 설명하기 위한 시안입니다. 실제 구성과 형태는 제작 과정에서 달라질 수 있으며, 출시 여부와 판매 일정은 확정되지 않았습니다.</p></aside>
    <section class="detail-related"><h2>함께 살펴볼 제품</h2><div>${p.related.map(id=>{const item=products.find(q=>q.id===id);return `<button type="button" class="related-product" data-related="${item.id}"><span>${item.name}<small>${item.lead}</small></span><span aria-hidden="true">↗</span></button>`}).join('')}</div></section>`;
  document.querySelectorAll('[data-related]').forEach(button=>button.addEventListener('click',()=>{
    const next = products.find(item=>item.id===button.dataset.related);
    if (location.hash.startsWith('#shop/product/')) history.replaceState(null,'',`#shop/product/${next.id}`);
    openProduct(next);
  }));
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('dialog-open');
  dialog.scrollTop = 0;
  document.querySelector('#closeDialog').focus({preventScroll:true});
}

function closeProduct() { if (dialog.open) dialog.close(); }
dialog.addEventListener('close',()=>{
  if (dialog.open) return;
  document.body.classList.remove('dialog-open');
  if (location.hash.startsWith('#shop/product/')) history.replaceState(null,'','#shop');
  const fallback = grid.querySelector(`[data-product="${openProductId}"]`);
  const target = lastOpener?.isConnected && lastOpener.matches('a,button') && lastOpener.getClientRects().length ? lastOpener : fallback;
  target?.focus({preventScroll:true});
  openProductId = null;
});
document.querySelector('#closeDialog').addEventListener('click',closeProduct);
document.querySelector('#dialogBack').addEventListener('click',()=>{
  closeProduct();
  if (currentPage !== 'shop') location.hash = '#shop';
});
dialog.addEventListener('click',event=>{
  const bounds=dialog.getBoundingClientRect();
  if (event.target===dialog && (event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)) closeProduct();
});

function setupScrollReveal() {
  revealObserver?.disconnect();
  const elements = document.querySelectorAll('.page:not([hidden]) .reveal-target');
  if (motionPreference.matches || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el=>el.classList.remove('reveal'));
    return;
  }
  revealObserver = new IntersectionObserver(entries=>entries.forEach(entry=>{
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }), {threshold:0.06,rootMargin:'0px 0px -16px 0px'});
  elements.forEach(el=>{
    const rect=el.getBoundingClientRect();
    el.classList.add('reveal');
    if(rect.top<innerHeight-16 && rect.bottom>0)el.classList.add('is-visible');
    if(!el.classList.contains('is-visible'))revealObserver.observe(el);
  });
}
motionPreference.addEventListener('change',setupScrollReveal);
document.addEventListener('focusin',event=>{
  const el=event.target.closest('.reveal');
  if(el){el.classList.add('is-visible');revealObserver?.unobserve(el)}
});

document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.filter;
  const hash=filter==='all'?'#shop':`#shop/${filter}`;
  if(location.hash===hash){renderProducts(filter);setupScrollReveal()}else location.hash=hash;
}));

function route() {
  const [requested,sub,id]=location.hash.slice(1).split('/');
  const page=['home','brand','shop','notice'].includes(requested)?requested:'home';
  const changed=page!==currentPage;
  const requestedProduct = page==='shop' && sub==='product' ? products.find(p=>p.id===id) : null;
  if(dialog.open && !requestedProduct)closeProduct();
  for(const name of ['home','brand','shop','notice']) {
    document.querySelector(`#page-${name}`).hidden=name!==page;
    const nav=document.querySelector(`[data-nav="${name}"]`);
    if(name===page)nav.setAttribute('aria-current','page');else nav.removeAttribute('aria-current');
  }
  currentPage=page;
  if(changed) {
    if(page==='brand')playBrandLogo();
    else stopBrandLogo();
  }
  if(page==='shop')renderProducts(sub);
  if(changed)window.scrollTo({top:0,behavior:'instant'});
  document.title=`${{home:'전주BURI',brand:'BRAND | 전주BURI',shop:'COLLECTION | 전주BURI',notice:'NOTICE | 전주BURI'}[page]} — 전주의 새로운 주전부리`;
  setupScrollReveal();
  if(requestedProduct)openProduct(requestedProduct);
  movingWindow.sync();
}
window.addEventListener('hashchange',route);
const selected=['lotus-giwa','gonggi-cookie','giwa-sleeve','lotus-tea'];
document.querySelector('#homeProductGrid').replaceChildren(...selected.map(id=>productCard(products.find(p=>p.id===id),true)));
renderProducts();
const movingWindow = setupMovingWindow();
route();

function setupMovingWindow() {
  const exhibition = [
    {id:'giwa-collection',crop:[0,0,1312,1199]},
    {id:'lotus-giwa',crop:[0,54,1254,1146]},
    {id:'gonggi-cookie',crop:[450,170,865,790]},
    {id:'lotus-tea',crop:[400,0,1120,1024]}
  ].map(item=>({...item,product:products.find(p=>p.id===item.id)}));
  const root=document.querySelector('.moving-window');
  const stage=root.querySelector('.window-stage');
  const name=root.querySelector('#windowName'), count=root.querySelector('#windowCount');
  const previous=root.querySelector('#windowPrevious'), next=root.querySelector('#windowNext');
  const play=root.querySelector('#windowPlay'), status=root.querySelector('#windowStatus');
  let index=0, timer, busy=false, inView=false, firstReady=false;
  let paused=motionPreference.matches, request=0, complete=null, suppressClickUntil=0;
  const images=new Map();
  const load=i=>{
    if(!images.has(i)) {
      const image=new Image();image.src=exhibition[i].product.image;
      images.set(i,image.decode().then(()=>true,()=>{images.delete(i);return false}));
    }
    return images.get(i);
  };
  const available=()=>currentPage==='home' && inView && !document.hidden && !dialog.open;
  const updateControls=()=>{
    previous.setAttribute('aria-disabled',String(busy));next.setAttribute('aria-disabled',String(busy));
    play.textContent=paused?'재생':'일시정지';
    play.setAttribute('aria-label',paused?'쇼윈도 자동 재생':'쇼윈도 자동 재생 일시정지');
  };
  const suspend=()=>{
    request++;
    if(complete)complete();
    busy=false;updateControls();
  };
  function sync() {
    clearTimeout(timer);
    if(!available())suspend();
    if(available() && !paused && !busy && firstReady)timer=setTimeout(()=>change(1,false),5500);
  }
  async function change(direction,manual=true) {
    if(busy || !available())return;
    clearTimeout(timer);busy=true;updateControls();
    const ticket=++request, target=(index+direction+exhibition.length)%exhibition.length;
    const ready=await load(target);
    if(ticket!==request)return;
    if(!ready || !available()) {
      busy=false;updateControls();
      if(manual)status.textContent='이미지를 불러오지 못했습니다. 다시 시도해 주세요.';
      sync();return;
    }
    const item=exhibition[target], old=stage.querySelector('.window-slide');
    const incoming=document.createElement('span');incoming.className='window-slide window-incoming';
    incoming.setAttribute('aria-hidden','true');incoming.innerHTML=imageWindow(item.product,item.crop);
    incoming.querySelector('img').loading='eager';
    const animations=[];
    complete=()=>{
      complete=null;
      index=target;incoming.classList.remove('window-incoming');incoming.removeAttribute('aria-hidden');
      old.remove();animations.forEach(a=>a.cancel());
      stage.href=`#shop/product/${item.id}`;stage.setAttribute('aria-label',`${item.product.name} 상세 보기`);
      name.textContent=item.product.name;count.textContent=`${String(index+1).padStart(2,'0')} / 04`;
      if(manual)status.textContent=`${item.product.name}, ${index+1} / 4`;
      busy=false;updateControls();load((index+1)%exhibition.length);sync();
    };
    stage.append(incoming);
    if(motionPreference.matches){complete();return}
    const options={duration:800,easing:'cubic-bezier(0.76, 0, 0.24, 1)',fill:'forwards'};
    animations.push(incoming.animate([{transform:'translateX(100%)'},{transform:'translateX(0)'}],options));
    animations.push(old.animate([{transform:'translateX(0)'},{transform:'translateX(-3%)'}],{...options,delay:80,duration:720}));
    Promise.all(animations.map(a=>a.finished)).then(()=>{if(ticket===request)complete?.()},()=>{});
  }
  previous.addEventListener('click',()=>change(-1));next.addEventListener('click',()=>change(1));
  play.addEventListener('click',()=>{paused=!paused;updateControls();sync()});
  stage.addEventListener('click',event=>{
    if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    event.preventDefault();
    if(busy || performance.now()<suppressClickUntil)return;
    openProduct(exhibition[index].product,stage);sync();
  });
  stage.addEventListener('dragstart',event=>event.preventDefault());
  stage.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft' || event.key==='ArrowRight') {
      event.preventDefault();change(event.key==='ArrowLeft'?-1:1);
    }
  });
  let touch=null;
  stage.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch' || !event.isPrimary)return;
    touch={x:event.clientX,y:event.clientY,id:event.pointerId};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointerup',event=>{
    if(!touch || event.pointerId!==touch.id)return;
    const dx=event.clientX-touch.x,dy=event.clientY-touch.y;touch=null;
    if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)*1.4) {
      suppressClickUntil=performance.now()+500;change(dx<0?1:-1);
    }
  });
  stage.addEventListener('pointercancel',()=>{touch=null});
  document.addEventListener('visibilitychange',sync);
  motionPreference.addEventListener('change',()=>{
    if(motionPreference.matches){paused=true;suspend()}
    updateControls();sync();
  });
  new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  if('IntersectionObserver' in window) {
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync()},{threshold:0}).observe(stage);
  } else inView=true;
  [previous,next,play].forEach(button=>button.hidden=false);updateControls();
  stage.querySelector('img').decode().then(()=>{
    firstReady=true;load(1);sync();
  },()=>{firstReady=true;sync()});
  return {sync};
}
