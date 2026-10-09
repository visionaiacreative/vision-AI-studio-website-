// Header background on scroll
const header = document.getElementById('siteHeader');
const onScroll = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 12);
};
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Logo on the home page: back to the top, and keep the address bar on the clean URL
// (a plain #top link would leave "/#top" behind).
const brand = document.querySelector('.site-header .brand[href="#top"]');
if (brand) brand.addEventListener('click', e => {
  e.preventDefault();
  window.scrollTo({ top: 0 });
  history.replaceState(null, '', location.pathname + location.search);
});

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
menuToggle.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('is-open');
  header.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
});
mobileNav.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileNav.classList.remove('is-open');
    header.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});

// Motion is off when the OS asks for reduced motion, or the visitor chose "stop animations"
// in the accessibility menu (html.a11y-still). Anything that autoplays checks motionOff().
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionOff = () => reduceMotion.matches || document.documentElement.classList.contains('a11y-still');

// Hero video — seamless loop: two stacked copies crossfade before the clip ends.
// A visible pause button lets anyone stop it (WCAG 2.2.2 — moving content over 5s).
const heroVideos = document.querySelectorAll('.hero-video');
if (heroVideos.length === 2) {
  const FADE = 1.2; // seconds, matches the CSS opacity transition
  let active = 0;
  let swapping = false;
  let userPaused = false;
  const canPlay = () => !motionOff() && !userPaused;

  heroVideos.forEach(v => { v.loop = false; v.muted = true; });

  // portrait screens play the dedicated vertical cut (picked by <source media>);
  // re-run source selection when the orientation flips, and match the poster
  const portrait = window.matchMedia('(orientation: portrait)');
  const setPoster = () => {
    heroVideos[0].poster = portrait.matches ? 'assets/hero-poster-mobile-v2.jpg' : 'assets/hero-poster-v2.jpg';
  };
  setPoster();
  portrait.addEventListener('change', () => {
    setPoster();
    heroVideos.forEach(v => { v.pause(); v.load(); });
    if (canPlay()) heroVideos[active].play().catch(() => {});
  });

  const swap = () => {
    const current = heroVideos[active];
    const next = heroVideos[1 - active];
    swapping = true;
    next.currentTime = 0;
    next.play().catch(() => {});
    next.classList.add('is-active');
    current.classList.remove('is-active');
    active = 1 - active;
    setTimeout(() => { current.pause(); swapping = false; }, FADE * 1000);
  };

  heroVideos.forEach((v, i) => {
    v.addEventListener('timeupdate', () => {
      if (i !== active || swapping || !v.duration) return;
      if (v.duration - v.currentTime <= FADE) swap();
    });
    // fallback if timeupdate was too coarse to catch the window
    v.addEventListener('ended', () => { if (i === active && !swapping) swap(); });
  });

  const pauseBtn = document.querySelector('.hero-pause');
  const syncPauseBtn = () => {
    if (!pauseBtn) return;
    const paused = !canPlay();
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.querySelector('.hero-pause-label').textContent = paused ? 'הפעלת וידאו' : 'עצירת וידאו';
    pauseBtn.classList.toggle('is-paused', paused);
  };
  const applyMotionPref = () => {
    if (!canPlay()) heroVideos.forEach(v => v.pause());
    else heroVideos[active].play().catch(() => {});
    syncPauseBtn();
  };
  applyMotionPref();
  reduceMotion.addEventListener('change', applyMotionPref);
  document.addEventListener('a11y-change', applyMotionPref);
  if (pauseBtn) pauseBtn.addEventListener('click', () => { userPaused = !userPaused; applyMotionPref(); });

  // don't burn CPU decoding video while the hero is off-screen
  new IntersectionObserver(([entry]) => {
    if (!canPlay()) return;
    if (entry.isIntersecting) heroVideos[active].play().catch(() => {});
    else heroVideos.forEach(v => v.pause());
  }).observe(document.getElementById('hero'));
}

