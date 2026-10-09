// Moteur de l'assistant de Jàppale : il répond uniquement à partir des données de la plateforme, sans rien inventer.
// Il est partagé par toutes les pages : chaque page lui fournit les données (communes, régions) et deux petits outils de mise en forme.
function creerMoteurAssistant({ communes, regionPoints, regionRate, mot, nomUnique }) {
  function normaliserTexte(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function trouverLieu(question) {
    const q = normaliserTexte(question);
    const mots = q.split(/\s+/).filter(w => w.length >= 4);
    let meilleurDirect = null, longueurDirect = 0;
    let meilleurMot = null, longueurMot = 0;
    for (const c of communes) {
      for (const champ of [c.n, c.d, c.r]) {
        const nq = normaliserTexte(champ);
        if (nq.length <= 2) continue;
        const type = champ === c.n ? 'commune' : champ === c.d ? 'departement' : 'region';
        if (q.includes(nq) && nq.length > longueurDirect) {
          meilleurDirect = { champ, valeur: champ, type, commune: c };
          longueurDirect = nq.length;
        } else if (mots.some(m => nq.startsWith(m) || nq === m) && nq.length > longueurMot) {
          meilleurMot = { champ, valeur: champ, type, commune: c };
          longueurMot = nq.length;
        }
      }
    }
    // une correspondance exacte (le nom complet apparaît dans la question) prime toujours
    // sur une correspondance partielle par mot, même plus longue en caractères.
    const trouve = meilleurDirect || meilleurMot;
    // Mbour, Kolda, Kanel... sont à la fois une commune et un département : si un nom est aussi celui d'une
    // commune, on la retient (les classements, eux, élargissent ensuite au département ou à la région).
    if (trouve) {
      const nv = normaliserTexte(trouve.valeur);
      const commune = communes.find(c => normaliserTexte(c.n) === nv);
      if (commune) return { champ: commune.n, valeur: commune.n, type: 'commune', commune };
    }
    return trouve;
  }

  const DEFINITIONS = {
    bassin: "La vue bassin tient compte des communes voisines : la capacité de chaque poste de santé est partagée entre toutes les communes situées à moins de 15 km, au prorata de la proximité. Une commune dense n'est donc pas automatiquement mieux desservie si ses voisines s'appuient sur les mêmes postes. L'idée s'inspire de l'indicateur d'accessibilité utilisé en France.",
    deficit: "Le déficit de postes de santé d'une commune est le nombre de postes requis moins le nombre de postes existants. Les postes requis sont la population divisée par 10 000, arrondie à l'entier supérieur (norme de l'OMS reprise par l'ANSD). Pour les centres de santé (1 pour 50 000 habitants) et les hôpitaux (1 pour 150 000), le calcul se fait par département, car ces équipements desservent plusieurs communes.",
    scenario: "Le scénario 2033 prolonge la croissance mesurée entre 2013 et 2023 : taux plein pendant 5 ans, puis ramené à mi-chemin du taux médian national pendant 5 ans. C'est un scénario, pas une prévision officielle.",
    score: "Le score combiné, de 0 à 100, fait la moyenne de deux rangs à poids égal : le déficit de postes de santé et le nombre d'habitants par établissement secondaire.",
  };
  function definitionFiabilite() {
    const sans = communes.filter(c => c.fb === 0).length;
    return `La fiabilité indique si des infrastructures ont pu être rattachées à la commune (« données vérifiées » ou « à confirmer ») et si sa croissance 2013-2023 a été mesurée ou estimée. Aujourd'hui, ${sans} communes sur ${communes.length} sont « à confirmer ».`;
  }
  function departements() {
    const m = new Map();
    communes.forEach(c => { const k = c.r + '|' + c.d; if (!m.has(k)) m.set(k, { d: c.d, r: c.r, nh: c.nh, bh: c.bh, dhd: c.dhd, nc: c.nc, bc: c.bc, dcd: c.dcd }); });
    return [...m.values()];
  }

  // Un même nom peut désigner une commune, un département et une région (Kolda, Thiès, Dakar...).
  // Pour un classement ou une liste, on retient le périmètre le plus large ; un nom de commune seule n'est pas un périmètre.
  function perimetre(lieu) {
    if (!lieu) return null;
    if (communes.some(c => c.r === lieu.valeur)) return { cle: 'r', valeur: lieu.valeur };
    if (communes.some(c => c.d === lieu.valeur)) return { cle: 'd', valeur: lieu.valeur };
    return null;
  }

  function repondreAssistant(question) {
    const q = normaliserTexte(question);
    const lieu = trouverLieu(question);
    const memes = (l) => communes.filter(x => x.n === l.valeur);
    const parleEducation = /ecole|college|lycee|education|scolaire|etablissement|universit/.test(q);
    const parleHopital = /hopita/.test(q), parleCentre = /centre de sante|centres de sante/.test(q);
    const parleSante = /sante|poste|deficit|manqu|besoin|priorit|touch|urgent|premier/.test(q);
    const demandeDefinition = /quoi|signifie|definition|explique|qu est ce|comment (est|sont) calcul|comment calcul/.test(q);

    // 1. Définitions
    if (q.includes('fiabilit')) return definitionFiabilite();
    if (demandeDefinition) {
      if (q.includes('bassin')) return DEFINITIONS.bassin;
      if (q.includes('2033') || q.includes('scenario')) return DEFINITIONS.scenario;
      if (q.includes('score') || q.includes('combine')) return DEFINITIONS.score;
      if (q.includes('deficit') || q.includes('norme') || q.includes('calcul')) return DEFINITIONS.deficit;
    }

    // 1 bis. Qui est derrière le projet : on ne devine pas
    if (/qui a (finance|produit|cree|realise|fait|developpe)|qui est derriere|qui sont vous/.test(q)) {
      return "Jàppale Sénégal est le projet de l'équipe Jàppale Sénégal pour le hackathon des 20 ans de l'ANSD. Je n'ai aucune information sur son financement. Tous les calculs partent de données de l'ANSD (RGPH-5, Géo Sénégal).";
    }
    // 1 ter. Questions de coût : aucune donnée de coût, on le dit plutôt que de répondre à côté
    if (/cout|coute|fcfa|\bfrancs?\b|combien (faut-il|depenser|investir)|quel est le budget|budget (pour|necessaire)|combler/.test(q) && !/ou construire|ou implanter/.test(q)) {
      return "Je n'ai aucune donnée de coût et je ne vais pas en inventer : l'algorithme suppose le même coût pour chaque structure. Je peux en revanche dire combien de postes manquent (« Déficit de Touba ») ou où investir en premier avec un nombre de structures donné (« Où construire en priorité avec 5 structures ? »).";
    }

    // 2. Où construire en priorité avec N structures
    const matchBudget = q.match(/(\d+)\s*(structure|poste)/);
    if (matchBudget && (q.includes('ou construire') || q.includes('priorite') || q.includes('budget'))) {
      const budget = Math.max(1, Math.min(20, parseInt(matchBudget[1])));
      const per = perimetre(lieu);
      const pool = per ? communes.filter(c => c[per.cle] === per.valeur) : communes;
      const candidats = pool.filter(c => c.dp > 0);
      if (!candidats.length) return "Je n'ai trouvé aucune commune en déficit de postes de santé sur ce périmètre.";
      const tri = [...candidats].sort((a, b) => b.dp - a.dp).slice(0, budget);
      const liste = tri.map((c, i) => `${i + 1}. ${nomUnique(c)} (${c.dp} ${mot(c.dp, 'poste manquant', 'postes manquants')})`).join(' ; ');
      return `Avec un budget de ${budget} ${mot(budget, 'poste', 'postes')} de santé${per ? ' dans ' + per.valeur : ''}, les communes les plus prioritaires par déficit sont : ${liste}. Pour un calcul qui retire le chevauchement entre communes proches, utilisez le simulateur (icône ⚙).`;
    }

    // 3. Quelle région est la plus touchée
    const inverse = /mieux|moins touch|moins en deficit|meilleur|bien dote|bien equip/.test(q);
    if (!lieu && q.includes('region') && (q.includes('plus') || q.includes('pire') || q.includes('quelle') || inverse)) {
      const m = parleEducation ? 'education' : 'sante';
      const liste = Object.values(regionPoints).map(r => ({ r, taux: regionRate(r, m, 'communale') })).sort((a, b) => inverse ? a.taux - b.taux : b.taux - a.taux).slice(0, 3);
      const texte = liste.map((x, i) => m === 'education'
        ? `${i + 1}. ${x.r.label} (${Math.round(x.r.pop / x.r.nbEduc).toLocaleString('fr-FR')} habitants par établissement secondaire)`
        : `${i + 1}. ${x.r.label} (${x.taux.toFixed(1).replace('.', ',')} postes manquants pour 100 000 habitants, ${x.r.deficitPoste} au total)`).join(' ; ');
      const titre = inverse ? (m === 'education' ? "Régions les moins tendues en éducation : " : "Régions les mieux dotées (le moins de postes de santé manquants pour 100 000 habitants) : ")
                            : (m === 'education' ? "Régions les plus tendues en éducation : " : "Régions les plus touchées par le manque de postes de santé : ");
      return titre + texte + ". Classement relatif entre régions.";
    }

    // 4. Hôpitaux et centres de santé
    if (parleHopital || parleCentre) {
      const classement = /manquant|plus|quels|quelles|ou sont|liste/.test(q);
      if (lieu && lieu.type === 'commune' && (!perimetre(lieu) || !classement)) {
        return memes(lieu).map(c => `${c.n} (${c.d}) : ${c.hp ? `hôpital le plus proche : ${c.hp}, à ${c.hk} km à vol d'oiseau. ` : ''}Le département compte ${c.nh} ${mot(c.nh, 'hôpital', 'hôpitaux')} pour ${c.bh} requis et ${c.nc} ${mot(c.nc, 'centre de santé', 'centres de santé')} pour ${c.bc} requis.`).join(' Autre commune du même nom : ');
      }
      const cle = parleHopital ? 'dhd' : 'dcd';
      const singulier = parleHopital ? 'hôpital manquant' : 'centre de santé manquant';
      const pluriel = parleHopital ? 'hôpitaux manquants' : 'centres de santé manquants';
      let deps = departements();
      const per = perimetre(lieu);
      if (per) deps = deps.filter(x => (per.cle === 'r' ? x.r : x.d) === per.valeur);
      const top = deps.sort((a, b) => b[cle] - a[cle]).slice(0, 3);
      if (!top.length) return "Aucune donnée trouvée pour cette zone.";
      return `Départements${per ? ' de ' + per.valeur : ''} où il en manque le plus : ` + top.map((x, i) => `${i + 1}. ${x.d} (${x.r}) : ${x[cle]} ${mot(x[cle], singulier, pluriel)}`).join(' ; ') + ". Calcul par département : ces équipements desservent aussi les départements voisins, donc « manquant » ne veut pas dire « aucun accès ».";
    }

    // 4 bis. Enseignement supérieur : campus d'universités publiques et espaces numériques, présentés à part du secondaire
    if (/universit|campus|enseignement superieur|etudes superieures|faculte/.test(q)) {
      const per = perimetre(lieu);
      const pool = per ? communes.filter(c => c[per.cle] === per.valeur) : (lieu && lieu.type === 'commune' ? memes(lieu) : communes);
      const nu = pool.reduce((a, c) => a + c.nu, 0), nv = pool.reduce((a, c) => a + c.nv, 0);
      const ou = per ? ' dans ' + per.valeur : (lieu && lieu.type === 'commune' ? ' à ' + lieu.valeur : ' au Sénégal');
      const villes = pool.filter(c => c.nu > 0).sort((a, b) => b.nu - a.nu).slice(0, 5).map(c => `${nomUnique(c)} (${c.nu})`).join(', ');
      return `Enseignement supérieur public${ou} : ${nu} ${mot(nu, 'campus', 'campus')} d'université et ${nv} ${mot(nv, 'espace numérique', 'espaces numériques')} de l'Université numérique Cheikh Hamidou Kane (ex-UVS).${villes ? ' Communes comptant des campus : ' + villes + '.' : ''} Ces chiffres suivent l'étiquette « publique » de la source Géo Sénégal, que je n'ai pas pu vérifier campus par campus ; les chantiers ne sont pas comptés. Le secondaire (collèges et lycées) est présenté à part.`;
    }

    // 5. Éducation
    if (parleEducation) {
      if (lieu && lieu.type === 'commune' && !perimetre(lieu)) {
        return memes(lieu).map(c => `${c.n} (${c.d}) : ${c.ne} ${mot(c.ne, 'établissement secondaire recensé', 'établissements secondaires recensés')} (collèges et lycées) pour ${c.p.toLocaleString('fr-FR')} habitants${c.ne > 0 ? `, soit 1 pour ${Math.round(c.p / c.ne).toLocaleString('fr-FR')}` : ''}. Le primaire n'est pas couvert.${c.fb === 0 ? ' Donnée à confirmer.' : ''}`).join(' Autre commune du même nom : ');
      }
      const per = perimetre(lieu);
      const pool = per ? communes.filter(c => c[per.cle] === per.valeur) : communes;
      const portee = per ? ' dans ' + per.valeur : '';
      if (q.includes('le plus d') || q.includes('plus nombreux') || q.includes('le plus grand nombre')) {
        const top = [...pool].sort((a, b) => b.ne - a.ne).slice(0, 3);
        return `Communes comptant le plus d'établissements secondaires${portee} : ` + top.map((c, i) => `${i + 1}. ${nomUnique(c)} (${c.ne})`).join(' ; ') + ". Le primaire n'est pas couvert.";
      }
      if (/besoin|tendu|manque|priorit|moins|pire|difficult/.test(q)) {
        const top = pool.filter(c => c.fb === 1).sort((a, b) => b.p / (b.ne + 1) - a.p / (a.ne + 1)).slice(0, 3);
        return `Communes les plus tendues en éducation${portee} (habitants par établissement secondaire) : ` + top.map((c, i) => `${i + 1}. ${nomUnique(c)} (${c.ne > 0 ? '1 pour ' + Math.round(c.p / c.ne).toLocaleString('fr-FR') : 'aucun établissement recensé'})`).join(' ; ') + ". C'est un constat, pas un déficit normé.";
      }
      return "Pour l'éducation, je peux donner le nombre d'établissements secondaires d'une commune (« Établissements à Touba ») ou classer les communes (« Quelle commune a le plus d'écoles ? », « Quelles communes sont les plus tendues en éducation ? »).";
    }

    // 5 bis. Les N communes avec le plus de postes manquants
    if (/pires?|plus touch|plus en deficit|plus deficitaires?/.test(q) && /communes?/.test(q) && !q.includes('region')) {
      const chiffre = q.match(/(\d+)/);
      const n = Math.max(1, Math.min(10, chiffre ? parseInt(chiffre[1], 10) : 3));
      const per = perimetre(lieu);
      const pool = per ? communes.filter(c => c[per.cle] === per.valeur) : communes;
      const top = [...pool].sort((a, b) => b.dp - a.dp).slice(0, n);
      return `Les ${n} communes avec le plus de postes de santé manquants${per ? ' dans ' + per.valeur : ''} : ` + top.map((c, i) => `${i + 1}. ${nomUnique(c)} (${c.dp})`).join(' ; ') + '. Classement par nombre absolu de postes manquants, avec 1 poste pour 10 000 habitants comme référence.';
    }

    // 6. Score combiné santé + éducation
    if (q.includes('combine') || (q.includes('sante') && q.includes('education') && (q.includes('les deux') || q.includes('ensemble')))) {
      const avecScore = communes.filter(c => c.sc !== undefined && c.sc !== null);
      if (!avecScore.length) return "Le score combiné n'est pas disponible dans cette version des données.";
      const top = [...avecScore].sort((a, b) => b.sc - a.sc).slice(0, 3);
      const liste = top.map((c, i) => `${i + 1}. ${nomUnique(c)} (score ${c.sc}/100)`).join(' ; ');
      return `En croisant le déficit de santé et la tension éducation (poids égal), les communes les plus prioritaires sont : ${liste}. Ce score combine deux réalités différentes par rang, pas par simple addition de chiffres bruts.`;
    }

    // 7. Déficit d'une commune précise
    if (lieu && lieu.type === 'commune' && !(perimetre(lieu) && /quelle|quelles|plus/.test(q)) && (q.includes('deficit') || q.includes('manque') || q.includes('besoin') || q.includes('combien de poste') || q.includes('etat de') || q.includes('situation de'))) {
      const decrire = (c) => `${c.n} (${c.d}) : ${c.dp} ${mot(c.dp, 'poste de santé manquant', 'postes de santé manquants')} sur ${c.bp} requis (${c.np} existants), population ${c.p.toLocaleString('fr-FR')} hab. Le département de ${c.d} affiche par ailleurs ${c.dcd} ${mot(c.dcd, 'centre manquant', 'centres manquants')} et ${c.dhd} ${mot(c.dhd, 'hôpital manquant', 'hôpitaux manquants')} à son échelle.` + (c.hp ? ` Hôpital le plus proche : ${c.hp}, à ${c.hk} km à vol d'oiseau.` : '') + (c.fb === 0 ? ' Attention : donnée à confirmer (aucune infrastructure rattachée).' : '');
      return memes(lieu).map(decrire).join(' Autre commune du même nom : ');
    }

    // 8. Population
    if (lieu && (q.includes('habitant') || q.includes('population') || q.includes('combien de gens'))) {
      if (lieu.type === 'commune') {
        return memes(lieu).map(c => `${c.n} (${c.d}) : ${c.p.toLocaleString('fr-FR')} habitants (RGPH-5, 2023).`).join(' ');
      }
      const champKey = lieu.type === 'region' ? 'r' : 'd';
      const total = communes.filter(c => c[champKey] === lieu.valeur).reduce((t, c) => t + c.p, 0);
      const nb = communes.filter(c => c[champKey] === lieu.valeur).length;
      return `${lieu.valeur} (${lieu.type === 'region' ? 'région' : 'département'}, ${nb} communes) : ${total.toLocaleString('fr-FR')} habitants au total (RGPH-5, 2023).`;
    }

    // 9. La commune la plus en déficit de postes de santé dans une zone
    if (q.includes('plus besoin') || q.includes('plus grand deficit') || q.includes('priorite') || q.includes('en premier') || q.includes('le plus urgent') || ((q.includes('quelle commune') || q.includes('quelle zone')) && parleSante)) {
      const per = perimetre(lieu);
      const pool = per ? communes.filter(c => c[per.cle] === per.valeur) : communes;
      const top = [...pool].sort((a, b) => b.dp - a.dp)[0];
      if (!top) return "Aucune donnée trouvée pour cette zone.";
      return `${nomUnique(top)} (${top.d}, ${top.r}) a le déficit de postes de santé le plus élevé${per ? ' de ' + per.valeur : ' du pays'} : ${top.dp} postes manquants sur ${top.bp} requis, pour ${top.p.toLocaleString('fr-FR')} habitants.`;
    }

    return "Je n'ai pas compris votre question, et je préfère ne pas deviner : je réponds uniquement à partir des données de la plateforme. Essayez par exemple : « Quelle région est la plus touchée ? », « Déficit de Touba », « Où sont les hôpitaux manquants ? », « Quelle commune a le plus d'écoles ? », « C'est quoi la vue bassin ? » ou « Où construire en priorité avec 5 structures ? ».";
  }


  return { normaliserTexte, trouverLieu, DEFINITIONS, definitionFiabilite, departements, perimetre, repondreAssistant };
}
