// ===== Cheniflora shared behaviour =====

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.classList.toggle('open');
    });
    // Close menu when a link is clicked
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.classList.remove('open');
      });
    });
  }

  /* Theme toggle: light / dark */
  const THEME_KEY = 'cheniflora_theme';
  const themeToggle = document.querySelectorAll('.theme-toggle');
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('theme-dark'); else root.classList.remove('theme-dark');
    // add a transient class to animate colors smoothly
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 420);
    if (themeToggle && themeToggle.length) themeToggle.forEach(btn => btn.setAttribute('data-theme', t));
  }
  function getSystemPref() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  // initialize theme
  let saved = localStorage.getItem(THEME_KEY);
  if (!saved) saved = getSystemPref();
  applyTheme(saved);
  if (themeToggle && themeToggle.length) {
    themeToggle.forEach(btn => btn.addEventListener('click', () => {
      const next = (document.documentElement.classList.contains('theme-dark')) ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    }));
  }

  // Mark active nav link based on current page
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });

  // Hide nav CTA button on build-gift.html
  if (path === 'build-gift.html') {
    const navCta = document.querySelector('.nav-cta');
    if (navCta) navCta.style.display = 'none';
  }

  // Logo click -> always home
  document.querySelectorAll('.logo').forEach(l => l.addEventListener('click', () => window.location.href = 'index.html'));

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 70);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => obs.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }

  // Wishlist persistence (per-session, in-memory + localStorage avoided per artifact rules -> use sessionStorage safe here since this is static site not artifact)
  const wishKey = 'cheniflora_wishlist';
  function getWish() { try { return JSON.parse(localStorage.getItem(wishKey)) || []; } catch (e) { return []; } }
  function setWish(arr) { localStorage.setItem(wishKey, JSON.stringify(arr)); updateWishBadge(); }
  function updateWishBadge() {
    const badge = document.querySelector('.wish-badge');
    if (badge) badge.textContent = getWish().length;
  }
  document.querySelectorAll('.card .card-heart').forEach(btn => {
    const id = btn.dataset.id;
    if (getWish().includes(id)) btn.classList.add('active');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      let wish = getWish();
      if (wish.includes(id)) { wish = wish.filter(x => x !== id); btn.classList.remove('active'); }
      else { wish.push(id); btn.classList.add('active'); }
      setWish(wish);
    });
  });
  updateWishBadge();

  // Cart badge (mock)
  const cartKey = 'cheniflora_cart_count';
  const cartBadge = document.querySelector('.cart-badge');
  if (cartBadge) cartBadge.textContent = localStorage.getItem(cartKey) || '0';

  // Navigation Search Bar Logic (Works on all pages)
  const searchInput = document.getElementById('navSearchInput');
  const searchBtn = document.getElementById('navSearchBtn');
  
  if (searchInput) {
    const performSearch = () => {
      const query = searchInput.value.trim();
      const isShopPage = window.location.pathname.endsWith('shop.html');
      
      if (isShopPage) {
        // Update URL query parameter without reloading
        const url = new URL(window.location.href);
        if (query) url.searchParams.set('q', query);
        else url.searchParams.delete('q');
        window.history.replaceState({}, '', url);
        
        // Trigger filtering if bento exists
        if (typeof filterAndPaginate === 'function') {
          filterAndPaginate();
        }
      } else {
        window.location.href = 'shop.html?q=' + encodeURIComponent(query);
      }
    };
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
    if (searchBtn) {
      searchBtn.addEventListener('click', performSearch);
    }
    
    // Prefill search input from URL parameter 'q'
    if (window.location.pathname.endsWith('shop.html')) {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) searchInput.value = q;
    }
  }

  // Filter & Pagination (shop page)
  const bento = document.querySelector('[data-paginated]');
  const pageBtns = document.querySelectorAll('.page-btn[data-page]');
  
  // Make filterAndPaginate globally referenceable for performSearch
  let filterAndPaginate = null;

  if (bento && pageBtns.length) {
    const cards = Array.from(bento.children);
    const perPage = 8;
    let activePage = 1;

    const occasionMap = {
      'birthday': ['bouquet-big-pink', 'wrap-yellow-lily', 'wrap-purple-lily', 'lily-bouquet', 'lily-bouquet-2', 'single-stem', 'single-stem-2'],
      'anniversary': ['bouquet-big-peach', 'wrap-blue-lily', 'wrap-purple-lily', 'lily-bouquet', 'lily-bouquet-2'],
      'friendship': ['keychain-fish', 'keychain-football', 'keychain-octopus', 'keychain-bear', 'keychain-sunflower', 'keychain-lily', 'keychain-evileye', 'keychain-daisy']
    };

    function getActiveFilters() {
      let category = 'all';
      let priceRange = 'any';
      let occasion = 'any';

      document.querySelectorAll('.filter-box .filter-group').forEach((group, index) => {
        const activeChip = group.querySelector('.filter-chip.active');
        if (activeChip) {
          const text = activeChip.textContent.trim().toLowerCase();
          if (index === 0) category = text; // Category
          else if (index === 1) priceRange = text; // Price
          else if (index === 2) occasion = text; // Occasion
        }
      });
      return { category, priceRange, occasion };
    }

    filterAndPaginate = function() {
      const { category, priceRange, occasion } = getActiveFilters();
      const searchQuery = (document.getElementById('navSearchInput')?.value || '').trim().toLowerCase();

      // 1. Filter cards
      const filteredCards = cards.filter(card => {
        // Tag filter
        const tag = card.querySelector('.card-tag').textContent.trim().toLowerCase();
        let matchCat = false;
        if (category === 'all') {
          matchCat = true;
        } else if (category === 'bouquets') {
          matchCat = (tag === 'bouquet' || tag === 'premium bouquet');
        } else if (category === 'single stems') {
          matchCat = (tag === 'single stem' || tag === 'single stem wrapped' || tag === 'gift wrapped');
        } else if (category === 'keychains') {
          matchCat = (tag === 'keychain');
        } else if (category === 'decor & pots') {
          matchCat = (tag === 'decor' || tag === 'desk decor');
        }

        // Price filter
        const priceText = card.querySelector('.price').textContent.replace(/[^\d]/g, '');
        const price = parseInt(priceText) || 0;
        let matchPrice = false;
        if (priceRange === 'any') {
          matchPrice = true;
        } else if (priceRange === 'under ₹100') {
          matchPrice = (price < 100);
        } else if (priceRange === '₹100 – ₹300') {
          matchPrice = (price >= 100 && price <= 300);
        } else if (priceRange === '₹300+') {
          matchPrice = (price >= 300);
        }

        // Occasion filter
        let matchOcc = false;
        const productId = card.querySelector('.card-heart').dataset.id;
        if (occasion === 'any') {
          matchOcc = true;
        } else {
          const allowedIds = occasionMap[occasion] || [];
          const baseId = productId.replace(/-2$/, '');
          matchOcc = allowedIds.includes(productId) || allowedIds.includes(baseId);
        }

        // Search filter
        const nameText = card.querySelector('.name').textContent.toLowerCase();
        const descText = card.querySelector('img').getAttribute('alt').toLowerCase();
        const matchSearch = !searchQuery || nameText.includes(searchQuery) || descText.includes(searchQuery) || tag.includes(searchQuery);

        return matchCat && matchPrice && matchOcc && matchSearch;
      });

      // 2. Hide all cards first
      cards.forEach(c => c.style.display = 'none');

      // 3. Paginate filtered cards
      const totalPages = Math.ceil(filteredCards.length / perPage) || 1;
      if (activePage > totalPages) activePage = totalPages;

      const start = (activePage - 1) * perPage;
      const end = activePage * perPage;
      const pageCards = filteredCards.slice(start, end);
      pageCards.forEach(c => c.style.display = '');

      // 4. Update pagination controls visibility/active state
      pageBtns.forEach(btn => {
        const pageNum = Number(btn.dataset.page);
        btn.style.display = (pageNum <= totalPages) ? '' : 'none';
        btn.classList.toggle('active', pageNum === activePage);
      });
    }

    // Add click listeners to all chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.parentElement.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activePage = 1; // Reset to page 1 on filter change
        filterAndPaginate();
      });
    });

    // Add click listeners to page buttons
    pageBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activePage = Number(btn.dataset.page);
        filterAndPaginate();
        bento.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Initial load
    filterAndPaginate();
  }

  // Contact form mock submit
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      document.querySelector('.form-success').classList.add('show');
      contactForm.reset();
    });
  }

  // ===== Hero Carousel Slider =====
  const heroSlides = document.querySelectorAll('.hero-slide');
  const heroIndicators = document.querySelectorAll('.slider-indicators .indicator');
  const heroPrev = document.querySelector('.slider-arrow.prev');
  const heroNext = document.querySelector('.slider-arrow.next');

  if (heroSlides.length > 0) {
    let currentSlide = 0;
    let autoSlideInterval;
    const slideDuration = 3000; // 3 seconds per slide

    function showSlide(index) {
      if (index >= heroSlides.length) currentSlide = 0;
      else if (index < 0) currentSlide = heroSlides.length - 1;
      else currentSlide = index;

      heroSlides.forEach((slide, idx) => {
        slide.classList.toggle('active', idx === currentSlide);
      });

      heroIndicators.forEach((indicator, idx) => {
        indicator.classList.toggle('active', idx === currentSlide);
      });
    }

    function startAutoSlide() {
      stopAutoSlide();
      autoSlideInterval = setInterval(() => {
        showSlide(currentSlide + 1);
      }, slideDuration);
    }

    function stopAutoSlide() {
      if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
      }
    }

    heroIndicators.forEach((indicator) => {
      indicator.addEventListener('click', () => {
        const index = parseInt(indicator.dataset.index);
        showSlide(index);
        startAutoSlide();
      });
    });

    if (heroPrev) {
      heroPrev.addEventListener('click', () => {
        showSlide(currentSlide - 1);
        startAutoSlide();
      });
    }

    if (heroNext) {
      heroNext.addEventListener('click', () => {
        showSlide(currentSlide + 1);
        startAutoSlide();
      });
    }

    const heroSection = document.querySelector('.hero-slider-section');
    if (heroSection) {
      heroSection.addEventListener('mouseenter', stopAutoSlide);
      heroSection.addEventListener('mouseleave', startAutoSlide);
    }

    showSlide(0);
    startAutoSlide();
  }

  // ===== Testimonials Slide Carousel =====
  const testTrack = document.getElementById('test-track');
  const testSlides = document.querySelectorAll('.test-card-slide');
  const testIndicators = document.querySelectorAll('#test-indicators .indicator');
  const testPrev = document.getElementById('test-prev');
  const testNext = document.getElementById('test-next');

  if (testTrack && testSlides.length > 0) {
    let currentTest = 0;
    let autoTestInterval;
    const testDuration = 5000;

    function showTestimonial(index) {
      if (index >= testSlides.length) currentTest = 0;
      else if (index < 0) currentTest = testSlides.length - 1;
      else currentTest = index;

      testTrack.style.transform = `translateX(-${currentTest * 100}%)`;

      testIndicators.forEach((indicator, idx) => {
        indicator.classList.toggle('active', idx === currentTest);
      });
    }

    function startAutoTest() {
      stopAutoTest();
      autoTestInterval = setInterval(() => {
        showTestimonial(currentTest + 1);
      }, testDuration);
    }

    function stopAutoTest() {
      if (autoTestInterval) clearInterval(autoTestInterval);
    }

    testIndicators.forEach(indicator => {
      indicator.addEventListener('click', () => {
        const index = parseInt(indicator.dataset.index);
        showTestimonial(index);
        startAutoTest();
      });
    });

    if (testPrev) {
      testPrev.addEventListener('click', () => {
        showTestimonial(currentTest - 1);
        startAutoTest();
      });
    }

    if (testNext) {
      testNext.addEventListener('click', () => {
        showTestimonial(currentTest + 1);
        startAutoTest();
      });
    }

    const testContainer = document.querySelector('.testimonials-carousel-container');
    if (testContainer) {
      testContainer.addEventListener('mouseenter', stopAutoTest);
      testContainer.addEventListener('mouseleave', startAutoTest);
    }

    showTestimonial(0);
    startAutoTest();
  }

  // ===== Dynamic Wishlist & Cart Drawers =====
  const PRODUCTS = {
    'lily-bouquet': {name:'Blush Lily Bouquet', price:420, img:'assets/bouquet_pink.jpg'},
    'blue-bouquet': {name:'Indigo Lily Stems', price:300, img:'assets/bouquet_blue.jpg'},
    'single-stem': {name:'Single Stem Flower', price:80, img:'assets/flowers_mixed.jpg'},
    'flowerpot': {name:'Desk Daisy Pot', price:250, img:'assets/flowerpot.jpg'},
    'keychain-bear': {name:'Bear Keychain', price:50, img:'assets/keychain_4.jpg'},
    'keychain-football': {name:'Football Keychain', price:45, img:'assets/keychain_2.jpg'},
    'keychain-fish': {name:'Goldfish Keychain', price:45, img:'assets/keychain_1.jpg'},
    'keychain-octopus': {name:'Octopus Keychain', price:50, img:'assets/keychain_3.jpg'},
    'keychain-sunflower': {name:'Sunflower Keychain', price:45, img:'assets/keychain_sunflower.png'},
    'keychain-lily': {name:'Lily Keychain', price:45, img:'assets/keychain_lily.png'},
    'keychain-evileye': {name:'Evil Eye Keychain', price:45, img:'assets/keychain_evileye.png'},
    'keychain-daisy': {name:'Daisy Keychain', price:45, img:'assets/keychain_daisy.png'},
    'wrap-pink': {name:'Single Lily, Wrapped', price:130, img:'assets/wrap_1.jpg'},
    'wrap-sunflower': {name:'Sunflower Stem, Wrapped', price:130, img:'assets/wrap_2.jpg'},
    'wrap-maroon': {name:'Wine Lily, Wrapped', price:130, img:'assets/wrap_3.jpg'},
    'wrap-blue': {name:'Sky Blue Stem, Wrapped', price:130, img:'assets/wrap_4.jpg'},
    'wrap-yellow-lily': {name:'Yellow Lily, Gift Wrapped', price:140, img:'assets/wrap_yellow_lily.png'},
    'wrap-blue-lily': {name:'Blue Lily, Gift Wrapped', price:140, img:'assets/wrap_blue_lily.png'},
    'wrap-purple-lily': {name:'Purple Lily, Gift Wrapped', price:140, img:'assets/wrap_purple_lily.jpg'},
    'wrap-sunflower-big': {name:'Sunflower Bouquet, Wrapped', price:200, img:'assets/wrap_sunflower_big.jpg'},
    'bouquet-big-pink': {name:'Pink Lily Premium Bouquet', price:400, img:'assets/bouquet_big_pink.jpg'},
    'bouquet-big-peach': {name:'Peach Lily Grand Bouquet', price:500, img:'assets/bouquet_big_peach.png'},
    'pot-bear-hearts': {name:'Bear & Hearts Pot', price:300, img:'assets/pot_bear_hearts.png'},
    'pot-sunflower': {name:'Sunflower Desk Pot', price:300, img:'assets/pot_sunflower.png'},
    'pot-pink-daisy': {name:'Pink Daisy Desk Pot', price:300, img:'assets/pot_pink_daisy.png'},
    'pot-blue-hydrangea': {name:'Blue Hydrangea Pot', price:300, img:'assets/pot_blue_hydrangea.png'},
    'pot-white-daisy': {name:'White Daisy Desk Pot', price:300, img:'assets/pot_white_daisy.png'}
  };

  function initDrawers() {
    const overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    document.body.appendChild(overlay);

    const wishDrawer = document.createElement('div');
    wishDrawer.className = 'drawer wish-drawer';
    wishDrawer.innerHTML = `
      <div class="drawer-header">
        <h3>Your Wishlist</h3>
        <button class="drawer-close">&times;</button>
      </div>
      <div class="drawer-content wish-drawer-content"></div>
    `;
    document.body.appendChild(wishDrawer);

    const cartDrawer = document.createElement('div');
    cartDrawer.className = 'drawer cart-drawer';
    cartDrawer.innerHTML = `
      <div class="drawer-header">
        <h3>Shopping Cart</h3>
        <button class="drawer-close">&times;</button>
      </div>
      <div class="drawer-content cart-drawer-content"></div>
      <div class="drawer-footer">
        <div class="drawer-total"><span>Total items:</span><span id="cart-total-qty">0</span></div>
        <button class="btn btn-primary checkout-btn" style="width:100%; justify-content:center;">Proceed to Checkout</button>
      </div>
    `;
    document.body.appendChild(cartDrawer);

    const wishBtn = document.querySelector('.wish-btn');
    const cartBtn = document.querySelector('.cart-btn');
    const closeBtns = document.querySelectorAll('.drawer-close');

    if (wishBtn) {
      wishBtn.addEventListener('click', () => {
        renderWishlist();
        wishDrawer.classList.add('open');
        overlay.classList.add('open');
      });
    }

    if (cartBtn) {
      cartBtn.addEventListener('click', () => {
        renderCart();
        cartDrawer.classList.add('open');
        overlay.classList.add('open');
      });
    }

    closeBtns.forEach(btn => {
      btn.addEventListener('click', closeAllDrawers);
    });

    overlay.addEventListener('click', closeAllDrawers);

    function closeAllDrawers() {
      wishDrawer.classList.remove('open');
      cartDrawer.classList.remove('open');
      overlay.classList.remove('open');
    }

    function renderWishlist() {
      const content = wishDrawer.querySelector('.wish-drawer-content');
      const wishList = getWish();
      if (wishList.length === 0) {
        content.innerHTML = '<div class="drawer-empty-msg">Your wishlist is empty.</div>';
        return;
      }

      content.innerHTML = '';
      wishList.forEach(id => {
        const item = PRODUCTS[id] || { name: 'Unknown Flower', price: 0, img: 'assets/flowers_mixed.jpg' };
        const div = document.createElement('div');
        div.className = 'drawer-item';
        div.innerHTML = `
          <img src="${item.img}" alt="${item.name}">
          <div class="drawer-item-info">
            <div class="drawer-item-name">${item.name}</div>
            <div class="drawer-item-price">₹${item.price}</div>
            <button class="drawer-item-remove" data-id="${id}">Remove</button>
          </div>
        `;
        div.querySelector('.drawer-item-remove').addEventListener('click', () => {
          let wish = getWish().filter(x => x !== id);
          setWish(wish);
          document.querySelectorAll(`.card-heart[data-id="${id}"]`).forEach(btn => btn.classList.remove('active'));
          if (typeof key !== 'undefined' && key === id) {
            const wBtn = document.getElementById('dWishBtn');
            if (wBtn) wBtn.classList.remove('active');
          }
          renderWishlist();
        });
        content.appendChild(div);
      });
    }

    function renderCart() {
      const content = cartDrawer.querySelector('.cart-drawer-content');
      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem('cheniflora_cart')) || [];
      } catch (e) {
        cart = [];
      }

      const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
      document.getElementById('cart-total-qty').textContent = totalCount;

      if (cart.length === 0) {
        content.innerHTML = '<div class="drawer-empty-msg">Your cart is empty.</div>';
        return;
      }

      content.innerHTML = '';
      cart.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'drawer-item';
        div.innerHTML = `
          <img src="${item.img}" alt="${item.name}">
          <div class="drawer-item-info">
            <div class="drawer-item-name">${item.name}</div>
            <div class="drawer-item-price">₹${item.price} x ${item.qty}</div>
            <button class="drawer-item-remove" data-index="${index}">Remove</button>
          </div>
        `;
        div.querySelector('.drawer-item-remove').addEventListener('click', () => {
          cart.splice(index, 1);
          localStorage.setItem('cheniflora_cart', JSON.stringify(cart));
          const newTotal = cart.reduce((sum, i) => sum + i.qty, 0);
          localStorage.setItem('cheniflora_cart_count', newTotal);
          const badge = document.querySelector('.cart-badge');
          if (badge) badge.textContent = newTotal;
          renderCart();
        });
        content.appendChild(div);
      });
    }

    cartDrawer.querySelector('.checkout-btn').addEventListener('click', () => {
      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem('cheniflora_cart')) || [];
      } catch (e) {
        cart = [];
      }
      if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
      }
      alert('Thank you for your order! In a real store, you would proceed to payment. 🌸');
      localStorage.setItem('cheniflora_cart', JSON.stringify([]));
      localStorage.setItem('cheniflora_cart_count', 0);
      const badge = document.querySelector('.cart-badge');
      if (badge) badge.textContent = 0;
      closeAllDrawers();
    });
  }

  // Initialize drawers on load
  initDrawers();
});