// Selected Work — poster → video. Mouse/keyboard: one tile at a time (hover or focus).
// Touch: the whole row plays together (both tiles of the 2-column grid); a tap on a
// tile outside the playing row switches to its row, a tap on a playing tile follows the link.
const workTiles = [...document.querySelectorAll('.work-tile')];
if (workTiles.length) {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const active = new Set();

  const stop = (tile) => {
    active.delete(tile);
    tile.classList.remove('is-active', 'is-playing');
    const v = tile.querySelector('.work-video');
    if (!v) return;
    // let the crossfade back to the poster finish before rewinding
    setTimeout(() => {
      if (tile.classList.contains('is-active')) return;
      v.pause();
      v.currentTime = parseFloat(v.dataset.start) || 0;
    }, 600);
  };

  const play = (tile) => {
    if (active.has(tile)) return;
    active.add(tile);
    tile.classList.add('is-active');
    const v = tile.querySelector('.work-video');
    if (!v || motionOff()) return;
    // first activation: load it, starting on the poster's frame (#t=) so the crossfade has no jump
    if (!v.src && v.dataset.src) v.src = v.dataset.start ? `${v.dataset.src}#t=${v.dataset.start}` : v.dataset.src;
    v.muted = true; // phones only autoplay (and play side by side) when muted
    v.play().catch(() => {});
  };

  // a phone may refuse one of two videos started in the same instant — ask again while it's still active
  const nudge = () => active.forEach(t => {
    const v = t.querySelector('.work-video');
    if (v && v.src && v.paused && !motionOff()) v.play().catch(() => {});
  });

  // make exactly these tiles the active ones
  const setActive = (tiles) => {
    [...active].forEach(t => { if (!tiles.includes(t)) stop(t); });
    tiles.forEach(play);
  };
  const stopAll = () => [...active].forEach(stop);

  // the visible tiles sharing this tile's row
  const rowOf = (tile) => {
    const top = tile.getBoundingClientRect().top;
    return workTiles.filter(t => {
      const r = t.getBoundingClientRect();
      return r.height && Math.abs(r.top - top) < 2;
    });
  };

  workTiles.forEach(tile => {
    const v = tile.querySelector('.work-video');
    if (v) v.addEventListener('playing', () => {
      if (active.has(tile)) tile.classList.add('is-playing');
    });

    tile.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setActive([tile]); });
    tile.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && active.has(tile)) stop(tile); });
    tile.addEventListener('focus', () => { if (tile.matches(':focus-visible')) setActive([tile]); });
    tile.addEventListener('blur', () => { if (canHover.matches && active.has(tile)) stop(tile); });
    tile.addEventListener('click', e => {
      if (canHover.matches) return;
      if (!active.has(tile)) { e.preventDefault(); setActive(rowOf(tile)); }
    });
  });

  // pause whatever is playing once the grid leaves the viewport
  const grid = document.querySelector('.work-grid');
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) stopAll();
    else onGridScroll();
  }).observe(grid);

  // touch screens (no hover): play the row closest to the middle of the screen, like a feed.
  // Skipped for reduced motion and data-saver; tapping another tile still switches.
  const saveData = navigator.connection && navigator.connection.saveData;
  let feedTicking = false;
  const pickCentred = () => {
    feedTicking = false;
    if (canHover.matches || motionOff() || saveData) { if (motionOff()) stopAll(); return; }
    const g = grid.getBoundingClientRect();
    if (g.bottom < 0 || g.top > window.innerHeight) { stopAll(); return; } // grid off-screen
    const mid = window.innerHeight / 2;
    let best = null, bestDist = Infinity;
    workTiles.forEach(t => {
      const r = t.getBoundingClientRect();
      if (!r.height || r.bottom < 0 || r.top > window.innerHeight) return; // hidden or off-screen
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bestDist) { bestDist = d; best = t; }
    });
    // only once the row is reasonably central, so it doesn't flicker at the grid's edges
    if (best && bestDist < window.innerHeight * .35) setActive(rowOf(best));
    nudge();
  };
  function onGridScroll(){ if (!feedTicking) { feedTicking = true; requestAnimationFrame(pickCentred); } }
  window.addEventListener('scroll', onGridScroll, { passive: true });
}

// What We Do — rows reveal as they enter; the row crossing the reading line is "current",
// the ones above it become "past" (slightly quieter).
const capRows = [...document.querySelectorAll('.cap-row')];
if (capRows.length) {
  const inIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); inIO.unobserve(e.target); }
  }), { threshold: .25 });
  capRows.forEach(r => inIO.observe(r));

  let capTicking = false;
  const markCurrent = () => {
    capTicking = false;
    const line = window.innerHeight * .55;
    let current = -1;
    capRows.forEach((r, i) => { if (r.getBoundingClientRect().top < line) current = i; });
    capRows.forEach((r, i) => {
      r.classList.toggle('is-current', i === current);
      r.classList.toggle('is-past', i < current);
    });
  };
  window.addEventListener('scroll', () => {
    if (!capTicking) { capTicking = true; requestAnimationFrame(markCurrent); }
  }, { passive: true });
  markCurrent();
}

