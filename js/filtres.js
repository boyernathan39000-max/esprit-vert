/* =========================================================================
   filtres.js — filtrage des chantiers, sans rechargement de page
   ========================================================================= */
(function () {
  'use strict';

  var grille = document.getElementById('projets');
  if (!grille) return;

  var projets = Array.prototype.slice.call(grille.querySelectorAll('.projet'));
  var boutons = Array.prototype.slice.call(document.querySelectorAll('.filtre'));
  var vide = document.getElementById('projets-vide');
  var compte = document.getElementById('compte-resultats');

  /* Le compteur de chaque filtre est calculé à partir du contenu réel :
     pas de nombre écrit en dur dans le HTML qui pourrait mentir. */
  boutons.forEach(function (btn) {
    var cle = btn.dataset.filtre;
    var n = cle === 'tous'
      ? projets.length
      : projets.filter(function (p) {
          return p.dataset.categories.split(' ').indexOf(cle) !== -1;
        }).length;
    var span = document.createElement('span');
    span.className = 'filtre__compte';
    span.textContent = n;
    btn.appendChild(span);
    if (n === 0) btn.disabled = true;
  });

  var appliquer = function (cle) {
    var visibles = 0;

    projets.forEach(function (p) {
      var garde = cle === 'tous' || p.dataset.categories.split(' ').indexOf(cle) !== -1;
      p.hidden = !garde;
      if (garde) visibles++;
    });

    boutons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.filtre === cle));
    });

    /* la grille vient de changer de hauteur : on redemande une passe
       d'apparition, sinon une carte remontée dans l'écran resterait masquée */
    if (window.apparitions) window.apparitions.verifier();

    vide.hidden = visibles > 0;
    compte.textContent = visibles === 0
      ? 'Aucune réalisation dans cette catégorie.'
      : visibles + (visibles > 1 ? ' réalisations affichées.' : ' réalisation affichée.');
  };

  boutons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      /* un filtre choisi montre toute la catégorie : on déplie la grille */
      grille.dataset.replie = 'false';
      var plus = document.getElementById('realisations-plus');
      if (plus) plus.parentElement.hidden = true;
      appliquer(btn.dataset.filtre);
    });
  });

  appliquer('tous');
})();
