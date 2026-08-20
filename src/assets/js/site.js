/**
 * Progressive enhancement only — every page is fully usable with this file
 * blocked. The destination filter ships hidden and is revealed here, so a
 * no-JS visitor simply sees all cards.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------ mobile nav */

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* -------------------------------------------------------- category filter */

  document.querySelectorAll('[data-filter-bar]').forEach(function (bar) {
    // The grid this bar controls: the next card grid in the same section, or
    // every grid on the page when the bar sits above several of them.
    var section = bar.closest('.section') || document;
    var scope = section === document ? document : section;
    var grids = scope.querySelectorAll('.card-grid');
    if (!grids.length) grids = document.querySelectorAll('.card-grid');
    if (!grids.length) return;

    var cards = [];
    grids.forEach(function (grid) {
      grid.querySelectorAll('.card').forEach(function (card) {
        cards.push(card);
      });
    });
    if (!cards.length) return;

    bar.hidden = false;

    bar.addEventListener('click', function (event) {
      var button = event.target.closest('.filter-btn');
      if (!button) return;

      var filter = button.getAttribute('data-filter');

      bar.querySelectorAll('.filter-btn').forEach(function (other) {
        var active = other === button;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });

      var shown = 0;
      cards.forEach(function (card) {
        var categories = (card.getAttribute('data-categories') || '').split(' ');
        var visible = filter === 'all' || categories.indexOf(filter) !== -1;
        card.hidden = !visible;
        if (visible) shown += 1;
      });

      // Hide a country block that has nothing left to show.
      grids.forEach(function (grid) {
        var any = grid.querySelector('.card:not([hidden])');
        var owner = grid.closest('.section');
        if (owner && owner !== section) owner.hidden = !any;
      });

      bar.setAttribute('data-shown', String(shown));
    });
  });

  /* ------------------------------------------------------ section nav state */

  var navLinks = document.querySelectorAll('.section-nav__list a');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    var targets = [];

    navLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      byId[id] = link;
      targets.push(target);
    });

    var visible = new Set();

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });

        var current = targets.filter(function (t) {
          return visible.has(t.id);
        })[0];

        navLinks.forEach(function (link) {
          link.classList.remove('is-current');
        });

        if (current && byId[current.id]) {
          byId[current.id].classList.add('is-current');
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );

    targets.forEach(function (target) {
      observer.observe(target);
    });
  }
})();