// Stills — one stage, several campaigns: the list picks which one shows. A mouse picks by hovering,
// touch and keyboard by pressing; arrow keys walk the list.
const stillTabs = [...document.querySelectorAll('.stills-tab')];
if (stillTabs.length) {
  const pickStill = (tab) => {
    stillTabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).classList.toggle('is-active', on);
    });
  };
  stillTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => pickStill(tab));
    tab.addEventListener('focus', () => pickStill(tab));
    tab.addEventListener('mouseenter', () => { if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) pickStill(tab); });
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      stillTabs[(i + step + stillTabs.length) % stillTabs.length].focus();
    });
  });
}

// Digital — live site previews: load when near, scale a 1440px-wide page into the frame.
// A preview is frozen until the visitor presses the button in its centre — otherwise a wheel or
// finger that happens to land on it would scroll the site inside and trap them mid-page.
// Live: the site scrolls inside; with a mouse the page underneath is locked meanwhile (an
// iframe's scroll otherwise chains out to the page at its top or bottom). It goes back to
// frozen on the exit button, Esc, a press outside, the mouse leaving, or scrolling it away.
const liveSites = [...document.querySelectorAll('.is-live-site')];
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const freezeSite = (box) => {
  if (!box.classList.contains('is-live')) return;
  box.classList.remove('is-live');
  box.querySelector('.digital-exit').hidden = true;
  box.querySelector('.digital-frame').tabIndex = -1;
  document.documentElement.classList.remove('is-preview-lock');
};
liveSites.forEach(box => {
  const frame = box.querySelector('.digital-frame');
  const screen = box.querySelector('.digital-screen');
  const enter = box.querySelector('.digital-enter');
  const exit = box.querySelector('.digital-exit');
  const fit = () => box.style.setProperty('--s', (screen.clientWidth / 1440).toFixed(4));
  fit();
  new ResizeObserver(fit).observe(screen);
  new IntersectionObserver(([entry], io) => {
    if (entry.isIntersecting) { frame.src = frame.dataset.src; io.disconnect(); }
  }, { rootMargin: '800px 0px' }).observe(box);

  enter.addEventListener('click', () => {
    liveSites.forEach(other => { if (other !== box) freezeSite(other); });
    if (!frame.src) frame.src = frame.dataset.src;
    box.classList.add('is-live');
    exit.hidden = false;
    frame.tabIndex = 0;
    if (finePointer.matches) document.documentElement.classList.add('is-preview-lock');
    exit.focus({ preventScroll: true });
  });
  exit.addEventListener('click', () => { freezeSite(box); enter.focus({ preventScroll: true }); });
  box.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') freezeSite(box); });
  // mostly scrolled out of view (touch: the page still scrolls around a live preview)
  new IntersectionObserver(([entry]) => { if (entry.intersectionRatio < .35) freezeSite(box); }, { threshold: .35 }).observe(box);
});
if (liveSites.length) {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') liveSites.forEach(freezeSite); });
  document.addEventListener('pointerdown', e => {
    liveSites.forEach(box => { if (!box.contains(e.target)) freezeSite(box); });
  });
}

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
revealEls.forEach(el => io.observe(el));

// Contact form → email. The site is static, so leads go through FormSubmit's AJAX endpoint,
// which forwards each submission to the studio inbox. (First-ever submission triggers a one-time
// activation email from FormSubmit to that inbox; after it's confirmed, leads arrive directly.)
const LEADS_INBOX = 'visionaiacreative@gmail.com';
const contactForm = document.getElementById('contactForm');
const formStatus = contactForm?.querySelector('.cf-status'); // no form on courses.html
contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector('.btn-submit');
  formStatus.classList.remove('is-error', 'is-success');

  // name is required and the email must be valid if given; email itself is optional,
  // but a lead needs some way back — so at least an email or a phone
  if (!contactForm.checkValidity()) {
    formStatus.textContent = contactForm.name.validity.valueMissing ? 'נא למלא שם.' : 'כתובת האימייל לא תקינה.';
    formStatus.classList.add('is-error');
    contactForm.querySelector(':invalid')?.focus();
    return;
  }
  const data = Object.fromEntries(new FormData(contactForm));
  if (!data.email.trim() && !data.phone.trim()) {
    formStatus.textContent = 'נא להשאיר אימייל או טלפון כדי שנוכל לחזור אליכם.';
    formStatus.classList.add('is-error');
    contactForm.email.focus();
    return;
  }
  if (data._honey) return; // bot
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'שולחים…';

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${LEADS_INBOX}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        'שם': data.name,
        'חברה': data.company || '—',
        'אימייל': data.email || '—',
        'טלפון': data.phone || '—',
        'מה רוצים ליצור': data.message || '—',
        ...(data.email ? { _replyto: data.email } : {}),
        _subject: `ליד חדש מהאתר — ${data.name}${data.company ? ' / ' + data.company : ''}`,
        _template: 'table',
        _captcha: 'false'
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.status);
    contactForm.reset();
    formStatus.textContent = 'תודה רבה על הפנייה, ניצור איתכם קשר בהקדם.';
    formStatus.classList.add('is-success');
  } catch (err) {
    formStatus.classList.add('is-error');
    formStatus.innerHTML = `משהו השתבש בשליחה. אפשר לכתוב לנו ישירות ל־<a href="mailto:${LEADS_INBOX}" dir="ltr">${LEADS_INBOX}</a>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});


// Floating WhatsApp — builds the wa.me link from data-phone (digits, international format).
// Until a number is set it falls back to the contact form.
const wa = document.querySelector('.wa-float');
if (wa) {
  const phone = (wa.dataset.phone || '').replace(/\D/g, '');
  if (phone) wa.href = `https://wa.me/${phone}?text=${encodeURIComponent(wa.dataset.text || '')}`;
  else { wa.removeAttribute('target'); wa.removeAttribute('rel'); }
}

