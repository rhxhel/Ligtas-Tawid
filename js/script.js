const backToTop = document.querySelector('.back-to-top');
const about = document.querySelector('#about');

function updateBackToTop() {
  const threshold = (about?.offsetTop ?? window.innerHeight) - 120;
  backToTop?.classList.toggle('is-visible', window.scrollY >= threshold);
}

backToTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', updateBackToTop, { passive: true });
window.addEventListener('resize', updateBackToTop);
updateBackToTop();

document.querySelectorAll('.team-photo').forEach((photo) => {
  const revealPhoto = () => photo.parentElement?.classList.add('has-photo');
  const hidePhoto = () => { photo.hidden = true; };

  photo.addEventListener('load', revealPhoto);
  photo.addEventListener('error', hidePhoto);

  if (photo.complete) {
    if (photo.naturalWidth > 0) revealPhoto();
    else hidePhoto();
  }
});

const carousel = document.querySelector('.hardware-carousel');
if (carousel) {
  const slides = [...carousel.querySelectorAll('.hardware-slide')];
  const dots = [...carousel.querySelectorAll('.carousel-dots button')];
  const counter = carousel.querySelector('.carousel-count b');
  const previous = carousel.querySelector('.carousel-prev');
  const next = carousel.querySelector('.carousel-next');
  const motionClasses = ['is-entering-next', 'is-entering-prev', 'is-leaving-next', 'is-leaving-prev'];
  let active = 0;
  let timer;
  let cleanupTimer;
  let ready = false;

  function showSlide(index, direction) {
    const target = (index + slides.length) % slides.length;

    if (!ready) {
      // first render: no animation
      ready = true;
      slides.forEach((slide, i) => {
        slide.hidden = slide.dataset.failed === 'true';
        slide.classList.toggle('is-active', i === target);
      });
    } else if (target !== active) {
      const dir = direction || (target > active ? 1 : -1);
      const outgoing = slides[active];
      const incoming = slides[target];

      clearTimeout(cleanupTimer);
      slides.forEach((slide) => slide.classList.remove(...motionClasses));

      outgoing.classList.remove('is-active');
      outgoing.classList.add(dir > 0 ? 'is-leaving-next' : 'is-leaving-prev');

      incoming.classList.add('is-active', dir > 0 ? 'is-entering-next' : 'is-entering-prev');

      cleanupTimer = setTimeout(() => {
        slides.forEach((slide) => slide.classList.remove(...motionClasses));
      }, 700);

      // restart the counter pop
      if (counter) {
        counter.classList.remove('is-bump');
        void counter.offsetWidth;
        counter.classList.add('is-bump');
      }
    }

    active = target;
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === active;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
    if (counter) counter.textContent = String(active + 1).padStart(2, '0');
  }

  function stopAutoplay() {
    window.clearInterval(timer);
  }

  function startAutoplay() {
    stopAutoplay();
    timer = window.setInterval(() => showSlide(active + 1, 1), 5000);
  }

  slides.forEach((slide) => {
    slide.addEventListener('error', () => {
      slide.dataset.failed = 'true';
      slide.hidden = true;
    });
  });
  previous?.addEventListener('click', () => { showSlide(active - 1, -1); startAutoplay(); });
  next?.addEventListener('click', () => { showSlide(active + 1, 1); startAutoplay(); });
  dots.forEach((dot, index) => dot.addEventListener('click', () => { showSlide(index); startAutoplay(); }));
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);
  carousel.addEventListener('focusin', stopAutoplay);
  carousel.addEventListener('focusout', startAutoplay);

  showSlide(0);
  startAutoplay();
}

const demoTriggers = document.querySelectorAll('[data-demo-trigger]');
const demoDialogs = document.querySelectorAll('[data-demo-dialog]');

demoDialogs.forEach((dialog) => document.body.appendChild(dialog));

function closeDemo() {
  demoDialogs.forEach((dialog) => {
    dialog.hidden = true;
  });
  document.body.classList.remove('modal-open');
}

function openDemo(index) {
  closeDemo();
  const dialog = document.querySelector(`[data-demo-dialog="${index}"]`);
  if (!dialog) return;

  dialog.hidden = false;
  document.body.classList.add('modal-open');
  dialog.querySelector('[data-demo-close]')?.focus();
}

demoTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => openDemo(trigger.dataset.demoTrigger));
});

demoDialogs.forEach((dialog) => {
  dialog.querySelector('[data-demo-close]')?.addEventListener('click', closeDemo);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDemo();
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDemo();
});

