/* =========================================================================
   apparitions.js — révèle les éléments à leur entrée dans la fenêtre
   -------------------------------------------------------------------------
   Le CSS (css/apparitions.css) porte les états masqués ; ce script se
   contente de poser data-vu="true" au bon moment, puis "pose" une fois la
   transition finie pour ne laisser aucune trace sur l'élément.

   Le déclenchement se fait sur l'événement scroll plutôt que sur un
   IntersectionObserver : le pire défaut possible ici serait une page qui
   reste blanche sous la ligne de flottaison, et un écouteur scroll se
   vérifie de façon déterministe. Le coût reste faible — la liste se vide au
   fur et à mesure et les mesures sont limitées à 90 ms d'intervalle.

   ⚠ SELECTEURS doit rester identique à la liste de css/apparitions.css.
   ========================================================================= */
(function () {
  'use strict';

  var racine = document.documentElement;
  if (racine.dataset.anim !== 'oui') return;      /* mouvement réduit, ou pas d'IO */

  var SELECTEURS = [
    /* 1. montée */
    '.section-entete > *', '.section-suite', '.confiance > *', '.grille > *',
    '.bento > *', '.rail__element', '.bandeau', '.duo__texte > *',
    '.temoin__carte > *', '.equipe__membre', '.appel__contenu > *',
    '.prestations > .presta', '.etape', '.materiel__item', '.filtres',
    '.projet', '.etude__fiche > *', '.avant-apres__legende', '.formulaire',
    '.visite__etape', '.recherche > *', '.faq__element', '.pratique__item',
    '.legal', '.pied__haut > *',
    /* 2. net */
    '.hero-page__titre', '.section-titre', '.confiance__titre', '.appel__titre',
    '.recherche__titre', '.presta__titre', '.formulaire__titre',
    '.pratique__titre', '.temoin__intitule',
    /* 3. échelle */
    '.duo__images .visuel', '.temoin__visuel', '.avant-apres', '.hero-page__badge'
  ].join(',');

  var restants = Array.prototype.slice.call(document.querySelectorAll(SELECTEURS));
  racine.dataset.animPrete = 'oui';
  if (!restants.length) return;

  /* ---- Cascade : les frères d'un même groupe se décalent -----------------
     70 ms d'écart, plafonnés à 350 ms pour que la dernière carte d'une
     rangée n'arrive jamais une seconde après la première. */
  var rangs = new Map();
  restants.forEach(function (el) {
    var parent = el.parentElement;
    var rang = rangs.get(parent) || 0;
    rangs.set(parent, rang + 1);
    if (rang > 0) el.style.setProperty('--retard', Math.min(rang * 70, 350) + 'ms');
  });

  /* ---- Révélation ------------------------------------------------------- */
  var poser = function (el) {
    el.dataset.vu = 'true';
    /* on nettoie la transition une fois qu'elle est finie : l'élément
       redevient un élément ordinaire, sans délai résiduel sur ses survols */
    var fin = function () {
      el.dataset.vu = 'pose';
      el.style.removeProperty('--retard');
      el.removeEventListener('transitionend', fin);
    };
    el.addEventListener('transitionend', fin);
    setTimeout(fin, 2400);
  };

  var verifier = function () {
    var seuil = window.innerHeight * 0.92;   /* un peu avant le bas de l'écran */
    var encore = [];
    for (var i = 0; i < restants.length; i++) {
      var el = restants[i];
      var haut = el.getBoundingClientRect().top;
      if (haut < seuil) poser(el);
      else encore.push(el);
    }
    restants = encore;
    if (!restants.length) {
      window.removeEventListener('scroll', planifier);
      window.removeEventListener('resize', planifier);
    }
  };

  /* Limitation à un passage toutes les 90 ms : indépendant de
     requestAnimationFrame, donc fiable même dans un onglet en arrière-plan. */
  var enAttente = false;
  var planifier = function () {
    if (enAttente) return;
    enAttente = true;
    setTimeout(function () { enAttente = false; verifier(); }, 90);
  };

  window.addEventListener('scroll', planifier, { passive: true });
  window.addEventListener('resize', planifier, { passive: true });
  window.addEventListener('load', verifier);

  /* Ouvert aux autres scripts : filtrer les chantiers ou envoyer le
     formulaire réorganise la page sans provoquer de défilement, et peut
     donc amener dans l'écran un élément encore masqué. */
  window.apparitions = { verifier: verifier };

  verifier();
})();