// Accessibility menu — text size, high contrast, highlighted links, readable font, stop motion.
// Choices live on <html> as classes (applied early by the inline script in <head>) and persist.
const A11Y_KEY = 'vision-a11y';
const a11yBtn = document.querySelector('.a11y-toggle');
const a11yPanel = document.getElementById('a11yPanel');
if (a11yBtn && a11yPanel) {
  const root = document.documentElement;
  const load = () => { try { return JSON.parse(localStorage.getItem(A11Y_KEY) || '{}'); } catch (e) { return {}; } };
  const save = st => { try { localStorage.setItem(A11Y_KEY, JSON.stringify(st)); } catch (e) {} };
  let state = load();

  const apply = () => {
    root.classList.remove('a11y-text-1', 'a11y-text-2', 'a11y-text-3');
    if (state.text) root.classList.add(`a11y-text-${state.text}`);
    ['contrast', 'links', 'font', 'still'].forEach(k => root.classList.toggle(`a11y-${k}`, !!state[k]));
    a11yPanel.querySelectorAll('[data-a11y]').forEach(b => {
      const k = b.dataset.a11y;
      if (k in { contrast: 1, links: 1, font: 1, still: 1 }) b.setAttribute('aria-pressed', String(!!state[k]));
    });
    const lvl = a11yPanel.querySelector('.a11y-text-level');
    if (lvl) lvl.textContent = `${100 + (state.text || 0) * 15}%`;
    if (state.still) document.querySelectorAll('video').forEach(v => v.pause());
    document.dispatchEvent(new CustomEvent('a11y-change'));
  };

  a11yPanel.addEventListener('click', e => {
    const b = e.target.closest('[data-a11y]');
    if (!b) return;
    const k = b.dataset.a11y;
    if (k === 'text-up') state.text = Math.min(3, (state.text || 0) + 1);
    else if (k === 'text-down') state.text = Math.max(0, (state.text || 0) - 1);
    else if (k === 'reset') state = {};
    else state[k] = !state[k];
    save(state);
    apply();
  });

  const setOpen = open => {
    a11yPanel.hidden = !open;
    a11yBtn.setAttribute('aria-expanded', String(open));
    if (open) a11yPanel.querySelector('button, a').focus();
  };
  a11yBtn.addEventListener('click', () => setOpen(a11yPanel.hidden));
  a11yPanel.querySelector('.a11y-close').addEventListener('click', () => { setOpen(false); a11yBtn.focus(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !a11yPanel.hidden) { setOpen(false); a11yBtn.focus(); }
  });
  document.addEventListener('pointerdown', e => {
    if (!a11yPanel.hidden && !a11yPanel.contains(e.target) && !a11yBtn.contains(e.target)) setOpen(false);
  });
  apply();
}

// Screen readers: mark English text as English (correct pronunciation), and say when a link opens a new tab.
document.querySelectorAll('[dir="ltr"]').forEach(el => {
  if (!el.hasAttribute('lang') && /[A-Za-z]/.test(el.textContent) && !/[֐-׿]/.test(el.textContent)) el.lang = 'en';
});
document.querySelectorAll('a[target="_blank"]').forEach(a => {
  if (a.hasAttribute('aria-label')) { a.setAttribute('aria-label', `${a.getAttribute('aria-label')} (נפתח בחלון חדש)`); return; }
  const note = document.createElement('span');
  note.className = 'sr-only';
  note.textContent = ' (נפתח בחלון חדש)';
  a.appendChild(note);
});
