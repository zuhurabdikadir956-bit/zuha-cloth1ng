const CART_STORAGE_KEY = "zuha-shopping-bag";
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-navigation");
const searchToggle = document.querySelector(".search-toggle");
const searchPanel = document.querySelector("#site-search");
const cartItemsContainer = document.querySelector("#cart-items");
const cartContent = document.querySelector("#cart-content");
const emptyCart = document.querySelector("#empty-cart");
const cartError = document.querySelector("#cart-error");
const bagStatus = document.querySelector("#bag-status");
const cartBadge = document.querySelector(".cart-count");
const cartLinks = document.querySelectorAll(".cart-button");

let cart = [];
let cartStorageReady = true;

function isCartItem(item) {
  return item
    && typeof item.name === "string"
    && typeof item.image === "string"
    && Number.isFinite(item.price)
    && item.price >= 0
    && typeof item.size === "string"
    && Number.isInteger(item.quantity)
    && item.quantity > 0
    && (item.color === undefined || typeof item.color === "string")
    && (item.currency === undefined || typeof item.currency === "string");
}

function showCartError(message) {
  if (cartError) {
    cartError.textContent = message;
    cartError.hidden = false;
  }
  console.error(message);
}

try {
  const savedCart = localStorage.getItem(CART_STORAGE_KEY);
  if (savedCart) {
    const parsedCart = JSON.parse(savedCart);
    if (!Array.isArray(parsedCart) || !parsedCart.every(isCartItem)) {
      throw new TypeError("Saved shopping bag data has an invalid format.");
    }
    cart = parsedCart;
  }
} catch (error) {
  cartStorageReady = false;
  showCartError("We couldn’t load your saved bag. Please check your browser storage and reload the page.");
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    cartStorageReady = false;
    showCartError("We couldn’t save your bag. Please check your browser storage settings.");
  }
}

function updateCartBadge() {
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  if (cartBadge) cartBadge.textContent = String(itemCount);
  cartLinks.forEach((link) => {
    link.setAttribute("aria-label", `Shopping bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`);
  });
}

