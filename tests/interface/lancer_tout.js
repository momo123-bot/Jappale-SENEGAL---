// Lance les trois fichiers de contrôles l'un après l'autre, même si l'un d'eux échoue, puis fait le bilan.
const { spawnSync } = require('child_process');
const fichiers = ['01_explorateur_et_liens.test.js', '02_accueil_comparer_methode.test.js', '03_assistant_ia.test.js'];
const enEchec = fichiers.filter(f => {
  console.log(`\n===== ${f} =====`);
  return spawnSync(process.execPath, [f], { stdio: 'inherit', cwd: __dirname }).status !== 0;
});
console.log(enEchec.length ? `\nBILAN : ${enEchec.length} fichier(s) avec des ECHEC : ${enEchec.join(', ')}` : '\nBILAN : les trois fichiers sont OK');
process.exit(enEchec.length ? 1 : 0);
