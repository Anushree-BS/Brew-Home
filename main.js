/* main.js - cart + checkout handling for Brew Home */

/*
Features:
- Add to cart (buttons with class 'add-btn' and data attributes)
- Cart stored in localStorage under key 'brewhome_cart'
- Update cart counts in nav
- Cart page shows items, can change qty, remove
- Checkout page shows summary from cart (or single product if ?product=slug provided)
- Payment submit simulates order, generates Order ID, clears cart, redirects to thankyou.html?orderId=XXXX
- thankyou.html reads orderId from URL and shows brief summary (if any)
*/

(function(){
  // Utility helpers
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEY = 'brewhome_cart_v1';
  const DELIVERY_FEE = 30;

  // Basic products DB (also embedded in pages via data attributes)
  const PRODUCTS = {
    cappuccino: { id:'cappuccino', title:'Cappuccino', price:220, image:'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=900&auto=format&fit=crop&ixlib=rb-4.0.3&s=3d8f0a8b7a7f' },
    coldbrew: { id:'coldbrew', title:'Cold Brew', price:180, image:'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?q=80&w=900&auto=format&fit=crop&ixlib=rb-4.0.3&s=5a2f1c1d6c07' },
    instant: { id:'instant', title:'Retro Instant', price:120, image:'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=900&auto=format&fit=crop&ixlib=rb-4.0.3&s=79929d7b8a3a' },
    cheesecake: { id:'cheesecake', title:'Classic Cheesecake', price:260, image:'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=900&auto=format&fit=crop&ixlib=rb-4.0.3&s=6d4a7b058d0f' },
    brownie: { id:'brownie', title:'Retro Brownie', price:140, image:'https://images.unsplash.com/photo-1527515637463-2b1b6b2f2f9e?q=80&w=900&auto=format&fit=crop&ixlib=rb-4.0.3&s=9a1c40e3b8a1' }
  };

  // localStorage helpers
  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) {
      console.warn('Failed to parse cart', e);
      return {};
    }
  }
  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }
  function addToCart(productId, title, price, image, qty=1) {
    const cart = loadCart();
    if (!cart[productId]) {
      cart[productId] = { id: productId, title, price: Number(price), image, qty: 0 };
    }
    cart[productId].qty += Number(qty);
    saveCart(cart);
    updateNavCount();
  }
  function removeFromCart(productId) {
    const cart = loadCart();
    if (cart[productId]) {
      delete cart[productId];
      saveCart(cart);
      updateNavCount();
    }
  }
  function updateQty(productId, qty) {
    const cart = loadCart();
    if (cart[productId]) {
      cart[productId].qty = Math.max(0, Number(qty));
      if (cart[productId].qty === 0) delete cart[productId];
      saveCart(cart);
      updateNavCount();
    }
  }
  function clearCart() {
    localStorage.removeItem(STORAGE_KEY);
    updateNavCount();
  }
  function cartTotals() {
    const cart = loadCart();
    let subtotal = 0, count=0, items=[];
    for (const k in cart) {
      const it = cart[k];
      subtotal += it.price * it.qty;
      count += it.qty;
      items.push(it);
    }
    return { subtotal, count, items };
  }

  // DOM updates
  function updateNavCount() {
    const { count } = cartTotals();
    qsa('#nav-cart-count, #nav-cart-count-2').forEach(el => el.textContent = count);
  }

  // Bind add-to-cart buttons (on any page)
  function bindAddButtons() {
    qsa('.add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        const price = btn.dataset.price;
        const image = btn.dataset.image;
        addToCart(id, title, price, image);
        btn.textContent = 'Added ✓';
        btn.disabled = true;
        setTimeout(()=>{ btn.textContent = 'Add to Cart'; btn.disabled = false; }, 1000);
      });
    });
  }

  // Populate Cart page
  function renderCartPage() {
    const cartList = $('cart-list');
    const cartEmpty = $('cart-empty');
    const orderSummary = $('order-summary');
    if (!cartList) return; // not on cart page

    const { items, subtotal } = cartTotals();
    cartList.innerHTML = '';
    if (!items.length) {
      cartEmpty.style.display = 'block';
      orderSummary.style.display = 'none';
      return;
    }
    cartEmpty.style.display = 'none';
    orderSummary.style.display = 'block';

    const summaryItems = $('summary-items');
    summaryItems.innerHTML = '';
    items.forEach(it => {
      // cart UI
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${it.image}" alt="${it.title}">
        <div class="meta">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>${it.title}</strong>
            <button class="btn btn-outline remove-item" data-id="${it.id}">Remove</button>
          </div>
          <div class="muted">₹ ${it.price} each</div>
          <div class="qty-control">
            <button class="qty-decrease" data-id="${it.id}">-</button>
            <input class="qty-input" data-id="${it.id}" value="${it.qty}" style="width:48px;text-align:center;border-radius:8px;border:1px solid rgba(0,0,0,0.06);padding:6px;">
            <button class="qty-increase" data-id="${it.id}">+</button>
          </div>
        </div>
      `;
      cartList.appendChild(div);

      const itemSummary = document.createElement('div');
      itemSummary.textContent = `${it.title} x ${it.qty} — ₹ ${it.price * it.qty}`;
      summaryItems.appendChild(itemSummary);
    });

    // subtotal & totals
    $('summary-subtotal').textContent = `₹ ${subtotal}`;
    $('summary-total').textContent = `₹ ${subtotal + DELIVERY_FEE}`;

    // bind removal and qty change
    qsa('.remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        removeFromCart(id);
        renderCartPage();
      });
    });
    qsa('.qty-decrease').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cart = loadCart();
        const current = cart[id] ? cart[id].qty : 1;
        updateQty(id, Math.max(0, current - 1));
        renderCartPage();
      });
    });
    qsa('.qty-increase').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cart = loadCart();
        const current = cart[id] ? cart[id].qty : 0;
        updateQty(id, current + 1);
        renderCartPage();
      });
    });
    qsa('.qty-input').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.dataset.id;
        const val = Number(input.value) || 0;
        updateQty(id, val);
        renderCartPage();
      });
    });
  }

  // Checkout page rendering
  function renderCheckout() {
    const checkoutSummary = $('checkout-summary');
    const checkoutTotal = $('checkout-total');
    const checkoutDelivery = $('checkout-delivery');

    if (!checkoutSummary) return;

    // If URL has product param, show only that single product (quick buy)
    const urlParams = new URLSearchParams(location.search);
    const singleProduct = urlParams.get('product');
    let items = [];

    if (singleProduct && PRODUCTS[singleProduct]) {
      items = [{ ...PRODUCTS[singleProduct], qty: 1 }];
    } else {
      const { items: cartItems } = cartTotals();
      items = cartItems;
    }

    if (!items.length) {
      checkoutSummary.innerHTML = '<div class="muted">No items in cart. Add items or use Quick Buy from products.</div>';
      checkoutTotal.textContent = `₹ 0`;
      return;
    }

    checkoutSummary.innerHTML = '';
    let subtotal = 0;
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'checkout-line';
      row.style.marginBottom = '8px';
      row.innerHTML = `<div style="display:flex;justify-content:space-between;"><span>${it.title} x ${it.qty}</span><span>₹ ${it.price * it.qty}</span></div>`;
      checkoutSummary.appendChild(row);
      subtotal += it.price * it.qty;
    });

    checkoutDelivery.textContent = `₹ ${DELIVERY_FEE}`;
    checkoutTotal.textContent = `₹ ${subtotal + DELIVERY_FEE}`;
  }

  // Handle checkout submit
  function bindCheckoutSubmit() {
    const form = qs('#checkout-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // basic validation – all required fields are HTML-required already
      const fullname = qs('#fullname').value.trim();
      const phone = qs('#phone').value.trim();
      const email = qs('#email').value.trim();
      const address = qs('#address').value.trim();

      if (!fullname || !phone || !email || !address) {
        alert('Please fill all required fields.');
        return;
      }

      // create order object
      const { items, subtotal } = cartTotals();
      // If user came via quick buy (product param), include that item instead of cart
      const urlParams = new URLSearchParams(location.search);
      const singleProduct = urlParams.get('product');
      let orderItems = items;
      if (singleProduct && PRODUCTS[singleProduct]) {
        orderItems = [{ ...PRODUCTS[singleProduct], qty: 1 }];
      }

      const order = {
        id: generateOrderId(),
        createdAt: new Date().toISOString(),
        customer: { fullname, phone, email, address },
        items: orderItems,
        subtotal,
        delivery: DELIVERY_FEE,
        total: subtotal + DELIVERY_FEE
      };

      // simulate "processing"
      // Save order summary to localStorage for thankyou page to optionally show (not required)
      const prevOrders = JSON.parse(localStorage.getItem('brewhome_orders_v1') || '[]');
      prevOrders.push(order);
      localStorage.setItem('brewhome_orders_v1', JSON.stringify(prevOrders));

      // Clear cart only if paying for cart items (if single product quick-buy, we do not clear storage)
      if (!singleProduct) clearCart();

      // redirect with orderId
      location.href = `thankyou.html?orderId=${order.id}`;
    });
  }

  // Thank you page handling
  function renderThankyou() {
    const orderSpan = $('order-id');
    if (!orderSpan) return;
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');
    orderSpan.textContent = orderId || '—';

    // attempt to show brief summary if stored
    const orders = JSON.parse(localStorage.getItem('brewhome_orders_v1') || '[]');
    const found = orders.find(o => o.id === orderId);
    const brief = $('order-summary-brief');
    if (found && brief) {
      const items = found.items.map(i => `${i.title} x ${i.qty}`).join(', ');
      brief.textContent = `Order: ${items} • Total: ₹ ${found.total} • Placed ${new Date(found.createdAt).toLocaleString()}`;
    } else if (brief) {
      brief.textContent = '';
    }

    // after payment redirect, we ensure main page link available (done in HTML)
  }

  // Small helpers
  function generateOrderId() {
    // Human-friendly order id: BH-YYYYMMDD-HHMM-XXXX
    const now = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
    const rand = Math.floor(Math.random()*9000)+1000;
    return `BH-${date}-${time}-${rand}`;
  }

  // Initialize interactive parts on all pages
  function init() {
    // set footer years
    qsa('#year, #year2, #year3, #year4, #year5').forEach(el => { if (el) el.textContent = new Date().getFullYear(); });

    updateNavCount();
    bindAddButtons();
    renderCartPage();
    renderCheckout();
    bindCheckoutSubmit();
    renderThankyou();

    // Hook filter buttons on home hero (if present)
    qsa('.filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;
        // simple behavior: go to products page and filter there via URL param
        if (location.pathname.endsWith('index.html') || location.pathname === '/' ) {
          location.href = `products.html?filter=${cat}`;
        } else {
          // if other page, we can try to filter product cards in place
          const cards = qsa('.product-card');
          cards.forEach(c => {
            if (cat === 'all' || c.dataset.category === cat) {
              c.style.display = '';
            } else {
              c.style.display = 'none';
            }
          });
        }
      });
    });

    // On products page, optionally filter by ?filter=
    const urlParams = new URLSearchParams(location.search);
    const filter = urlParams.get('filter');
    if (filter && qsa('.product-card').length) {
      const cards = qsa('.product-card');
      cards.forEach(c => {
        if (filter === 'all' || c.dataset.category === filter) c.style.display = '';
        else c.style.display = 'none';
      });
    }

    // Quick-buy support: if products page had a single product param and user clicked "Book Now", payments page will show that product in summary
    // Also, if on payments page, prefill persistent customer info if available (optional)
    const savedCustomer = JSON.parse(localStorage.getItem('brewhome_customer') || 'null');
    if (savedCustomer) {
      if (qs('#fullname')) qs('#fullname').value = savedCustomer.fullname || '';
      if (qs('#email')) qs('#email').value = savedCustomer.email || '';
      if (qs('#phone')) qs('#phone').value = savedCustomer.phone || '';
      if (qs('#address')) qs('#address').value = savedCustomer.address || '';
    }

    // When checkout form is submitted, save the basic customer details for next time
    const form = qs('#checkout-form');
    if (form) {
      form.addEventListener('submit', () => {
        const store = {
          fullname: qs('#fullname').value.trim(),
          phone: qs('#phone').value.trim(),
          email: qs('#email').value.trim(),
          address: qs('#address').value.trim()
        };
        localStorage.setItem('brewhome_customer', JSON.stringify(store));
      });
    }

    // On product "Book Now" links — if they include product param, payments page will render that product; otherwise the full cart
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();

})();
