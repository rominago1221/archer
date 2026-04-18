/**
 * Attorneys network data — 8 sample attorneys surfaced on the public
 * /attorneys page. Photos are imported so CRA/Webpack fingerprints them,
 * not bundled as base64 (the design source ships inline; we extract).
 *
 * `areas` keys map to i18n leaves under `attorneys.meet.filters.*` and
 * drive the filter bar in the MeetAttorneys section.
 */
import marieDelcourt from '../assets/attorneys/marie-delcourt.jpg';
import sophieLambert from '../assets/attorneys/sophie-lambert.jpg';
import julienPeeters from '../assets/attorneys/julien-peeters.jpg';
import anaisVermeulen from '../assets/attorneys/anais-vermeulen.jpg';
import thomasDesmet from '../assets/attorneys/thomas-desmet.jpg';
import camilleRousseau from '../assets/attorneys/camille-rousseau.jpg';
import emmaBauwens from '../assets/attorneys/emma-bauwens.jpg';
import nathanMartens from '../assets/attorneys/nathan-martens.jpg';

export const attorneys = [
  {
    id: 'marie-delcourt',
    nameFr: 'M. Marie Delcourt',
    nameEn: 'Marie Delcourt',
    photo: marieDelcourt,
    bar: 'Brussels Bar',
    online: true,
    experienceYears: 12,
    winRate: '98%',
    cases: 340,
    areas: ['traffic', 'debt', 'consumer'],
  },
  {
    id: 'sophie-lambert',
    nameFr: 'M. Sophie Lambert',
    nameEn: 'Sophie Lambert',
    photo: sophieLambert,
    bar: 'Antwerp Bar',
    online: true,
    experienceYears: 15,
    winRate: '96%',
    cases: 420,
    areas: ['family', 'eviction', 'real_estate'],
  },
  {
    id: 'julien-peeters',
    nameFr: 'M. Julien Peeters',
    nameEn: 'Julien Peeters',
    photo: julienPeeters,
    bar: 'Ghent Bar',
    online: true,
    experienceYears: 15,
    winRate: '94%',
    cases: 285,
    areas: ['employment', 'discrimination'],
  },
  {
    id: 'anais-vermeulen',
    nameFr: 'M. Anaïs Vermeulen',
    nameEn: 'Anaïs Vermeulen',
    photo: anaisVermeulen,
    bar: 'Liège Bar',
    online: false,
    experienceYears: 10,
    winRate: '95%',
    cases: 215,
    areas: ['insurance', 'consumer'],
  },
  {
    id: 'thomas-desmet',
    nameFr: 'M. Thomas De Smet',
    nameEn: 'Thomas De Smet',
    photo: thomasDesmet,
    bar: 'Brussels Bar',
    online: true,
    experienceYears: 8,
    winRate: '93%',
    cases: 178,
    areas: ['traffic', 'eviction'],
  },
  {
    id: 'camille-rousseau',
    nameFr: 'M. Camille Rousseau',
    nameEn: 'Camille Rousseau',
    photo: camilleRousseau,
    bar: 'Charleroi Bar',
    online: false,
    experienceYears: 13,
    winRate: '97%',
    cases: 310,
    areas: ['debt', 'consumer', 'family'],
  },
  {
    id: 'emma-bauwens',
    nameFr: 'M. Emma Bauwens',
    nameEn: 'Emma Bauwens',
    photo: emmaBauwens,
    bar: 'Bruges Bar',
    online: true,
    experienceYears: 9,
    winRate: '96%',
    cases: 195,
    areas: ['real_estate', 'eviction'],
  },
  {
    id: 'nathan-martens',
    nameFr: 'M. Nathan Martens',
    nameEn: 'Nathan Martens',
    photo: nathanMartens,
    bar: 'Antwerp Bar',
    online: true,
    experienceYears: 11,
    winRate: '95%',
    cases: 245,
    areas: ['employment', 'discrimination', 'insurance'],
  },
];

// Filter categories + aggregate counts shown inside each pill.
export const filterCategories = [
  { id: 'all',            count: 2047 },
  { id: 'traffic',        count: 412 },
  { id: 'debt',           count: 288 },
  { id: 'consumer',       count: 261 },
  { id: 'family',         count: 194 },
  { id: 'eviction',       count: 182 },
  { id: 'employment',     count: 165 },
  { id: 'insurance',      count: 147 },
  { id: 'discrimination', count: 98 },
  { id: 'real_estate',    count: 87 },
];
