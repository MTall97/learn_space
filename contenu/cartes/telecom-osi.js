LS.ajouterCarte({
  id: "telecom-osi",
  titre: "Le modèle OSI",
  intro: "Reprise de ta carte XMind « OSI ». Le modèle **OSI** découpe une communication réseau en **7 couches** ; chacune rend un service à celle du dessus et dialogue avec la couche de même niveau chez le correspondant. Les « ??? » de ta carte (flags, checksum) sont complétés ici.",
  racine: { t: "OSI", c: [
    { t: "Encapsulation", d: "À l'émission, chaque couche ajoute son **en-tête** (et parfois une fin) aux données de la couche supérieure ; à la réception, chaque couche lit et retire le sien. Les noms des unités changent : données → segment → paquet → trame → bits.", tp: "tel-05-encapsulation" },
    { t: "Application", d: "Couche 7 : les protocoles utilisés directement par les programmes : HTTP/HTTPS (web), DNS (noms de domaine), SMTP/IMAP (courriel), FTP, MQTT (objets connectés)." },
    { t: "Présentation", d: "Couche 6 : représentation commune des données : encodage des caractères (UTF-8), formats (JSON, JPEG), compression, chiffrement (TLS)." },
    { t: "Session", d: "Couche 5 : ouverture, maintien, synchronisation et fermeture du dialogue entre deux applications (reprise d'un transfert interrompu)." },
    { t: "Transport (TCP)", note: "Gérer les connexions applicatives. Garantir la connexion.", d: "Couche 4 (appelée « Transfert » dans ta carte) : communication de bout en bout entre deux **programmes**, désignés par des **numéros de port**. Découpe en segments, contrôle de flux, et avec TCP fiabilité (accusés de réception, retransmission, remise en ordre).", tp: "tel-05-encapsulation", c: [
      { t: "Protocoles de transport", c: [
        { t: "TCP", d: "Transmission Control Protocol : **orienté connexion** (poignée de main SYN, SYN-ACK, ACK), fiable, ordonné, avec contrôle de congestion. Web, courriel, transfert de fichiers.", c: [
          { t: "Segment", note: "Port Source | Port Destination | Flags | Checksum | Données", d: "Unité de TCP : en-tête de 20 octets minimum + données. Champs principaux : **port source** et **port destination** (16 bits chacun), **numéro de séquence** et **numéro d'accusé** (pour remettre en ordre et confirmer), **flags**, taille de fenêtre, **checksum**.", tp: "tel-05-encapsulation" },
          { t: "Flags TCP", d: "Bits d'état de l'en-tête TCP : **SYN** (ouvrir), **ACK** (accusé valide), **FIN** (fermer proprement), **RST** (couper brutalement), **PSH** (transmettre tout de suite), **URG** (données urgentes)." },
          { t: "Checksum", d: "Somme de contrôle calculée sur l'en-tête et les données : le récepteur la recalcule ; si elle diffère, le segment est jeté (et TCP le fera renvoyer)." }
        ] },
        { t: "UDP", d: "User Datagram Protocol : **sans connexion**, sans garantie d'arrivée ni d'ordre, mais très léger (en-tête de 8 octets) et rapide. DNS, streaming, jeux, voix sur IP.", tp: "tel-05-encapsulation", c: [
          { t: "Datagramme", note: "Port Source | Port Destination | Longueur totale | Checksum | Données", d: "Unité d'UDP : port source, port destination, **longueur totale** (en-tête + données), checksum (facultatif en IPv4), puis les données." }
        ] }
      ] }
    ] },
    { t: "Réseau (IP)", note: "Interconnecter les réseaux entre eux. Fragmenter les paquets.", d: "Couche 3 : acheminement des paquets **d'un réseau à l'autre** grâce aux adresses IP et au **routage**. Les routeurs travaillent à cette couche.", tp: "tel-06-ipv4", c: [
      { t: "Adresse IP", d: "Identifiant logique d'une interface sur un réseau IP.", tp: "tel-06-ipv4", c: [
        { t: "IPv4", d: "Adresse de 32 bits écrite en 4 octets décimaux (192.168.1.10) ; ≈ 4,3 milliards d'adresses, épuisées : on utilise des adresses privées et le NAT.", c: [
          { t: "Masque de sous-réseau", d: "Indique quels bits de l'adresse désignent le réseau (bits à 1) : 255.255.255.0 = /24.", tp: "tel-06-ipv4" },
          { t: "Partie réseau", d: "Bits de gauche (selon le masque), communs à toutes les machines d'un même réseau.", tp: "tel-06-ipv4" },
          { t: "Partie hôte", d: "Bits de droite, propres à chaque machine. Tous à 0 : adresse du réseau ; tous à 1 : adresse de diffusion.", tp: "tel-06-ipv4" }
        ] },
        { t: "IPv6", d: "Adresse de 128 bits écrite en hexadécimal (2001:db8::1) : un nombre d'adresses pratiquement illimité, configuration automatique, plus de NAT nécessaire." }
      ] },
      { t: "Protocole IP", c: [
        { t: "Datagramme IP", d: "Paquet IP : en-tête de 20 octets (version, longueur, durée de vie TTL, protocole transporté, checksum d'en-tête, adresses IP source et destination) + données. Fragmenté si plus grand que le MTU (1 500 octets en Ethernet)." }
      ] },
      { t: "Protocole ICMP", d: "Messages de contrôle et d'erreur d'IP : « destination inaccessible », « délai dépassé ». Utilisé par **ping** (écho) et **traceroute**." },
      { t: "Protocole ARP", note: "Relie la couche Réseau à la couche Liaison", d: "Trouve l'adresse MAC qui correspond à une adresse IP du réseau local : « qui a 192.168.1.1 ? » envoyé en diffusion, la machine concernée répond avec sa MAC.", voir: ["L'adresse MAC"] },
      { t: "Routeur", d: "Équipement qui relie des réseaux différents et choisit, d'après l'adresse IP de destination et sa table de routage, vers où envoyer chaque paquet. Ta box est un routeur." }
    ] },
    { t: "Liaison de données", tag: "Commutateur", note: "Connecter les machines entre elles sur un réseau local. Détecter les erreurs de transmission.", d: "Couche 2 : transmission fiable entre machines **voisines** (même réseau local), adressage physique (MAC), détection d'erreurs. Les **commutateurs** (switchs) travaillent à cette couche.", c: [
      { t: "L'adresse MAC", tag: "Adresse d'une carte réseau", d: "Adresse physique de 48 bits gravée dans chaque carte réseau, écrite en 6 octets hexadécimaux (3c:71:bf:12:34:56). Les 3 premiers octets désignent le fabricant.", c: [
        { t: "Adresse de broadcast", note: "ff:ff:ff:ff:ff:ff", d: "Adresse de diffusion : une trame envoyée à ff:ff:ff:ff:ff:ff est reçue par toutes les machines du réseau local (utilisée par ARP, DHCP). En IP, l'équivalent est l'adresse dont tous les bits d'hôte sont à 1.", tp: "tel-06-ipv4" }
      ] },
      { t: "Protocoles de liaison", c: [
        { t: "Ethernet", d: "Protocole de liaison des réseaux locaux filaires (IEEE 802.3), de 10 Mbit/s à 400 Gbit/s. Le Wi-Fi (802.11) est son équivalent radio.", c: [
          { t: "Trame Ethernet", note: "MAC dst | MAC src | Type | Données | CRC", d: "Unité de la couche 2 : adresse MAC destination (6 octets), MAC source (6), type du protocole transporté (2, par ex. 0x0800 = IPv4), données (46 à 1 500 octets), **CRC** (4) pour détecter les erreurs.", tp: "tel-05-encapsulation", c: [
            { t: "Taille de la trame", d: "**Minimum 64 octets** (sinon on ajoute du bourrage), **maximum 1 518 octets** ; l'en-tête et le CRC font **18 octets**. S'y ajoutent sur le câble un préambule de 8 octets et un silence de 12 octets entre trames." }
          ] }
        ] }
      ] }
    ] },
    { t: "Physique", tag: "Hub · supports de transmission", note: "Offrir un support de transmission pour la communication.", d: "Couche 1 : transformation des bits en signaux (tensions, impulsions lumineuses, ondes radio) et caractéristiques du support : connecteurs, câbles, débit, codage. Le **hub** (concentrateur), qui répète les signaux sur tous ses ports sans les comprendre, travaille à cette couche.", voir: ["Encapsulation"] }
  ] }
});
