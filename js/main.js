/* =========================================================================
   main.js — menu, rail de chantiers, témoignages, accordéon, communes,
   comparateur avant/après. Vanilla, sans dépendance.
   ========================================================================= */
(function () {
  'use strict';

  /* ---- Commande sous le pointeur ---------------------------------------
     Deux obstacles rendaient les boutons inertes sur téléphone. Le survol y
     est éteint à dessein — laissé actif, le navigateur l'applique au tap et
     l'y laisse jusqu'au tap suivant. Et sur iOS, :active ne s'applique pas à
     un lien tant que le document n'a pas d'écouteur tactile.

     On pose donc nous-mêmes un attribut : au survol du pointeur comme au
     contact du doigt. Les événements « pointer » couvrent les deux, et le
     doigt levé retire l'attribut, donc rien ne reste allumé.

     Un tap dure une centaine de millisecondes, moins que la transition de
     couleur : sans durée minimale, l'animation démarrerait puis repartirait
     en arrière sans qu'on la voie. On la maintient donc 220 ms au doigt —
     jamais à la souris, où ce serait un retard. */
  var COMMANDES = '.bouton, .rond, .rail__fleche, .filtre, .faq__bouton, .burger,' +
                  '.marque, .lien-fleche, .avant-apres__bouton, .nav__lien';
  var DUREE_MIN = 220;

  var actif = null;
  var depuis = 0;
  var minuteur = null;

  var eteindre = function () {
    if (minuteur) { clearTimeout(minuteur); minuteur = null; }
    if (!actif) return;
    actif.removeAttribute('data-actif');
    actif = null;
  };

  var allumer = function (cible) {
    if (actif === cible) return;
    eteindre();
    actif = cible;
    depuis = Date.now();
    cible.setAttribute('data-actif', '');
  };

  /* le doigt : on garde l'état le temps qu'il se voie */
  var relacher = function (tactile) {
    if (!actif) return;
    var reste = tactile ? DUREE_MIN - (Date.now() - depuis) : 0;
    if (reste > 0) {
      if (minuteur) clearTimeout(minuteur);
      minuteur = setTimeout(eteindre, reste);
    } else {
      eteindre();
    }
  };

  var commande = function (e) {
    return e.target && e.target.closest ? e.target.closest(COMMANDES) : null;
  };

  document.addEventListener('pointerover', function (e) {
    var c = commande(e);
    if (c && !c.disabled) allumer(c);
  }, { passive: true });

  document.addEventListener('pointerdown', function (e) {
    var c = commande(e);
    if (c && !c.disabled) allumer(c);
  }, { passive: true });

  document.addEventListener('pointerout', function (e) {
    if (actif && !actif.contains(e.relatedTarget)) relacher(e.pointerType === 'touch');
  }, { passive: true });

  document.addEventListener('pointerup', function (e) {
    relacher(e.pointerType === 'touch');
  }, { passive: true });

  ['pointercancel', 'blur'].forEach(function (ev) {
    window.addEventListener(ev, function () { relacher(false); }, { passive: true });
  });
  window.addEventListener('scroll', function () { relacher(false); }, { passive: true, capture: true });

  /* ---- Menu mobile ----------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var ouvert = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!ouvert));
      burger.setAttribute('aria-label', ouvert ? 'Ouvrir le menu' : 'Fermer le menu');
      menu.dataset.ouvert = String(!ouvert);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        burger.setAttribute('aria-expanded', 'false');
        menu.dataset.ouvert = 'false';
        burger.focus();
      }
    });

    /* Le lien de la page courante ne provoque pas de navigation : sans ceci
       le menu resterait ouvert par-dessus la page. */
    menu.addEventListener('click', function (e) {
      if (!e.target.closest('a')) return;
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Ouvrir le menu');
      menu.dataset.ouvert = 'false';
    });
  }

  /* ---- Bande menu : masquée à la descente, rendue à la remontée ---------
     Elle change aussi d'habillage selon la surface qui passe derrière elle :
     sur un fond vert ou une photo sombre, logo blanc et bouton menu inversé ;
     sur un fond clair, logo encre et bouton menu sombre.
     ---------------------------------------------------------------------- */
  var entete = document.getElementById('entete');
  if (entete) {
    var dernier = window.scrollY;
    var hauteurEntete = entete.offsetHeight;
    /* les surfaces sur lesquelles la bande menu doit passer en blanc */
    var surfacesSombres = document.querySelectorAll('.hero, .section--sombre, .appel, .pied');

    var majBande = function () {
      var y = window.scrollY;

      /* masquage : seulement en descente et une fois la bande dépassée */
      if (y > dernier && y > hauteurEntete * 1.5 && menu.dataset.ouvert !== 'true') {
        entete.dataset.cache = 'true';
      } else {
        entete.dataset.cache = 'false';
      }
      dernier = y;

      /* habillage : on regarde ce qui passe réellement derrière la bande.
         Sur une surface sombre — hero, section verte, bandeau d'appel, pied
         de page — le logo passe en blanc et le bouton menu s'inverse. */
      var mi = hauteurEntete / 2;
      var sombre = false;
      for (var i = 0; i < surfacesSombres.length; i++) {
        var r = surfacesSombres[i].getBoundingClientRect();
        if (r.top <= mi && r.bottom >= mi) { sombre = true; break; }
      }
      entete.dataset.fond = sombre ? 'sombre' : 'clair';
    };

    window.addEventListener('scroll', majBande, { passive: true });
    window.addEventListener('resize', function () {
      hauteurEntete = entete.offsetHeight;
      majBande();
    }, { passive: true });
    majBande();
  }

  /* ---- Carte d'avis du hero : trois avis, défilement toutes les 3 s ------
     Les trois avis sont déjà dans le HTML, empilés dans la même cellule de
     grille : la carte garde la hauteur du plus long et ne saute pas. On ne
     fait ici que déplacer l'état — le sortant glisse vers la gauche pendant
     que l'entrant arrive de la droite.
     Si l'utilisateur a demandé moins d'animation, la carte ne tourne pas du
     tout : un contenu qui défile seul est justement ce que ce réglage vise. */
  var carteHero = document.getElementById('hero-temoignage');
  if (carteHero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var avisHero = carteHero.querySelectorAll('.hero__avis-item');
    if (avisHero.length > 1) {
      var iAvis = 0;

      var glisser = function () {
        var sortant = avisHero[iAvis];
        iAvis = (iAvis + 1) % avisHero.length;
        var entrant = avisHero[iAvis];

        sortant.dataset.etat = 'sortie';
        entrant.dataset.etat = 'entree';
        /* Lecture forcée du style : sans elle le navigateur fusionne
           « entree » et « actif », et l'avis entrerait par la gauche. */
        void carteHero.offsetWidth;
        entrant.dataset.etat = 'actif';

        setTimeout(function () {
          /* on ne range le sortant que s'il n'a pas déjà été rappelé */
          if (sortant.dataset.etat === 'sortie') sortant.dataset.etat = 'attente';
        }, 360);
      };

      setInterval(glisser, 3000);
    }
  }

  /* ---- Bandes horizontales : chantiers, équipe -------------------------
     Même mécanique pour les deux : un pas d'une carte, deux flèches qui se
     désactivent aux extrémités. Sans elles, rien ne dit que la ligne
     continue à droite. */
  var brancherBande = function (idBande, attribut, selecteurCarte) {
    var bande = document.getElementById(idBande);
    if (!bande) return;

    var pas = function () {
      var el = bande.querySelector(selecteurCarte);
      if (!el) return 320;
      var st = window.getComputedStyle(bande);
      return el.getBoundingClientRect().width + (parseFloat(st.columnGap) || 24);
    };

    var prec = document.querySelector('[' + attribut + '="prec"]');
    var suiv = document.querySelector('[' + attribut + '="suiv"]');

    document.querySelectorAll('[' + attribut + ']').forEach(function (btn) {
      btn.addEventListener('click', function () {
        bande.scrollBy({
          left: btn.getAttribute(attribut) === 'suiv' ? pas() : -pas(),
          behavior: 'smooth'
        });
      });
    });

    var majBoutons = function () {
      if (!prec || !suiv) return;
      var reste = bande.scrollWidth - bande.clientWidth;
      prec.disabled = bande.scrollLeft < 8;
      suiv.disabled = bande.scrollLeft >= reste - 8;
      /* la ligne tient en entier : les flèches n'ont plus d'objet */
      var commandes = prec.parentElement;
      if (commandes) commandes.hidden = reste < 8;
    };
    bande.addEventListener('scroll', majBoutons, { passive: true });
    window.addEventListener('resize', majBoutons, { passive: true });
    majBoutons();
  };

  brancherBande('rail', 'data-rail', '.rail__element');
  brancherBande('equipe', 'data-equipe', '.equipe__membre');

  /* ---- Empilement au défilement : hauteurs égalisées --------------------
     Les cartes qui s'empilent doivent avoir exactement la même hauteur, sinon
     le bas de celle du dessous dépasse de celle qui vient se poser dessus.
     Les textes n'ont pas la même longueur : on aligne sur la plus haute, et
     on recalcule à chaque changement de largeur. */
  var piles = document.querySelectorAll('.etapes--empile');
  if (piles.length) {
    var empilement = window.matchMedia('(max-width: 700px)');

    var egaliser = function () {
      piles.forEach(function (pile) {
        var cartes = pile.children;
        var i;
        for (i = 0; i < cartes.length; i++) cartes[i].style.minHeight = '';
        if (!empilement.matches) return;
        var plusHaute = 0;
        for (i = 0; i < cartes.length; i++) {
          plusHaute = Math.max(plusHaute, cartes[i].getBoundingClientRect().height);
        }
        for (i = 0; i < cartes.length; i++) {
          cartes[i].style.minHeight = Math.ceil(plusHaute) + 'px';
        }
      });
    };

    egaliser();
    window.addEventListener('resize', egaliser, { passive: true });
    window.addEventListener('load', egaliser);
    if (empilement.addEventListener) empilement.addEventListener('change', egaliser);
  }

  /* ---- Avis clients ----------------------------------------------------
     Aucun avis publié au 03/10/2026 (fiche Google, Facebook, travaux.com).
     Quand les premiers arrivent, on les recopie ici À L'IDENTIQUE :
     { note: 5, texte: '…', nom: 'Prénom N.', date: 'octobre 2026' }.
     Chaque avis remplace une case réservée de la section #avis. */
  var AVIS = [];

  var grilleAvis = document.getElementById('avis-liste');
  if (grilleAvis && AVIS.length) {
    var etoile = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9z"/></svg>';
    grilleAvis.innerHTML = '';
    AVIS.forEach(function (a) {
      var carte = document.createElement('figure');
      carte.className = 'avis-carte';
      carte.innerHTML = '<div class="etoiles" role="img" aria-label="' + a.note + ' sur 5">' +
        new Array(a.note + 1).join(etoile) + '</div>' +
        '<blockquote class="avis-carte__texte"></blockquote>' +
        '<figcaption class="avis-carte__auteur"><span class="avis-carte__nom"></span>' +
        '<span class="avis-carte__date"></span></figcaption>';
      carte.querySelector('blockquote').textContent = '« ' + a.texte + ' »';
      carte.querySelector('.avis-carte__nom').textContent = a.nom;
      carte.querySelector('.avis-carte__date').textContent = a.date;
      grilleAvis.appendChild(carte);
    });
  }

  /* ---- Réalisations : afficher la suite --------------------------------- */
  var plus = document.getElementById('realisations-plus');
  var projetsBloc = document.getElementById('projets');
  if (plus && projetsBloc) {
    plus.addEventListener('click', function () {
      projetsBloc.dataset.replie = 'false';
      plus.parentElement.hidden = true;
      if (window.apparitions) window.apparitions.verifier();
    });
  }

  /* ---- Accordéon FAQ --------------------------------------------------- */
  document.querySelectorAll('.faq__bouton').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var element = btn.closest('.faq__element');
      var ouvert = element.dataset.ouvert === 'true';
      element.dataset.ouvert = String(!ouvert);
      btn.setAttribute('aria-expanded', String(!ouvert));
    });
  });

  /* ---- Comparateur avant / après --------------------------------------- */
  document.querySelectorAll('.avant-apres').forEach(function (bloc) {
    var apres = bloc.querySelector('.avant-apres__couche--apres');
    var poignee = bloc.querySelector('.avant-apres__poignee');
    var bouton = bloc.querySelector('.avant-apres__bouton');
    var position = 50;

    var placer = function (pct) {
      position = Math.max(0, Math.min(100, pct));
      apres.style.clipPath = 'inset(0 0 0 ' + position + '%)';
      poignee.style.insetInlineStart = position + '%';   /* le rond suit, il est dans la poignée */
      bouton.setAttribute('aria-valuenow', Math.round(position));
    };

    var depuisEvenement = function (e) {
      var rect = bloc.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      placer((x / rect.width) * 100);
    };

    var glisse = false;
    bloc.addEventListener('pointerdown', function (e) {
      glisse = true;
      bloc.setPointerCapture(e.pointerId);
      depuisEvenement(e);
    });
    bloc.addEventListener('pointermove', function (e) { if (glisse) depuisEvenement(e); });
    bloc.addEventListener('pointerup', function () { glisse = false; });
    bloc.addEventListener('pointercancel', function () { glisse = false; });

    bouton.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { placer(position - 4); e.preventDefault(); }
      if (e.key === 'ArrowRight') { placer(position + 4); e.preventDefault(); }
      if (e.key === 'Home') { placer(0); e.preventDefault(); }
      if (e.key === 'End') { placer(100); e.preventDefault(); }
    });

    placer(50);
  });
})();
