LS.ajouterCarte({
  id: "telecom",
  titre: "Télécommunication",
  intro: "Reprise de ta carte XMind « Télécommunication ». Les télécommunications reposent sur deux piliers : la **commutation** (comment on met en relation les correspondants à travers un réseau) et la **transmission** (comment on fait voyager le signal sur une liaison). Les cartes « Transmission » et « Modèle OSI » détaillent la suite.",
  racine: { t: "Télécommunication", c: [
    { t: "Commutation", tag: "Concept de réseau", d: "Opération qui consiste à établir, à travers un réseau de nœuds (commutateurs, routeurs), le chemin qui relie deux correspondants, puis à acheminer les informations. Sans commutation, il faudrait un câble entre chaque paire d'abonnés.", tp: "tel-07-commutation", c: [
      { t: "Les types de commutation", d: "Il existe plusieurs façons de partager le réseau entre les communications, du plus « réservé » au plus « partagé ».", c: [
        { t: "Commutation de circuits", d: "Un chemin physique (ou un intervalle de temps) est **réservé** de bout en bout pendant toute la communication. Débit garanti et délai constant, mais ressources bloquées même pendant les silences. Téléphone classique (RTC), GSM voix.", tp: "tel-07-commutation" },
        { t: "Commutation de paquets", d: "Les données sont découpées en **paquets** autonomes (avec adresse et numéro), routés indépendamment et stockés-retransmis par chaque nœud. Partage efficace des liaisons, tolérance aux pannes, mais délai variable et désordre possible. Internet (IP).", tp: "tel-07-commutation" },
        { t: "Circuit virtuel", d: "Commutation de paquets où l'on établit d'abord un chemin logique : tous les paquets le suivent, dans l'ordre, sans réserver la liaison pour eux seuls. X.25, Frame Relay, ATM.", tp: "tel-07-commutation" },
        { t: "Commutation de cellules", d: "Commutation de paquets de **taille fixe et petite** (cellules de 53 octets en ATM) : commutation matérielle très rapide, délai prévisible, adaptée à la voix et à la vidéo." },
        { t: "Commutation de labels", d: "Chaque paquet reçoit une courte **étiquette** (label) à l'entrée du réseau ; les routeurs commutent d'après l'étiquette au lieu d'analyser l'adresse IP complète. MPLS, utilisé par les opérateurs." }
      ] },
      { t: "Mise en relation", d: "Phases d'une communication commutée : établissement, communication, libération.", c: [
        { t: "Signalisation", note: "Composition | Sonnerie | Raccrocher", d: "Échange d'informations de **service** entre le terminal et le réseau, et entre les nœuds du réseau, pour établir, superviser et libérer une communication : numérotation, tonalité, sonnerie, décroché, raccroché, facturation. En téléphonie moderne : SS7, SIP.", tp: "tel-07-commutation" },
        { t: "Communication", note: "Échange d'informations lors d'un appel", d: "Phase où les informations utiles (voix, données) circulent sur le chemin établi, entre la signalisation d'établissement et celle de libération." }
      ] }
    ] },
    { t: "Transmission", tag: "Liaison", note: "Sans fréquence il n'y a pas de transmission", d: "Acheminement d'un signal d'un point à un autre sur un **support** (câble, fibre, ondes radio) : c'est la **liaison**. Un signal porteur d'information varie dans le temps, donc possède des **fréquences** ; le support doit les laisser passer. Détails dans la carte « La transmission ».", tp: "tel-01-signal", c: [
      { t: "Liaison point à point", d: "Liaison qui relie directement deux équipements (une ligne d'abonné, un faisceau hertzien entre deux antennes)." },
      { t: "Liaison multipoint", d: "Un support partagé par plusieurs équipements (Wi-Fi, bus, ancien Ethernet coaxial) : il faut une règle d'accès au support pour éviter les collisions." }
    ] }
  ] }
});
