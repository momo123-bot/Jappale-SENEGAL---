// Moteur du simulateur budgétaire : port fidèle de l'algorithme Python (code/06_algorithme_arbitrage_budgetaire.py).
// Il est partagé par l'explorateur (fiche « Simulateur ») et par la page « Simuler un budget » : un seul calcul, deux écrans.
function creerMoteurSimulation({ communes }) {
  const RAYON_TERRE_KM = 6371.0;
  const RAYON_CHALANDISE_KM = 15.0;

  function haversineKm(a, b) {
    if (a.lat == null || b.lat == null) return Infinity;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * RAYON_TERRE_KM * Math.asin(Math.sqrt(s));
  }
  function facteurChevauchement(d) {
    if (d >= RAYON_CHALANDISE_KM) return 0;
    return 1 - (d / RAYON_CHALANDISE_KM);
  }
  function normePoste() { return 10000; }
  function populationNonCouverte(c, annee) {
    const deficit = annee === '2033' ? c.dp33 : c.dp;
    const besoin = Math.ceil(c.p / normePoste());
    if (besoin === 0) return 0;
    const part = Math.min(1, deficit / besoin);
    return c.p * part;
  }
  // périmètre : null (tout le pays), { cle: 'r', valeur } (une région) ou { cle: 'd', valeur, region } (un département)
  const reserve = perimetre => perimetre ? communes.filter(c => c[perimetre.cle] === perimetre.valeur && (!perimetre.region || c.r === perimetre.region)) : communes;

  function selectionGloutonne(budget, annee, perimetre) {
    const candidats = reserve(perimetre).filter(c => (annee === '2033' ? c.dp33 : c.dp) > 0);
    const poolInitial = new Map(); candidats.forEach(c => poolInitial.set(c, populationNonCouverte(c, annee)));
    const selection = []; const resultats = []; let cumul = 0;
    let restants = candidats.slice();
    const n = Math.min(budget, restants.length);
    for (let i = 0; i < n; i++) {
      let meilleur = null, meilleurGain = -1;
      for (const c of restants) {
        let gain = poolInitial.get(c);
        for (const s of selection) {
          const ov = facteurChevauchement(haversineKm(c, s));
          if (ov > 0) gain *= (1 - ov);
        }
        if (gain > meilleurGain) { meilleurGain = gain; meilleur = c; }
      }
      if (!meilleur) break;
      cumul += meilleurGain;
      resultats.push({ c: meilleur, gain: meilleurGain, cumul });
      selection.push(meilleur);
      restants = restants.filter(c => c !== meilleur);
    }
    return resultats;
  }
  function selectionSimple(budget, annee, perimetre) {
    const cle = c => (annee === '2033' ? c.dp33 : c.dp);
    return reserve(perimetre).filter(c => cle(c) > 0).sort((a, b) => cle(b) - cle(a)).slice(0, budget);
  }
  function couvertureReelle(liste, annee) {
    // même règle de non-double-comptage pour les deux méthodes (équivalent de evaluer_couverture_reelle en Python)
    let total = 0; const deja = [];
    for (const c of liste) {
      let gain = populationNonCouverte(c, annee);
      for (const s of deja) { const ov = facteurChevauchement(haversineKm(c, s)); if (ov > 0) gain *= (1 - ov); }
      total += gain; deja.push(c);
    }
    return total;
  }
  return { haversineKm, facteurChevauchement, populationNonCouverte, reserve, selectionGloutonne, selectionSimple, couvertureReelle };
}
