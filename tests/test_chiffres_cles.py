"""
Tests des chiffres clés de Jàppale Sénégal.

Lancer depuis n'importe quel dossier :
    python3 tests/test_chiffres_cles.py -v

Ces tests servent deux objectifs :
1. vérifier que le pipeline (code/01 à 08) produit bien les chiffres cités dans les
   documents (note méthodologique, guide, pitch) ;
2. empêcher qu'une modification future casse silencieusement un résultat : si un test
   échoue, soit le code a régressé, soit un document doit être mis à jour.

Les valeurs "officielles" viennent de publications de l'ANSD (voir la section
"Recoupements avec des sources indépendantes" de la note méthodologique).
"""

import csv
import importlib.util
import json
import re
import unittest
from collections import defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
DONNEES = RACINE / "donnees"


def charger_csv(nom):
    with open(DONNEES / nom, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def charger_module(fichier):
    chemin = RACINE / "code" / fichier
    spec = importlib.util.spec_from_file_location(chemin.stem.replace("-", "_"), chemin)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def charger_data_js(chemin):
    texte = Path(chemin).read_text(encoding="utf-8")
    communes = json.loads(re.search(r"const COMMUNES_DATA = (\[.*?\]);\n", texte, re.S).group(1))
    regions = json.loads(re.search(r"const REGION_STATS = (\{.*?\});\n", texte, re.S).group(1))
    return communes, regions


class TestStructureEtPopulation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lignes = charger_csv("score_final_corrige.csv")

    def test_structure_administrative_conforme_a_l_ansd(self):
        # ANSD, Situation économique et sociale 2022-2023 : 14 régions, 46 départements, 553 communes
        self.assertEqual(len(self.lignes), 553)
        self.assertEqual(len({r["region"] for r in self.lignes}), 14)
        self.assertEqual(len({(r["region"], r["departement"]) for r in self.lignes}), 46)

    def test_population_totale_proche_du_total_officiel(self):
        total = sum(int(r["population"]) for r in self.lignes)
        officiel = 18_126_390  # RGPH-5, ANSD
        self.assertLess(abs(total - officiel) / officiel, 0.0001)  # moins de 0,01 %

    def test_regions_identiques_aux_publications_ansd(self):
        par_region = defaultdict(int)
        for r in self.lignes:
            par_region[r["region"]] += int(r["population"])
        officiel = {
            "DIOURBEL": 2_080_332, "FATICK": 906_922, "KAOLACK": 1_336_718, "KOLDA": 914_797,
            "MATAM": 831_632, "SAINT LOUIS": 1_202_438, "TAMBACOUNDA": 987_154, "THIES": 2_463_679,
            "ZIGUINCHOR": 617_568, "SEDHIOU": 589_264, "KAFFRINE": 820_404, "KEDOUGOU": 245_147,
            "LOUGA": 1_125_862,  # vie-publique.sn (au-senegal.com donne 1 125 910)
        }
        for region, valeur in officiel.items():
            self.assertEqual(par_region[region], valeur, region)
        # Dakar : 4 004 425 publié, 4 003 205 ici (écart résiduel de 1 220 habitants, à clarifier)
        self.assertLess(abs(par_region["DAKAR"] - 4_004_425), 1_500)


class TestResultatsCles(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lignes = charger_csv("accessibilite_bassin.csv")
        cls.par_commune = {(r["departement"], r["commune"]): r for r in cls.lignes}

    def test_touba(self):
        t = self.par_commune[("MBACKE", "TOUBA MOSQUEE")]
        self.assertEqual((t["nb_poste_sante"], t["besoin_poste_sante"], t["deficit_poste_sante"]), ("38", "113", "75"))
        self.assertEqual((t["deficit_centre_departement"], t["deficit_hopital_departement"]), ("25", "8"))
        self.assertAlmostEqual(float(t["deficit_bassin"]), 93.1, places=1)
        self.assertAlmostEqual(float(t["postes_accessibles_bassin"]), 19.87, places=2)

    def test_variantes_d_orthographe_rattachees(self):
        # communes qui affichaient 0 poste avant la table d'alias (orthographe différente des infrastructures)
        attendu = {"WOURO SIDY": 8, "DIENDER": 9, "MERY": 5, "PAOS KOTO": 3, "SAN SAMBA": 1,
                   "RANEROU": 2, "DIOKOUL BELBOUCK": 4, "DAROU KHOUDOSS": 8}
        for commune, postes in attendu.items():
            ligne = next(r for r in self.lignes if r["commune"] == commune)
            self.assertEqual(int(ligne["nb_poste_sante"]), postes, commune)

    def test_communes_sans_coordonnees(self):
        sans = {r["commune"] for r in self.lignes if not r["lat"]}
        self.assertEqual(sans, {"SAMA KANTA PEULH", "DIOUBOUDOU"})

    def test_postes_recenses(self):
        # couche Géo Sénégal : 2 085 postes de santé + 39 centres médico-sociaux
        self.assertEqual(sum(int(r["nb_poste_sante"]) for r in self.lignes), 2124)

    def test_croissance_mesuree_et_mediane(self):
        self.assertEqual(sum(1 for r in self.lignes if r["source_taux"] == "mesure_reelle_2013_2023"), 526)
        taux = sorted(float(r["taux_croissance_annuel_pct"]) for r in charger_csv("croissance_2013_2023.csv"))
        self.assertEqual(len(taux), 526)
        mediane = taux[len(taux) // 2]
        self.assertAlmostEqual(mediane, 2.94, places=2)   # taux intercensitaire retenu par l'ANSD : 2,94 %
        repli = {float(r["taux_croissance_annuel_pct"]) for r in self.lignes if r["source_taux"] == "taux_median_national"}
        self.assertEqual(repli, {mediane})

    def test_communes_redecoupees_exclues_du_calcul_de_croissance(self):
        communes_2023 = {r["commune_2023"] for r in charger_csv("croissance_2013_2023.csv")}
        for exclue in ("SICAP LIBERTE", "GUINAW RAIL NORD"):
            self.assertNotIn(exclue, communes_2023)

    def test_projection_amortie_sangalkam(self):
        s = next(r for r in self.lignes if r["commune"] == "SANGALKAM")
        lineaire = int(s["population"]) * (1 + float(s["taux_croissance_annuel_pct"]) / 100) ** 10
        amortie = int(s["population_2033_amortie"])
        self.assertLess(amortie, 0.7 * lineaire)
        self.assertTrue(640_000 < amortie < 660_000, amortie)

    def test_homonymes_medina_gounass(self):
        m = [r for r in self.lignes if r["commune"] == "MEDINA GOUNASS"]
        self.assertEqual(len(m), 2)
        self.assertEqual({r["departement"]: r["nb_infra_education"] for r in m}, {"VELINGARA": "0", "GUEDIAWAYE": "3"})

    def test_bassin_conserve_la_capacite(self):
        avec = [r for r in self.lignes if r["lat"]]
        distribue = sum(float(r["postes_accessibles_bassin"]) for r in avec)
        recense = sum(int(r["nb_poste_sante"]) for r in avec)
        self.assertLess(abs(distribue - recense), 1.0)   # aucune capacité inventée ni comptée deux fois

    def test_valeurs_non_negatives(self):
        for r in self.lignes:
            self.assertGreaterEqual(int(r["deficit_poste_sante"]), 0, r["commune"])
            if r["deficit_bassin"]:
                self.assertGreaterEqual(float(r["deficit_bassin"]), 0, r["commune"])


class TestAlgorithme(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = charger_module("06_algorithme_arbitrage_budgetaire.py")
        cls.communes = cls.m.charger_communes(str(DONNEES / "score_final_corrige.csv"))

    def couvertures(self, budget):
        glouton = self.m.selection_gloutonne(self.communes, budget, "2023")
        naif = self.m.selection_naive(self.communes, budget, "2023")
        return glouton[-1]["cumul_population_gagnee"], self.m.evaluer_couverture_reelle(naif, "2023")

    def test_glouton_jamais_inferieur_au_classement_simple(self):
        attendu = {3: (1_105_978, 1_105_978), 5: (1_302_094, 1_245_171), 10: (1_595_049, 1_371_193),
                   15: (1_754_664, 1_535_935), 25: (1_967_238, 1_600_573)}
        for budget, (g_ref, n_ref) in attendu.items():
            g, n = self.couvertures(budget)
            self.assertGreaterEqual(g, n - 1, f"budget {budget}")
            self.assertAlmostEqual(g, g_ref, delta=1, msg=f"glouton, budget {budget}")
            self.assertAlmostEqual(n, n_ref, delta=1, msg=f"simple, budget {budget}")

    def test_homonyme_medina_gounass_velingara_retenu(self):
        for budget in (10, 15, 25):
            sel = self.m.selection_gloutonne(self.communes, budget, "2023")
            self.assertTrue(any(s["commune"] == "Medina Gounass" and s["departement"] == "VELINGARA" for s in sel), budget)

    def test_sensibilite_au_rayon_de_chalandise(self):
        """Les trois premiers choix ne dépendent pas du rayon (5 à 25 km). Le reste de la
        sélection en dépend : à 10 structures, 6 choix sur 10 sont communs à 5 km et au
        moins 8 sur 10 à partir de 10 km. Ces seuils sont ceux cités dans la note méthodologique."""
        initial = self.m.RAYON_CHALANDISE_KM
        try:
            choix = {}
            for rayon in (5, 10, 15, 20, 25):
                self.m.RAYON_CHALANDISE_KM = rayon
                choix[rayon] = [(s["commune"], s["departement"]) for s in self.m.selection_gloutonne(self.communes, 10, "2023")]
            for rayon, liste in choix.items():
                self.assertEqual(liste[:3], choix[15][:3], f"trois premiers choix, rayon {rayon} km")
                commun = len(set(liste) & set(choix[15]))
                self.assertGreaterEqual(commun, 6 if rayon == 5 else 8, f"rayon {rayon} km")
        finally:
            self.m.RAYON_CHALANDISE_KM = initial


class TestHopitaux(unittest.TestCase):
    """Un hôpital dessert aussi les départements voisins : l'interface montre donc l'hôpital le plus
    proche (à vol d'oiseau) et le total régional, en plus du déficit calculé par département."""

    @classmethod
    def setUpClass(cls):
        cls.communes, cls.regions = charger_data_js(RACINE / "docs" / "data.js")

    def test_kanel_a_un_hopital_a_21_km_meme_sans_hopital_dans_son_departement(self):
        kanel = next(c for c in self.communes if c["n"] == "Kanel" and c["d"] == "Kanel")
        self.assertEqual((kanel["nh"], kanel["bh"]), (0, 3))      # 0 hôpital dans le département
        self.assertEqual((kanel["hp"], kanel["hk"]), ("Hôpital Ourossogui", 21))

    def test_contexte_regional_de_matam(self):
        self.assertEqual((self.regions["MATAM"]["nbHopitaux"], self.regions["MATAM"]["besoinHopitaux"]), (3, 6))
        self.assertEqual(sum(r["nbHopitaux"] for r in self.regions.values()), 50)   # les 50 hôpitaux de la couche source

    def test_les_structures_specialisees_ne_sont_jamais_l_hopital_le_plus_proche(self):
        for c in self.communes:
            if c["hp"]:
                self.assertIsNone(re.search(r"sychiatr|raditionn", c["hp"]), f'{c["n"]} : {c["hp"]}')
        medina = next(c for c in self.communes if c["n"] == "Medina Gounass" and c["d"] == "Velingara")
        self.assertEqual((medina["hp"], medina["hk"]), ("Hôpital Régional de Tambacounda", 64))

    def test_communes_sans_coordonnees_n_ont_pas_d_hopital_proche(self):
        self.assertEqual({c["n"] for c in self.communes if c["hp"] is None}, {"Sama Kanta Peulh", "Diouboudou"})

    def test_le_fichier_des_infrastructures_porte_le_nom_des_structures(self):
        hopitaux = [r for r in charger_csv("infrastructures_geolocalisees.csv") if r["type_structure"] == "hopital"]
        self.assertEqual(len(hopitaux), 50)
        self.assertTrue(all(r["nom"] for r in hopitaux))


class TestCoherenceMaquette(unittest.TestCase):
    def test_donnees_de_la_maquette_identiques_au_pipeline(self):
        communes, regions = charger_data_js(RACINE / "docs" / "data.js")
        self.assertEqual(len(communes), 553)
        lignes = charger_csv("accessibilite_bassin.csv")
        self.assertEqual(sum(c["fb"] for c in communes), 551)
        self.assertEqual(sum(c["tm"] for c in communes), 526)
        par_region = defaultdict(lambda: [0, 0])
        for r in lignes:
            cle = r["region"].upper().replace(" ", "_")
            par_region[cle][0] += int(r["population"])
            par_region[cle][1] += int(r["deficit_poste_sante"])
        for cle, (pop, deficit) in par_region.items():
            self.assertEqual(regions[cle]["pop"], pop, cle)
            self.assertEqual(regions[cle]["deficitPoste"], deficit, cle)
        touba = next(c for c in communes if c["n"] == "Touba Mosquee")
        self.assertEqual((touba["np"], touba["bp"], touba["dp"]), (38, 113, 75))

    def test_dossier_docs_identique_a_maquette(self):
        if not (RACINE / "maquette").exists():
            self.skipTest("depot livrable : docs/ est la seule copie de l'application")
        for fichier in ("index.html", "style.css", "script.js", "data.js"):
            self.assertEqual((RACINE / "maquette" / fichier).read_bytes(), (RACINE / "docs" / fichier).read_bytes(), fichier)


class TestCommunesSansPoste(unittest.TestCase):
    """Une commune sans poste de santé mais avec un centre de santé ou un hôpital est servie sur place :
    son déficit de postes est à lire avec prudence (voir la page Méthode et données, limites)."""

    def test_toutes_les_communes_sans_poste_ont_un_centre_ou_un_hopital(self):
        import csv, os
        chemin = os.path.join(os.path.dirname(__file__), "..", "donnees", "score_deficit.csv")
        lignes = [r for r in csv.DictReader(open(chemin, encoding="utf-8")) if r["lat"] != ""]   # communes dont les structures sont rattachées
        sans_poste = [r for r in lignes if int(r["nb_poste_sante"]) == 0]
        self.assertEqual(len(sans_poste), 20)
        self.assertTrue(all(int(r["nb_centres_commune"]) + int(r["nb_hopitaux_commune"]) > 0 for r in sans_poste))
        oussouye = next(r for r in lignes if r["commune"] == "OUSSOUYE")
        self.assertEqual((oussouye["nb_poste_sante"], oussouye["deficit_poste_sante"], oussouye["nb_centres_commune"]), ("0", "1", "1"))

    def test_education_secondaire_exclut_les_universites(self):
        import csv, os
        base = os.path.join(os.path.dirname(__file__), "..", "donnees")
        infra = list(csv.DictReader(open(os.path.join(base, "infrastructures_geolocalisees.csv"), encoding="utf-8")))
        secondaire = sum(1 for r in infra if r["type_structure"] in ("college", "lycee"))
        self.assertEqual(secondaire, 1342)
        scores = list(csv.DictReader(open(os.path.join(base, "score_deficit.csv"), encoding="utf-8")))
        self.assertEqual(sum(int(r["nb_infra_education"]) for r in scores), 1342)
        self.assertEqual(sum(int(r["nb_univ_publiques"]) for r in scores), 25)
        self.assertEqual(sum(int(r["nb_espaces_uvs"]) for r in scores), 23)


class TestImages(unittest.TestCase):
    """Les illustrations à fond blanc sont détourées (coins transparents) pour suivre le thème sombre ;
    celles à fond coloré et la photo gardent un fond plein. Ce test lit les pixels (il demande Pillow, sinon il est ignoré)."""
    TRANSPARENTES = ["comment-calcule", "methode", "question", "pour-qui", "pourquoi", "simuler", "toutes-communes", "elu", "habitant", "sante"]
    PLEINES = ["chercher-commune", "comparer", "donnees", "education", "poste-de-sante", "lycee"]

    def _images(self):
        import os
        try:
            from PIL import Image
        except ImportError:
            self.skipTest("Pillow n'est pas installé")
        return Image, os.path.join(os.path.dirname(__file__), "..", "docs", "images")

    def test_les_coins_des_illustrations_detourees_sont_transparents(self):
        Image, dossier = self._images()
        for nom in self.TRANSPARENTES:
            im = Image.open(f"{dossier}/{nom}.webp").convert("RGBA"); w, h = im.size
            coins = [im.getpixel(p)[3] for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
            self.assertEqual(coins, [0, 0, 0, 0], f"{nom} garde un fond opaque dans un coin")

    def test_les_images_a_fond_colore_et_la_photo_restent_pleines(self):
        Image, dossier = self._images()
        for nom in self.PLEINES:
            im = Image.open(f"{dossier}/{nom}.webp").convert("RGBA"); w, h = im.size
            self.assertTrue(all(im.getpixel(p)[3] == 255 for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))), nom)

    def test_la_balance_de_comparaison_ne_dit_ni_vrai_ni_faux(self):
        """Comparer deux territoires n'a pas de « bonne réponse » : les pastilles de la balance sont grises, identiques, sans coche ni croix."""
        Image, dossier = self._images()
        im = Image.open(f"{dossier}/comparer.webp").convert("RGB"); w, h = im.size
        def zone(cx, cy, r=3): return [im.getpixel((x, y)) for x in range(cx - r, cx + r + 1) for y in range(cy - r, cy + r + 1)]
        gauche, droite = zone(int(w * 0.223), int(h * 0.473)), zone(int(w * 0.746), int(h * 0.473))
        for nom, px in (("gauche", gauche), ("droite", droite)):
            ecart = max(max(c) - min(c) for c in px)
            self.assertLess(ecart, 45, f"pastille {nom} colorée")                        # grise : canaux proches
            self.assertLess(max(max(p[i] for p in px) - min(p[i] for p in px) for i in range(3)), 14, f"pastille {nom} : un symbole est encore visible")
        moyenne = lambda px: [sum(p[i] for p in px) / len(px) for i in range(3)]
        mg, md = moyenne(gauche), moyenne(droite)
        self.assertLess(max(abs(mg[i] - md[i]) for i in range(3)), 20, "les deux pastilles doivent être identiques")

    def test_aucune_image_ne_depasse_30_ko_et_il_y_en_a_seize(self):
        import os
        dossier = os.path.join(os.path.dirname(__file__), "..", "docs", "images")
        fichiers = [f for f in os.listdir(dossier) if f.endswith(".webp")]
        self.assertEqual(len(fichiers), 16)
        self.assertTrue(all(os.path.getsize(os.path.join(dossier, f)) < 30 * 1024 for f in fichiers))


class TestLimites(unittest.TestCase):
    """Le fichier des limites rassemble ce que nous savons ne pas savoir, et le README y renvoie."""

    def test_le_fichier_cite_les_limites_connues(self):
        import os
        base = os.path.join(os.path.dirname(__file__), "..")
        texte = open(os.path.join(base, "methodologie", "LIMITES.md"), encoding="utf-8").read()
        for attendu in ("Sama Kanta Peulh", "Diouboudou", "2 124 postes", "1 680", "CONTACT_FORMULAIRE", "CONTACT_COURRIEL",
                        "Le site est en français, avec sept phrases clés en wolof", "centre de santé", "qualité n'est pas mesurée", "Aucun modèle économique"):
            self.assertIn(attendu, texte, attendu)
        self.assertIn("methodologie/LIMITES.md", open(os.path.join(base, "README.md"), encoding="utf-8").read())

    def test_le_document_des_contributions_est_vivant_et_sans_nom(self):
        import os, re
        base = os.path.join(os.path.dirname(__file__), "..")
        texte = open(os.path.join(base, "methodologie", "CONTRIBUTIONS.md"), encoding="utf-8").read()
        for attendu in ("seul participant", "aide extérieure", "Journal des contributions", "Comment mettre à jour ce document", "Plus de 19 testeurs", "équipe de trois personnes", "aucun nom de personne", "Nous avons utilisé l'IA comme outil de travail", "nous vérifions toujours la source"):
            self.assertIn(attendu, texte, attendu)
        # Le dépôt ne contient aucun nom de personne : on ne les écrit donc pas ici, on compare des empreintes de mots.
        import hashlib
        interdits = {"069f032a387177d377508014f60f9d692b0e94910f6ffd8d85948dd3847a5fd8", "4827cb53284b5255a4face312ffe853cadf7d1fda4c083a285012eaea34ec4e9", "597b137650f009f9c7c926f67a9ae628eb0a26b9bcf7e803a08d32396b5d2a06", "629b2ae9000a72a84e9a6b9181d7ca14a8b89b0ea3f0eb2f7db10c0ee86fd3b1", "6bb99b3c31de846ae000fe8baad1360dca6933cc3fd58641ada88ffe5413dc50", "9ab7eb1560d4cfc91dd2d8ab1cdbd0b4e35e082d5a31506c750e2ff742c0097c", "b3c6df3f7a3ed3b534e63fbb794a83294c3f090ff90bc62049e8a1dea30c8dbf", "e8ae16d9657a089deb57f99ae31db5f3cffbd232559cbad884d7ecf4d2889cee", "9c4f0656793bc63f1b97069a99115b654c7cd9e846025d39c7de73d351f9ee99", "bc371452ed8c6bfe3f59ade5dc1d47a2c4f9152cb8a4227a3b00f9ac4dfab938"}
        trouves = [m for m in re.findall(r"[\wÀ-ÿ'-]+", texte.lower()) if hashlib.sha256(m.encode()).hexdigest() in interdits]
        self.assertEqual(trouves, [], "le document ne doit contenir aucun nom de personne")
        self.assertNotIn("EQUIPE_N", texte)
        self.assertNotRegex(texte, r"(?i)premier prix|part du prix|pourcentage")   # l'accord privé n'a pas à figurer dans le dépôt
        self.assertIn("CONTRIBUTIONS.md", open(os.path.join(base, "README.md"), encoding="utf-8").read())

    def test_la_limite_du_formulaire_est_ecrite_sans_detour(self):
        import os
        base = os.path.join(os.path.dirname(__file__), "..")
        texte = open(os.path.join(base, "methodologie", "LIMITES.md"), encoding="utf-8").read()
        self.assertIn("Le formulaire de contact n'envoie aucun message", texte)
        self.assertIn("Rien n'a été envoyé", texte)
        self.assertIn("ce formulaire n'est pas encore relié à une boîte de réception : il n'envoie aucun message pour le moment", texte)   # la phrase retirée de la page est écrite ici, pour l'organisation
        self.assertIn("À l'attention de l'organisation du hackathon", texte)
        site = open(os.path.join(base, "docs", "site.js"), encoding="utf-8").read()
        self.assertIn('const CONTACT_FORMULAIRE = "";', site); self.assertIn('const CONTACT_COURRIEL = "";', site)   # livré non branché, comme la limite le dit

    def test_les_limites_de_la_carte_et_du_personnel_sont_ecrites(self):
        import os
        base = os.path.join(os.path.dirname(__file__), "..")
        texte = open(os.path.join(base, "methodologie", "LIMITES.md"), encoding="utf-8").read()
        for attendu in ("Le personnel n'est pas mesuré, en santé comme en éducation", "la limite la plus importante du site", "Un établissement recensé n'est pas forcément fonctionnel",
                        "Le chiffre de 553 dépend de la convention d'arrondi", "À l'échelle d'un département ou d'une région", "Pas de fond de carte"):
            self.assertIn(attendu, texte, attendu)

    def test_les_nombres_de_tests_annonces_dans_les_documents_sont_exacts(self):
        """Aucun document ne doit annoncer un nombre périmé de tests Python (c'est arrivé : « 23 tests » sur la page Méthode alors qu'il y en avait 39)."""
        import glob, os, re, sys, unittest
        reel = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]).countTestCases()
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))   # chemin absolu : sinon « /tests/.. » apparaît dans tous les chemins et le filtre ci-dessous les exclurait tous
        fichiers = [f for f in glob.glob(os.path.join(base, "**", "*.md"), recursive=True) if "node_modules" not in f and not os.path.relpath(f, base).startswith("tests" + os.sep)] + glob.glob(os.path.join(base, "docs", "*.html"))
        self.assertGreater(len(fichiers), 8, "le test de cohérence ne lit plus les documents")
        faux = []
        for f in fichiers:
            for m in re.finditer(r"\b(\d+) tests\b", open(f, encoding="utf-8").read()):
                if int(m.group(1)) != reel: faux.append(f"{os.path.relpath(f, base)} : « {m.group(0)} » au lieu de {reel}")
        self.assertEqual(faux, [])

    def _charger_analyse(self, nom):
        import importlib.util, os
        spec = importlib.util.spec_from_file_location(nom, os.path.join(os.path.dirname(__file__), nom + ".py")); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        return mod

    def test_le_fichier_du_personnel_reproduit_les_totaux_imprimes_de_l_annuaire_2021(self):
        """Garde-fou contre une faute de saisie : chaque total égale celui imprimé dans l'annuaire (population 17 215 428, médecins 1 549, etc.)."""
        l = self._charger_analyse("analyse_personnel_region").lignes()
        tot = lambda c: sum(int(x[c]) for x in l)
        self.assertEqual((len(l), tot("population_2021"), tot("medecins"), tot("chirurgiens_total"), tot("dentistes"), tot("sages_femmes_etat"), tot("infirmiers_diplomes_etat"), tot("infirmiers_brevetes"), tot("postes_de_sante_publics")),
                         (14, 17215428, 1549, 298, 176, 2414, 2263, 509, 1731))

    def test_le_fichier_du_personnel_2022_reproduit_les_totaux_et_les_ratios_de_l_annuaire_RH(self):
        mod = self._charger_analyse("analyse_personnel_normes"); L = mod.lignes(); t = mod.totaux()
        self.assertEqual((len(L), t["population_2022"], t["medecins"], t["infirmiers_diplomes_etat"], t["sages_femmes_etat"], t["femmes_age_reproduction"]), (14, 17738795, 2057, 2560, 2685, 4270499))
        ide = {"DAKAR": 1.29, "DIOURBEL": 0.35, "FATICK": 0.53, "KAFFRINE": 0.58, "KAOLACK": 0.36, "KEDOUGOU": 1.20, "KOLDA": 0.63, "LOUGA": 0.54, "MATAM": 0.59, "SAINT LOUIS": 0.41, "SEDHIOU": 0.50, "TAMBACOUNDA": 0.52, "THIES": 0.66, "ZIGUINCHOR": 1.16}
        sfe = {"DAKAR": 1.07, "DIOURBEL": 0.66, "FATICK": 1.00, "KAFFRINE": 1.21, "KAOLACK": 0.79, "KEDOUGOU": 1.54, "KOLDA": 0.85, "LOUGA": 0.94, "MATAM": 0.84, "SAINT LOUIS": 0.73, "SEDHIOU": 1.11, "TAMBACOUNDA": 1.07, "THIES": 0.72, "ZIGUINCHOR": 1.74}   # ratios imprimés dans l'annuaire
        for l in L:
            _, i, s = mod.ratios(l)
            self.assertAlmostEqual(i, ide[l["region"]], delta=0.006, msg=l["region"]); self.assertAlmostEqual(s, sfe[l["region"]], delta=0.006, msg=l["region"])
        self.assertEqual(sorted(l["region"] for l in L if mod.ratios(l)[0] >= 1), ["DAKAR", "ZIGUINCHOR"])   # l'annuaire le dit : seules ces deux régions atteignent la norme pour les médecins
        self.assertEqual((round(t["infirmiers_diplomes_etat"] / t["population_2022"] * 5000, 2), round(t["sages_femmes_etat"] / t["femmes_age_reproduction"] * 1500, 2)), (0.72, 0.94))

    def test_la_page_methode_et_les_limites_disent_juste_les_normes_de_personnel(self):
        import os
        mod = self._charger_analyse("analyse_personnel_normes"); L = mod.lignes(); par = {l["region"]: mod.couverture(l) for l in L}
        moins = sorted(par, key=par.get)[:4]
        self.assertEqual((moins, [round(par[r] * 100) for r in moins]), (["KAOLACK", "SAINT LOUIS", "DIOURBEL", "KOLDA"], [50, 58, 59, 59]))
        self.assertEqual(tuple(sum(1 for l in L if mod.ratios(l)[k] >= 1) for k in range(3)), (2, 3, 6))
        base = os.path.join(os.path.dirname(__file__), "..")
        page = open(os.path.join(base, "docs", "methode.html"), encoding="utf-8").read(); limites = open(os.path.join(base, "methodologie", "LIMITES.md"), encoding="utf-8").read()
        for attendu in ("1 médecin pour 10 000 habitants", "seules Dakar et Ziguinchor atteignent la norme pour les médecins, trois régions pour les infirmiers, six sur quatorze pour les sages-femmes", "50 à 59 % des trois normes réunies", "61 %"):
            self.assertIn(attendu, page, attendu)
        self.assertIn("Kaolack (50 %), Saint-Louis (58 %), Diourbel (59 %, la région de Touba) et Kolda (59 %)", limites)
        self.assertNotIn("22,8", page)   # la comparaison aux seuils internationaux a été retirée : la norme du Ministère fait foi
        for attendu in ("le plus récent que nous ayons trouvé : ces effectifs ont quatre ans", "décrit la même géographie pour les médecins"):
            self.assertIn(attendu, page, attendu)
        for attendu in ("7,4 %", "Kédougou à 1,20", "(3,0 pour Dakar, alors que 1 292 médecins pour 4 042 235 habitants donnent 3,2", "au lieu de 0,6 et 0,7"):
            self.assertIn(attendu, limites, attendu)
        rh = {l["region"]: mod.ratios(l)[0] for l in L}
        self.assertEqual((round(rh["DAKAR"], 1), round(rh["SAINT LOUIS"], 1), round(rh["THIES"], 1)), (3.2, 0.6, 0.7))
        # corroboration par un autre document du Ministère : rapport de suivi de la carte sanitaire 2021, tableau 97 (habitants par médecin)
        hab_par_medecin = {"DAKAR": 3498, "DIOURBEL": 11994, "FATICK": 18653, "KAFFRINE": 21576, "KAOLACK": 25076, "KEDOUGOU": 9850, "KOLDA": 27366, "LOUGA": 13814, "MATAM": 14627, "SAINT LOUIS": 10376, "SEDHIOU": 36998, "TAMBACOUNDA": 17057, "THIES": 10730, "ZIGUINCHOR": 8411}
        self.assertEqual(sorted(sorted(hab_par_medecin, key=hab_par_medecin.get)[:2]), ["DAKAR", "ZIGUINCHOR"]); self.assertEqual(sorted(sorted(rh, key=rh.get, reverse=True)[:2]), ["DAKAR", "ZIGUINCHOR"])
        self.assertEqual(sorted(sorted(hab_par_medecin, key=hab_par_medecin.get, reverse=True)[:3]), ["KAOLACK", "KOLDA", "SEDHIOU"]); self.assertTrue({"KAOLACK", "KOLDA", "SEDHIOU"} <= set(sorted(rh, key=rh.get)[:4]))

    def test_l_isolement_scolaire_et_le_choix_de_sites_sont_exacts(self):
        import os
        mod = self._charger_analyse("analyse_isolement_scolaire"); C = mod.communes(); E = mod.etablissements(); D = mod.distances(C, E)
        self.assertEqual((len(C), len(E), sum(1 for c in C if c["nb_secondaire"] == 0)), (551, 1342, 215))
        self.assertEqual([mod.isolement(R, C, D) for R in (10, 15, 20, 30)], [(131, 2395380), (86, 1571354), (54, 1089543), (21, 298873)])
        for R in (10, 15, 20):
            noms = [n for n, _, _ in mod.glouton(R, 5, C, D)]; self.assertIn("MEDINA GOUNASS", noms, R); self.assertIn("AOURE", noms, R)
        i = next(k for k, c in enumerate(C) if c["nom"] == "MEDINA GOUNASS"); self.assertEqual((round(D[i], 1), C[i]["population"]), (25.6, 91085))
        page = open(os.path.join(os.path.dirname(__file__), "..", "docs", "methode.html"), encoding="utf-8").read()
        for attendu in ("215 communes n'ont aucun établissement secondaire", "86 communes (1,57 million d'habitants, 8,7 %)", "54 (1,09 million, 6,0 %)", "91 085 habitants, à 25,6 km"):
            self.assertIn(attendu, page, attendu)

    def test_hopitaux_et_postes_sont_recoupes_avec_les_documents_officiels(self):
        import csv, os
        base = os.path.join(os.path.dirname(__file__), "..")
        infra = list(csv.DictReader(open(os.path.join(base, "donnees", "infrastructures_geolocalisees.csv"), encoding="utf-8-sig")))
        score = list(csv.DictReader(open(os.path.join(base, "donnees", "score_final_corrige.csv"), encoding="utf-8-sig")))
        hop = [r for r in infra if r["type_structure"] == "hopital"]; pub = [r for r in hop if "public" in r["statut"].lower()]
        # rapport officiel de suivi de la carte sanitaire 2021, tableau 92 : EPS1 + EPS2 + EPS3 par région
        officiel = {"DAKAR": 14, "DIOURBEL": 4, "FATICK": 1, "KAFFRINE": 1, "KAOLACK": 1, "KEDOUGOU": 1, "KOLDA": 1, "LOUGA": 2, "MATAM": 3, "SAINT LOUIS": 3, "SEDHIOU": 1, "TAMBACOUNDA": 1, "THIES": 5, "ZIGUINCHOR": 2}
        nous = {}
        for r in pub: k = r["region"].replace("-", " ").replace("É", "E"); nous[k] = nous.get(k, 0) + 1
        self.assertEqual((len(hop), len(pub), sum(officiel.values())), (50, 44, 40))   # la comparaison juste : hôpitaux PUBLICS contre établissements publics de santé
        ecarts = {r: nous.get(r, 0) - officiel[r] for r in officiel}
        self.assertEqual((min(ecarts, key=ecarts.get), ecarts["SAINT LOUIS"], max(ecarts, key=ecarts.get), ecarts["DAKAR"], sum(1 for e in ecarts.values() if e == 0)), ("SAINT LOUIS", -2, "DAKAR", 4, 8))
        strict = [r for r in pub if not re.search(r"annexe|ambulatoire|tradition", r["nom"], re.I)]; self.assertEqual(len(strict), 38)
        dept, popd = {}, {}
        for r in score: k = (r["region"], r["departement"]); dept[k] = int(r["nb_hopital_departement"]); popd[k] = popd.get(k, 0) + int(r["population"])
        sans = [k for k, v in dept.items() if v == 0]
        self.assertEqual((len(dept), len(sans), round(sum(popd[k] for k in sans) / sum(popd.values()) * 100)), (46, 23, 29))
        page = open(os.path.join(base, "docs", "methode.html"), encoding="utf-8").read(); limites = open(os.path.join(base, "methodologie", "LIMITES.md"), encoding="utf-8").read()
        for attendu in ("Écart de +4, à clarifier", "40 établissements publics de santé (EPS 1, 2 et 3)", "de -2 (Saint-Louis) à +4 (Dakar)", "Huit régions sur 14 sont identiques", "38 hôpitaux publics, soit 2 de moins que les 40 officiels"):
            self.assertIn(attendu, page, attendu)
        for attendu in ("44 contre 40", "huit régions sur 14 identiques", "un écart de -2 (Saint-Louis) à +4 (Dakar)", "23 départements sans aucun hôpital sur 46 (29 % de la population)", "n'est pas un chiffre officiel", "ne reprenons aucun chiffre qui ne figure pas dans un document officiel publié"):
            self.assertIn(attendu, limites, attendu)

    def test_les_constats_sur_les_couches_hopitaux_et_education_sont_exacts(self):
        import csv, math, os, re, unicodedata
        base = os.path.join(os.path.dirname(__file__), "..")
        infra = list(csv.DictReader(open(os.path.join(base, "donnees", "infrastructures_geolocalisees.csv"), encoding="utf-8-sig")))
        score = [r for r in csv.DictReader(open(os.path.join(base, "donnees", "score_final_corrige.csv"), encoding="utf-8-sig"))]
        hop = [r for r in infra if r["type_structure"] == "hopital"]
        self.assertEqual((len(hop), sum("public" in r["statut"].lower() for r in hop), sum("priv" in r["statut"].lower() for r in hop)), (50, 44, 6))
        self.assertEqual(sum("tradition" in r["nom"].lower() for r in hop), 3)
        norm = lambda s: re.sub(r"[^A-Z0-9]", "", unicodedata.normalize("NFD", s.upper()).encode("ascii", "ignore").decode())
        pop = {}
        for r in score: pop[norm(r["departement"])] = pop.get(norm(r["departement"]), 0) + int(r["population"])
        def sans(rows):
            garde = {norm(r["departement"]) for r in rows}; ds = [d for d in pop if d not in garde]
            return len(ds), round(sum(pop[d] for d in ds) / sum(pop.values()) * 100, 1)
        self.assertEqual(sans(hop), (23, 29.2)); self.assertEqual(sans([r for r in hop if "tradition" not in r["nom"].lower()]), (25, 35.7))
        sec = [r for r in infra if r["type_structure"] in ("college", "lycee") and r["latitude"]]; pub = [r for r in sec if "public" in r["statut"].lower()]
        self.assertEqual((len(sec), len(pub), len(sec) - len(pub), round((len(sec) - len(pub)) / len(sec) * 100)), (1342, 475, 867, 65))
        col = [r for r in infra if r["type_structure"] == "college"]; self.assertEqual((len(col), sum("public" in r["statut"].lower() for r in col)), (481, 1))
        def distances(rows):   # distance du centre de chaque commune à l'établissement le plus proche (cosinus sphériques, km)
            pts = [(math.radians(float(r["latitude"])), math.radians(float(r["longitude"]))) for r in rows]; out = []   # liste, pas dictionnaire : des communes homonymes existent
            for c in score:
                if not c["lat"]: continue
                la, lo = math.radians(float(c["lat"])), math.radians(float(c["lon"]))
                out.append((c["commune"] + "|" + c["departement"], 6371.0 * min(math.acos(max(-1.0, min(1.0, math.sin(la) * math.sin(a) + math.cos(la) * math.cos(a) * math.cos(b - lo)))) for a, b in pts)))
            return out
        dt, dp = distances(sec), distances(pub)
        self.assertEqual((sum(d > 15 for _, d in dt), sum(d > 15 for _, d in dp)), (88, 90))
        dist_mg = lambda L: [d for n, d in L if n == "MEDINA GOUNASS|VELINGARA"]; self.assertEqual((len(dist_mg(dt)), round(dist_mg(dt)[0], 1), round(dist_mg(dp)[0], 1)), (1, 25.6, 26.3))
        limites = open(os.path.join(base, "methodologie", "LIMITES.md"), encoding="utf-8").read(); page = open(os.path.join(base, "docs", "methode.html"), encoding="utf-8").read()
        for attendu in ("ils sont 25 (36 % de la population)", "44 hôpitaux comme publics et 6 comme privés", "contre trois dans le rapport officiel", "65 % des 1 342 établissements secondaires de la couche sont privés (867)", "un seul des 481 collèges est public", "90 communes sont à plus de 15 km au lieu de 88", "de 25,6 à 26,3 km"):
            self.assertIn(attendu, limites, attendu)
        for attendu in ("44 dans notre couche (2023), plus 6 privés", "25 sans les établissements de médecine traditionnelle", "65 % des établissements secondaires de la couche sont privés", "90 communes au lieu de 88"):
            self.assertIn(attendu, page, attendu)

    def test_les_liens_d_ancre_ne_passent_pas_sous_la_barre_fixe(self):
        import os, re
        css = open(os.path.join(os.path.dirname(__file__), "..", "docs", "accueil.css"), encoding="utf-8").read()   # feuille partagée par l'accueil et les pages de contenu
        m = re.search(r"html\s*\{[^}]*scroll-padding-top:[^;]*\+\s*(\d+)px", css)
        self.assertIsNotNone(m, "marge de défilement absente : le titre du formulaire de l'accueil repasserait sous la barre fixe")
        self.assertGreaterEqual(int(m.group(1)), 70)   # la barre fixe mesure 63 px

    def test_le_registre_des_anomalies_est_exact_et_a_jour(self):
        import csv, os, re, sys
        from collections import Counter
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); sys.path.insert(0, os.path.join(base, "code"))
        try: import registre_anomalies as reg
        finally: sys.path.pop(0)
        lignes = list(csv.DictReader(open(reg.SORTIE, encoding="utf-8-sig")))
        self.assertEqual([l["id"] for l in lignes], [f"A{i:02d}" for i in range(1, 16)])
        self.assertEqual([dict(l) for l in lignes], [{k: str(v) for k, v in a.items()} for a in reg.calculer()], "le fichier n'est pas celui que le script produit : relancer python3 code/registre_anomalies.py")
        self.assertEqual({l["id"]: l["nombre"] for l in lignes}, {"A01": "3771", "A02": "13", "A03": "4", "A04": "393 à 593", "A05": "481", "A06": "10", "A07": "103", "A08": "344", "A09": "2", "A10": "2", "A11": "517 à 575", "A12": "1307", "A13": "9", "A14": "355", "A15": "5"})
        infra, communes = reg.lire("infrastructures_geolocalisees.csv"), reg.lire("score_final_corrige.csv")
        self.assertEqual(len({r["statut"] for r in infra}), 11); self.assertTrue(all(r["statut"] in reg.STATUTS_SANS_ACCENTS for r in infra))
        hop = [r for r in infra if r["type_structure"] == "hopital"]
        self.assertEqual(sum(1 for r in hop if re.search(r"annexe|ambulatoire|tradition|psychiatr|militaire|polyclinique", r["nom"], re.I)), 13)   # aucune ligne comptée deux fois
        orph = reg.etiquettes_orphelines(infra, communes)
        self.assertEqual((Counter(r["departement"] for r in orph)["KOUMPENTOUM"], Counter(r["departement"] for r in orph)["TIVAOUNE"], Counter(r["region"] for r in orph)["KÉDOUGOU"]), (31, 9, 1))
        connus = set(reg.LIBELLES_RAPPROCHES); self.assertTrue(all((r["region"] in connus or r["departement"] in connus or (r["region"] in {x["region"] for x in communes} and r["departement"] in {x["departement"] for x in communes})) for r in orph), "libellé orphelin inattendu")
        # rapprochement sans perte : les comptes de nos couches égalent ceux des infrastructures une fois les libellés rapprochés
        for dep, ancien in (("KOUPENTOUM", "KOUMPENTOUM"), ("TIVAOUANE", "TIVAOUNE")):
            postes_infra = sum(1 for r in infra if r["type_structure"] == "poste_sante" and r["departement"] in (dep, ancien))
            self.assertEqual(sum(int(r["nb_poste_sante"]) for r in communes if r["departement"] == dep), postes_infra, dep)
        self.assertEqual((sum(1 for r in infra if r["type_structure"] == "centre_sante" and r["departement"] in ("KOUPENTOUM", "KOUMPENTOUM")), next(int(r["nb_centre_departement"]) for r in communes if r["departement"] == "KOUPENTOUM")), (1, 1))
        self.assertEqual(sum(reg.EPS_PAR_REGION_2021.values()), 40)

    def test_les_donnees_ouvertes_sont_exactes_et_documentees(self):
        import importlib.util, json, os, sys
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); sys.path.insert(0, os.path.join(base, "code"))
        try: import exporter_donnees_ouvertes as exp
        finally: sys.path.pop(0)
        def charger_module(nom):
            spec = importlib.util.spec_from_file_location(nom, os.path.join(base, "tests", nom + ".py")); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
        sortie = os.path.join(base, "docs", "donnees-ouvertes"); communes, regions = exp.construire()
        lire_json = lambda f: [json.loads(l.rstrip(",")) for l in open(os.path.join(sortie, f), encoding="utf-8").read().split("\n") if l.startswith("{")]
        self.assertEqual(lire_json("communes.json"), communes, "relancer python3 code/exporter_donnees_ouvertes.py"); self.assertEqual(lire_json("regions.json"), regions)
        self.assertEqual((len(communes), len(regions), sum(c["population_2023"] for c in communes), sum(c["postes_sante_manquants"] for c in communes)), (553, 14, 18125122, 553))
        self.assertEqual(sum(1 for c in communes if c["distance_secondaire_km"] is None), 2)
        iso = charger_module("analyse_isolement_scolaire"); C = iso.communes(); D = iso.distances(C)
        self.assertEqual((sum(1 for c in communes if (c["distance_secondaire_km"] or 0) > 15), sum(c["population_2023"] for c in communes if (c["distance_secondaire_km"] or 0) > 15)), iso.isolement(15, C, D))
        pers = charger_module("analyse_personnel_normes")
        for r in regions:
            l = next(x for x in pers.lignes() if x["region"].title() == r["region"]); self.assertEqual(r["couverture_des_normes_pct"], round(pers.couverture(l) * 100), r["region"])
        lisez = open(os.path.join(sortie, "LISEZ-MOI.md"), encoding="utf-8").read(); self.assertEqual(lisez, exp.lisez_moi())
        for k in list(communes[0]) + list(regions[0]): self.assertIn(f"`{k}`", lisez, k)
        for attendu in ("ODC-By 1.0", "Jàppale Sénégal, d'après les données de l'ANSD", "reste à confirmer auprès de l'ANSD", "un ordre de grandeur, pas une mesure", "à vol d'oiseau"): self.assertIn(attendu, lisez, attendu)
        self.assertEqual(open(os.path.join(sortie, "anomalies_signalees.csv"), "rb").read(), open(os.path.join(base, "donnees", "anomalies_signalees.csv"), "rb").read())
        self.assertEqual(open(os.path.join(base, "docs", "complements.js"), encoding="utf-8").read(), exp.complements_js(communes, regions))

    def test_la_page_methode_dit_les_memes_chiffres_que_le_registre(self):
        import csv, html, os
        base = os.path.join(os.path.dirname(__file__), ".."); page = open(os.path.join(base, "docs", "methode.html"), encoding="utf-8").read()
        lignes = list(csv.DictReader(open(os.path.join(base, "donnees", "anomalies_signalees.csv"), encoding="utf-8-sig")))
        for sec in ("axes", "retour", "perspectives", "ouvertes"):
            self.assertIn(f'<section id="{sec}">', page, sec); self.assertIn(f'href="#{sec}"', page, sec)
        for l in lignes:
            self.assertIn(f'<td>{l["id"]}</td><td>{html.escape(l["anomalie"], quote=False)}</td><td class="num">{html.escape(l["nombre"], quote=False)}</td>', page, l["id"])
        for attendu in (f"nous avons relevé {len(lignes)} anomalies", f"Voir les {len(lignes)} anomalies", f"{len(lignes)} anomalies chiffrées", "ODC-By 1.0", "la compatibilité reste à confirmer auprès de l'ANSD", "aucune structure n'est chargée de la mise à jour", "Nous ne promettons ni calendrier ni maintenance", "Un serveur MCP (Model Context Protocol), en lecture seule", "Seul le wolof est envisagé à ce stade"):
            self.assertIn(attendu, page, attendu)
        for f in ("communes.json", "regions.json", "anomalies_signalees.csv", "LISEZ-MOI.md"):
            self.assertIn(f'href="donnees-ouvertes/{f}"', page, f); self.assertTrue(os.path.exists(os.path.join(base, "docs", "donnees-ouvertes", f)), f)

    def test_les_documents_retour_perspectives_et_licence_existent_et_disent_juste(self):
        import csv, os
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *c: open(os.path.join(base, *c), encoding="utf-8").read()
        lignes = list(csv.DictReader(open(os.path.join(base, "donnees", "anomalies_signalees.csv"), encoding="utf-8-sig")))
        retour = lire("methodologie", "RETOUR_A_L_ANSD.md")
        for l in lignes: self.assertIn(f"| {l['id']} | {l['anomalie']} | {l['nombre']} |", retour, l["id"])
        for attendu in (f"compte {len(lignes)} anomalies", "challenge20ans@ansd.sn", "Fiche minimale de métadonnées proposée", "Demander à qui adresser les futurs signalements"): self.assertIn(attendu, retour, attendu)
        persp = lire("methodologie", "PERSPECTIVES_ET_DURABILITE.md")
        for attendu in ("aucune structure n'est chargée de la mise à jour", "Ce que nous ne promettons pas", "Un serveur MCP (Model Context Protocol)", "Un assistant en wolof", "Seul le wolof est envisagé", "python3 code/registre_anomalies.py", "python3 code/exporter_donnees_ouvertes.py", "python3 tests/test_chiffres_cles.py"): self.assertIn(attendu, persp, attendu)
        licence = lire("donnees", "LICENCE_DONNEES.md"); self.assertIn("ODC-By 1.0", licence); self.assertIn("reste à confirmer auprès de l'ANSD", licence)
        readme = lire("README.md")
        for attendu in ("donnees-ouvertes", "RETOUR_A_L_ANSD.md", "PERSPECTIVES_ET_DURABILITE.md", "LICENCE_DONNEES.md", "anomalies_signalees.csv"): self.assertIn(attendu, readme, attendu)
        self.assertIn("anomalies_signalees.csv", lire("donnees", "DICTIONNAIRE_DE_DONNEES.md")); self.assertIn("exporter_donnees_ouvertes.py", lire("methodologie", "FICHE_TECHNIQUE.md"))

    def test_la_fiche_de_decision_est_cachee_a_l_ecran_et_imprimable(self):
        import os, re
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda f: open(os.path.join(base, "docs", f), encoding="utf-8").read()
        css, html, js = lire("communes.css"), lire("communes.html"), lire("communes.js")
        self.assertRegex(css, r"\.decision\s*\{\s*display:\s*none;\s*\}")
        for attendu in ("@media print", "body.page-fiche", "size: A4"): self.assertIn(attendu, css, attendu)
        self.assertLess(html.index("complements.js"), html.index("communes.js"))
        for attendu in ('id="ficheDecision"', 'id="imprimerFiche"', "window.print()", 'classList.add("page-fiche")'): self.assertIn(attendu, js, attendu)

    def test_le_recalage_des_postes_et_le_ressenti_de_distance_sont_exacts(self):
        import importlib.util, os
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        spec = importlib.util.spec_from_file_location("analyse_postes_officiels", os.path.join(base, "tests", "analyse_postes_officiels.py")); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        s = mod.scenario()
        self.assertEqual((round(s["total_actuel"]), round(s["total_recale"]), s["recouvrement"], s["premier_actuel"], s["premier_recale"], round(s["postes_recales"])), (553, 796, 9, "Touba Mosquee", "Touba Mosquee", 1583))
        self.assertEqual(sum(mod.postes_officiels().values()), 1583)
        c = mod.correlations()
        self.assertEqual({k: round(v, 2) for k, v in c.items()}, {"distance_hopital": 0.83, "population_sans_poste": 0.47, "habitants_par_poste": -0.71, "manque_pour_100000": -0.11})
        lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read(); page, lim, idx = lire("docs", "methode.html"), lire("methodologie", "LIMITES.md"), lire("docs", "index.html")
        for attendu in ("le manque serait d'environ 796 postes", "neuf des dix communes les plus touchées restent les mêmes et Touba Mosquée reste la première", "Le chiffre de 553 est donc un minimum", "corrélation de rang de +0,83", "n'est pas lié à ce ressenti (-0,11)", "de 5,1 % à Dakar à 49,6 % à Tambacounda", "158 femmes à Kédougou"):
            self.assertIn(attendu, page, attendu)
        for attendu in ("environ 796 au lieu de 553", "corrélation de rang +0,83 sur 14 régions", "(-0,11)"): self.assertIn(attendu, lim, attendu)
        self.assertIn("il serait d'environ <b class=\"hl\">800</b>", idx); self.assertEqual(round(s["total_recale"], -1), 800)
        js = lire("docs", "communes.js")
        for attendu in ("RESSENTI_DISTANCE_REGION", "échantillon réduit", "1 342 contre 2 649", "moyenne publique nationale est de 46,0", "et 1 584 en 2022"): self.assertIn(attendu, js, attendu)
        acc, sc = lire("docs", "accueil.js"), lire("docs", "script.js")
        self.assertIn("il serait d'environ <b class=", acc); self.assertIn("ce constat est probablement surestimé", acc)
        for attendu in ("environ 796 au lieu de 553", "1 342 sur 2 649 établissements"): self.assertIn(attendu, sc, attendu)

    def test_les_indicateurs_d_education_sont_coherents_et_documentes(self):
        import csv, os
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        d = {r["indicateur"]: r for r in csv.DictReader(open(os.path.join(base, "donnees", "education_moyen_secondaire_national.csv"), encoding="utf-8-sig"))}
        v = lambda ind, col: int(d[ind][col])
        for col, attendu in (("public", (46.0, 31.5, 6.8)), ("prive", (29.2, 17.9, 1.0))):
            self.assertEqual((round(v("eleves", col) / v("groupes_pedagogiques", col), 1), round(v("eleves", col) / v("enseignants", col), 1), round(v("salles_en_abri_provisoire", col) / v("salles_de_classe", col) * 100, 1)), attendu, col)
        self.assertEqual((v("etablissements", "public"), v("etablissements", "prive")), (1556, 1093))
        self.assertEqual((round(1342 / (1556 + 1093) * 100), round(475 / 1556 * 100)), (51, 31))
        page, lim, js = lire("docs", "methode.html"), lire("methodologie", "LIMITES.md"), lire("docs", "communes.js")
        for attendu in ("1 342 établissements du moyen et du secondaire, dont 475 publics", "2 649, dont 1 556 publics", "n'en couvre que 51 %, et 31 % des publics", "probablement surestimé", "20 à 45 élèves, 33 en moyenne", "46,0 élèves par classe dans le public (29,2 dans le privé)", "6,8 % des salles de classe publiques", "L'année de ces tableaux n'est pas précisée"):
            self.assertIn(attendu, page, attendu)
        for attendu in ("2 649 établissements du moyen et du secondaire (1 556 publics", "celle-ci n'en couvre que 51 %, et 31 % des publics", "la moyenne publique est de 46,0 et la moyenne privée de 29,2"): self.assertIn(attendu, lim, attendu)

    def test_la_mention_de_source_de_l_ansd_est_presente_partout(self):
        import os
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        m1 = "Source : Agence Nationale de la Statistique et de la Démographie. Contient des informations sous licence conformément à l'Accord de licence de données ouvertes de l'ANSD."
        m2 = "Ce produit a été adapté à partir des informations de l'Agence Nationale de la Statistique et de la Démographie, qui sont sous licence conformément à l'Accord de licence de données ouvertes de l'ANSD."
        for chemin in (("README.md",), ("donnees", "LICENCE_DONNEES.md"), ("docs", "donnees-ouvertes", "LISEZ-MOI.md"), ("docs", "methode.html"), ("methodologie", "LIMITES.md")):
            t = lire(*chemin); self.assertIn(m1, t, chemin); self.assertIn(m2, t, chemin)

    def test_le_wolof_est_celui_qui_a_ete_valide_et_branche_sans_toucher_au_francais(self):
        import os, re
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        wo = lire("docs", "wolof.js"); paires = dict(re.findall(r'^\s*"([^"]+)": "([^"]+)",?$', wo, re.M))
        self.assertEqual(paires, {"Chercher ma commune": "Seet sama komin", "Comment est servie votre commune ?": "Ndax sa komin am na ndimbal bu doy ci wér-gi-yaram ak njàng ?", "Nom de la commune": "Tur-u komin bi", "Voir la fiche": "Xool xët bi",
                                  "Postes de santé manquants": "Poste santé yi ñu soxla te amuñu", "Population": "Waa-dëkk yi (limu nit ñi)", "Imprimer la fiche de décision": "Móol xët-u dogal bi"})
        for page in ("index.html", "communes.html"):
            h = lire("docs", page); self.assertLess(h.index("site.js"), h.index("wolof.js"), page)
        self.assertIn('id="langueBtn"', lire("docs", "index.html")); self.assertIn("langue=wo", lire("docs", "site.js")); self.assertIn("appliquerLangue", lire("docs", "communes.js"))
        self.assertIn("sept phrases clés en wolof", lire("methodologie", "LIMITES.md")); self.assertNotIn("pulaar", wo.lower()); self.assertNotIn("sérère", wo.lower())

    def test_la_barre_du_haut_les_boutons_et_les_noms_de_fichiers_tiennent_dans_360_px(self):
        import os, re
        css = open(os.path.join(os.path.dirname(__file__), "..", "docs", "accueil.css"), encoding="utf-8").read()
        m = re.search(r"@media \(max-width: 400px\)\s*\{[^}]*\.brand \{ font-size: 1\.0625rem; \}[^@]*\}", css, re.S); self.assertIsNotNone(m, "règle de la barre du haut pour les petits téléphones absente")
        self.assertRegex(css, r"@media \(max-width: 480px\)\s*\{\s*\.btn \{[^}]*white-space: normal")
        self.assertRegex(css, r"code \{ overflow-wrap: anywhere; \}")

    def test_le_schema_les_identifiants_et_la_fourchette_sont_coherents(self):
        import importlib.util, json, math, os, re, sys
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); sys.path.insert(0, os.path.join(base, "code"))
        try: import exporter_donnees_ouvertes as exp
        finally: sys.path.pop(0)
        spec = importlib.util.spec_from_file_location("analyse_postes_officiels", os.path.join(base, "tests", "analyse_postes_officiels.py")); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        communes, _ = exp.construire(); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        schema = json.loads(lire("docs", "donnees-ouvertes", "schema-communes.json")); self.assertEqual(schema, exp.schema_communes(communes))
        props = schema["items"]["properties"]; types = {"string": str, "integer": int, "number": (int, float), "null": type(None)}
        for c in communes:
            self.assertEqual(set(c), set(props), c["id_commune"])
            for k, v in c.items():
                t = props[k]["type"]; t = t if isinstance(t, list) else [t]
                self.assertTrue(any(isinstance(v, types[x]) and not isinstance(v, bool) for x in t), (c["id_commune"], k, v, t))
        ids = [c["id_commune"] for c in communes]; self.assertEqual(len(set(ids)), 553)
        self.assertTrue(all(re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", i) for i in ids)); self.assertIn("diourbel-mbacke-touba-mosquee", ids)
        self.assertEqual({"kolda-velingara-medina-gounass", "dakar-guediawaye-medina-gounass"} - set(ids), set())
        for c, (n, d, _, v) in zip(communes, mod.deficits(True)): self.assertEqual(c["postes_sante_manquants_recale_2022"], int(math.floor(v + 0.5)), (n, d))
        self.assertEqual((sum(c["postes_sante_manquants_recale_2022"] for c in communes), sum(c["postes_sante_manquants"] for c in communes), round(mod.scenario()["total_recale"])), (772, 553, 796))
        touba = next(c for c in communes if c["id_commune"] == "diourbel-mbacke-touba-mosquee"); self.assertEqual((touba["postes_sante_manquants"], touba["postes_sante_manquants_recale_2022"]), (75, 85))
        self.assertIn("schema-communes.json", lire("docs", "donnees-ouvertes", "LISEZ-MOI.md")); self.assertIn("(772)", lire("docs", "donnees-ouvertes", "LISEZ-MOI.md"))
        cl = lire("donnees", "CHANGELOG_DONNEES.md"); self.assertIn("Version 1.0 : 7 octobre 2026", cl); self.assertIn("Règle de numérotation", cl)
        lim, js = lire("methodologie", "LIMITES.md"), lire("docs", "communes.js")
        for attendu in ("Statut et bon usage", "ne l'a pas approuvé", "la fourchette du manque de postes va du résultat avec la couche de données"): self.assertIn(attendu, lim, attendu)
        for attendu in ("Fourchette : ", "RECALAGE_POSTES", "la fourchette est de", "ne doit pas servir à classer des responsables"): self.assertIn(attendu, js, attendu)

    def test_liens_d_evitement_roles_et_mentions_non_officielles_sont_en_place(self):
        import glob, json, os, re
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        pages = sorted(glob.glob(os.path.join(base, "docs", "*.html"))); self.assertEqual(len(pages), 7)
        for f in pages:
            h = open(f, encoding="utf-8").read(); nom = os.path.basename(f); cible = "stage" if nom == "explorer.html" else "contenu"
            self.assertRegex(h, r"<body[^>]*>\s*<a class=\"evitement\" href=\"#" + cible + r"\">Aller au contenu</a>", nom)
            self.assertRegex(h, r'id="' + cible + r'"[^>]*tabindex="-1"', nom)
        for css in ("accueil.css", "style.css"):
            c = lire("docs", css); self.assertIn(".evitement:focus { top: 12px; }", c, css)
        self.assertIn("@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }", lire("docs", "methode.css"))
        self.assertIn('p.setAttribute("role", "link")', lire("docs", "accueil.js")); ap = lire("docs", "assistant-page.js")
        self.assertIn('document.createElement("aside")', ap); self.assertIn('panneau.setAttribute("role", "complementary")', ap)
        site = lire("docs", "site.js")
        for attendu in ("y / reste >= 2 / 3", "reste > 400", 'haut.tabIndex = visible ? 0 : -1', 'haut.setAttribute("aria-hidden"'): self.assertIn(attendu, site, attendu)
        self.assertNotIn("y > 320", site)
        idx = lire("docs", "index.html"); self.assertIn('<aside aria-label="Assistant"><a class="assist"', idx); self.assertNotIn("Code et données ouverts", idx)
        self.assertIn("Projet de hackathon : pas une publication officielle de l'ANSD", idx)
        for chemin in (("docs", "methode.html"), ("README.md",), ("methodologie", "LIMITES.md")): self.assertIn("ce n'est pas une publication officielle de l'ANSD, et l'ANSD ne l'a pas approuvé", lire(*chemin), chemin)
        audit = lire("tests", "navigateur", "audit_accessibilite.js"); pk = json.loads(lire("tests", "navigateur", "package.json"))
        for attendu in ("axe-core", "wcag22aa", "best-practice", "process.exit(nb ? 1 : 0)"): self.assertIn(attendu, audit, attendu)
        self.assertIn("axe-core", pk["devDependencies"]); self.assertEqual(pk["scripts"]["audit"], "node audit_accessibilite.js")

    def test_l_affichage_est_en_place_sur_les_sept_pages(self):
        import glob, os, re
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        for f in sorted(glob.glob(os.path.join(base, "docs", "*.html"))):
            h = open(f, encoding="utf-8").read(); nom = os.path.basename(f)
            self.assertIn('<link rel="stylesheet" href="confort.css">', h, nom); self.assertIn('<script src="confort.js"></script>', h, nom)
            self.assertGreater(h.index("confort.css"), h.rindex('<link rel="stylesheet" href="', 0, h.index("confort.css")), nom)
            self.assertEqual(h.count('id="confortBtn"'), 1, nom)
            self.assertRegex(h, r'<button type="button" class="(?:icon-btn confort-icone|site-confort-btn)" id="confortBtn" aria-expanded="false" aria-controls="confortPanneau" aria-label="Affichage : taille du texte, contraste, thème" title="Affichage : taille du texte, contraste, thème"><span class="confort-lib">Affichage</span></button>', nom)
            self.assertIn('<li class="confort-li"><button type="button" class="confort-btn" data-confort-ouvrir aria-expanded="false" aria-controls="confortPanneau">Affichage : texte, contraste, thème</button></li>', h, nom)
            if nom != "explorer.html": self.assertIn('<a href="methode.html#accessibilite">Accessibilité</a>', h, nom)
        self.assertNotIn("confortAccueil", lire("docs", "index.html")); self.assertNotIn("Texte trop petit", lire("docs", "index.html")); self.assertNotIn("confortFiche", lire("docs", "communes.js"))
        for css in ("accueil.css", "communes.css", "comparer.css", "methode.css"):
            c = lire("docs", css); self.assertEqual(re.findall(r"font-size:\s*[\d.]+px", c), [], css + " : une taille de police fixe subsiste")
            self.assertEqual(re.findall(r"font-size:\s*clamp\([\d.]+px", c), [], css + " : un titre en pixels subsiste"); self.assertNotIn("var(--k, 1)", c, css); self.assertNotIn("calc(max(", c, css); self.assertIn("rem;", c, css)
        acc = lire("docs", "accueil.css"); self.assertRegex(acc, r"body \{[^}]*font-size: 1\.0625rem")
        cf = lire("docs", "confort.css")
        for attendu in ('html[data-taille="tg"] { --k: 1.5; }', 'html[data-taille="g"] { --k: 1.25; }', 'html[data-contraste="fort"]', '--ink: #000000', 'html[data-mouvement="reduit"]', "@media (pointer: coarse)", "min-height: 44px", 'html[data-contraste="fort"] :focus-visible',
                        "@media print { body { line-height: 1.5; } }", "@media (min-width: 1181px) and (max-width: 1560px) { .links a { padding: 7px 8px; } .nav .wrap { gap: 14px; } }", "@media (max-width: 640px)", "html:is([data-taille], [data-agrandi]) .brand { font-size: 18px; }",
                        "html:is([data-taille], [data-agrandi]) .chiffres, html:is([data-taille], [data-agrandi]) .cartes-chiffres { grid-template-columns: 1fr !important; }", "white-space: normal; max-width: 100%;", ".fiche-actions { flex-wrap: wrap; }", "@media print { .confort-panneau",
                        ".confort-icone::before, .site-confort-btn::before { content: \"Aa\"; }", ".table-wrap:focus-visible", "@media (max-width: 480px) { .site-nav { padding-left: 12px; padding-right: 12px; gap: 8px; }", ".confort-li { display: none; }", ".nav-tools #themeBtn { display: none; }", ".confort-lib { display: inline; }"): self.assertIn(attendu, cf, attendu)
        js = lire("docs", "confort.js")
        for attendu in ("jappale-confort", 'e.key === "Escape"', "aria-pressed", 'role="status" aria-live="polite"', "prefers-contrast: more", "prefers-reduced-motion: reduce", "data-agrandi", "jappale-theme-v3", 'aria-label", "Affichage"'): self.assertIn(attendu, js, attendu)
        cm = lire("docs", "communes.js")
        for attendu in ("function texteLectureFiche", 'id="ecouterFiche" hidden', '"speechSynthesis" in window', 'u.lang = "fr-FR"'): self.assertIn(attendu, cm, attendu)
        for f in sorted(glob.glob(os.path.join(base, "docs", "*.html")) + glob.glob(os.path.join(base, "docs", "*.js"))):
            t = open(f, encoding="utf-8").read(); self.assertEqual(re.findall(r'class=\\?"table-wrap\\?"(?![^>]*tabindex)', t), [], os.path.basename(f) + " : un tableau défilant n'est pas atteignable au clavier")
        self.assertEqual(len(re.findall(r"<li>", re.search(r'<ol class="etapes".*?</ol>', lire("docs", "index.html"), re.S).group(0))), 3)
        me = lire("docs", "methode.html")
        for attendu in ('<section id="accessibilite">', '<li><a href="#accessibilite">', 'data-confort-ouvrir', "Ce qui n'a pas été vérifié", "bouton « Affichage »", "À qui s'adresse quoi", "Personnes malentendantes", "le bouton « Aa » ne les concerne pas directement"): self.assertIn(attendu, me, attendu)
        dec = lire("methodologie", "DECLARATION_ACCESSIBILITE.md")
        for attendu in ("Ce qui n'a PAS été vérifié", "Texte de base de 17 px", "ni son ni vidéo", "sous-titrée et accompagnée d'une transcription", "bouton « Affichage »", "À qui s'adresse quoi", "Personnes malvoyantes ou âgées", "le bouton « Aa » ne les concerne pas directement"): self.assertIn(attendu, dec, attendu)
        self.assertIn("Accessibilité : ce qui n'a pas été vérifié", lire("methodologie", "LIMITES.md"))
        audit = lire("tests", "navigateur", "audit_accessibilite.js")
        for attendu in ("process.argv.includes('confort')", "color-contrast-enhanced", "jappale-confort", "document.getAnimations()"): self.assertIn(attendu, audit, attendu)
        pk = lire("tests", "navigateur", "package.json"); self.assertIn("test:confort", pk); self.assertIn("audit:confort", pk)
        for attendu in ('"test:1": "node verifier_mise_en_page.js 1"', '"test:2": "node verifier_mise_en_page.js 2"', '"test": "node verifier_mise_en_page.js 1 && node verifier_mise_en_page.js 2"'): self.assertIn(attendu, pk, attendu)
        vm = lire("tests", "navigateur", "verifier_mise_en_page.js"); self.assertIn("partie(1)", vm); self.assertIn("partie(2)", vm)
        vc = lire("tests", "navigateur", "verifier_confort.js")
        for attendu in ("jappale-confort", "pointer", "Page.setFontSizes", "prefers-contrast"): self.assertIn(attendu, vc, attendu)

    def test_la_fiche_se_telecharge_en_pdf_et_en_word_et_le_lien_copie_est_complet(self):
        import os
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        fe = lire("docs", "fiche-export.js")
        for attendu in ("%PDF-1.4", "xref", "/Helvetica-Bold", "WinAnsiEncoding", "0x04034b50", "0x02014b50", "0x06054b50", "word/document.xml", "[Content_Types].xml", "wordprocessingml.document.main+xml", "window.fichePdfOctets", "window.ficheDocxOctets", "window.blocsFiche", "window.telechargerFiche"): self.assertIn(attendu, fe, attendu)
        cm = lire("docs", "communes.js")
        for attendu in ('id="pdfFiche"', 'id="wordFiche"', 'id="ficheAide"', "Télécharger en PDF", "Télécharger en Word", "lienComplet(", "fichePdfOctets(blocs", "ficheDocxOctets(blocs", "Si l'impression ne s'ouvre pas, utilisez le PDF"): self.assertIn(attendu, cm, attendu)
        self.assertNotIn("navigator.clipboard.writeText(location.href)", cm); self.assertIn("const lienComplet", lire("docs", "site.js"))
        h = lire("docs", "communes.html"); self.assertLess(h.index("fiche-export.js"), h.index("communes.js"))
        self.assertIn(".fiche-aide", lire("docs", "communes.css"))
        self.assertIn("fiche-export.js", lire("methodologie", "FICHE_TECHNIQUE.md")); self.assertIn("Export de la fiche (PDF et Word)", lire("methodologie", "LIMITES.md")); self.assertIn("non balisé", lire("methodologie", "DECLARATION_ACCESSIBILITE.md"))

    def test_la_projection_officielle_ansd_est_lue_rapprochee_et_prudemment_utilisee(self):
        import csv, json, math, os
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        rows = list(csv.DictReader(open(os.path.join(base, "donnees", "projections_ansd_communes.csv"), encoding="utf-8-sig")))
        self.assertEqual(len(rows), 553); used = [r for r in rows if r["utilisee"] == "1"]; self.assertEqual(len(used), 544)
        self.assertEqual((sum(r["appariement"] == "exact" for r in rows), sum(r["appariement"] == "region+commune" for r in rows)), (531, 22))
        for r in used: self.assertEqual(int(r["population_2023_ansd"]), int(r["population_2023_site"]), r["commune"])
        for r in rows:
            if r["utilisee"] == "0": self.assertNotEqual(r["population_2023_ansd"], r["population_2023_site"], r["commune"])
        self.assertLessEqual(abs(sum(int(r["population_2023_ansd"]) for r in rows) - 18126390), 10); self.assertLessEqual(abs(sum(int(r["population_2033_ansd"]) for r in rows) - 23504174), 10)
        d = lire("docs", "data.js"); data = json.loads(d[d.index("["):d.rindex("]") + 1])
        for c in data: self.assertEqual(c["dp33o"], None if c["p33o"] is None else max(0, math.ceil(c["p33o"] / 10000) - c["np"]), c["n"])
        self.assertEqual(sum(c["p33o"] is None for c in data), 9)
        tot, toto = sum(c["dp33"] for c in data), sum(c["dp33o"] if c["dp33o"] is not None else c["dp33"] for c in data); self.assertEqual((tot, toto), (1040, 898))
        top = lambda cle: [c["n"] for c in sorted(data, key=lambda c: (-(cle(c) or 0), c["n"]))[:10]]
        commun = len(set(top(lambda c: c["dp33"])) & set(top(lambda c: c["dp33o"] if c["dp33o"] is not None else c["dp33"])))
        touba = next(c for c in data if c["n"] == "Touba Mosquee"); self.assertEqual((touba["p33o"], touba["dp33"], touba["dp33o"]), (1513229, 125, 114))
        me, lim = lire("docs", "methode.html"), lire("methodologie", "LIMITES.md")
        for attendu in (f"le manque de 2033 serait de {toto} postes au lieu de 1 040", "23 504 174 habitants en 2033", f"{commun} des 10 communes les plus touchées sont les mêmes", "anomalie A13", f"de {toto} à 1 040 postes en 2033", f"({toto} avec la projection officielle de l'ANSD)"): self.assertIn(attendu, me, attendu)
        for attendu in ("Projection officielle 2033", "anomalie A13", f"{toto} postes manquants en 2033 contre 1 040"): self.assertIn(attendu, lim, attendu)
        self.assertIn("projection officielle de l'ANSD", lire("docs", "index.html")); self.assertIn("deficit33o", lire("docs", "accueil.js"))
        a13 = next(r for r in csv.DictReader(open(os.path.join(base, "donnees", "anomalies_signalees.csv"), encoding="utf-8-sig")) if r["id"] == "A13"); self.assertEqual(a13["nombre"], "9"); self.assertIn("7 d'entre elles échangent leurs populations", a13["anomalie"])

    def test_l_education_regionale_la_carte_de_la_fiche_et_la_cssdos_sont_documentees(self):
        import csv, json, os, re, unicodedata
        from collections import defaultdict
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        norm = lambda s: re.sub(r"[^A-Z]", "", unicodedata.normalize("NFD", s.upper()).encode("ascii", "ignore").decode())
        sc = {r["region"]: (float(r["tbs_secondaire_16_18_pct"]), float(r["tns_secondaire_16_18_pct"])) for r in csv.DictReader(open(os.path.join(base, "donnees", "rgph5_scolarisation_secondaire_region.csv"), encoding="utf-8-sig"))}
        self.assertEqual(len(sc), 15); self.assertEqual((sc["ZIGUINCHOR"], sc["DAKAR"], sc["KAFFRINE"], sc["DIOURBEL"], sc["SENEGAL"]), ((56.5, 24.8), (45.8, 24.0), (14.1, 6.2), (15.8, 6.4), (30.3, 14.0)))
        self.assertTrue(all(tns <= tbs for tbs, tns in sc.values())); self.assertEqual(min((v[1], k) for k, v in sc.items() if k != "SENEGAL"), (6.2, "KAFFRINE"))
        com = [json.loads(l.rstrip(",")) for l in lire("docs", "donnees-ouvertes", "communes.json").split("\n") if l.startswith("{")]
        num, den = defaultdict(float), defaultdict(float)
        for c in com:
            if c["distance_secondaire_km"] is not None: num[norm(c["region"])] += c["distance_secondaire_km"] * c["population_2023"]; den[norm(c["region"])] += c["population_2023"]
        reg = {norm(k): v[1] for k, v in sc.items() if k != "SENEGAL"}; dist = {k: num[k] / den[k] for k in reg}
        rangs = lambda v: {k: i + 1 for i, k in enumerate(sorted(v, key=lambda k: v[k]))}; ra, rb = rangs(dist), rangs(reg)
        self.assertEqual(round(1 - 6 * sum((ra[k] - rb[k]) ** 2 for k in dist) / (14 * (14 * 14 - 1)), 2), -0.76)
        me, lim = lire("docs", "methode.html"), lire("methodologie", "LIMITES.md")
        for attendu in ("corrélation de rang de -0,76", "de 6,2 % à Kaffrine à 24,8 % à Ziguinchor", "1 584 postes de santé, 107 centres de santé, 40 hôpitaux et 2 197 cases de santé", "consulté le 8 octobre 2026", "Projections démographiques 2023-2073, ANSD (tableaux par commune)", "Contexte officiel : pour situer la commune"): self.assertIn(attendu, me, attendu)
        for attendu in ("Scolarisation régionale", "Carte sanitaire (CSSDOS)", "2 197 cases de santé"): self.assertIn(attendu, lim, attendu)
        cm, fe, css = lire("docs", "communes.js"), lire("docs", "fiche-export.js"), lire("docs", "communes.css")
        for attendu in ("function carteDecision", 'class="d-carte-svg"', 'data-region="1"', "d-sources", "carte sanitaire de la CSSDOS", "SCOLARISATION_REGION", "decScol", "kpi-officiel"): self.assertIn(attendu, cm, attendu)
        for attendu in ("cartePng", "dessinerCarte", "wp:inline", "word/media/carte.png"): self.assertIn(attendu, fe, attendu)
        self.assertIn(".decision .d-carte svg", css); self.assertNotIn("regions.js", lire("docs", "communes.html").split('communes.js')[0].split('complements.js')[1])
        self.assertEqual(lire("docs", "communes.html").count('<script src="regions.js"></script>'), 1)
        self.assertIn("projections_officielles.py", lire("methodologie", "FICHE_TECHNIQUE.md")); self.assertIn("Version 1.1 : 8 octobre 2026", lire("donnees", "CHANGELOG_DONNEES.md"))

    def test_la_procedure_de_deploiement_est_simple_verifiable_et_son_journal_dit_la_verite(self):
        import os, re, subprocess, sys
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        r = subprocess.run([sys.executable, os.path.join(base, "tests", "verifier_deploiement.py")], capture_output=True, text=True, timeout=120, cwd=base)
        self.assertEqual(r.returncode, 0, r.stdout[-600:] + r.stderr[-300:]); self.assertNotIn("ECHEC", r.stdout); self.assertIn("tout est conforme, le déploiement est réussi", r.stdout)
        n = int(re.search(r"(\d+) contrôles en", r.stdout).group(1)); self.assertGreaterEqual(n, 50)
        for page in ("index.html", "explorer.html", "communes.html", "comparer.html", "methode.html", "simulateur.html", "synthese.html"): self.assertIn(f"OK    page {page}", r.stdout, page)
        for fichier in ("data.js", "regions.js", "fiche-export.js", "confort.js", "wolof.js"): self.assertIn(f"OK    fichier chargé : {fichier}", r.stdout, fichier)
        md = lire("methodologie", "PROCEDURE_DEPLOIEMENT.md")
        for attendu in ("## Choisir son chemin", "## Chemin 2 : GitHub Pages, pas à pas", "## Vérifier le déploiement en une commande", "## Journal de déploiement : ce que nous avons testé", "## Mettre à jour le site", "python3 tests/verifier_deploiement.py", "python3 -m http.server --directory docs 8000", "Deploy from a branch", "À compléter par l'équipe", f"{n} contrôles réussis", "10 contrôles sur 10"): self.assertIn(attendu, md, attendu)
        ajouts_remise = ("LISEZ-MOI-ANSD.txt", "Procedure_de_deploiement_Jappale_Senegal.pdf", "Note_de_presentation_Jappale_Senegal.pdf")   # fichiers que l'archive de remise ajoute à la racine du dépôt
        nb = sum(1 for d, _, fs in os.walk(base) if not any(x in d.split(os.sep) for x in ("__pycache__", "node_modules", ".git")) for f in fs if not (os.path.abspath(d) == base and f in ajouts_remise))
        self.assertIn(f"le dépôt en compte {nb} :", md)   # le nombre de fichiers annoncé pour l'envoi sur GitHub est le vrai
        self.assertEqual(md.count("| **1. Ouvrir le fichier** |"), 1); self.assertLess(md.index("## Choisir son chemin"), md.index("## Chemin 2"))
        self.assertIn("verifier_deploiement.py", lire("methodologie", "FICHE_TECHNIQUE.md")); self.assertIn("verifier_deploiement.py", lire("README.md"))
        sys.path.insert(0, os.path.join(base, "tests"))
        try: import verifier_deploiement as vd
        finally: sys.path.pop(0)
        self.assertEqual(vd.PAGES, ["index.html", "explorer.html", "communes.html", "comparer.html", "methode.html", "simulateur.html", "synthese.html"])

    def test_le_site_reste_lisible_par_les_navigateurs_de_2018_et_la_fiche_propose_une_carte_detaillee(self):
        import glob, os, re
        base = os.path.join(os.path.dirname(__file__), ".."); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        interdits = {"coalescence ??": r"\?\?", "chaînage ?.": r"\?\.[A-Za-z_$(\[]", "affectation logique": r"\|\|=|&&=|\?\?=", "catch sans paramètre": r"catch\s*\{", "flat": r"\.flat\(", "flatMap": r"\.flatMap\(", "matchAll": r"\.matchAll\(", "replaceAll": r"\.replaceAll\(", "at()": r"\.at\(-?\d", "fromEntries": r"Object\.fromEntries", "structuredClone": r"structuredClone", "trimEnd": r"\.trimEnd\("}
        for f in sorted(glob.glob(os.path.join(base, "docs", "*.js"))):
            t = open(f, encoding="utf-8").read()
            for nom, motif in interdits.items(): self.assertEqual(re.findall(motif, t), [], f"{os.path.basename(f)} : écriture trop récente pour les navigateurs de 2018 ({nom})")
        for f in sorted(glob.glob(os.path.join(base, "docs", "*.css"))):
            t = open(f, encoding="utf-8").read(); nom = os.path.basename(f)
            self.assertNotRegex(t, r"(^|[;{\s])inset:", nom + " : « inset » fait disparaître la carte de l'explorateur sur les navigateurs d'avant 2021"); self.assertNotIn("calc(max(", t, nom)
            for m in re.finditer(r"font-size:\s*clamp\(", t): self.assertRegex(t[:m.start()].rstrip()[-40:], r"font-size:\s*[\d.]+rem;$", nom + " : un titre en clamp() sans taille de secours")
        for f in sorted(glob.glob(os.path.join(base, "docs", "*.html"))):
            h = open(f, encoding="utf-8").read(); nom = os.path.basename(f)
            self.assertIn('id = "navigateurAncien"', h.replace('d.id="navigateurAncien"', 'id = "navigateurAncien"'), nom); self.assertIn("Ce navigateur est trop ancien pour afficher correctement ce site", h, nom)
            self.assertLess(h.index("Aller au contenu"), h.index("navigateurAncien"), nom)
        cm = lire("docs", "communes.js")
        self.assertIn('<details class="fiche-plus">', cm); self.assertIn("Imprimer, télécharger, partager", cm); self.assertIn("matchMedia(\"(min-width: 700px)\")", cm); self.assertIn(".fiche-plus", lire("docs", "communes.css"))
        for attendu in ('id="carteGoogle"', "https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}", 'id="carteOsm"', "https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=13/${c.lat}/${c.lon}", 'rel="noopener noreferrer"', "s'ouvre dans un nouvel onglet"): self.assertIn(attendu, cm, attendu)
        lim = lire("methodologie", "LIMITES.md")
        for attendu in ("Navigateurs pris en charge", "envoyez le lien, pas le fichier", "Carte détaillée", "Chrome 64, Firefox 60, Safari 12"): self.assertIn(attendu, lim, attendu)
        self.assertIn("test:mobiles", lire("tests", "navigateur", "package.json")); self.assertIn("verifier_mobiles.js", lire("methodologie", "FICHE_TECHNIQUE.md"))
        vm = lire("tests", "navigateur", "verifier_mobiles.js")
        for attendu in ("iPhone SE (375 x 667)", "petit téléphone (320 x 568)", "delete Array.prototype.flat", "navigateurAncien", "#mapWrap"): self.assertIn(attendu, vm, attendu)

    def test_la_note_d_une_page_est_courte_et_les_donnees_sont_documentees_avec_les_vrais_chiffres(self):
        import csv, glob, json, os, re
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        d = lire("docs", "data.js"); data = json.loads(d[d.index("["):d.rindex("]") + 1]); fr = lambda n: f"{n:,}".replace(",", " ")
        manque, tot, toto = sum(c["dp"] for c in data), sum(c["dp33"] for c in data), sum(c["dp33o"] if c["dp33o"] is not None else c["dp33"] for c in data)
        anom = len(list(csv.DictReader(open(os.path.join(base, "donnees", "anomalies_signalees.csv"), encoding="utf-8-sig"))))
        note = lire("methodologie", "NOTE_DE_PRESENTATION.md"); self.assertLessEqual(len(note.split()), 520, "la note doit se lire en deux minutes")
        for attendu in (f"Au moins {manque} postes de santé manquent", f"entre {toto} et {fr(tot)} en 2033", f"{anom} anomalies relevées", "corrélation +0,83", "corrélation -0,76", "51 %", "GESTION_DES_DONNEES.md", "ce n'est pas une publication officielle de l'ANSD"): self.assertIn(attendu, note, attendu)
        taille = lambda rep: sum(os.path.getsize(os.path.join(a, f)) for a, _, fs in os.walk(os.path.join(base, rep)) for f in fs if "node_modules" not in a and "__pycache__" not in a)
        g = lire("methodologie", "GESTION_DES_DONNEES.md"); mo = lambda t: float(re.search(r"environ \*\*([\d,]+) Mo\*\*", t).group(1).replace(",", "."))
        self.assertAlmostEqual(mo(g), taille("docs") / 1024 / 1024, delta=0.15, msg="le poids du site annoncé n'est pas le vrai")
        nb_loc = sum(1 for _ in csv.reader(open(os.path.join(base, "donnees", "rgph5_localites_nettoye.csv"), encoding="utf-8-sig"))) - 1; nb_inf = sum(1 for _ in csv.reader(open(os.path.join(base, "donnees", "infrastructures_geolocalisees.csv"), encoding="utf-8-sig"))) - 1
        for attendu in (f"{fr(nb_loc)} localités", f"{fr(nb_inf)} structures", "## 1. Où sont les données aujourd'hui", "## 3. Où les mettre en ligne : trois options", "## 4. Les données détaillées remises par l'ANSD (Dakar, Diourbel, Thiès)", "## 5. Garder, mettre à jour, sauvegarder", "Le site est **public**", "GitHub Pages limits", "1 Go", "100 Go par mois", "ne pas les mettre dans le dépôt public", "Responsable à nommer"): self.assertIn(attendu, g, attendu)
        self.assertEqual(len(glob.glob(os.path.join(base, "donnees", "*.csv"))), 15); self.assertIn("GESTION_DES_DONNEES.md", lire("docs", "methode.html"))

    def test_la_typographie_est_embarquee_la_devise_est_la_et_aucun_service_exterieur_n_est_appele(self):
        import glob, os, re
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read(); docs = os.path.join(base, "docs")
        for f in sorted(glob.glob(os.path.join(docs, "*.html")) + glob.glob(os.path.join(docs, "*.css")) + glob.glob(os.path.join(docs, "*.js"))):
            t = open(f, encoding="utf-8").read(); n = os.path.basename(f)
            if n not in ("methode.html", "synthese.html"): self.assertNotIn("fonts.googleapis", t, n); self.assertNotIn("fonts.gstatic", t, n)
        for f in sorted(glob.glob(os.path.join(docs, "*.html"))): h = open(f, encoding="utf-8").read(); self.assertIn('<link rel="stylesheet" href="polices.css">', h, os.path.basename(f)); self.assertNotIn("preconnect", h, os.path.basename(f))
        pc = lire("docs", "polices.css"); faces = re.findall(r"@font-face \{[^}]*\}", pc); self.assertEqual(len(faces), 11)
        for fc in faces:
            fichier = re.search(r"url\(polices/([^)]+)\)", fc).group(1); self.assertTrue(os.path.getsize(os.path.join(docs, "polices", fichier)) > 5000, fichier); self.assertIn("font-display: swap", fc); self.assertIn("unicode-range", fc)
        self.assertEqual({re.search(r'font-family: "([^"]+)"', fc).group(1) for fc in faces}, {"Source Sans 3", "Source Serif 4"})
        for fichier in ("LICENCE-Source-Sans-3.txt", "LICENCE-Source-Serif-4.txt", "LISEZ-MOI.txt"): self.assertTrue(os.path.exists(os.path.join(docs, "polices", fichier)), fichier)
        self.assertIn("SIL OPEN FONT LICENSE", lire("docs", "polices", "LICENCE-Source-Sans-3.txt").upper()); self.assertIn("ŋ", lire("docs", "polices", "LISEZ-MOI.txt"))
        for f in ("accueil.css", "style.css"): c = lire("docs", f); self.assertIn('--f-display: "Source Serif 4"', c); self.assertIn('--f-body: "Source Sans 3"', c); self.assertNotIn("Poppins", c); self.assertNotIn("Nunito", c); self.assertNotIn("IBM Plex", c)
        idx = lire("docs", "index.html"); self.assertNotIn("devise", idx); self.assertNotIn("Chaque commune compte", idx + lire("docs", "accueil.css") + lire("methodologie", "NOTE_DE_PRESENTATION.md"))   # la devise est réservée à la vidéo
        self.assertIn("<h1>Santé et éducation&nbsp;: que manque-t-il à votre commune&nbsp;?</h1>", idx)   # espaces insécables : le deux-points et le point d'interrogation ne passent jamais seuls à la ligne; self.assertEqual(idx.count('data-repli="'), 5)

    def test_le_site_est_pense_pour_le_telephone_recherche_d_abord_blocs_repliés_carte_qui_revient_liste_par_25(self):
        import os, re
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        css, js, sj, ex, cm = lire("docs", "accueil.css"), lire("docs", "index.html"), lire("docs", "site.js"), lire("docs", "script.js"), lire("docs", "communes.js")
        self.assertIn('grid-template-areas: "titre" "recherche" "carte" "constat"', css); self.assertIn(".hero-reste { display: contents; }", css); self.assertIn(".hero .finder { grid-area: recherche; }", css)
        for libelle in ("Voir le chiffre et ses limites", "Voir les communes les plus touchées", "Lire en trente secondes", "Voir les sources", "Lire sur le projet"): self.assertIn(f'data-repli="{libelle}"', js, libelle)
        for attendu in ('matchMedia("(max-width: 640px)")', 'document.createElement("details")', 'summary.repli-bouton' if False else 'r.className = "repli-bouton"', "d.open = true"): self.assertIn(attendu, sj, attendu)
        self.assertIn("min-height: 44px", re.search(r"\.repli > summary\.repli-bouton \{[^}]*\}", css).group(0))
        for attendu in ("function fermerFiche()", "function repererCommune(c)", "function retirerRepere()", "reinitialiserVue();", "'#mapSvg circle.commune-dot, #mapSvg circle#reperCommune'", "document.getElementById('cardClose').addEventListener('click', fermerFiche)"): self.assertIn(attendu, ex, attendu)
        self.assertEqual(ex.count('onclick="fermerFiche()">Fermer</button>'), 3); self.assertIsNone(re.search(r"classList\.remove\(.active.\)\">Fermer", ex))
        self.assertNotIn("zoomerSurCommune(c);", ex.replace("function zoomerSurCommune(c, duree)", "")); self.assertIn("if (!input.value.trim() && (", ex)
        for attendu in ("const LIMITE_PAGE = 25;", 'matchMedia("(max-width: 640px)").matches', "visibles.map(c =>", 'id="plusCommunes"' if False else 'id = "pagination"', "Afficher ${Math.min(LIMITE_PAGE"): self.assertIn(attendu, cm, attendu)

    def test_les_services_sociaux_de_l_ansd_sont_agreges_sans_rien_perdre_et_les_comparaisons_sont_exactes(self):
        import csv, glob, json, os, re
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        rows = list(csv.DictReader(open(os.path.join(base, "donnees", "services_sociaux_ansd_commune.csv"), encoding="utf-8-sig"))); I = lambda r, k: int(float(r[k] or 0)); S = lambda k: sum(I(r, k) for r in rows)
        self.assertEqual(len(rows), 142); self.assertEqual({reg: sum(1 for r in rows if r["region"] == reg) for reg in ("DAKAR", "DIOURBEL", "THIES")}, {"DAKAR": 53, "DIOURBEL": 40, "THIES": 49})
        sante = ["postes", "centres_sante", "cases_sante", "hopitaux", "centres_medico_sociaux", "maternites", "cliniques_cabinets", "pharmacies", "laboratoires"]
        edu = ["petite_enfance", "elementaire_public", "elementaire_prive", "college_public", "college_prive", "lycee_public", "lycee_prive", "formation", "universites"]
        self.assertEqual((sum(S(k) for k in sante), sum(S(k) for k in edu), S("forages") + S("chateaux_eau")), (2902, 6449, 705))   # rien ne se perd : les totaux redonnent ceux du classeur
        self.assertEqual((S("postes"), S("postes_notre_couche"), S("centres_sante"), S("hopitaux"), S("universites")), (586, 616, 66, 29, 71))
        self.assertEqual((S("college_public"), S("college_prive"), S("lycee_public") + S("lycee_prive")), (356, 357, 430)); sec = S("college_public") + S("college_prive") + S("lycee_public") + S("lycee_prive"); self.assertEqual((sec, S("secondaire_notre_couche")), (1143, 788))
        da, dn = [float(r["distance_secondaire_ansd_km"]) for r in rows], [float(r["distance_secondaire_notre_couche_km"]) for r in rows]
        self.assertEqual((sum(x > 15 for x in da), sum(x > 15 for x in dn), sum(x > 5 for x in da), sum(x > 5 for x in dn)), (0, 10, 5, 31)); self.assertEqual((sum(I(r, "secondaire_notre_couche") == 0 for r in rows), sum(1 for r in rows if I(r, "college_public") + I(r, "college_prive") + I(r, "lycee_public") + I(r, "lycee_prive") == 0)), (34, 7))
        self.assertTrue(all(float(a) <= float(n) + 0.05 for a, n in zip(da, dn)), "avec l'ANSD, une commune n'est jamais plus loin d'un établissement que dans notre couche")
        self.assertEqual({r["appariement"] for r in rows} <= {"exact", "region+commune", "alias"}, True); self.assertEqual(sum(r["appariement"] == "exact" for r in rows), 139)
        pj = lire("docs", "pilote.js"); cols = json.loads(re.search(r"const PILOTE_COLONNES = (\[.*?\]);", pj).group(1)); pilote = json.loads(re.search(r"const PILOTE = (\{.*\});", pj, re.S).group(1))
        d = lire("docs", "data.js"); data = json.loads(d[d.index("["):d.rindex("]") + 1]); cles = {f"{c['r']}|{c['d']}|{c['n']}" for c in data}
        self.assertEqual(len(pilote), 142); self.assertTrue(set(pilote) <= cles); self.assertEqual(sum(v[cols.index("postes")] for v in pilote.values()), 586); self.assertEqual(sum(v[cols.index("forages")] + v[cols.index("chateaux_eau")] for v in pilote.values()), 705)
        self.assertLess(os.path.getsize(os.path.join(base, "docs", "pilote.js")), 20000)
        self.assertEqual([f for f in glob.glob(os.path.join(base, "**", "*.xlsx"), recursive=True) if "node_modules" not in f and re.search(r"(?i)services.sociaux|RGPH.?2023", os.path.basename(f))], [], "le classeur brut remis par l'ANSD n'est pas publié")
        me, lim = lire("docs", "methode.html"), lire("methodologie", "LIMITES.md")
        for attendu in ("2 902 de santé et 705 points d'eau", "mêmes hôpitaux (29), mêmes centres de santé (66), mêmes lycées (430) et mêmes universités (71)", "586 et nous 616 (121 communes sur 142 à l'identique), contre 426 à l'annuaire 2022", "788 collèges et lycées contre 1 143 chez l'ANSD (69 %)", "34 communes sans collège ni lycée sur place chez nous contre 7 chez l'ANSD", "10 communes à plus de 15 km chez nous contre 0 chez l'ANSD", "sur les 86 communes que nous donnons à plus de 15 km"): self.assertIn(attendu, me, attendu)
        for attendu in ("Pilote ANSD (Dakar, Diourbel, Thiès)", "cinq cas, anomalie A15", "nous ne les avons pas corrigés", "Nous ignorons si « poste de santé » désigne seulement les postes publics"): self.assertIn(attendu, lim, attendu)
        reg = {r["id"]: r for r in csv.DictReader(open(os.path.join(base, "donnees", "anomalies_signalees.csv"), encoding="utf-8-sig"))}; self.assertEqual((reg["A14"]["nombre"], reg["A15"]["nombre"]), ("355", "5")); self.assertIn("1 143", reg["A14"]["anomalie"]); self.assertIn("586 postes contre 426", reg["A04"]["exemples"])
        sc = lire("code", "services_sociaux_ansd.py")
        for attendu in ("n'est PAS dans le dépôt", "type inconnu dans", "assert somme == total", "ALIAS", "0 quand la commune a au moins un collège ou lycée"): self.assertIn(attendu, sc, attendu)
        self.assertIn("Version 1.2 : 8 octobre 2026", lire("donnees", "CHANGELOG_DONNEES.md")); self.assertIn("services_sociaux_ansd_commune.csv", lire("donnees", "DICTIONNAIRE_DE_DONNEES.md")); self.assertIn("services_sociaux_ansd.py", lire("methodologie", "FICHE_TECHNIQUE.md"))
        cm = lire("docs", "communes.js")
        for attendu in ('id="pilote"', "Services de base : données de l'ANSD", "PILOTE_COLONNES.forEach", "kmNu", "aucune structure d'assainissement" if False else "Le fichier remis ne contient aucune structure d'assainissement"): self.assertIn(attendu, cm, attendu)
        self.assertLess(lire("docs", "communes.html").index("pilote.js"), lire("docs", "communes.html").index("communes.js"))

    def test_v11_assistant_ia_theme_des_telephones_et_documentation_courte(self):
        import glob, hashlib, json, os, re
        caches = {"e8ae16d9657a089deb57f99ae31db5f3cffbd232559cbad884d7ecf4d2889cee", "bc371452ed8c6bfe3f59ade5dc1d47a2c4f9152cb8a4227a3b00f9ac4dfab938", "9ab7eb1560d4cfc91dd2d8ab1cdbd0b4e35e082d5a31506c750e2ff742c0097c", "c857d09db23e6822e3600bc06ad8d58f92ed62bc8efd81c753f77048662cb97d", "c70eca6b0f88f44d81a41311647e50fda1ac454ec04ffd442b0eb4743a993131"}
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")); lire = lambda *p: open(os.path.join(base, *p), encoding="utf-8").read()
        for f in sorted(glob.glob(os.path.join(base, "docs", "*.html"))):
            h = open(f, encoding="utf-8").read(); n = os.path.basename(f)
            self.assertLess(h.index('src="assistant.js"'), h.index('src="assistant-llm.js"'), n); self.assertLess(h.index('src="assistant-llm.js"'), h.index('src="assistant-page.js"' if n != "explorer.html" else 'src="script.js"'), n)
            for attendu in ('(navigator.maxTouchPoints>0||"ontouchstart" in window)&&screen.width>0&&Math.min(screen.width,screen.height)<=640', "sessionStorage.getItem(k)", 'k="jappale-theme-v3"'): self.assertIn(attendu, h, n)
        for f in glob.glob(os.path.join(base, "docs", "*.js")) + glob.glob(os.path.join(base, "docs", "*.html")): self.assertNotIn("jappale-theme-v2", open(f, encoding="utf-8").read(), f)
        llm = lire("docs", "assistant-llm.js")
        for attendu in ("function creerAssistantLLM", "function verifier(reponse, faits)", "function lieuOublie", "Réponse immédiate sans IA", "projection officielle de l'ANSD pour 2033"): self.assertIn(attendu, llm, attendu)
        self.assertIn("assistantIA.poser(text, addMsg)", lire("docs", "script.js")); self.assertIn('id="chatEtat"', lire("docs", "script.js")); self.assertIn("creerAssistantLLM", lire("docs", "assistant-page.js"))
        pk = json.loads(lire("tests", "interface", "package.json"))["scripts"]; self.assertEqual((pk["test"], pk["test:ia"]), ("node lancer_tout.js", "node 03_assistant_ia.test.js"))
        self.assertIn("03_assistant_ia.test.js", lire("tests", "interface", "lancer_tout.js")); self.assertTrue(os.path.exists(os.path.join(base, "tests", "ia", "evaluer_assistant_ia.js")))
        css = lire("docs", "accueil.css"); self.assertIn('html[data-theme="light"] .hero-zone::before { display: none; }', css); self.assertIn("border: 1.5px solid var(--bas); border-radius: 999px; color: var(--bas);", css); self.assertIn(".assist-etat[hidden], .chat-etat[hidden] { display: none; }", css)
        rd = lire("README.md")
        for attendu in ("# Jàppale Sénégal (V11)", "D'abord les décideurs qui veulent construire", "Plus de 19 personnes réelles", "Leurs noms restent confidentiels", "## Les trois documents essentiels", "methodologie/METHODOLOGIE.md", "trois rubriques (Comprendre, Explorer, Agir)", "Nous avons utilisé l'IA comme outil de travail", "nous vérifions toujours la source", "équipe de trois personnes", "Nos limites, assumées"): self.assertIn(attendu, rd, attendu)
        for f in ["README.md"] + glob.glob(os.path.join(base, "methodologie", "*.md")) + glob.glob(os.path.join(base, "docs", "*.css")) + glob.glob(os.path.join(base, "docs", "*.html")):
            texte = open(f if os.path.isabs(f) else os.path.join(base, f), encoding="utf-8").read(); self.assertEqual([m for m in re.findall(r"[\w'-]+", texte.lower()) if hashlib.sha256(m.encode()).hexdigest() in caches], [], f)   # aucun nom de personne ni d'outil (empreintes de mots)
        self.assertLess(len(rd.split()), 900, "le README reste court")
        self.assertIn("D'abord les décideurs", lire("docs", "index.html"))
        me = lire("methodologie", "METHODOLOGIE.md")
        for attendu in ("**En bref :**", "au moins 553", "447", "environ 800", "898", "1 040", "+0,83", "-0,76", "15 anomalies"): self.assertIn(attendu, me, attendu)
        self.assertLess(len(me.split()), 600)
        import re as _re
        for f in sorted(glob.glob(os.path.join(base, "docs", "*.html"))):
            h = open(f, encoding="utf-8").read(); m = _re.search(r'<ul class="(?:links|site-links)" id="(?:links|siteLinks)">(.*?)</ul>', h, _re.S)
            self.assertEqual(_re.findall(r'<li><a href="([a-z]+\.html)"', m.group(1)), ["synthese.html", "explorer.html", "simulateur.html"], os.path.basename(f))
            self.assertEqual(_re.findall(r'<li><a [^>]*>([^<]+)</a>', m.group(1)), ["Comprendre", "Explorer", "Agir"], os.path.basename(f))
        cm = lire("docs", "communes.js")
        for attendu in ('<details class="comprendre"><summary>Comprendre ce chiffre</summary>', "Pourquoi c'est important", 'id="agir"', "Agir : que peut-on faire ?", "Piste d'action", "pas une décision", "Acteurs concernés</th><td>À confirmer", "Indicateur de suivi", "ne pourra pas être attribuée au site sans preuve"): self.assertIn(attendu, cm, attendu)
        self.assertIn('href="${lienFiche(r.c)}#agir"', lire("docs", "simulateur.js")); self.assertIn("Que peut-on faire ?", lire("docs", "index.html"))
        lim = lire("methodologie", "LIMITES.md")
        for attendu in ("## L'essentiel, en huit lignes", "**L'assistant** a deux modes", "Le site démarre toujours en sombre sur un téléphone", "Aucun nom de personne dans le dépôt"): self.assertIn(attendu, lim, attendu)
        su = lire("methodologie", "SUIVI_DES_RETOURS.md")
        for attendu in ("## En bref", "**Plus de 19 personnes réelles**", "lycéen, étudiants, grands-parents, habitants, médecin, juriste, professeurs, doctorant", "## Dernière série (octobre 2026)"): self.assertIn(attendu, su, attendu)
        for nom, maxi in (("ASSISTANT_IA.md", 450), ("CONTRIBUTIONS.md", 450)):
            t = lire("methodologie", nom); self.assertIn("**En bref :**", t, nom); self.assertLess(len(t.split()), maxi, nom)
        for f in sorted(x for x in glob.glob(os.path.join(base, "methodologie", "*.md")) if not x.endswith("GLOSSAIRE.md")):   # le glossaire reste identique à celui de la page
            t = open(f, encoding="utf-8").read(); self.assertRegex(t, r"\*\*En bref :\*\*|## En bref|## L'essentiel|\*Hackathon des 20 ans", os.path.basename(f))
        self.assertIn("plus de 19 personnes réelles", lire("methodologie", "NOTE_DE_PRESENTATION.md"))   # la note est régénérée par le script de la note

    def test_aucun_chiffre_du_depot_ne_vient_de_la_presse(self):
        import glob, os, re
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        fichiers = glob.glob(os.path.join(base, "docs", "*.html")) + glob.glob(os.path.join(base, "methodologie", "*.md")) + [os.path.join(base, "README.md")] + glob.glob(os.path.join(base, "donnees", "*.md"))
        self.assertGreater(len(fichiers), 12)
        trouves = [f"{os.path.relpath(f, base)} : « {m.group(0)} »" for f in fichiers for m in re.finditer(r"(?i)\bpresse\b|\bAPS\b|Le Soleil|Seneplus|Senego", open(f, encoding="utf-8").read())]
        self.assertEqual(trouves, [], "un document cite la presse comme source d'un chiffre")

    def test_l_ecart_avec_l_annuaire_sur_les_postes_est_ecrit_exactement(self):
        import os
        mod = self._charger_analyse("analyse_personnel_region")
        source = sum(mod.postes_de_la_source_par_region().values()); annuaire = sum(int(x["postes_de_sante_publics"]) for x in mod.lignes())
        self.assertEqual((source, annuaire), (2124, 1731))
        self.assertEqual(round((source - (annuaire + 14)) / (annuaire + 14) * 100), 22)   # 14 centres médico-sociaux, total imprimé du tableau 16
        self.assertEqual(round((source - 1680) / 1680 * 100), 26)
        page = open(os.path.join(os.path.dirname(__file__), "..", "docs", "methode.html"), encoding="utf-8").read()
        self.assertEqual(round((source - 1531) / 1531 * 100), 39)
        for attendu in ("Écart de +22 % à +39 %", "1 731 postes", "14 centres médico-sociaux", "1 531 postes publics"):
            self.assertIn(attendu, page, attendu)
        par = mod.postes_de_la_source_par_region(); ligne = {x["region"]: int(x["postes_de_sante_publics"]) for x in mod.lignes()}
        self.assertEqual(par["kedougou"], ligne["KEDOUGOU"])   # seule région où la couche source et l'annuaire coïncident exactement

    def test_la_page_de_simulation_et_ses_scripts_existent(self):
        import os
        docs = os.path.join(os.path.dirname(__file__), "..", "docs")
        for f in ("simulateur.html", "simulateur.js", "simulateur.css", "simulation.js"):
            self.assertTrue(os.path.exists(os.path.join(docs, f)), f)


class TestPrevisions(unittest.TestCase):
    """La formule écrite sur la page Méthode est exactement celle qui produit les chiffres de 2033 du site (553 communes)."""

    def test_la_formule_documentee_produit_les_chiffres_de_2033(self):
        import csv, math, os
        base = os.path.join(os.path.dirname(__file__), "..", "donnees")
        croissance = [float(r["taux_croissance_annuel_pct"]) for r in csv.DictReader(open(os.path.join(base, "croissance_2013_2023.csv"), encoding="utf-8-sig"))]
        mediane = sorted(croissance)[len(croissance) // 2]
        self.assertEqual(mediane, 2.94)   # « 2,94 % par an » écrit sur la page
        lignes = list(csv.DictReader(open(os.path.join(base, "score_final_corrige.csv"), encoding="utf-8-sig")))
        self.assertEqual(len(lignes), 553)
        total_deficit_2033 = 0
        for r in lignes:
            g, pop = float(r["taux_croissance_annuel_pct"]), int(r["population"])
            pop33 = pop * (1 + g / 100) ** 5 * (1 + (g + mediane) / 200) ** 5       # la formule de la page Méthode
            self.assertLessEqual(abs(int(r["population_2033_amortie"]) - pop33), 1.0, r["commune"])
            besoin = math.ceil(int(r["population_2033_amortie"]) / 10000)               # arrondi supérieur de (population ÷ 10 000)
            deficit = max(0, besoin - int(r["nb_poste_sante"]))                         # maximum de 0 et (besoin - postes existants)
            self.assertEqual(int(r["deficit_sante_commune_2033_amorti"]), deficit, r["commune"])
            total_deficit_2033 += deficit
        self.assertEqual(total_deficit_2033, 1040)   # le « 1 040 » affiché par le site

    def test_la_sensibilite_au_taux_de_croissance_est_celle_que_dit_la_page(self):
        """Les chiffres écrits sur la page Méthode (920 à 1 190 postes, au moins 8 communes sur 10) sortent de l'analyse de sensibilité."""
        import importlib.util, os
        chemin = os.path.join(os.path.dirname(__file__), "analyse_sensibilite_croissance.py")
        spec = importlib.util.spec_from_file_location("sens", chemin); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        s = mod.scenarios(); base = s["base (mesuré, amorti)"]
        totaux = {nom: sum(d.values()) for nom, d in s.items()}
        self.assertEqual(totaux["base (mesuré, amorti)"], 1040)
        self.assertEqual((totaux["médiane partout"], totaux["mesuré moins 1 point"], totaux["mesuré plus 1 point"], totaux["extrapolation brute"]), (948, 916, 1194, 1106))
        self.assertEqual((min(totaux.values()), max(totaux.values())), (916, 1194))          # « d'environ 920 à 1 190 »
        self.assertEqual(round((916 / 1040 - 1) * 100), -12); self.assertEqual(round((1194 / 1040 - 1) * 100), 15)   # « 12 % de moins à 15 % de plus »
        self.assertGreaterEqual(min(len(mod.top(d) & mod.top(base)) for d in s.values()), 8)   # « au moins huit des dix »

    def test_le_chiffre_de_553_depend_de_l_arrondi_et_le_classement_ne_change_pas(self):
        """Les chiffres écrits dans les limites (553, 447, 440, 369) sortent de l'analyse de sensibilité à l'arrondi."""
        import importlib.util, os
        chemin = os.path.join(os.path.dirname(__file__), "analyse_sensibilite_arrondi.py")
        spec = importlib.util.spec_from_file_location("arrondi", chemin); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        lignes = mod.communes(); res = {nom: mod.manque(lignes, f) for nom, f in mod.CONVENTIONS.items()}
        totaux = {nom: round(v[0]) for nom, v in res.items()}
        self.assertEqual(totaux, {"arrondi au supérieur (le site)": 553, "arrondi à l'entier le plus proche": 440, "arrondi à l'inférieur": 369, "sans arrondi (besoin fractionnaire)": 447})
        self.assertEqual(res["arrondi au supérieur (le site)"][1], 184)
        base = mod.dix_premieres(res["arrondi au supérieur (le site)"][2])
        self.assertTrue(all(mod.dix_premieres(v[2]) == base for v in res.values()), "le classement des dix premières communes change selon la convention")

    def test_le_total_regional_comparé_a_la_population_ne_verrait_que_deux_regions(self):
        """La phrase « 2 régions sur 14, 265 postes ; 2 124 pour 1 813 au niveau du pays » est exacte."""
        import math, os, csv
        base = os.path.join(os.path.dirname(__file__), "..", "donnees")
        lignes = list(csv.DictReader(open(os.path.join(base, "score_final_corrige.csv"), encoding="utf-8-sig")))
        par = {}
        for r in lignes:
            a = par.setdefault(r["region"], [0, 0, 0]); a[0] += int(r["population"]); a[1] += int(r["nb_poste_sante"])
        vues = {k: math.ceil(a[0] / 10000) - a[1] for k, a in par.items() if math.ceil(a[0] / 10000) - a[1] > 0}
        self.assertEqual((len(par), len(vues), sum(vues.values())), (14, 2, 265))
        pop = sum(int(r["population"]) for r in lignes); existants = sum(int(r["nb_poste_sante"]) for r in lignes)
        self.assertEqual((existants, math.ceil(pop / 10000)), (2124, 1813))

    def test_les_communes_sans_croissance_mesuree_recoivent_la_mediane(self):
        import csv, os
        base = os.path.join(os.path.dirname(__file__), "..", "donnees")
        lignes = list(csv.DictReader(open(os.path.join(base, "score_final_corrige.csv"), encoding="utf-8-sig")))
        repli = [r for r in lignes if r["source_taux"] == "taux_median_national"]
        self.assertGreater(len(repli), 0)
        self.assertTrue(all(float(r["taux_croissance_annuel_pct"]) == 2.94 for r in repli))


if __name__ == "__main__":
    unittest.main()
