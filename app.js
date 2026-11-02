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
  if(page==='shop')renderProducts(sub);
  if(changed)window.scrollTo({top:0,behavior:'instant'});
  document.title=`${{home:'전주BURI',brand:'BRAND | 전주BURI',shop:'COLLECTION | 전주BURI',notice:'NOTICE | 전주BURI'}[page]} — 전주의 새로운 주전부리`;
  setupScrollReveal();
  if(requestedProduct)openProduct(requestedProduct);
}
window.addEventListener('hashchange',route);
const selected=['lotus-giwa','gonggi-cookie','giwa-sleeve','lotus-tea'];
document.querySelector('#homeProductGrid').replaceChildren(...selected.map(id=>productCard(products.find(p=>p.id===id),true)));
renderProducts();
route();
