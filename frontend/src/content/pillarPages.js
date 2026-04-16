// Pillar page content — structured data for the 4 pillar pages.
// Content placeholders to be enriched by Romain.

const STATES = [
  { slug: 'california', name: 'California' },
  { slug: 'texas', name: 'Texas' },
  { slug: 'florida', name: 'Florida' },
  { slug: 'new-york', name: 'New York' },
  { slug: 'illinois', name: 'Illinois' },
  { slug: 'pennsylvania', name: 'Pennsylvania' },
];

export const PILLAR_CONTENT = {
  'eviction-help': {
    title: 'Eviction Help',
    heroTitle: "Facing Eviction? Here's How to Fight Back",
    heroSubtitle: 'The complete guide to eviction rights, legal defenses, and what to do in the next 72 hours.',
    ctaText: 'Analyze my eviction notice free',
    ctaHeadline: 'Got an eviction notice?',
    quickAnswer: "If you just received an eviction notice, you have 3 priority actions: (1) note the deadline — don't miss it, (2) don't move out yet — the notice alone doesn't mean you must leave, (3) respond in writing within 48 hours. Most eviction notices contain procedural errors that can be challenged.",
    states: STATES,
    sections: [
      { title: 'Understanding Eviction Notices', content: 'An eviction notice is the first step in the legal process to remove a tenant from a rental property. There are several types: 3-day notices (pay or quit), 30-day notices (month-to-month tenancy), and 60-day notices (tenancy over 1 year). Each has different requirements and timelines.' },
      { title: 'Your Rights as a Tenant', content: "Tenants have significant legal protections in every US state. Your landlord cannot change locks, shut off utilities, or remove your belongings without a court order. You have the right to receive proper notice, to contest the eviction in court, and to request more time if you're facing hardship." },
      { title: 'How to Respond: Step by Step', content: "Step 1: Read the notice carefully and note the deadline. Step 2: Check for errors — is the notice properly served? Is the reason valid? Is the timeline correct? Step 3: Respond in writing. Step 4: If you can't resolve it, file an answer with the court before the deadline. Step 5: Prepare your defense for the hearing." },
      { title: 'Common Legal Defenses', content: "The most common defenses against eviction include: improper notice (wrong form, wrong timeline, wrong delivery method), retaliation (landlord evicting because you complained about conditions), discrimination (protected class), habitability issues (serious repairs needed), and payment disputes (you paid but landlord claims otherwise)." },
      { title: 'When to Hire an Attorney', content: "Consider hiring an attorney if: you have a strong defense but need help presenting it, the eviction involves discrimination or retaliation, you're facing a large financial claim, or the case is going to trial. Many legal aid organizations offer free help for tenants facing eviction." },
    ],
    faqs: [
      { question: 'How long do I have to respond to an eviction notice?', answer: 'It depends on the type of notice and your state. Most 3-day notices require a response within 3 business days. 30-day and 60-day notices give you more time. Check your state-specific rules below.' },
      { question: 'Can my landlord evict me without going to court?', answer: "No. In every US state, a landlord must go through the court system to legally evict you. Self-help evictions (changing locks, shutting off utilities, removing belongings) are illegal and you can sue for damages." },
      { question: 'What happens if I ignore the eviction notice?', answer: "If you ignore the notice, your landlord will likely file an eviction lawsuit. If you don't respond to the lawsuit, the court will issue a default judgment against you, and you'll be legally required to move out." },
      { question: 'Can I be evicted during winter?', answer: 'Most states do not have winter eviction moratoriums. However, some cities (like Chicago) have winter protections. Check your local rules.' },
      { question: 'Does an eviction go on my record?', answer: "Yes. An eviction filing appears on your record and can make it harder to rent in the future. This is true even if you win the case. Some states allow you to seal eviction records in certain circumstances." },
      { question: 'How much does Archer cost for eviction help?', answer: 'Archer analyzes your eviction notice for free. If you need an attorney-signed response letter, it costs $49 and is delivered in 4 hours.' },
    ],
  },

  'wrongful-termination': {
    title: 'Wrongful Termination',
    heroTitle: 'Wrongful Termination: Know Your Rights & Fight Back',
    heroSubtitle: 'Were you fired illegally? Learn how to document your case, understand your rights, and take action.',
    ctaText: 'Analyze my termination documents',
    ctaHeadline: 'Think you were fired illegally?',
    quickAnswer: "If you believe you were wrongfully terminated, do these 3 things immediately: (1) request your termination letter and personnel file in writing, (2) document everything — emails, texts, witness names, timeline of events, (3) file for unemployment benefits right away. Don't sign anything without reviewing it first.",
    states: STATES,
    sections: [
      { title: 'What Counts as Wrongful Termination?', content: "Wrongful termination occurs when an employer fires you in violation of federal or state law. Common examples include: firing for reporting illegal activity (whistleblower retaliation), firing based on race, gender, age, disability, or other protected characteristics (discrimination), firing for taking FMLA leave, firing in breach of an employment contract, and firing for filing a workers' compensation claim." },
      { title: 'At-Will Employment: What It Really Means', content: "Most US states follow at-will employment, meaning your employer can fire you for any reason — or no reason. But there are important exceptions: they can't fire you for an illegal reason (discrimination, retaliation), they can't fire you in violation of a contract, and they can't fire you in violation of public policy." },
      { title: 'How to Build Your Case', content: 'Step 1: Get everything in writing — request your termination letter and reason for dismissal. Step 2: Gather evidence — emails, performance reviews, witness statements. Step 3: Create a timeline of events leading up to your termination. Step 4: Identify possible legal violations. Step 5: File complaints with the appropriate agencies (EEOC, state labor board).' },
      { title: 'Damages You Can Recover', content: 'If you prove wrongful termination, you may be entitled to: back pay (wages you would have earned), front pay (future lost earnings), reinstatement to your position, compensatory damages (emotional distress), and in some cases, punitive damages.' },
    ],
    faqs: [
      { question: 'Can I be fired without a reason in the US?', answer: "In most states, yes — at-will employment allows firing without cause. But you can't be fired for an illegal reason (discrimination, retaliation, protected activity)." },
      { question: 'How long do I have to file a wrongful termination claim?', answer: 'It varies. EEOC complaints must be filed within 180-300 days. State law claims may have different deadlines. Act quickly — delays can hurt your case.' },
      { question: 'Should I sign a severance agreement?', answer: "Don't sign anything immediately. You typically have 21-45 days to review. Have an attorney review it first — you may be waiving valuable rights." },
      { question: 'Can I sue if I was fired during my probation period?', answer: "Yes, if the firing was for an illegal reason. Probation periods don't eliminate your legal protections against discrimination or retaliation." },
    ],
  },

  'severance-negotiation': {
    title: 'Severance Negotiation',
    heroTitle: 'Severance Negotiation: Get What You Deserve',
    heroSubtitle: 'Most severance offers are negotiable. Learn how to evaluate, negotiate, and maximize your package.',
    ctaText: 'Analyze my severance offer',
    ctaHeadline: 'Got a severance offer?',
    quickAnswer: 'Most people accept the first severance offer without negotiating. This is a mistake — 70% of severance packages are negotiable. Key leverage points: your years of service, knowledge of company information, willingness to sign a non-compete, and the strength of any potential legal claims.',
    sections: [
      { title: 'Understanding Your Severance Offer', content: "A typical severance package includes: a lump sum payment (usually 1-2 weeks per year of service), continuation of health insurance (COBRA), outplacement services, and a release of claims (you agree not to sue). But these are starting points — almost everything is negotiable." },
      { title: 'What You Can Negotiate', content: "Beyond the dollar amount, consider negotiating: extended health insurance coverage, vesting of stock options, removal or reduction of non-compete clauses, a positive reference agreement, outplacement services, payment timing (lump sum vs. salary continuation), and the scope of the release of claims." },
      { title: 'Negotiation Strategies', content: "Strategy 1: Don't accept immediately — you have time (21-45 days for age 40+). Strategy 2: Counter with specifics, not just 'more money.' Strategy 3: Leverage any potential claims (discrimination, unpaid overtime, etc.). Strategy 4: Get everything in writing. Strategy 5: Have an attorney review before signing." },
    ],
    faqs: [
      { question: 'Am I entitled to severance pay?', answer: "There's no federal law requiring severance pay. But you may be entitled if: your employment contract includes it, company policy promises it, or your employer has a practice of providing it." },
      { question: 'Can I negotiate severance after being laid off?', answer: 'Absolutely. Being laid off doesn\'t mean you have to accept the first offer. Your employer wants you to sign a release of claims — that has value, and you can negotiate for it.' },
      { question: "What if my employer says the offer is 'final'?", answer: "Most 'final' offers aren't actually final. Counter professionally with specific requests. The worst they can say is no — but most employers have room to negotiate." },
    ],
  },

  'ai-legal-assistant': {
    title: 'AI Legal Assistant',
    heroTitle: 'AI Legal Assistant: The Future of Affordable Legal Help',
    heroSubtitle: 'How AI is making quality legal help accessible to everyone — not just those who can afford $500/hour attorneys.',
    ctaText: 'Try Archer free',
    ctaHeadline: 'Ready to experience AI legal help?',
    quickAnswer: "An AI legal assistant analyzes your legal documents, identifies violations and rights, and helps you take action — in minutes instead of weeks, for a fraction of the cost. Archer's AI has been trained on 2.4M+ case laws and is used by thousands of people across the US and Belgium.",
    sections: [
      { title: 'What Is an AI Legal Assistant?', content: "An AI legal assistant is software that uses artificial intelligence to help people understand and respond to legal issues. Unlike a chatbot that gives generic answers, a true AI legal assistant like Archer analyzes your actual documents, identifies specific violations, and creates actionable strategies based on relevant law and jurisprudence." },
      { title: 'How Archer Works', content: "Archer uses a multi-pass AI analysis pipeline: Pass 1 extracts facts from your documents. Pass 2 performs legal analysis against applicable laws. Pass 3 develops strategic recommendations. Pass 4 creates a battle preview showing your arguments vs. the opposing party's likely arguments. The entire process takes under 60 seconds." },
      { title: 'AI vs. Traditional Legal Help', content: "Traditional legal consultation: $200-500/hour, weeks for a response, limited to one attorney's knowledge. AI legal assistant: instant analysis, 2.4M+ case laws consulted, $49 for an attorney-signed letter. AI doesn't replace attorneys for complex cases — it makes the initial analysis and response affordable for everyone." },
    ],
    faqs: [
      { question: 'Is AI legal advice the same as attorney advice?', answer: "No. AI legal assistants provide legal information and analysis, not legal advice. For formal legal advice, you need a licensed attorney. Archer connects you with attorneys when your case requires it." },
      { question: 'How accurate is AI legal analysis?', answer: "Archer's analysis includes confidence scores for each finding, based on relevant jurisprudence. For clear-cut violations (missed deadlines, improper notice), accuracy exceeds 90%. For nuanced interpretations, the AI flags uncertainty." },
      { question: 'Is my data safe with an AI legal assistant?', answer: 'Archer uses end-to-end encryption, GDPR compliance, and never shares your data with third parties. Your documents are analyzed in real-time and not stored for training purposes.' },
    ],
  },
};
