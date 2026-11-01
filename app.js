/*
 * 전주BURI — 브랜드 사이트 초기 버전
 * 현재는 상품을 소개하는 정적 사이트이며 결제 및 주문은 구현되어 있지 않습니다.
 * 아래 products 배열을 추후 상품 DB/API로 교체할 수 있도록 상품 정보를 분리했습니다.
 */
const products = [
  { id:'giwa-sleeve', name:'기와 · 단청', en:'GIWA / DANCHEONG', category:'chocolate', categoryLabel:'CHOCOLATE', image:'assets/giwa-sleeve.webp', alt:'단청 무늬 상자 속에 기와 지붕 곡선을 닮은 초콜릿이 놓인 상품 이미지', description:'기와의 유려한 곡선을 초콜릿의 형태로 담았습니다. 단청의 색과 패턴을 입힌 긴 패키지까지, 전주의 건축적 아름다움을 새로운 선물로 상상한 시안입니다.' },
  { id:'jeonju-moon', name:'전주의 달', en:'THE MOON OF JEONJU', category:'chocolate', categoryLabel:'CHOCOLATE', image:'assets/jeonju-moon.webp', alt:'주황색과 분홍색 용 일러스트 패키지에 초콜릿이 담긴 상품 이미지', description:'유쾌한 용의 표정과 대담한 색채를 통해 전통의 상징을 친근하게 풀어낸 초콜릿 시안입니다. 패키지 하단의 작은 창을 통해 한 알의 초콜릿을 보여줍니다.' },
  { id:'giwa-collection', name:'기와 · 문양', en:'GIWA / PATTERNS', category:'chocolate', categoryLabel:'CHOCOLATE', image:'assets/giwa-collection.webp', alt:'다양한 기와와 수막새 문양으로 만든 다섯 가지 초콜릿과 네이비 상자', description:'기와의 선, 수막새의 꽃무늬, 지붕의 반복적인 리듬을 서로 다른 다섯 조각의 초콜릿으로 풀어낸 컬렉션 시안입니다.' },
  { id:'lotus-giwa', name:'연꽃기와', en:'LOTUS GIWA', category:'chocolate', categoryLabel:'CHOCOLATE', image:'assets/lotus-giwa.webp', alt:'주황색 박스와 연꽃 문양이 새겨진 사각 초콜릿 이미지', description:'연꽃을 연상시키는 커다란 그래픽과 절제된 초콜릿 장식을 대비시켰습니다. 선물상자를 열었을 때 한 조각에 시선이 머물도록 기획한 시안입니다.' },
  { id:'hanok-pop-up', name:'한옥 초콜릿', en:'HANOK CHOCOLATE', category:'chocolate', categoryLabel:'CHOCOLATE', image:'assets/hanok-pop-up.webp', alt:'뚜껑을 열면 한옥 모양 입체 팝업이 펼쳐지는 초콜릿 선물상자', description:'초콜릿 상자를 여는 행위 자체가 한옥을 만나는 경험이 되도록 구상했습니다. 뚜껑 안쪽의 팝업 구조와 초콜릿이 함께 놓이는 패키지 시안입니다.' },
  { id:'hanok-cookie', name:'기와쿠키', en:'GIWA COOKIE', category:'cookie', categoryLabel:'COOKIE', image:'assets/hanok-cookie.webp', alt:'한옥 기와 지붕 형태의 입체 패키지에 담긴 길쭉한 쿠키', description:'한옥의 지붕과 기둥을 닮은 상자 안에 쿠키를 담은 패키지 시안입니다. 전통 건축을 손에 올려둘 수 있는 작은 먹거리 오브제로 재해석했습니다.' },
  { id:'lotus-tea', name:'연꽃차', en:'LOTUS TEA', category:'tea', categoryLabel:'TEA', image:'assets/lotus-tea.webp', alt:'연잎밥에서 착안한 녹색 잎 패키지와 연잎 모양 티백 태그', description:'연잎으로 감싼 연잎밥의 모습을 포장 구조에 적용하고, 잎 모양 태그를 찻잔 가장자리에 끼울 수 있도록 구상한 차 패키지 시안입니다.' },
  { id:'cookie-tower', name:'쿠키탑', en:'COOKIE TOWER', category:'cookie', categoryLabel:'COOKIE', image:'assets/cookie-tower.webp', alt:'투명 돔 안에 슬롯으로 쌓아 만든 쿠키탑과 조립 방법을 보여주는 이미지', description:'조각을 끼워 탑을 완성하는 조립형 쿠키입니다. 먹기 전 간단히 쌓아 보는 즐거움을 투명 돔 패키지에 담았습니다.' },
  { id:'gonggi-cookie', name:'공기쿠키', en:'GONGGI COOKIE', category:'cookie', categoryLabel:'COOKIE', image:'assets/gonggi-cookie.webp', alt:'분홍색 하늘색 연두색 아이싱을 얹은 공기 모양 쿠키와 투명 틴 스타일 용기', description:'우리에게 익숙한 공기놀이의 모양과 색을 아기자기한 쿠키로 옮겼습니다. 투명한 원통 패키지 너머로 알록달록한 색감을 드러내는 시안입니다.' }
];

const grid = document.querySelector('#productGrid');
const shopCount = document.querySelector('#shopCount');
const dialog = document.querySelector('#productDialog');
let currentFilter = 'all';
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let revealObserver;

