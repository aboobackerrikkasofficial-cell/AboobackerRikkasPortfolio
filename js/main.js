// =========================================================
// Aboobacker Rikkas — Portfolio 2 interactions
// =========================================================

/* ---------- WebGL support check (fallback for old/blocked GPUs) ---------- */
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}
if (!hasWebGL()) {
  document.documentElement.classList.add('no-webgl');
}

document.addEventListener('DOMContentLoaded', () => {

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- Preloader — "Core" boot sequence ---------- */
  const preloader = document.getElementById('preloader');
  const statusEl0 = document.getElementById('preload-status');
  const fillEl = document.getElementById('preload-fill');
  const percentEl = document.getElementById('preload-percent');

  const bootMessages = [
    'Initializing core',
    'Booting orbit rings',
    'Compiling stylesheets',
    'Linking REST endpoints',
    'Rendering 3D scene',
    'Ready'
  ];

  if (preloader && statusEl0 && fillEl && percentEl) {
    let pct = 0;
    let msgIndex = 0;
    statusEl0.innerHTML = `${bootMessages[0]}<span class="dots">...</span>`;

    const bootInterval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 14 + 6, 100);
      fillEl.style.width = pct + '%';
      percentEl.textContent = Math.round(pct) + '%';

      const nextMsgIndex = Math.min(
        Math.floor((pct / 100) * (bootMessages.length - 1)),
        bootMessages.length - 1
      );
      if (nextMsgIndex !== msgIndex) {
        msgIndex = nextMsgIndex;
        const isLast = msgIndex === bootMessages.length - 1;
        statusEl0.innerHTML = isLast
          ? `${bootMessages[msgIndex]}<span class="dots">.</span>`
          : `${bootMessages[msgIndex]}<span class="dots">...</span>`;
      }

      if (pct >= 100) {
        clearInterval(bootInterval);
      }
    }, 160);

    const dismissPreloader = () => {
      pct = 100;
      fillEl.style.width = '100%';
      percentEl.textContent = '100%';
      statusEl0.innerHTML = `${bootMessages[bootMessages.length - 1]}<span class="dots">.</span>`;
      clearInterval(bootInterval);
      setTimeout(() => preloader.classList.add('done'), 280);
    };

    window.addEventListener('load', () => setTimeout(dismissPreloader, 900));
    setTimeout(dismissPreloader, 3200); // hard fallback so it never hangs
  }

  /* ---------- Cursor-reactive spotlight ---------- */
  if (finePointer && !reducedMotion) {
    let sx = 50, sy = 30, tx = 50, ty = 30;
    window.addEventListener('pointermove', (e) => {
      tx = (e.clientX / window.innerWidth) * 100;
      ty = (e.clientY / window.innerHeight) * 100;
    });
    function animateSpotlight() {
      sx += (tx - sx) * 0.08;
      sy += (ty - sy) * 0.08;
      document.documentElement.style.setProperty('--sx', sx + '%');
      document.documentElement.style.setProperty('--sy', sy + '%');
      requestAnimationFrame(animateSpotlight);
    }
    animateSpotlight();
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0,0)'; });
    });
  }

  /* ---------- Project card shine tracking ---------- */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
      });
    });
  }

  /* ---------- Live Kasaragod (IST) clock ---------- */
  const clockEl = document.getElementById('ist-clock');
  if (clockEl) {
    function updateClock() {
      const now = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true
      });
      clockEl.textContent = now;
    }
    updateClock();
    setInterval(updateClock, 30000);
  }

  /* ---------- Animated stat counters ---------- */
  const statEls = document.querySelectorAll('.stat-num');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      if (reducedMotion) {
        el.textContent = target + suffix;
      } else {
        const duration = 1400;
        const start = performance.now();
        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
      statObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  statEls.forEach(el => statObserver.observe(el));

  /* ---------- Sliding nav pill indicator ---------- */
  const navPill = document.getElementById('nav-pill');
  const navLinksWrap = document.getElementById('nav-links');
  function movePillTo(link) {
    if (!navPill || !link || !navLinksWrap) return;
    const wrapRect = navLinksWrap.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    navPill.style.width = linkRect.width + 'px';
    navPill.style.transform = `translateX(${linkRect.left - wrapRect.left}px)`;
  }
  const initialActive = document.querySelector('.nav-links a.active');
  if (initialActive) requestAnimationFrame(() => movePillTo(initialActive));

  /* ---------- Mobile nav ---------- */
  const burger = document.getElementById('nav-burger');
  const mobilePanel = document.getElementById('mobile-panel');
  if (burger) {
    burger.addEventListener('click', () => {
      mobilePanel.classList.toggle('open');
    });
    mobilePanel.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobilePanel.classList.remove('open'));
    });
  }

  /* ---------- Active nav link on scroll ---------- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-panel a');
  const setActive = (id) => {
    navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
    const activeDesktopLink = document.querySelector(`.nav-links a[href="#${id}"]`);
    if (activeDesktopLink) movePillTo(activeDesktopLink);
  };
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sections.forEach(sec => navObserver.observe(sec));

  window.addEventListener('resize', () => {
    const current = document.querySelector('.nav-links a.active');
    if (current) movePillTo(current);
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ---------- Rotating hero role text ---------- */
  const roles = document.querySelectorAll('.role-item');
  let roleIndex = 0;
  if (roles.length) {
    roles[0].classList.add('show');
    setInterval(() => {
      roles[roleIndex].classList.remove('show');
      roleIndex = (roleIndex + 1) % roles.length;
      roles[roleIndex].classList.add('show');
    }, 2300);
  }

  /* ---------- 3D tilt effect on project cards ---------- */
  if (!reducedMotion) {
    document.querySelectorAll('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateY(0deg) rotateX(0deg) translateY(0)';
      });
    });
  }

  /* ---------- Contact form ---------- */
  const form = document.getElementById('contact-form');
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submitBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      if (statusEl) { statusEl.textContent = ''; statusEl.className = 'form-status'; }

      try {
        const res = await fetch(form.action, { method: 'POST', body: data });
        if (res.ok) {
          if (statusEl) {
            statusEl.textContent = '✓ Message sent — thanks! I\'ll reply within a day.';
            statusEl.className = 'form-status ok';
          }
          form.reset();
        } else {
          throw new Error('Non-200 response');
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = '✕ Something went wrong. Please email me directly at aboobackerrikkasofficial@gmail.com';
          statusEl.className = 'form-status err';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

});

/* Wake the backend (Render free-tier cold start) */
fetch("https://portfolio-backend-c631.onrender.com/health")
  .then(() => console.log("Backend awake"))
  .catch(() => console.log("Waking backend..."));