function money(amount, currency = "$") {
  if (currency === "KSh") return `KSh ${amount.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
  return `$${amount.toFixed(2)}`;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderCart() {
  updateCartBadge();
  if (!cartItemsContainer || !cartContent || !emptyCart) return;

  if (!cartStorageReady) {
    cartContent.hidden = true;
    emptyCart.hidden = true;
    return;
  }

  const hasItems = cart.length > 0;
  cartContent.hidden = !hasItems;
  emptyCart.hidden = hasItems;
  cartItemsContainer.replaceChildren();

  cart.forEach((item, index) => {
    const row = createElement("article", "cart-item");
    const image = createElement("img", "cart-item-image");
    image.src = item.image;
    image.alt = item.name;
    image.loading = "lazy";

    const details = createElement("div", "cart-item-details");
    const name = createElement("h3", "cart-item-name", item.name);
    if (item.color) details.append(name, createElement("p", "cart-item-color", item.color));
    else details.append(name);
    const sizeLabel = createElement("label", "cart-size-label", "Size");
    const sizeSelect = createElement("select", "cart-size-select");
    sizeSelect.dataset.cartAction = "size";
    sizeSelect.dataset.cartIndex = String(index);
    sizeSelect.setAttribute("aria-label", `Size for ${item.name}`);

    ["XS", "S", "M", "L", "XL", "XXL"].forEach((size) => {
      const option = createElement("option", "", size);
      option.value = size;
      option.selected = item.size === size;
      sizeSelect.append(option);
    });
    if (!["XS", "S", "M", "L", "XL", "XXL"].includes(item.size)) {
      const option = createElement("option", "", item.size);
      option.value = item.size;
      option.selected = true;
      sizeSelect.append(option);
    }
    sizeLabel.append(sizeSelect);

    const unitPrice = createElement("p", "cart-item-price", money(item.price, item.currency));
    details.append(sizeLabel, unitPrice);

    const quantity = createElement("div", "cart-quantity");
    quantity.setAttribute("aria-label", `Quantity for ${item.name}`);
    const decrease = createElement("button", "quantity-button", "−");
    decrease.type = "button";
    decrease.dataset.cartAction = "decrease";
    decrease.dataset.cartIndex = String(index);
    decrease.setAttribute("aria-label", `Decrease ${item.name} quantity`);
    decrease.disabled = item.quantity <= 1;
    const quantityValue = createElement("span", "quantity-value", String(item.quantity));
    quantityValue.setAttribute("aria-live", "polite");
    const increase = createElement("button", "quantity-button", "+");
    increase.type = "button";
    increase.dataset.cartAction = "increase";
    increase.dataset.cartIndex = String(index);
    increase.setAttribute("aria-label", `Increase ${item.name} quantity`);
    quantity.append(decrease, quantityValue, increase);

    const lineTotal = createElement("p", "cart-line-total", money(item.price * item.quantity, item.currency));
    const remove = createElement("button", "remove-item", "Remove");
    remove.type = "button";
    remove.dataset.cartAction = "remove";
    remove.dataset.cartIndex = String(index);
    remove.setAttribute("aria-label", `Remove ${item.name} from bag`);

    const actions = createElement("div", "cart-item-actions");
    actions.append(quantity, lineTotal, remove);
    row.append(image, details, actions);
    cartItemsContainer.append(row);
  });

  const currency = cart[0]?.currency;
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const delivery = subtotal >= 100 ? 0 : 8;
  document.querySelector("#cart-subtotal").textContent = money(subtotal, currency);
  document.querySelector("#cart-delivery").textContent = delivery === 0 ? "Free" : money(delivery, currency);
  document.querySelector("#cart-total").textContent = money(subtotal + delivery, currency);
  document.querySelector("#delivery-note").textContent = delivery === 0
    ? "Your order qualifies for complimentary delivery."
    : `Complimentary delivery on orders over $100.`;
}

const shopGrid = document.querySelector("#shop-product-grid");
const categoryFilters = document.querySelectorAll("[data-category-filter]");
const shopSort = document.querySelector("#shop-sort");
const catalogueCount = document.querySelector("#catalogue-count");
const shopEmptyResults = document.querySelector("#shop-empty-results");
let selectedShopCategory = "all";
let shopSearchQuery = "";

function updateShopCatalogue() {
  if (!shopGrid) return;

  const products = [...shopGrid.querySelectorAll(".shop-product-card")];
  const sortOrder = shopSort ? shopSort.value : "featured";
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedShopCategory === "all" || product.dataset.category === selectedShopCategory;
    const matchesSearch = product.textContent.toLowerCase().includes(shopSearchQuery);
    return matchesCategory && matchesSearch;
  });

  filteredProducts.sort((first, second) => {
    if (sortOrder === "featured") return Number(first.dataset.position) - Number(second.dataset.position);
    const firstPrice = Number(first.querySelector(".product-price").textContent.replace(/[^\d.]/g, ""));
    const secondPrice = Number(second.querySelector(".product-price").textContent.replace(/[^\d.]/g, ""));
    return sortOrder === "price-low" ? firstPrice - secondPrice : secondPrice - firstPrice;
  });

  products.forEach((product) => {
    product.hidden = !filteredProducts.includes(product);
  });
  filteredProducts.forEach((product) => shopGrid.append(product));

  if (catalogueCount) {
    catalogueCount.textContent = `Showing ${filteredProducts.length} ${filteredProducts.length === 1 ? "piece" : "pieces"}`;
  }
  if (shopEmptyResults) shopEmptyResults.hidden = filteredProducts.length > 0;
}

if (shopGrid) {
  [...shopGrid.querySelectorAll(".shop-product-card")].forEach((product, index) => {
    product.dataset.position = String(index);
  });

  categoryFilters.forEach((filter) => {
    filter.addEventListener("click", () => {
      selectedShopCategory = filter.dataset.categoryFilter;
      categoryFilters.forEach((categoryFilter) => {
        const isSelected = categoryFilter === filter;
        categoryFilter.classList.toggle("is-active", isSelected);
        categoryFilter.setAttribute("aria-pressed", String(isSelected));
      });
      updateShopCatalogue();
    });
  });

  if (shopSort) shopSort.addEventListener("change", updateShopCatalogue);
  updateShopCatalogue();
}

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    navigation.classList.toggle("is-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navigation.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    }
  });
}

if (searchToggle && searchPanel) {
  searchToggle.addEventListener("click", () => {
    const isOpen = searchToggle.getAttribute("aria-expanded") === "true";
    searchToggle.setAttribute("aria-expanded", String(!isOpen));
    searchToggle.setAttribute("aria-label", isOpen ? "Open search" : "Close search");
    searchPanel.hidden = isOpen;
    if (!isOpen) document.querySelector("#search-input").focus();
  });

  searchPanel.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = new FormData(searchPanel).get("q").toString().trim();
    if (!query) return;

    if (shopGrid) {
      shopSearchQuery = query.toLowerCase();
      updateShopCatalogue();
      document.querySelector("#catalogue").scrollIntoView({ behavior: "smooth" });
      return;
    }

    const products = [...document.querySelectorAll(".product-card")];
    if (!products.length) {
      const stylesheetLink = document.querySelector('link[rel="stylesheet"]');
      const stylesheetUrl = new URL(stylesheetLink.getAttribute("href"), window.location.href);
      const siteDirectory = new URL(".", stylesheetUrl);
      window.location.href = new URL("index.html#new-arrivals", siteDirectory).href;
      return;
    }

    products.forEach((product) => {
      product.hidden = !product.textContent.toLowerCase().includes(query.toLowerCase());
    });
    const resultsSection = document.querySelector("#new-arrivals, .related-products-section");
    if (resultsSection) resultsSection.scrollIntoView({ behavior: "smooth" });
  });
}

document.querySelectorAll("[data-product]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!cartStorageReady) {
      if (bagStatus) bagStatus.textContent = "Your shopping bag is unavailable. Please check your browser storage settings.";
      return;
    }

    const productCard = button.closest(".product-card");
    const productName = button.dataset.product;
    const priceText = productCard.querySelector(".product-price").textContent;
    const image = productCard.querySelector("img").getAttribute("src");
    const price = Number(priceText.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(price) || !image) {
      showCartError(`Could not add ${productName}: product information is incomplete.`);
      return;
    }

    const currency = productCard.querySelector(".product-price").dataset.currency;
    const existingItem = cart.find((item) => item.name === productName && item.size === "M" && item.currency === currency);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ name: productName, image, price, size: "M", quantity: 1, currency });
    }
    saveCart();
    renderCart();
    if (bagStatus) bagStatus.textContent = `${productName} added to your bag.`;
  });
});

const productPurchaseForm = document.querySelector("#product-purchase-form");
if (productPurchaseForm) {
  const productQuantity = document.querySelector("#product-quantity");
  const productImage = document.querySelector("#product-main-image");
  const productAddStatus = document.querySelector("#product-add-status");

  productPurchaseForm.addEventListener("click", (event) => {
    const stepButton = event.target.closest("[data-quantity-step]");
    if (!stepButton) return;

    const step = Number(stepButton.dataset.quantityStep);
    const min = Number(productQuantity.min) || 1;
    const max = Number(productQuantity.max) || Number.MAX_SAFE_INTEGER;
    const current = Number(productQuantity.value) || min;
    productQuantity.value = String(Math.min(max, Math.max(min, current + step)));
  });

  productPurchaseForm.addEventListener("change", (event) => {
    if (event.target.name === "color") {
      document.querySelector(".selected-color-name").textContent = event.target.value;
    }
  });

  document.querySelectorAll("[data-gallery-image]").forEach((thumbnail) => {
    thumbnail.addEventListener("click", () => {
      productImage.src = thumbnail.dataset.galleryImage;
      productImage.alt = thumbnail.dataset.galleryAlt;
      document.querySelectorAll("[data-gallery-image]").forEach((imageButton) => {
        const isSelected = imageButton === thumbnail;
        imageButton.classList.toggle("is-active", isSelected);
        imageButton.setAttribute("aria-pressed", String(isSelected));
      });
    });
  });

  productPurchaseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!cartStorageReady) {
      productAddStatus.textContent = "Your shopping bag is unavailable. Please check your browser storage settings.";
      return;
    }

    const formData = new FormData(productPurchaseForm);
    const size = formData.get("size");
    const quantity = Number(formData.get("quantity"));
    const color = formData.get("color");
    const productName = document.querySelector("#product-title").textContent.trim();
    const priceElement = document.querySelector(".product-detail-price");
    const price = Number(priceElement.textContent.replace(/[^\d.]/g, ""));
    if (!size || !Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(price)) {
      productAddStatus.textContent = "Please choose a size and valid quantity before adding this item.";
      return;
    }

    const existingItem = cart.find((item) => item.name === productName
      && item.size === size && item.color === color && item.currency === priceElement.dataset.currency);
    if (existingItem) existingItem.quantity += quantity;
    else {
      cart.push({
        name: productName,
        image: productImage.src,
        price,
        size,
        color,
        currency: priceElement.dataset.currency,
        quantity
      });
    }
    saveCart();
    renderCart();
    productAddStatus.textContent = `${productName}, size ${size}, added to your bag.`;
  });
}

if (cartItemsContainer) {
  cartItemsContainer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-action]");
    if (!button || !cartStorageReady) return;

    const index = Number(button.dataset.cartIndex);
    const item = cart[index];
    if (!item) return;

    if (button.dataset.cartAction === "increase") item.quantity += 1;
    if (button.dataset.cartAction === "decrease" && item.quantity > 1) item.quantity -= 1;
    if (button.dataset.cartAction === "remove") cart.splice(index, 1);
    saveCart();
    renderCart();
  });

  cartItemsContainer.addEventListener("change", (event) => {
    const select = event.target.closest('[data-cart-action="size"]');
    if (!select || !cartStorageReady) return;

    const index = Number(select.dataset.cartIndex);
    const item = cart[index];
    if (!item) return;

    const duplicate = cart.find((candidate, candidateIndex) => (
      candidateIndex !== index
      && candidate.name === item.name
      && candidate.size === select.value
      && candidate.color === item.color
      && candidate.currency === item.currency
    ));
    if (duplicate) {
      duplicate.quantity += item.quantity;
      cart.splice(index, 1);
    } else {
      item.size = select.value;
    }
    saveCart();
    renderCart();
  });
}

const checkoutButton = document.querySelector("#checkout-button");
if (checkoutButton) {
  checkoutButton.addEventListener("click", () => {
    const checkoutMessage = document.querySelector("#checkout-message");
    checkoutMessage.textContent = cart.length
      ? "Checkout is not available yet. Your bag is saved while we get things ready."
      : "Add an item to your bag before checking out.";
  });
}

const newsletterForm = document.querySelector(".newsletter-form");
if (newsletterForm) {
  newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const emailInput = newsletterForm.querySelector('input[type="email"]');
    if (!emailInput.reportValidity()) return;

    newsletterForm.querySelector(".newsletter-message").textContent = "Thanks for joining us. Keep an eye on your inbox!";
    newsletterForm.reset();
  });
}

const currentYear = document.querySelector("#current-year");
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

renderCart();
