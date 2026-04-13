export const PRICING = {
  US: {
    certified_mail: { amount: 14, currency: "$", display: "$14" },
    attorney_letter: { amount: 49.99, currency: "$", display: "$49.99" },
    live_counsel: { amount: 149, currency: "$", display: "$149" },
  },
  BE: {
    certified_mail: { amount: 15, currency: "€", display: "15€" },
    attorney_letter: { amount: 49.99, currency: "€", display: "49,99€" },
    live_counsel: { amount: 149, currency: "€", display: "149€" },
  },
};

export const JURISDICTION_LABELS = {
  US: { en: "United States", fr: "États-Unis", es: "Estados Unidos", nl: "Verenigde Staten" },
  BE: { en: "Belgium", fr: "Belgique", es: "Bélgica", nl: "België" },
};

export const DATE_FORMATS = {
  US: "mm/dd/yyyy",
  BE: "dd/mm/yyyy",
};
