(function () {
  document.documentElement.classList.remove('no-js');

  // Old links/bookmarks may still use /page.html: show the clean URL instead (live site only)
  if (/khmerlawcode\.com$/.test(location.hostname) && /\.html$/.test(location.pathname) && window.history.replaceState) {
    var clean = location.pathname.replace(/(index)?\.html$/, '');
    history.replaceState(null, '', clean + location.search + location.hash);
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Header: solid once scrolled; hides while scrolling down, comes back on scroll up
  var header = document.querySelector('.site-header');
  if (header) {
    var root = document.documentElement;
    var lastY = Math.max(0, window.scrollY);
    var TOLERANCE = 8;          // ignore tiny movements so the header doesn't flicker
    var ticking = false;
    var setHidden = function (hide) {
      header.classList.toggle('header-hidden', hide);
      root.classList.toggle('header-is-hidden', hide);
    };
    var update = function () {
      ticking = false;
      var y = Math.max(0, window.scrollY);     // ignore iOS rubber-band negatives
      header.classList.toggle('scrolled', y > 8);
      var menuOpen = links && links.classList.contains('open');
      var revealZone = 160;            // always show near the top of the page
      if (menuOpen || y <= revealZone) { setHidden(false); lastY = y; return; }
      var delta = y - lastY;
      if (Math.abs(delta) < TOLERANCE) return;  // accumulate until a clear direction
      setHidden(delta > 0);
      lastY = y;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Rotating word inside the hero pill
  var pill = document.querySelector('.action-pill');
  if (pill && !reduceMotion) {
    var word = pill.querySelector('.action-word');
    var items = [];
    try { items = JSON.parse(pill.getAttribute('data-words') || '[]'); } catch (e) { items = []; }
    var i = 0;
    var measure = function (text) {
      var probe = pill.cloneNode(true);
      probe.style.cssText = 'position:absolute;left:-10000px;top:-10000px;width:auto;visibility:hidden';
      probe.querySelector('.action-word').textContent = text;
      probe.querySelector('.action-word').className = 'action-word';
      pill.parentNode.appendChild(probe);
      var w = probe.getBoundingClientRect().width;
      probe.remove();
      return w;
    };
    var setWidth = function () { pill.style.width = measure(word.textContent) + 'px'; };
    if (items.length > 1) {
      setWidth();
      window.addEventListener('resize', setWidth);
      setInterval(function () {
        if (document.hidden) return;
        i = (i + 1) % items.length;
        var next = items[i];
        word.classList.add('leaving');
        setTimeout(function () {
          word.textContent = next.text;
          pill.style.setProperty('--pill-bg', next.bg);
          pill.style.width = measure(next.text) + 'px';
          word.classList.remove('leaving');
          word.classList.add('entering');
          void word.offsetWidth; // restart transition
          word.classList.remove('entering');
        }, 220);
      }, 2400);
    }
  }

  // Feature accordion (one open at a time) driving the phone video
  var acc = document.querySelector('.acc');
  if (acc) {
    var accItems = Array.prototype.slice.call(acc.querySelectorAll('.acc-item'));
    var video = document.querySelector('.device-screen');
    var toggleBtn = document.querySelector('.media-toggle');
    var current = Math.max(0, accItems.findIndex(function (el) { return el.classList.contains('open'); }));
    var autoAdvance = true;     // stops once the visitor picks a feature themselves
    var inView = false;
    var userPaused = !!reduceMotion;

    var bar = function () { var it = accItems[current]; return it && it.querySelector('.acc-progress i'); };
    var setPausedUI = function (paused) {
      if (!toggleBtn) return;
      toggleBtn.classList.toggle('paused', paused);
      toggleBtn.setAttribute('aria-label', toggleBtn.getAttribute(paused ? 'data-label-play' : 'data-label-pause'));
    };
    var tryPlay = function () {
      if (!video || userPaused || !inView) return;
      var p = video.play();
      if (p && p.catch) p.catch(function () { setPausedUI(true); });
    };

    var openItem = function (idx, fromUser) {
      accItems.forEach(function (el, i) {
        var on = i === idx;
        el.classList.toggle('open', on);
        el.querySelector('.acc-btn').setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      current = idx;
      var b = bar(); if (b) b.style.transform = 'scaleX(0)';
      if (!video) return;
      var src = accItems[idx].getAttribute('data-video');
      if (src && video.getAttribute('src') !== src) {
        video.setAttribute('poster', accItems[idx].getAttribute('data-poster') || '');
        video.setAttribute('src', src);
        video.load();
      } else {
        try { video.currentTime = 0; } catch (e) {}
      }
      video.classList.remove('swap'); void video.offsetWidth; video.classList.add('swap');
      if (fromUser) { autoAdvance = false; userPaused = false; setPausedUI(false); }
      tryPlay();
    };

    acc.addEventListener('click', function (e) {
      var btn = e.target.closest('.acc-btn');
      if (!btn) return;
      var idx = accItems.indexOf(btn.parentNode);
      if (idx === current && accItems[idx].classList.contains('open')) return; // keep one always open
      openItem(idx, true);
    });

    if (video) {
      video.loop = false;
      video.addEventListener('timeupdate', function () {
        var b = bar();
        if (b && video.duration) b.style.transform = 'scaleX(' + (video.currentTime / video.duration) + ')';
      });
      video.addEventListener('ended', function () {
        if (autoAdvance) openItem((current + 1) % accItems.length, false);
        else { video.currentTime = 0; tryPlay(); }
      });
      video.addEventListener('click', function () { if (toggleBtn) toggleBtn.click(); });

      if (toggleBtn) {
        setPausedUI(userPaused);
        toggleBtn.addEventListener('click', function () {
          if (video.paused) { userPaused = false; inView = true; setPausedUI(false); tryPlay(); }
          else { userPaused = true; video.pause(); setPausedUI(true); }
        });
      }

      // Only load and play while the section is on screen
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
          if (inView) { video.preload = 'auto'; tryPlay(); } else video.pause();
        }, { threshold: 0.35 }).observe(video);
      } else { inView = true; tryPlay(); }
      document.addEventListener('visibilitychange', function () { if (document.hidden) video.pause(); else tryPlay(); });
    }
  }

  // Download page: feature chips drive the phone video (always auto-advance)
  var chipList = document.querySelector('.chips-feat');
  var dlVideo = document.querySelector('.has-device .device-screen');
  if (chipList && dlVideo) {
    var chips = Array.prototype.slice.call(chipList.querySelectorAll('.chip'));
    var dlToggle = document.querySelector('.has-device .media-toggle');
    var cur = 0, dlPaused = !!reduceMotion, dlInView = false;
    var dlUI = function (paused) {
      if (!dlToggle) return;
      dlToggle.classList.toggle('paused', paused);
      dlToggle.setAttribute('aria-label', dlToggle.getAttribute(paused ? 'data-label-play' : 'data-label-pause'));
    };
    var dlPlay = function () {
      if (dlPaused || !dlInView) return;
      var pr = dlVideo.play(); if (pr && pr.catch) pr.catch(function () { dlPaused = true; dlUI(true); });
    };
    var show = function (idx) {
      chips[cur].style.setProperty('--p', 0);
      cur = idx;
      chips.forEach(function (c, i) { c.setAttribute('aria-pressed', i === idx ? 'true' : 'false'); });
      dlVideo.setAttribute('poster', chips[idx].getAttribute('data-poster'));
      dlVideo.setAttribute('src', chips[idx].getAttribute('data-video'));
      dlVideo.load();
      dlVideo.classList.remove('swap'); void dlVideo.offsetWidth; dlVideo.classList.add('swap');
      // slide the chip row so the active feature sits in the middle
      var li = chips[idx].parentNode;
      var left = li.offsetLeft - (chipList.clientWidth - li.offsetWidth) / 2;
      chipList.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
      dlPlay();
    };
    chipList.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      dlPaused = false; dlUI(false);
      show(chips.indexOf(c));
    });
    dlVideo.addEventListener('timeupdate', function () {
      if (dlVideo.duration) chips[cur].style.setProperty('--p', (dlVideo.currentTime / dlVideo.duration).toFixed(3));
    });
    dlVideo.addEventListener('ended', function () { show((cur + 1) % chips.length); });
    dlVideo.addEventListener('click', function () { if (dlToggle) dlToggle.click(); });
    if (dlToggle) {
      dlUI(dlPaused);
      dlToggle.addEventListener('click', function () {
        if (dlVideo.paused) { dlPaused = false; dlInView = true; dlUI(false); dlPlay(); }
        else { dlPaused = true; dlVideo.pause(); dlUI(true); }
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        dlInView = en[0].isIntersecting;
        if (dlInView) { dlVideo.preload = 'auto'; dlPlay(); } else dlVideo.pause();
      }, { threshold: 0.3 }).observe(dlVideo);
    } else { dlInView = true; dlPlay(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) dlVideo.pause(); else dlPlay(); });
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Support page: iPhone / Android guide switch. Android phones, and links
  // to #google-play (the Android app's Help button), open the Android guide.
  var phoneSwitch = document.querySelector('.sp-switch');
  if (phoneSwitch) {
    var tabs = Array.prototype.slice.call(phoneSwitch.querySelectorAll('[role="tab"]'));
    var panelOf = function (tab) { return document.getElementById(tab.getAttribute('aria-controls')); };
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panelOf(t).hidden = !on;
      });
      if (focus) tab.focus();
    };
    var fromHash = function () {
      var id = location.hash.slice(1);
      if (!id) return null;
      for (var i = 0; i < tabs.length; i++) {
        var panel = panelOf(tabs[i]);
        if (panel.id === id || panel.querySelector('[id="' + id + '"]')) return tabs[i];
      }
      return null;
    };
    var android = /Android/i.test(navigator.userAgent);
    var first = fromHash() || (android ? tabs[1] : tabs[0]);
    phoneSwitch.hidden = false;
    phoneSwitch.parentNode.classList.add('sp-switched');
    select(first, false);
    // Scroll to the guide once it is shown.
    if (fromHash() === first) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) setTimeout(function () { target.scrollIntoView(); }, 0);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
        if (next === null) return;
        e.preventDefault();
        select(tabs[(next + tabs.length) % tabs.length], true);
      });
    });
    window.addEventListener('hashchange', function () {
      var tab = fromHash();
      if (tab) {
        select(tab, false);
        var el = document.getElementById(location.hash.slice(1));
        if (el) el.scrollIntoView();
      }
    });
  }
})();