function setupScrollReveal() {
  revealObserver?.disconnect();
  const activePage = document.querySelector('.page:not([hidden])');
  const elements = activePage.querySelectorAll(
    '.editorial-heading, .selected-card, .collection-note, .category-tile, ' +
    '.editorial-story > *, .brand-visual, .brand-manifesto, .brand-bottom-photo, .product-card'
  );
  if (motionPreference.matches || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.remove('reveal'));
    return;
  }
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
  elements.forEach(el => {
    const bounds = el.getBoundingClientRect();
    const inView = bounds.top < window.innerHeight - 24 && bounds.bottom > 0;
    const staggered = el.matches('.selected-card, .category-tile, .product-card');
    const index = staggered ? Array.from(el.parentElement.children).indexOf(el) : 0;
    // Small stagger; no scroll listeners or continuous parallax on mobile.
    el.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
    el.classList.add('reveal');
    el.classList.toggle('is-visible', inView);
    if (!inView) revealObserver.observe(el);
  });
}

motionPreference.addEventListener('change', setupScrollReveal);
document.addEventListener('focusin', event => {
  const target = event.target.closest('.reveal');
  if (target) {
    target.classList.add('is-visible');
    revealObserver?.unobserve(target);
  }
});

function renderProducts() {
  const listed = currentFilter === 'all' ? products : products.filter(p => p.category === currentFilter);
  shopCount.textContent = String(listed.length).padStart(2,'0') + ' OBJECTS';
  grid.replaceChildren(...listed.map((p) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-card-button';
    button.setAttribute('aria-label', p.name + ' 상세 보기');
    button.innerHTML = `
      <div class="product-image">
        <img src="${p.image}" alt="${p.alt}" loading="lazy" decoding="async">
        <span class="product-image-index">${String(products.indexOf(p)+1).padStart(2,'0')} / 09</span>
        <span class="product-image-corner" aria-hidden="true">↗</span>
      </div>
      <div class="product-meta"><div><h2>${p.name}</h2><p>${p.en}</p></div><span class="product-status">${p.categoryLabel}</span></div>
    `;
    button.addEventListener('click',()=>openProduct(p));
    card.appendChild(button);
    return card;
  }));
}

function openProduct(p) {
  document.querySelector('#dialogImage').src = p.image;
  document.querySelector('#dialogImage').alt = p.alt;
  document.querySelector('#dialogTitle').textContent = p.name;
  document.querySelector('#dialogEnglish').textContent = p.en;
  document.querySelector('#dialogEyebrow').textContent = `${p.categoryLabel} / ${String(products.indexOf(p)+1).padStart(2,'0')} OF 09`;
  document.querySelector('#dialogDescription').textContent = p.description;
  dialog.showModal();
  document.querySelector('#closeDialog').focus();
}
function closeProduct() { dialog.close(); }
document.querySelector('#closeDialog').addEventListener('click',closeProduct);
document.querySelector('#dialogBack').addEventListener('click',closeProduct);
dialog.addEventListener('click',e=>{if(e.target===dialog) closeProduct()});

function setFilter(filter) {
  currentFilter = ['chocolate','cookie','tea'].includes(filter) ? filter : 'all';
  document.querySelectorAll('[data-filter]').forEach(el=>{
    const selected=el.dataset.filter===currentFilter;
    el.classList.toggle('is-active',selected);
    el.setAttribute('aria-pressed',String(selected));
  });
  renderProducts();
}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  const hash=button.dataset.filter==='all'?'#shop':'#shop/'+button.dataset.filter;
  if(location.hash===hash) {
    setFilter(button.dataset.filter);
    setupScrollReveal();
  } else location.hash=hash;
}));

function renderHomeProducts() {
  const selectedIds=['giwa-collection','jeonju-moon','gonggi-cookie','lotus-tea'];
  document.querySelector('#homeProductGrid').replaceChildren(...selectedIds.map(id=>{
    const p=products.find(item=>item.id===id);
    const card=document.createElement('article');
    card.className='selected-card';
    const button=document.createElement('button');
    button.type='button';
    button.setAttribute('aria-label',p.name+' 상세 보기');
    button.innerHTML=`<div class="selected-image"><img src="${p.image}" alt="${p.alt}" loading="lazy" decoding="async"></div><div class="selected-meta"><div><h3>${p.name}</h3><p>${p.en}</p></div><span aria-hidden="true">↗</span></div>`;
    button.addEventListener('click',()=>openProduct(p));
    card.append(button);
    return card;
  }));
}

function route() {
  const requested = location.hash.replace('#','').split('/')[0];
  const page = ['home','brand','shop','notice'].includes(requested)?requested:'home';
  for(const name of ['home','brand','shop','notice']){
    document.querySelector(`#page-${name}`).hidden = name!==page;
    const link=document.querySelector(`[data-nav="${name}"]`);
    if (name===page) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  }
  if(page==='shop')setFilter(location.hash.split('/')[1]);
  if(dialog.open)dialog.close();
  window.scrollTo({top:0,behavior:'instant'});
  document.title = `${page==='home'?'전주BURI':({brand:'BRAND',shop:'SHOP',notice:'NOTICE'}[page]+' | 전주BURI')} — 전주의 새로운 주전부리`;
  setupScrollReveal();
}

window.addEventListener('hashchange',route);
renderProducts();
renderHomeProducts();
route();
