// Archer clarifying questions derivation.
// Priority: the single backend `archer_question` → wrapped in a list.
// Fallback: 3 generic questions per V7 case_type + language.
//
// Each question: { id, text, choices: [string] }. Choices are selectable pills.

const GENERIC_CHOICES = {
  fr: ['Oui', 'Non', 'Je ne sais pas'],
  en: ['Yes', 'No', "I'm not sure"],
};

const FALLBACK_QUESTIONS = {
  fr: {
    penal_routier: [
      { text: 'Y avait-il des circonstances particulières ce jour-là ?', choices: ['Oui', 'Non', 'Partiellement'] },
      { text: 'As-tu d\u2019autres infractions récentes ?', choices: ['Aucune', '1', '2 ou plus'] },
      { text: 'Le PV mentionne-t-il bien la marque du radar ?', choices: ['Oui', 'Partiellement', 'Non', 'Je ne sais pas'] },
    ],
    logement: [
      { text: 'Le bail est-il toujours en cours de validité ?', choices: ['Oui', 'Non', 'Je ne sais pas'] },
      { text: 'As-tu déjà signalé des problèmes au bailleur ?', choices: ['Oui', 'Non'] },
      { text: 'As-tu des preuves écrites des échanges ?', choices: ['Oui', 'Partiellement', 'Non'] },
    ],
    travail: [
      { text: 'Es-tu toujours en contrat avec cet employeur ?', choices: ['Oui', 'Non', 'En préavis'] },
      { text: 'As-tu des témoins de la situation ?', choices: ['Oui', 'Non'] },
      { text: 'Y a-t-il eu des signes avant-coureurs ?', choices: ['Oui', 'Non', 'Je ne sais pas'] },
    ],
    consommation: [
      { text: 'As-tu conservé la preuve d\u2019achat ?', choices: ['Oui', 'Non'] },
      { text: 'As-tu déjà tenté de contacter le vendeur ?', choices: ['Oui', 'Non'] },
      { text: 'Y a-t-il une garantie applicable ?', choices: ['Oui', 'Non', 'Je ne sais pas'] },
    ],
    administratif: [
      { text: 'As-tu reçu d\u2019autres notifications ?', choices: ['Oui', 'Non'] },
      { text: 'As-tu respecté tous les délais précédents ?', choices: ['Oui', 'Non', 'Partiellement'] },
      { text: 'As-tu accès à ton dossier administratif ?', choices: ['Oui', 'Non'] },
    ],
    famille: [
      { text: 'Y a-t-il des enfants concernés ?', choices: ['Oui', 'Non'] },
      { text: 'Existe-t-il déjà un accord écrit ?', choices: ['Oui', 'Non'] },
      { text: 'Es-tu en contact avec l\u2019autre partie ?', choices: ['Oui', 'Non', 'Par avocat'] },
    ],
    civil: [
      { text: 'As-tu un contrat écrit ?', choices: ['Oui', 'Non', 'Partiellement'] },
      { text: 'As-tu déjà mis en demeure l\u2019autre partie ?', choices: ['Oui', 'Non'] },
      { text: 'Le délai de prescription est-il dépassé ?', choices: ['Oui', 'Non', 'Je ne sais pas'] },
    ],
    assurance: [
      { text: 'As-tu déclaré le sinistre dans les délais ?', choices: ['Oui', 'Non', 'Je ne sais pas'] },
      { text: 'As-tu conservé toutes les pièces justificatives ?', choices: ['Oui', 'Partiellement', 'Non'] },
      { text: 'As-tu déjà eu d\u2019autres litiges avec cet assureur ?', choices: ['Oui', 'Non'] },
    ],
    generic: [
      { text: 'As-tu des éléments supplémentaires à partager ?', choices: ['Oui', 'Non'] },
      { text: 'Y a-t-il une urgence particulière ?', choices: ['Oui', 'Non'] },
      { text: 'As-tu déjà consulté un professionnel ?', choices: ['Oui', 'Non'] },
    ],
  },
  en: {
    penal_routier: [
      { text: 'Were there any special circumstances that day?', choices: ['Yes', 'No', 'Partially'] },
      { text: 'Do you have any other recent violations?', choices: ['None', '1', '2 or more'] },
      { text: 'Does the ticket properly mention the radar model?', choices: ['Yes', 'Partially', 'No', "I'm not sure"] },
    ],
    logement: [
      { text: 'Is the lease still currently valid?', choices: ['Yes', 'No', "I'm not sure"] },
      { text: 'Have you previously reported issues to the landlord?', choices: ['Yes', 'No'] },
      { text: 'Do you have written evidence of the exchanges?', choices: ['Yes', 'Partially', 'No'] },
    ],
    travail: [
      { text: 'Are you still under contract with this employer?', choices: ['Yes', 'No', 'On notice'] },
      { text: 'Do you have any witnesses to the situation?', choices: ['Yes', 'No'] },
      { text: 'Were there any warning signs?', choices: ['Yes', 'No', "I'm not sure"] },
    ],
    consommation: [
      { text: 'Have you kept the proof of purchase?', choices: ['Yes', 'No'] },
      { text: 'Have you tried to contact the seller?', choices: ['Yes', 'No'] },
      { text: 'Is there an applicable warranty?', choices: ['Yes', 'No', "I'm not sure"] },
    ],
    administratif: [
      { text: 'Have you received any other notifications?', choices: ['Yes', 'No'] },
      { text: 'Have you respected all previous deadlines?', choices: ['Yes', 'No', 'Partially'] },
      { text: 'Do you have access to your administrative file?', choices: ['Yes', 'No'] },
    ],
    famille: [
      { text: 'Are there children involved?', choices: ['Yes', 'No'] },
      { text: 'Is there already a written agreement?', choices: ['Yes', 'No'] },
      { text: 'Are you in contact with the other party?', choices: ['Yes', 'No', 'Through attorney'] },
    ],
    civil: [
      { text: 'Do you have a written contract?', choices: ['Yes', 'No', 'Partially'] },
      { text: 'Have you already sent a formal notice?', choices: ['Yes', 'No'] },
      { text: 'Is the statute of limitations exceeded?', choices: ['Yes', 'No', "I'm not sure"] },
    ],
    assurance: [
      { text: 'Did you report the claim within the deadline?', choices: ['Yes', 'No', "I'm not sure"] },
      { text: 'Have you kept all supporting documents?', choices: ['Yes', 'Partially', 'No'] },
      { text: 'Have you had previous disputes with this insurer?', choices: ['Yes', 'No'] },
    ],
    generic: [
      { text: 'Do you have additional information to share?', choices: ['Yes', 'No'] },
      { text: 'Is there any particular urgency?', choices: ['Yes', 'No'] },
      { text: 'Have you already consulted a professional?', choices: ['Yes', 'No'] },
    ],
  },
};

