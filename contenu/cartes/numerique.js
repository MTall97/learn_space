LS.ajouterCarte({
  id: "numerique",
  titre: "L'électricité numérique",
  intro: "En numérique, on ne s'intéresse plus à la valeur exacte de la tension mais à deux états : **0** et **1**. Cette carte va du codage des nombres jusqu'au microcontrôleur, en passant par la logique, la mémoire et la conversion analogique-numérique.",
  racine: { t: "Numérique", c: [
    { t: "Numération", c: [
      { t: "Binaire", d: "Écriture des nombres en base 2, avec les seuls chiffres 0 et 1. Chaque position a un poids double de la précédente : 1, 2, 4, 8, 16…", ex: "101010 = 32 + 8 + 2 = 42.", tp: "num-01-binaire" },
      { t: "Bit", d: "Plus petite unité d'information : 0 ou 1 (« binary digit »)." },
      { t: "Octet", d: "Groupe de 8 bits : 256 valeurs (0 à 255). Unité de base des mémoires : 1 ko = 1 000 octets, 1 Mo = 1 000 000.", tp: "num-01-binaire" },
      { t: "Hexadécimal", d: "Base 16 (chiffres 0–9 puis A–F). Un chiffre hexadécimal = 4 bits : un octet s'écrit avec 2 chiffres. Préfixe 0x.", ex: "0x3C = 0011 1100 = 60.", tp: "num-01-binaire" },
      { t: "Complément à deux", d: "Façon de coder les entiers négatifs : le bit de poids fort compte négativement (−128 sur un octet). Pour obtenir −x : on inverse tous les bits de x et on ajoute 1.", ex: "−1 = 1111 1111 ; −128 = 1000 0000.", tp: "num-01-binaire" },
      { t: "Code ASCII", d: "Table qui associe un nombre à chaque caractère : « A » = 65, « a » = 97, « 0 » = 48. Les accents demandent un codage plus large (UTF-8)." }
    ] },
    { t: "Logique combinatoire", d: "Circuits dont la sortie ne dépend que des entrées présentes.", c: [
      { t: "Table de vérité", d: "Tableau qui donne la sortie pour toutes les combinaisons d'entrées (2ⁿ lignes pour n entrées).", tp: "num-02-portes" },
      { t: "Porte ET", d: "Sortie à 1 seulement si toutes les entrées sont à 1.", f: "S = A·B", tp: "num-02-portes" },
      { t: "Porte OU", d: "Sortie à 1 si au moins une entrée est à 1.", f: "S = A + B", tp: "num-02-portes" },
      { t: "Porte NON", d: "Inverse son entrée.", f: "S = Ā" },
      { t: "Porte NON-ET", d: "ET suivi de NON (NAND). Porte « universelle » : on peut fabriquer toutes les autres avec elle seule.", tp: "num-02-portes" },
      { t: "Porte OU exclusif", d: "Sortie à 1 si les entrées sont différentes (XOR). Sert à additionner, comparer, détecter des erreurs (parité).", f: "S = A ⊕ B", tp: "num-02-portes" },
      { t: "Algèbre de Boole", d: "Calcul sur les valeurs 0 et 1 avec ET, OU, NON. Les lois de **De Morgan** : NON(A·B) = Ā + B̄ et NON(A + B) = Ā·B̄. On simplifie les équations avec les tableaux de **Karnaugh**." },
      { t: "Additionneur", d: "Circuit qui additionne des nombres binaires. Demi-additionneur : S = A ⊕ B, retenue = A·B. Additionneur complet : ajoute aussi la retenue entrante. Chaînés, ils forment l'unité arithmétique d'un processeur.", tp: "num-03-additionneur" },
      { t: "Multiplexeur", d: "Aiguillage numérique : une entrée de sélection choisit laquelle des entrées de données est recopiée en sortie." }
    ] },
    { t: "Logique séquentielle", d: "Circuits dont la sortie dépend aussi du passé : ils ont une **mémoire**.", c: [
      { t: "Bascule RS", d: "Deux portes rebouclées : S (set) met la sortie à 1, R (reset) la met à 0, et sans ordre elle garde sa valeur. Mémoire d'un bit.", tp: "num-04-bascules" },
      { t: "Bascule D", d: "Recopie l'entrée D sur la sortie Q au **front montant** de l'horloge, et la garde jusqu'au front suivant. Brique des registres et des mémoires.", tp: "num-04-bascules" },
      { t: "Horloge", d: "Signal carré régulier qui cadence les circuits séquentiels. La fréquence d'horloge d'un processeur (240 MHz pour un ESP32) donne son rythme.", tp: "num-04-bascules" },
      { t: "Compteur", d: "Chaîne de bascules qui compte les impulsions d'horloge en binaire. Chaque étage divise la fréquence par 2.", tp: "num-04-bascules" },
      { t: "Registre", d: "Groupe de bascules qui mémorise un mot (8, 16, 32 bits). Registre à décalage : les bits avancent d'un cran à chaque coup d'horloge (conversion série-parallèle)." }
    ] },
    { t: "Conversion", c: [
      { t: "CAN (ADC)", d: "Convertisseur analogique-numérique : transforme une tension en nombre. Caractérisé par sa résolution (bits) et sa vitesse d'échantillonnage.", tp: ["num-05-echantillonnage", "esp-04-adc"] },
      { t: "CNA (DAC)", d: "Convertisseur numérique-analogique : transforme un nombre en tension (sortie audio, consigne). L'ESP32 en a deux (GPIO 25 et 26)." },
      { t: "Échantillonnage", d: "Mesure du signal à intervalles réguliers, à la fréquence fe.", tp: "num-05-echantillonnage" },
      { t: "Quantification", d: "Arrondi de chaque mesure au plus proche des 2ⁿ niveaux. L'erreur d'arrondi est le **bruit de quantification**.", f: "RSB ≈ 6,02·n + 1,76 dB", tp: "num-05-echantillonnage" },
      { t: "Théorème de Shannon", d: "Pour reconstituer un signal, il faut échantillonner à plus de deux fois sa plus haute fréquence. Sinon, apparaît le **repliement de spectre** (aliasing) : de fausses fréquences.", f: "fe > 2·f_max", ex: "Audio CD : 44,1 kHz pour 20 kHz.", tp: "num-05-echantillonnage" }
    ] },
    { t: "Microcontrôleur", d: "Ordinateur complet sur une puce : processeur, mémoires, horloge et périphériques (entrées/sorties, convertisseurs, bus). Il exécute un seul programme, en boucle. Exemples : ATmega328 (Arduino Uno), ESP32, STM32.", voir: ["Horloge"], c: [
      { t: "Mémoire flash", d: "Mémoire non volatile qui garde le programme hors tension." },
      { t: "RAM", d: "Mémoire vive pour les variables, effacée à la coupure (520 ko dans un ESP32)." },
      { t: "Entrées/sorties", d: "Broches que le programme lit ou commande (GPIO), et périphériques intégrés : PWM, ADC, UART, I2C, SPI, minuteries." },
      { t: "Interruption", d: "Signal qui suspend le programme principal pour exécuter tout de suite une fonction courte (front sur une broche, minuterie, réception série)." }
    ] }
  ] }
});
