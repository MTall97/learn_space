LS.ajouterTP({
  id: "ia-04-evaluation",
  titre: "Évaluer une transcription et une traduction",
  domaine: "ml-audio", niveau: 2, duree: "25 min",
  sim: "evaluation",
  intro: "Pour savoir si un système de reconnaissance ou de traduction progresse, on compare sa sortie à une **référence** écrite par un humain. Les scores automatiques sont rapides et reproductibles, mais ils comptent des mots, pas du **sens**.\n\n- **WER** (taux d'erreur sur les mots) : substitutions + suppressions + insertions, divisées par le nombre de mots de la référence.\n- **CER** : la même chose sur les lettres.\n- **BLEU** : proportion de suites de 1 à 4 mots communes avec la référence, avec une pénalité si la sortie est trop courte (version simplifiée, une seule référence, lissage pour les phrases courtes).\n\nToutes les phrases sont **inventées** pour l'exercice. Tu peux modifier la sortie du système dans le champ sous le schéma ; minuscules et ponctuation sont ignorées.",
  objectifs: [
    { texte: "Transcription : écris une sortie avec **exactement 1 substitution**, aucune suppression et aucune insertion.",
      indice: "Remplace un seul mot par un autre, sans en ajouter ni en enlever.",
      verif: s => s.p.tache === "transcription" && s.etat.w && s.etat.w.S === 1 && s.etat.w.D === 0 && s.etat.w.I === 0 },
    { texte: "Trouve une sortie dont le **CER** est inférieur au **tiers** du WER : quel genre d'erreur est-ce ?",
      verif: s => s.etat.w && s.etat.w.taux > 0 && s.etat.c < s.etat.w.taux / 3,
      bravo: "Une faute d'orthographe ou d'accord compte un mot entier pour le WER, une ou deux lettres pour le CER. Le CER est souvent plus juste pour les langues à l'orthographe peu fixée ou aux mots longs." },
    { texte: "Obtiens un **WER supérieur à 100 %**.",
      verif: s => s.etat.w && s.etat.w.taux > 1,
      bravo: "Les insertions n'ont pas de limite : un système qui invente beaucoup de mots dépasse 100 %. Le WER n'est donc pas un pourcentage de mots justes." },
    { texte: "Traduction : compare la **paraphrase** (sens juste) et la **négation** (sens inversé). Laquelle a le meilleur BLEU ?",
      verif: (s, m) => { if (s.p.tache !== "traduction") return false; if (s.p.hyp === "paraphrase") m.para = true; if (s.p.hyp === "negation") m.nega = true; return !!(m.para && m.nega); },
      bravo: "La négation, de loin, alors qu'elle dit le contraire de la référence. Le BLEU sert à suivre des progrès sur beaucoup de phrases ; pour dire qu'un modèle est fiable, il faut des personnes qui jugent le sens, sur un jeu de test de référence." }
  ],
  questions: [
    { q: "Référence de 10 mots, 1 suppression et 2 substitutions : WER ?", choix: ["20 %", "30 %", "3 %"], bonne: 1, explication: "(0 + 1 + 2) / 10 = 30 %." },
    { q: "Deux systèmes ont un BLEU de 31 et 33 sur 50 phrases. On peut conclure que…", choix: ["le second traduit mieux le sens", "rien de sûr sans évaluation humaine et sans test de signification"], bonne: 1 },
    { q: "Pourquoi ne pas filtrer le jeu de test en gardant les phrases où une cascade (transcription puis traduction) obtient un bon score ?", choix: ["Parce que le test serait alors choisi pour avantager la cascade", "Parce que le calcul serait plus long"], bonne: 0 }
  ],
  notions: [["ml-audio", "WER et CER"], ["ml-audio", "BLEU et chrF"], ["ml-audio", "Évaluation humaine"], ["ml-audio", "Jeu de test de référence"], ["ml-audio", "Distance d'édition"]],
  suite: "Écris une sortie qui ne garde que les mots les plus importants (« marché ouvre demain sept heures ») : WER élevé, mais un humain comprend tout. Pour un usage réel (sous-titrage, interprétation), c'est souvent ce qui compte."
});
