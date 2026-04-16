// State-specific content for pillar page sub-pages.
// 6 states x 2 verticals (eviction-help, wrongful-termination) = 12 pages.
// Content placeholders — to be enriched with state-specific laws by Romain.

function makeEvictionState(name, laws, timeline, resources) {
  return {
    name,
    heroTitle: `Eviction Process in ${name}: 2026 Tenant's Guide`,
    heroSubtitle: `How evictions work in ${name}, your rights as a tenant, and how to fight an eviction notice.`,
    sections: [
      { title: `${name} Eviction Laws Overview`, content: laws },
      { title: 'Eviction Timeline', content: timeline },
      { title: 'Resources & Legal Aid', content: resources },
    ],
  };
}

function makeTerminationState(name, laws, timeline, resources) {
  return {
    name,
    heroTitle: `Wrongful Termination in ${name}: Know Your Rights`,
    heroSubtitle: `Employment protections, filing deadlines, and how to fight back if you were fired illegally in ${name}.`,
    sections: [
      { title: `${name} Employment Law Overview`, content: laws },
      { title: 'Filing Deadlines & Process', content: timeline },
      { title: 'Resources & Legal Aid', content: resources },
    ],
  };
}

export const STATE_CONTENT = {
  'eviction-help': {
    california: makeEvictionState('California',
      "California has some of the strongest tenant protections in the US. The Tenant Protection Act (AB 1482) limits rent increases to 5% + local CPI and requires just cause for eviction in most rental units. Los Angeles, San Francisco, and other cities have additional local protections.",
      "3-day notice for non-payment of rent. 30-day notice for month-to-month tenancy (under 1 year). 60-day notice for tenancy over 1 year. After notice expires, landlord must file an Unlawful Detainer lawsuit. Tenant has 5 days to respond.",
      "California Courts Self-Help Center: selfhelp.courts.ca.gov. Legal Aid: lawhelpca.org. Tenant Rights Hotline: (800) 952-5210."),
    texas: makeEvictionState('Texas',
      "Texas is a landlord-friendly state with fewer tenant protections than coastal states. There is no statewide rent control, and eviction timelines are among the fastest in the nation. However, tenants still have rights under the Texas Property Code.",
      "3-day notice to vacate is standard. Landlord can file eviction suit after notice period. Court hearing typically within 10-21 days. Tenant can appeal within 5 days of judgment.",
      "Texas RioGrande Legal Aid: trla.org. Lone Star Legal Aid: lonestarlegal.org. Texas Tenant Advisor: texastenant.org."),
    florida: makeEvictionState('Florida',
      "Florida law requires landlords to provide proper written notice before filing for eviction. The type of notice depends on the reason for eviction. Florida does not have rent control, but tenants have rights under Florida Statutes Chapter 83.",
      "3-day notice for non-payment. 7-day notice for lease violations. 15-day notice for month-to-month tenancy. After notice period, landlord files eviction complaint. Tenant has 5 days to respond.",
      "Florida Bar Lawyer Referral: floridabar.org. Legal Aid: floridalegal.org. Florida Housing helpline: (800) 955-2232."),
    'new-york': makeEvictionState('New York',
      "New York has extensive tenant protections, especially in New York City where rent stabilization covers about 1 million apartments. The Housing Stability and Tenant Protection Act (2019) added significant statewide protections.",
      "14-day notice for non-payment. 30-day notice for month-to-month (under 1 year). 60-day notice (1-2 years). 90-day notice (over 2 years). NYC has additional protections through Housing Court.",
      "NYC Tenant Protection: www1.nyc.gov/site/hpd. Legal Aid Society: legal-aid.org. NY State Homes: hcr.ny.gov."),
    illinois: makeEvictionState('Illinois',
      "Illinois provides moderate tenant protections. Chicago has additional protections through the Residential Landlord and Tenant Ordinance (RLTO). The state requires proper notice and court proceedings for all evictions.",
      "5-day notice for non-payment. 10-day notice for lease violations. 30-day notice for month-to-month. Cook County has a longer timeline due to the Right to Counsel program.",
      "Legal Aid Chicago: legalaidchicago.org. Prairie State Legal Services: pslegal.org. Illinois Tenant Union: tenants-rights.org."),
    pennsylvania: makeEvictionState('Pennsylvania',
      "Pennsylvania provides moderate tenant protections. Philadelphia has the strongest local protections through the Renters' Access Act. Landlords must follow strict procedures for eviction.",
      "10-day notice for non-payment. 15-day notice for lease violations (first offense). 30-day notice for month-to-month. Landlord files complaint with Magisterial District Judge.",
      "Legal Aid of Southeastern PA: lasp.org. Community Legal Services: clsphila.org. PA 211: dial 211 for resources."),
  },

  'wrongful-termination': {
    california: makeTerminationState('California',
      "California is one of the most employee-friendly states. Key protections include the FEHA (Fair Employment and Housing Act) covering more categories than federal law, strong whistleblower protections (Labor Code 1102.5), and the WARN Act requiring 60-day notice for mass layoffs.",
      "FEHA complaints: file with DFEH within 3 years. Federal EEOC: 300 days. Wage claims: 3 years. Contract claims: 4 years written, 2 years oral.",
      "California DFEH: dfeh.ca.gov. Legal Aid at Work: legalaidatwork.org. California Employment Lawyers Association: cela.org."),
    texas: makeTerminationState('Texas',
      "Texas is an at-will employment state with fewer protections than coastal states. However, employees are still protected under federal anti-discrimination laws, and Texas has its own Texas Commission on Human Rights Act mirroring Title VII.",
      "EEOC: 300 days. Texas Workforce Commission: 180 days. Contract claims: 4 years. Workers' comp retaliation: 2 years.",
      "Texas Workforce Commission: twc.texas.gov. Texas RioGrande Legal Aid: trla.org. Equal Employment Opportunity Commission: eeoc.gov."),
    florida: makeTerminationState('Florida',
      "Florida is an at-will state with limited additional protections beyond federal law. The Florida Civil Rights Act mirrors Title VII. Whistleblower protections exist under the Florida Whistleblower Act.",
      "EEOC: 300 days. Florida Commission on Human Relations: 365 days. Whistleblower claims: 180 days.",
      "Florida Commission on Human Relations: fchr.myflorida.com. Legal Aid: floridalegal.org. EEOC Miami: eeoc.gov."),
    'new-york': makeTerminationState('New York',
      "New York provides strong employee protections through the New York State Human Rights Law, which covers more categories than federal law (including salary history inquiries). NYC adds further protections through the NYC Human Rights Law.",
      "NYSDHR: 3 years. NYC Commission on Human Rights: 3 years. EEOC: 300 days. Contract claims: 6 years.",
      "NYSDHR: dhr.ny.gov. Legal Aid Society: legal-aid.org. A Better Balance: abetterbalance.org."),
    illinois: makeTerminationState('Illinois',
      "Illinois has strong employee protections through the Illinois Human Rights Act. Recent amendments expanded protections significantly, including mandatory sexual harassment training and broader discrimination categories.",
      "Illinois DHR: 300 days. EEOC: 300 days. Wage Payment Act: 3 years. Whistleblower: 2 years.",
      "Illinois DHR: www2.illinois.gov/dhr. Legal Aid Chicago: legalaidchicago.org. Cabrini Green Legal Aid: cgla.net."),
    pennsylvania: makeTerminationState('Pennsylvania',
      "Pennsylvania provides protections through the Pennsylvania Human Relations Act, which covers employers with 4+ employees (broader than federal Title VII's 15-employee threshold). Philadelphia has additional protections.",
      "PHRC: 180 days. EEOC: 300 days. Contract claims: 4 years. Wage claims: 3 years.",
      "PHRC: phrc.pa.gov. Community Legal Services: clsphila.org. SeniorLAW Center: seniorlawcenter.org."),
  },
};
