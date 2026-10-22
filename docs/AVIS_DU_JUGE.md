# Avis du juge et limites connues des modèles

## Revues indépendantes

| Date | Portée | État |
|---|---|---|
| 22/10/2026 | Tout le site existant (électricité → drones) | **Pas de rapport** : la première revue a été perdue lors d'une remise à zéro de la session, la seconde a été arrêtée avant la fin. À relancer. |

Aucune revue indépendante n'a encore jugé ce dépôt. Les limites ci-dessous sont celles que les auteurs des
modèles ont eux-mêmes relevées ; elles ne remplacent pas une revue critique.

## Limites relevées par les auteurs (22/10/2026)

### Maths utiles
- Graphiques sans graduations chiffrées : seules les plages sont écrites dans les titres.
- Intervalle de confiance en 1,96·σ/√n : juste seulement pour un grand nombre de tirages.
- Le masquage des réglages inutiles dépend de l'ordre des contrôles produits par `LS.simAnimee`.

### Énergie solaire et batteries
- Panneau (modèle à une diode, 60 cellules : Voc 39,6 V, Isc 9,8 A, Pmp 288 W) : ni vieillissement, ni salissure, ni angle d'incidence ; claquage inverse fixé à 18 V ; le MPPT trouve toujours le maximum global (un vrai peut rester sur un maximum local à l'ombre).
- Batterie : pas d'effet de la température, pas d'autodécharge ; courbes de tension typiques ; résistance de charge réglée à la main.
- Régulateur : tension de batterie fixe sur la journée.
- Dimensionnement : irradiations mensuelles d'ordre de grandeur (pas PVGIS), jour couvert = 20 % ; rendements constants ; prix en FCFA indicatifs.

### Électricité du bâtiment
- Seuil magnétique au milieu de la plage de la courbe, sans dispersion ; bilame ajusté sur les seuls points conventionnels (CEI 60898).
- Échauffement du câble au premier ordre, pose encastrée seulement, constante de temps estimée.
- Zones CEI 60479-1 simplifiées (courbes b et c1) ; différentiel déterministe à 0,8 IΔn.
- Chute de tension calculée sous 230 V sans rétroaction ; seuil de démarrage moteur indicatif (15 %).
- Seul le schéma TT est simulé. Le site ne forme pas à intervenir sur une installation réelle.

### Capteurs
- CTN : Steinhart-Hart ajusté sur des valeurs B plausibles, pas sur une fiche précise ; dissipation 1,5 mW/°C en ordre de grandeur.
- ADC : modèle simplifié d'`esp32.js`.
- HC-SR04 : faisceau, perte d'écho et portée en règles simples.
- IMU : accélérations en créneaux, pas de lacet, pas de filtre de Kalman.
- Balance : décalage, gain et bruit inventés ; dérive linéaire.

### Machine learning et audio
- Neurone : régression logistique seule (le XOR montre la limite, la solution à couche cachée n'est pas simulée).
- Surapprentissage : polynômes (base de Legendre), pas un réseau profond.
- Spectrogramme : voix synthétique (120 Hz, formants masculins, pas de consonnes) ; repliement sans filtre anti-repliement ; pas d'échelle mel.
- Évaluation : BLEU simplifié (une référence, lissage), **non comparable** aux chiffres sacreBLEU publiés ; chrF seulement défini.
- Fuite de données : données 2D, plus proches voisins, « style » de série = décalage ; 4 tirages par score.
