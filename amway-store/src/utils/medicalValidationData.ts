export interface MedicalStandardRow {
  ingredient: string;
  product_measurement: string;
  standard_measurement: string;
  fit_assessment: string;
  rating: 'Good' | 'Moderate' | 'Bad';
}

export interface MedicalValidationRecord {
  standard_authority: string;
  standard_url: string;
  secondary_url?: string;
  verification_table: MedicalStandardRow[];
  who_may_use: string[];
  who_should_not_use: string[];
  clinical_nutrition_rationale?: {
    what_it_is: string;
    why_it_is_needed: string;
  };
}

export const PRODUCT_VALIDATION_MAP: Record<string, MedicalValidationRecord> = {
  // XS Whey Protein Powder Formula 2 Chocolate
  '329954ID': {
    standard_authority: 'International Society of Sports Nutrition (ISSN) & ICMR-NIN 2020 RDA',
    standard_url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8',
    secondary_url: 'https://www.icmr.gov.in/pdf/guidelines/Nutrient_Requirements_and_Recommended_Dietary_Allowances_for_Indians.pdf',
    clinical_nutrition_rationale: {
      what_it_is: 'A multi-phase whey protein matrix combining fast-acting Whey Protein Hydrolysate and Whey Protein Isolate with sustained-release Whey Protein Concentrate and Milk Protein Concentrate, delivering 23g intact protein and 5g BCAAs (2:1:1 leucine-to-isoleucine-to-valine ratio) per 30g scoop, enriched with inulin prebiotic fiber and zero added sugars.',
      why_it_is_needed: 'Resistance training induces myofibrillar micro-tears requiring immediate cellular amino acid availability to trigger mTORC1 phosphorylation. Single-source whey produces a rapid hyperaminoacidemia followed by a steep drop within 90 minutes. Formula 2 staged kinetic release maintains elevated systemic amino acid levels for up to 4 hours, attenuating exercise-induced protein catabolism and accelerating muscular hypertrophy without gastrointestinal distress.'
    },
    verification_table: [
      {
        ingredient: 'Intact Protein (6-Blend)',
        product_measurement: '23.0 g / 30g scoop',
        standard_measurement: '20.0 – 25.0 g / serving (ISSN Benchmark)',
        fit_assessment: 'Matches the exact leucine threshold (~2.5g) to trigger maximal Muscle Protein Synthesis (MPS) in young adults without excessive nitrogen oxidation.',
        rating: 'Good'
      },
      {
        ingredient: 'Branched Chain Amino Acids (BCAAs)',
        product_measurement: '5.0 g per serving',
        standard_measurement: '3.0 – 5.0 g per post-workout dose (ISSN Guidelines)',
        fit_assessment: 'Provides the clinically validated 2:1:1 ratio necessary to suppress exercise-induced muscle protein breakdown.',
        rating: 'Good'
      },
      {
        ingredient: 'Prebiotic Fiber (Inulin)',
        product_measurement: '0.7 g per serving',
        standard_measurement: '0.5 – 2.0 g per dose (EFSA & NIH Digestive Benchmark)',
        fit_assessment: 'Promotes upper GI transit and optimizes peptide absorption without osmotic cramping.',
        rating: 'Good'
      },
      {
        ingredient: 'Elemental Calcium',
        product_measurement: '80 mg (8% ICMR RDA)',
        standard_measurement: '1,000 mg/day (ICMR-NIN 2020 RDA for Adult Men)',
        fit_assessment: 'Provides safe supplementary baseline for actin-myosin contraction without competing with dietary iron absorption.',
        rating: 'Moderate'
      },
      {
        ingredient: 'Added Sugar',
        product_measurement: '0.0 g (Zero added sucrose)',
        standard_measurement: '< 25.0 g/day or < 5% total energy (WHO / ICMR Standards)',
        fit_assessment: '100% compliant with clinical guidelines; prevents postprandial insulin surges and unwanted visceral fat accumulation.',
        rating: 'Good'
      }
    ],
    who_may_use: [
      'Lean individuals (ectomorphs) seeking hypertrophy and muscle mass accretion',
      'Resistance-trained athletes requiring targeted post-workout recovery',
      'Adults requiring sustained daytime and nocturnal amino acid delivery',
      'Individuals prone to GI bloating with standard single-source whey'
    ],
    who_should_not_use: [
      'Individuals with severe dairy / milk protein anaphylaxis or allergy',
      'Patients with Chronic Kidney Disease (CKD stage 3+) without nephrologist consent',
      'Children under 12 years of age',
      'Individuals with galactosemia'
    ]
  },

  // NUTRILITE® All Plant Protein Powder
  '329861ID': {
    standard_authority: 'WHO/FAO/UNU Expert Consultation & ICMR-NIN 2020 RDA',
    standard_url: 'https://www.who.int/publications/i/item/9241209356',
    secondary_url: 'https://ods.od.nih.gov/factsheets/Soy-HealthProfessional/',
    clinical_nutrition_rationale: {
      what_it_is: 'A tri-peptide plant protein isolate complex formulated from non-GMO soy protein isolate, wheat protein concentrate, and yellow pea protein isolate. It delivers an 80% pure protein yield (8.0g intact protein per 10g scoop) supplying all 9 essential amino acids (EAAs) in precise stoichiometric balance. Naturally unflavored, devoid of added sucrose, cholesterol, synthetic excipients, or artificial sweeteners.',
      why_it_is_needed: 'Over 70% of Indian diets suffer from severe primary protein deficits (<0.6g/kg/day vs recommended 0.83-1.0g/kg/day). This chronic deficit triggers sarcopenic obesity, impaired cellular immunity, and delayed wound/collagen healing. All Plant Protein solves this without adding saturated fat or cholesterol. Combining legumes with grain peptides achieves a biological PDCAAS of 1.0, matching egg and milk protein bioavailability while remaining 100% dairy- and lactose-free.'
    },
    verification_table: [
      {
        ingredient: 'Tri-Blend Plant Protein (Soy, Wheat, Pea)',
        product_measurement: '8.0 g / 10g scoop (80% concentration)',
        standard_measurement: '0.83 – 1.0 g / kg bodyweight / day (ICMR-NIN RDA)',
        fit_assessment: 'Delivers an 80% pure protein yield per scoop; 2 scoops provide 16g complete protein, fulfilling ~30% of daily adult RDA.',
        rating: 'Good'
      },
      {
        ingredient: 'Essential Amino Acid Pattern (PDCAAS)',
        product_measurement: 'PDCAAS = 1.0 (Full 9 EAAs)',
        standard_measurement: 'PDCAAS ≥ 0.80 for high-quality dietary protein (WHO/FAO)',
        fit_assessment: 'Overcomes standard plant protein limitations by combining legumes and grains to match milk protein biological value.',
        rating: 'Good'
      },
      {
        ingredient: 'Dietary Cholesterol',
        product_measurement: '0.0 mg',
        standard_measurement: '< 200 mg / day (AHA & Medical Lipid Guidelines)',
        fit_assessment: 'Superior cardiovascular safety profile; enables high protein fortification without elevating serum LDL or apoB.',
        rating: 'Good'
      },
      {
        ingredient: 'Soy Isoflavones',
        product_measurement: 'Approx. 12.0 mg / serving',
        standard_measurement: 'Safe upper intake: up to 100 mg / day (EFSA / NIH ODS)',
        fit_assessment: 'Naturally present at safe physiological levels; confers antioxidant and endothelial benefits without hormonal perturbation.',
        rating: 'Good'
      }
    ],
    who_may_use: [
      'Lean individuals struggling to hit daily protein targets through solid food alone',
      'Vegetarians and vegans seeking complete essential amino acid adequacy',
      'Lactose-intolerant individuals who cannot tolerate dairy whey',
      'Families desiring heat-stable protein enrichment in home-cooked meals'
    ],
    who_should_not_use: [
      'Individuals with proven severe Soy protein allergy',
      'Individuals with Celiac disease or severe gluten enteropathy (contains wheat protein fraction)',
      'Individuals with chronic end-stage renal failure on strict protein restrictions'
    ]
  },

  // NUTRILITE® Cherry Iron
  '329868ID': {
    standard_authority: 'WHO Maternal Postpartum Guidelines & ICMR-NIN 2020 RDA for Lactation',
    standard_url: 'https://www.who.int/publications/i/item/9789240019522',
    secondary_url: 'https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/',
    clinical_nutrition_rationale: {
      what_it_is: 'An organic chelated iron supplement formulated with 15.0mg elemental iron derived from three synergized bioavailable sources (Ferrous Bisglycinate, Ferrous Fumarate, and Mustard Greens extract), fortified with 40mg Vitamin C from certified organic Acerola Cherries and 150mcg active Folic Acid.',
      why_it_is_needed: 'Postpartum recovery and chronic menstrual bleeding deplete maternal ferritin stores, causing profound microcytic hypochromic anemia, cognitive fatigue, and impaired immune function. Conventional inorganic iron salts trigger severe constipation, oxidative mucosal distress, and gastric nausea. Cherry Iron amino acid-chelated form bypasses standard DMT-1 competition, while Acerola-derived Vitamin C reduces non-heme iron into the soluble Fe2+ state, maximizing duodenal absorption with zero lower GI toxicity.'
    },
    verification_table: [
      {
        ingredient: 'Elemental Iron (Triple Source)',
        product_measurement: '15.0 mg / tablet',
        standard_measurement: '15.0 – 21.0 mg / day (ICMR-NIN RDA for Lactation)',
        fit_assessment: 'Delivers 100% of the recommended postpartum supplemental iron dose; organic chelate form minimizes free radical iron in the colon, eliminating severe constipation.',
        rating: 'Good'
      },
      {
        ingredient: 'Vitamin C (Acerola Cherry)',
        product_measurement: '40.0 mg',
        standard_measurement: '≥ 25.0 mg co-ingested with iron (NIH ODS / WHO Guidelines)',
        fit_assessment: 'Maintains non-heme iron in reduced, highly soluble ferrous (Fe2+) state for maximal duodenal enterocyte uptake.',
        rating: 'Good'
      },
      {
        ingredient: 'Folic Acid',
        product_measurement: '150.0 mcg',
        standard_measurement: '100.0 – 200.0 mcg / day supplementary (ICMR-NIN 2020)',
        fit_assessment: 'Adequately replenishes maternal red blood cell synthesis and lactation turnover without masking Vitamin B12 deficiency.',
        rating: 'Good'
      }
    ],
    who_may_use: [
      'Postpartum and lactating mothers rebuilding iron reserves lost during delivery',
      'Women experiencing iron-deficiency anemia or postpartum exhaustion',
      'Individuals prone to severe constipation or gastrointestinal nausea from standard hospital iron salts (ferrous sulfate)',
      'Women with heavy lochial or menstrual blood loss'
    ],
    who_should_not_use: [
      'Individuals diagnosed with primary Hemochromatosis, Hemosiderosis, or Thalassemia Major',
      'Patients suffering from non-iron deficiency anemias (e.g., untreated pernicious or hemolytic anemia)',
      'Individuals taking calcium carbonate supplements or antacids at the exact same hour (requires 2-hour spacing)'
    ]
  },

  // NUTRILITE® Salmon Omega-3
  '329869ID': {
    standard_authority: 'ACOG Clinical Consensus, GOED Global Standard & WHO Infant Nutrition Guidelines',
    standard_url: 'https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/',
    secondary_url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2989696/',
    clinical_nutrition_rationale: {
      what_it_is: 'An ultra-purified molecularly distilled marine lipid formulation delivering 300mg active Omega-3 Polyunsaturated Fatty Acids (PUFAs) — consisting of 180mg Eicosapentaenoic Acid (EPA) and 120mg Docosahexaenoic Acid (DHA) — sourced from deep cold-water ocean salmon, anchovy, and sardine harvests, protected with mixed natural tocopherols (Vitamin E).',
      why_it_is_needed: 'Modern industrialized diets exhibit an inflammatory Omega-6 to Omega-3 ratio exceeding 20:1, promoting systemic vascular endothelial dysfunction, hypertriglyceridemia, and cellular membrane rigidity. Specifically during lactation, maternal DHA stores are partitioned into breast milk for neonatal synaptic and retinal arborization; maternal deficiency precipitates cognitive exhaustion and postpartum mood disturbances. Salmon Omega-3 re-establishes normal cell membrane fluidity, selectively suppresses COX-2/5-LOX inflammatory cascade enzymes, and supplies the gold-standard DHA threshold mandated by perinatal medical guidelines.'
    },
    verification_table: [
      {
        ingredient: 'Docosahexaenoic Acid (DHA)',
        product_measurement: '120.0 mg / softgel (240 mg in 2 softgels)',
        standard_measurement: '≥ 200.0 mg DHA / day for lactating women (ACOG & European Consensus)',
        fit_assessment: 'Taking 2 softgels provides 240mg pure DHA, precisely satisfying international clinical standards for neonatal brain development during lactation.',
        rating: 'Good'
      },
      {
        ingredient: 'Eicosapentaenoic Acid (EPA)',
        product_measurement: '180.0 mg / softgel (360 mg in 2 softgels)',
        standard_measurement: '250.0 – 500.0 mg / day combined EPA/DHA (AHA / WHO)',
        fit_assessment: 'Potent anti-inflammatory lipid ratio; selectively suppresses pro-inflammatory PGE2 and TXA2, lowering postpartum depression risk scores.',
        rating: 'Good'
      },
      {
        ingredient: 'Heavy Metal Purity (Mercury, Lead, PCBs)',
        product_measurement: 'Non-detectable / < 0.01 ppm (Molecularly Distilled)',
        standard_measurement: 'Mercury < 0.1 ppm, Lead < 0.1 ppm, PCBs < 0.09 ppm (GOED / USP Monograph)',
        fit_assessment: '100% compliant with strict medical purity limits; protects breastfed infant from bio-accumulative heavy metals common in unrefined fish oils.',
        rating: 'Good'
      }
    ],
    who_may_use: [
      'Lactating women whose breast milk is the exclusive nutritional source of DHA for their infant',
      'Mothers experiencing postpartum mood fluctuations, brain fog, or emotional fatigue',
      'Individuals with low dietary intake of cold-water oily fish',
      'Adults seeking systemic anti-inflammatory and cardiovascular support'
    ],
    who_should_not_use: [
      'Individuals with known severe fish, seafood, or gelatin allergies',
      'Patients on high-dose anticoagulant therapy (e.g. Warfarin, Clopidogrel) without physician monitoring',
      'Patients scheduled for invasive surgery within 10-14 days (due to mild anti-platelet effect)'
    ]
  }
};