/* Team carousel (phones only, infinite loop, click + swipe + mouse drag; desktop layout untouched) */
const teamGrid = document.querySelector('.team-grid');
if (teamGrid) {
  const originals = [...teamGrid.querySelectorAll('.team-card')];
  const lead = originals.find((card) =>
    /project\s*lead/i.test(card.querySelector('.team-role')?.textContent || '')
  );
  const ordered = lead ? [lead, ...originals.filter((c) => c !== lead)] : originals;
  const n = ordered.length;
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Clones need their own photo handling because the earlier listeners ran before they existed */
  function wirePhoto(photo) {
    const reveal = () => photo.parentElement?.classList.add('has-photo');
    const hide = () => { photo.hidden = true; };
    photo.addEventListener('load', reveal);
    photo.addEventListener('error', hide);
    if (photo.complete) (photo.naturalWidth > 0 ? reveal : hide)();
  }

  function makeClone(card) {
    const clone = card.cloneNode(true);
    clone.classList.add('team-clone');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.querySelectorAll('.team-photo').forEach((img) => { img.alt = ''; wirePhoto(img); });
    return clone;
  }

  const before = ordered.map(makeClone);
  const after = ordered.map(makeClone);
  /* Appended after the real cards so desktop/tablet nth-child layouts keep working */
  teamGrid.append(...before, ...after);

  /* Visual order on phones: [clones][Project Lead first ... last][clones] */
  const slides = [...before, ...ordered, ...after];
  slides.forEach((card, k) => card.style.setProperty('--o', k));

  const controls = document.createElement('div');
  controls.className = 'team-carousel-controls';
  controls.innerHTML = `
    <button class="team-prev" type="button" aria-label="Previous team member">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
    </button>
    <div class="team-dots" role="group" aria-label="Choose team member"></div>
    <button class="team-next" type="button" aria-label="Next team member">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>
    </button>`;
  teamGrid.insertAdjacentElement('afterend', controls);

  const dotsWrap = controls.querySelector('.team-dots');
  const dots = ordered.map((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show ${card.querySelector('h3')?.textContent.trim() || 'member ' + (i + 1)}`);
    dot.addEventListener('click', () => scrollToSlide(n + i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  const centerOf = (card) => card.offsetLeft - (teamGrid.clientWidth - card.offsetWidth) / 2;

  function nearestIndex() {
    const center = teamGrid.scrollLeft + teamGrid.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  }

  function updateDots() {
    const active = nearestIndex() % n;
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === active);
      dot.setAttribute('aria-current', i === active ? 'true' : 'false');
    });
  }

  function scrollToSlide(i) {
    const idx = Math.max(0, Math.min(slides.length - 1, i));
    teamGrid.scrollTo({
      left: centerOf(slides[idx]),
      behavior: reduceMotion.matches ? 'auto' : 'smooth'
    });
  }

  /* Instant, invisible jump (snap is paused so it can't fight the jump) */
  function jumpToSlide(i) {
    const prevSnap = teamGrid.style.scrollSnapType;
    teamGrid.style.scrollSnapType = 'none';
    teamGrid.scrollLeft = centerOf(slides[i]);
    requestAnimationFrame(() => { teamGrid.style.scrollSnapType = prevSnap; });
  }

  /* If we've settled on a clone, jump to the identical real card */
  function normalize() {
    if (!mobileQuery.matches) return;
    const idx = nearestIndex();
    if (idx < n || idx >= 2 * n) jumpToSlide(n + (idx % n));
    updateDots();
  }

  controls.querySelector('.team-prev').addEventListener('click', () => scrollToSlide(nearestIndex() - 1));
  controls.querySelector('.team-next').addEventListener('click', () => scrollToSlide(nearestIndex() + 1));

  let settleTimer;
  let touching = false;
  let dragging = false;
  const scheduleNormalize = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (touching || dragging) return;
      normalize();
      teamGrid.classList.remove('is-dragging'); // re-enable snap once settled
    }, 120);
  };

  teamGrid.addEventListener('scroll', () => {
    if (!mobileQuery.matches) return;
    updateDots();
    scheduleNormalize();
  }, { passive: true });
  teamGrid.addEventListener('touchstart', () => { touching = true; }, { passive: true });
  teamGrid.addEventListener('touchend', () => { touching = false; scheduleNormalize(); }, { passive: true });
  teamGrid.addEventListener('touchcancel', () => { touching = false; scheduleNormalize(); }, { passive: true });

  /* Mouse drag-to-swipe (touch already scrolls natively) */
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragStartIndex = 0;

  teamGrid.addEventListener('dragstart', (e) => e.preventDefault());

  teamGrid.addEventListener('pointerdown', (e) => {
    if (!mobileQuery.matches || e.pointerType === 'touch' || e.button !== 0) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartScroll = teamGrid.scrollLeft;
    dragStartIndex = nearestIndex();
    teamGrid.classList.add('is-dragging');
    teamGrid.setPointerCapture(e.pointerId);
  });

  teamGrid.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    teamGrid.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (teamGrid.hasPointerCapture?.(e.pointerId)) teamGrid.releasePointerCapture(e.pointerId);

    const dx = e.clientX - dragStartX;
    let target = nearestIndex();
    /* A short flick still moves one card in the dragged direction */
    if (target === dragStartIndex && Math.abs(dx) > 40) {
      target = dragStartIndex + (dx < 0 ? 1 : -1);
    }
    scrollToSlide(target);
    scheduleNormalize(); // re-enables snap and handles the loop jump
  }

  teamGrid.addEventListener('pointerup', endDrag);
  teamGrid.addEventListener('pointercancel', endDrag);

  function resetTeamCarousel() {
    if (mobileQuery.matches) {
      jumpToSlide(n); // start on Project Lead
      updateDots();
    } else {
      teamGrid.scrollLeft = 0;
    }
  }

  mobileQuery.addEventListener('change', resetTeamCarousel);
  window.addEventListener('load', resetTeamCarousel);
  window.addEventListener('resize', () => {
    if (mobileQuery.matches) { jumpToSlide(nearestIndex()); updateDots(); }
  });
  resetTeamCarousel();
}

/* Keep the hero traffic light and the footer traffic light in sync */
const signalAnimNames = new Set([
  'heroGreen', 'heroAmber', 'heroRed',
  'footerGreen', 'footerAmber', 'footerRed'
]);

function syncSignalLights() {
  document.getAnimations().forEach((anim) => {
    if (signalAnimNames.has(anim.animationName)) {
      anim.startTime = 0; // every light now runs from the same page clock
    }
  });
}

let signalSyncTimer;
const scheduleSignalSync = () => {
  clearTimeout(signalSyncTimer);
  signalSyncTimer = setTimeout(syncSignalLights, 150);
};

window.addEventListener('load', syncSignalLights);
window.addEventListener('resize', scheduleSignalSync); // the footer light is re-created when it shows or hides on phones
syncSignalLights();

/* Foundation cards: pop-up details */
const infoCards = document.querySelectorAll('[data-info-card]');
const infoDialogs = document.querySelectorAll('[data-info-dialog]');
let lastInfoTrigger = null;

infoDialogs.forEach((dialog) => document.body.appendChild(dialog));

function closeInfo() {
  let wasOpen = false;
  infoDialogs.forEach((dialog) => {
    if (!dialog.hidden) wasOpen = true;
    dialog.hidden = true;
  });
  if (wasOpen) {
    document.body.classList.remove('modal-open');
    lastInfoTrigger?.focus();
    lastInfoTrigger = null;
  }
}

function openInfo(index, trigger) {
  closeInfo();
  const dialog = document.querySelector(`[data-info-dialog="${index}"]`);
  if (!dialog) return;
  lastInfoTrigger = trigger;
  dialog.hidden = false;
  document.body.classList.add('modal-open');
  dialog.querySelector('[data-info-close]')?.focus();
}

infoCards.forEach((card) => {
  card.addEventListener('click', () =>
    openInfo(card.dataset.infoCard, card.querySelector('.card-arrow'))
  );
});

infoDialogs.forEach((dialog) => {
  dialog.querySelector('[data-info-close]')?.addEventListener('click', closeInfo);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeInfo();
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeInfo();
});

/* Scroll progress bar (shown after the cover) */
(() => {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  let ticking = false;
  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.setProperty('--p', p.toFixed(4));
    bar.classList.toggle('is-visible', window.scrollY > (about?.offsetTop ?? window.innerHeight) - 120);
    ticking = false;
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
})();

/* Scroll-reveal animations (everything below the cover page) */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('js-anim');

  /* [selector, effect]. Siblings of the same selector get a staggered delay. */
  const fxTargets = [
    ['.section-label', 'stamp'],
    ['.section .eyebrow', 'up'],
    ['.section h2', 'up'],
    ['.about-columns p', 'up'],
    ['.chips li', 'pop'],
    ['.meaning-wrap', 'drop'],
    ['.objective-card', 'up'],
    ['.process-lede', 'right'],
    ['.process-list article', 'left'],
    ['.hardware-note', 'right'],
    ['.component-photo', 'left'],
    ['.feature-kicker', 'up'],
    ['.features li', 'up'],
    ['footer .footer-top', 'up'],
    ['footer h2', 'up'],
    ['.foot-nav a', 'pop'],
    ['.footer-return', 'drop'],
    ['.footer-road', 'wipe'],
    ['.footer-bottom', 'up']
  ];

  const targets = [];
  fxTargets.forEach(([selector, fx]) => {
    const perParent = new Map();
    document.querySelectorAll(selector).forEach((el) => {
      const index = perParent.get(el.parentElement) || 0;
      perParent.set(el.parentElement, index + 1);
      el.dataset.fx = fx;
      el.style.setProperty('--d', `${Math.min(index * 0.1, 0.4)}s`);
      targets.push(el);
    });
  });

  /* Containers that only need an .is-in flag (lines, grids) */
  const marks = [
    ...document.querySelectorAll('.process-list, .team-grid, .objectives .section-heading > div:last-child')
  ];

  /* Section dividers */
  const sections = [...document.querySelectorAll('.section')];

  function observe(elements, options) {
    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, options);
    elements.forEach((el) => io.observe(el));
  }

  observe([...targets, ...marks], { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  observe(sections, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
})();

/* Mobile navbar: three-bar menu toggle */
(() => {
  const nav = document.querySelector('.route-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (!nav || !toggle) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));

  nav.querySelectorAll('.route-links a').forEach((link) =>
    link.addEventListener('click', () => setOpen(false))
  );

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) setOpen(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', () => setOpen(false));
})();