function resolveLang(language) {
  const short = String(language || 'fr').slice(0, 2).toLowerCase();
  return short === 'en' ? 'en' : 'fr';
}

const TARGET_COUNT = 3;

export function deriveArcherQuestions(caseDoc, caseTypeV7 = 'generic', language = 'fr') {
  const lang = resolveLang(language);

  // Backend currently exposes either a single `archer_question` or, in the
  // future, an `archer_questions` list. Normalise to an array so we can
  // merge with the generic fallbacks.
  const backendList = [];
  if (Array.isArray(caseDoc?.archer_questions)) {
    backendList.push(...caseDoc.archer_questions);
  } else if (caseDoc?.archer_question && typeof caseDoc.archer_question === 'object' && caseDoc.archer_question.text) {
    backendList.push(caseDoc.archer_question);
  }

  const fromBackend = backendList.slice(0, TARGET_COUNT).map((q, i) => ({
    id: `aq-${i}`,
    text: q.text,
    choices: Array.isArray(q.options) && q.options.length > 0
      ? q.options
      : (Array.isArray(q.choices) && q.choices.length > 0 ? q.choices : GENERIC_CHOICES[lang]),
  }));

  if (fromBackend.length >= TARGET_COUNT) return fromBackend;

  // Pad with generic fallbacks per case_type until we reach TARGET_COUNT.
  const table = FALLBACK_QUESTIONS[lang] || FALLBACK_QUESTIONS.fr;
  const pool = table[caseTypeV7] || table.generic;

  // Skip fallback questions whose text overlaps an already-included one.
  const seenTexts = new Set(fromBackend.map((q) => q.text.toLowerCase()));
  const padded = [...fromBackend];
  for (const q of pool) {
    if (padded.length >= TARGET_COUNT) break;
    if (seenTexts.has(q.text.toLowerCase())) continue;
    padded.push({ id: `fallback-${padded.length}`, text: q.text, choices: q.choices });
    seenTexts.add(q.text.toLowerCase());
  }
  return padded;
}
