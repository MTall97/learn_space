LS.ajouterCarte({
  id: "moteur",
  titre: "Le moteur thermique",
  intro: "Un moteur thermique transforme l'énergie chimique du carburant en chaleur, puis en travail mécanique : la combustion fait monter la pression qui pousse un piston, et le système bielle-manivelle transforme ce va-et-vient en rotation. Valable pour la voiture comme pour la moto.",
  racine: { t: "Moteur thermique", c: [
    { t: "Principes", c: [
      { t: "Moteur à combustion interne", d: "La combustion a lieu **dans** le cylindre (essence, diesel), contrairement à la machine à vapeur (combustion externe). Rendement typique 30–40 % : le reste part en chaleur (échappement, refroidissement)." },
      { t: "Cycle 4 temps", d: "Cycle Beau de Rochas (Otto) : **admission**, **compression**, **combustion-détente**, **échappement**, en deux tours de vilebrequin. Un seul temps moteur sur quatre.", tp: "meca-01-quatre-temps" },
      { t: "Cycle 2 temps", d: "Le cycle complet en un seul tour : compression et détente au-dessus du piston, pré-compression du mélange dans le carter en dessous ; pas de soupapes mais des lumières. Léger et puissant, mais plus polluant.", tp: "meca-03-deux-temps" },
      { t: "Moteur essence", d: "Allumage **commandé** par une bougie ; mélange air-essence dosé (stœchiométrique, 14,7 g d'air par g d'essence) ; puissance réglée par un **papillon** qui limite l'air admis. Taux de compression 9 à 13.", tp: "meca-02-diesel" },
      { t: "Moteur diesel", d: "Allumage par **compression** : l'air seul, comprimé 15 à 22 fois, dépasse 600 °C ; le gazole injecté s'enflamme spontanément. Pas de papillon : puissance réglée par la quantité injectée. Plus de couple et meilleur rendement, mais plus lourd.", tp: "meca-02-diesel" }
    ] },
    { t: "Organes", d: "Pièces principales du moteur.", c: [
      { t: "Bloc-cylindres", d: "Pièce en fonte ou aluminium qui contient les cylindres et porte le vilebrequin." },
      { t: "Culasse", d: "Couvercle du bloc qui ferme les cylindres : chambres de combustion, soupapes, bougies ou injecteurs, souvent les arbres à cames. Joint de culasse entre les deux." },
      { t: "Piston", d: "Pièce mobile qui coulisse dans le cylindre et reçoit la poussée des gaz. Ses **segments** assurent l'étanchéité et raclent l'huile." },
      { t: "Bielle", d: "Relie le piston (axe) au vilebrequin (maneton) : transforme le mouvement rectiligne en rotation." },
      { t: "Vilebrequin", d: "Arbre coudé qui reçoit les efforts des bielles et fournit le couple de sortie. Ses **contrepoids** équilibrent les masses en mouvement.", tp: "meca-04-multicylindre" },
      { t: "Volant moteur", d: "Disque lourd fixé au vilebrequin : son inertie régularise la rotation entre les temps moteurs ; il porte la couronne du démarreur et l'embrayage.", tp: "meca-04-multicylindre" },
      { t: "Carter", d: "Enveloppe inférieure du moteur, réservoir d'huile (4 temps) ; en 2 temps, le carter étanche sert de pompe à mélange." }
    ] },
    { t: "Distribution", d: "Ensemble qui ouvre et ferme les soupapes au bon moment, synchronisé avec le vilebrequin.", c: [
      { t: "Soupapes", d: "Clapets en forme de champignon : admission (la plus grande) et échappement. Rappelées par des ressorts, poussées par les cames.", tp: "meca-01-quatre-temps" },
      { t: "Arbre à cames", d: "Arbre muni de bossages (cames) qui poussent les soupapes. Il tourne **deux fois moins vite** que le vilebrequin (un tour par cycle de 4 temps)." },
      { t: "Courroie ou chaîne de distribution", d: "Lie l'arbre à cames au vilebrequin. Une courroie cassée peut faire heurter soupapes et pistons : on la change selon le carnet d'entretien." },
      { t: "Diagramme de distribution", d: "Angles d'ouverture et de fermeture des soupapes. On ouvre l'admission **avant** le PMH (AOA) et on la ferme **après** le PMB (RFA) ; l'échappement s'ouvre avant le PMB (AOE) et se ferme après le PMH (RFE). Autour du PMH, les deux sont ouvertes : le **croisement**.", tp: "meca-01-quatre-temps" }
    ] },
    { t: "Caractéristiques", c: [
      { t: "PMH et PMB", d: "Point mort haut et point mort bas : positions extrêmes du piston, où sa vitesse s'annule.", tp: "meca-01-quatre-temps" },
      { t: "Alésage et course", d: "Alésage : diamètre du cylindre. Course : distance parcourue par le piston du PMH au PMB (deux fois le rayon de la manivelle). « Carré » si égaux ; « super-carré » (alésage > course) pour les moteurs qui montent haut en régime (motos)." },
      { t: "Cylindrée", d: "Volume balayé par les pistons.", f: "Cylindrée unitaire = π × alésage² / 4 × course\nCylindrée totale = unitaire × nombre de cylindres", ex: "75 mm × 84,8 mm → 375 cm³ par cylindre, 1 500 cm³ pour 4 cylindres.", tp: "meca-01-quatre-temps" },
      { t: "Taux de compression", d: "Rapport entre le volume total au PMB et le volume de la chambre au PMH. Plus il est élevé, meilleur est le rendement, jusqu'à la limite du cliquetis (essence) ou de la résistance mécanique (diesel).", f: "ε = (V cylindrée + V chambre) / V chambre", tp: ["meca-01-quatre-temps", "meca-02-diesel"] },
      { t: "Couple", d: "Effort de rotation fourni au vilebrequin, en newtons-mètres (N·m). C'est lui qui fait accélérer ; il est maximal là où le cylindre se remplit le mieux.", tp: "meca-05-couple-puissance" },
      { t: "Puissance", d: "Travail fourni par seconde, en kilowatts (kW) ou chevaux (1 ch ≈ 736 W).", f: "P = C × ω = C × 2π × N / 60", tp: "meca-05-couple-puissance" },
      { t: "Régime", d: "Vitesse de rotation du vilebrequin, en tours par minute (tr/min). Ralenti ≈ 800 tr/min ; zone rouge 4 500 (diesel) à 15 000 (moto sportive).", tp: "meca-05-couple-puissance" },
      { t: "Ordre d'allumage", d: "Ordre dans lequel les cylindres produisent leur temps moteur, choisi pour l'équilibre : 1-3-4-2 sur un 4 cylindres en ligne (un temps moteur tous les 180°).", tp: "meca-04-multicylindre" }
    ] },
    { t: "Alimentation", c: [
      { t: "Carburateur", d: "Ancien système (motos, petits moteurs) où l'air aspiré entraîne l'essence par effet Venturi. Simple mais imprécis." },
      { t: "Injection", d: "Le calculateur commande des injecteurs qui pulvérisent le carburant sous pression : indirecte (dans la tubulure d'admission) ou directe (dans la chambre). En diesel, rampe commune (common rail) jusqu'à 2 000 bars.", tp: "meca-02-diesel" },
      { t: "Turbocompresseur", d: "Turbine entraînée par les gaz d'échappement, qui fait tourner un compresseur sur l'admission : on fait entrer plus d'air, donc on brûle plus de carburant dans la même cylindrée.", tp: "meca-02-diesel" }
    ] },
    { t: "Allumage", c: [
      { t: "Bougie", d: "Produit l'étincelle entre ses électrodes grâce à une haute tension (20 000 à 40 000 V) fournie par la bobine d'allumage." },
      { t: "Avance à l'allumage", d: "L'étincelle a lieu **avant** le PMH, car la combustion prend du temps : la pression doit être maximale juste après le PMH. Elle augmente avec le régime.", tp: "meca-01-quatre-temps" },
      { t: "Cliquetis", d: "Auto-inflammation brutale d'une partie du mélange avant le passage du front de flamme : bruit métallique, chocs qui détruisent pistons et segments. Causes : compression trop forte, trop d'avance, carburant à indice d'octane trop faible.", tp: "meca-02-diesel" }
    ] },
    { t: "Lubrification", d: "L'huile réduit les frottements et l'usure, refroidit et nettoie. 4 temps : pompe à huile et carter. 2 temps : huile mélangée à l'essence (2 à 4 %) ou injectée séparément.", tp: "meca-03-deux-temps" },
    { t: "Lumières et transferts", d: "Dans un 2 temps, ouvertures dans la paroi du cylindre découvertes par le piston : lumière d'**échappement**, lumières de **transfert** (du carter vers le cylindre) et d'**admission**.", tp: "meca-03-deux-temps" },
    { t: "Refroidissement", d: "Évacue l'excès de chaleur : par air (ailettes, motos anciennes) ou par liquide (pompe à eau, radiateur, thermostat, ventilateur). Surchauffe = joint de culasse et pistons endommagés." },
    { t: "Échappement", d: "Collecteur, pot catalytique (transforme CO, HC, NOx en CO₂, H₂O, N₂), filtre à particules (diesel), silencieux." }
  ] }
});
