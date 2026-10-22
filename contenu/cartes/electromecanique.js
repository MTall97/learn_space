LS.ajouterCarte({
  id: "electromecanique",
  titre: "L'électromécanique",
  intro: "L'électromécanique relie l'électricité et le mouvement grâce au **magnétisme** : un courant crée un champ magnétique, un champ magnétique qui varie crée une tension, et un courant dans un champ subit une force. De là viennent moteurs, alternateurs, transformateurs et relais.",
  racine: { t: "Électromécanique", c: [
    { t: "Magnétisme", c: [
      { t: "Champ magnétique", d: "Zone où s'exercent des forces magnétiques, représentée par des lignes de champ (du nord au sud à l'extérieur d'un aimant). Intensité B en teslas (T).", ex: "Champ terrestre ≈ 50 µT ; aimant néodyme ≈ 1 T." },
      { t: "Aimant permanent", d: "Matériau (ferrite, néodyme) qui garde une aimantation. Pôles nord et sud ; pôles de même nom se repoussent." },
      { t: "Électroaimant", d: "Bobine parcourue par un courant, souvent autour d'un noyau de fer : elle devient un aimant, qui disparaît quand le courant s'arrête. Base des relais, contacteurs, électrovannes, haut-parleurs.", tp: "em-01-relais-moteur" },
      { t: "Induction (loi de Faraday)", d: "Quand le flux magnétique qui traverse une bobine varie, une tension apparaît à ses bornes, proportionnelle à la vitesse de variation.", f: "e = −N · dΦ/dt", tp: ["em-03-alternateur", "em-04-transformateur"] },
      { t: "Loi de Lenz", d: "Le courant induit s'oppose toujours à la cause qui l'a produit : c'est pourquoi un alternateur qui débite freine, et qu'une bobine s'oppose aux variations de courant.", tp: "em-03-alternateur" },
      { t: "Force de Laplace", d: "Un conducteur parcouru par un courant I, placé dans un champ B, subit une force perpendiculaire aux deux. C'est le principe de tous les moteurs électriques.", f: "F = B · I · L", tp: "em-02-moteur-cc" }
    ] },
    { t: "Machines à courant continu", c: [
      { t: "Moteur à courant continu", d: "Rotor bobiné dans le champ d'aimants (ou d'un inducteur) ; la force de Laplace crée un couple proportionnel au courant. Sa vitesse est proportionnelle à la tension. Facile à commander : on inverse le sens en inversant la polarité.", f: "C = k·I ; U = E + R·I ; E = k·Ω", tp: "em-02-moteur-cc" },
      { t: "Collecteur et balais", d: "Le collecteur (bagues fendues sur l'axe) et les balais (frotteurs en carbone) inversent le courant dans le rotor à chaque demi-tour pour que le couple garde le même sens. Ils s'usent et font des étincelles.", tp: "em-02-moteur-cc" },
      { t: "Force contre-électromotrice", d: "En tournant, le moteur fonctionne aussi en génératrice : il produit une tension E = k·Ω qui s'oppose à l'alimentation. À l'arrêt, E = 0 : le courant de démarrage est très fort.", tp: ["em-02-moteur-cc", "em-01-relais-moteur"] },
      { t: "Moteur brushless (sans balais)", d: "Les aimants sont sur le rotor et les bobines sur le stator ; un contrôleur électronique (ESC) commute le courant. Pas d'usure, très bon rendement : drones, ventilateurs de PC, trottinettes, voitures électriques." }
    ] },
    { t: "Machines à courant alternatif", c: [
      { t: "Alternateur", d: "Un rotor aimanté (ou électroaimant) tourne devant des bobines et y induit une tension alternative. Toutes les centrales et les véhicules en ont.", f: "f = p · n / 60", tp: "em-03-alternateur" },
      { t: "Champ tournant", d: "Trois bobines décalées de 120° alimentées en triphasé créent un champ magnétique qui tourne à la vitesse de synchronisme.", f: "ns = 60 · f / p (tr/min)", tp: "em-05-asynchrone" },
      { t: "Moteur asynchrone", d: "Le champ tournant induit des courants dans le rotor en cage d'écureuil, qui est entraîné un peu moins vite que le champ. Robuste, sans entretien : le plus répandu dans l'industrie.", tp: "em-05-asynchrone" },
      { t: "Glissement", d: "Écart relatif entre la vitesse du champ et celle du rotor, quelques pour cent en charge.", f: "g = (ns − n) / ns", tp: "em-05-asynchrone" },
      { t: "Moteur synchrone", d: "Le rotor (aimants) tourne exactement à la vitesse du champ. Avec un variateur, c'est le moteur de la plupart des voitures électriques et des robots." }
    ] },
    { t: "Transformateur", d: "Deux bobinages sur un noyau de fer feuilleté. Le flux alternatif créé par le primaire induit une tension au secondaire. Il élève ou abaisse une tension alternative avec un très bon rendement, et isole galvaniquement. Le nombre de spires du primaire est imposé par la tension : trop peu de spires et le fer **sature** (courant à vide énorme).", f: "U2 / U1 = N2 / N1 = I1 / I2 ; flux ∝ U1 / (N1 · f)", tp: "em-04-transformateur" },
    { t: "Positionnement", c: [
      { t: "Moteur pas à pas", d: "Moteur qui avance d'un angle fixe (souvent 1,8°, soit 200 pas par tour) à chaque impulsion envoyée dans ses bobines, dans l'ordre. Positionnement précis sans capteur : imprimantes 3D, CNC.", tp: "em-06-pas-a-pas" },
      { t: "Servomoteur", d: "Moteur, réducteur et capteur de position avec un asservissement : il rejoint l'angle commandé par la durée d'une impulsion (1 à 2 ms toutes les 20 ms).", tp: "em-06-pas-a-pas" }
    ] },
    { t: "Commande", c: [
      { t: "Relais", d: "Interrupteur commandé par un électroaimant ; isole le circuit de commande (faible puissance) du circuit de puissance.", tp: "em-01-relais-moteur" },
      { t: "Contacteur", d: "Gros relais pour la puissance (moteurs triphasés), souvent associé à un relais thermique de protection." },
      { t: "Variateur de vitesse", d: "Convertisseur électronique qui alimente un moteur alternatif sous fréquence et tension variables : réglage de vitesse, démarrage progressif, économies d'énergie.", tp: "em-05-asynchrone" },
      { t: "Démarrage étoile-triangle", d: "On démarre un moteur triphasé couplé en étoile (courant divisé par 3), puis on passe en triangle : limite le courant d'appel." }
    ] }
  ] }
});
