export interface TeamMeta {
  code: string;
  name: string;
  shortName: string;
  primary: string;
  secondary: string;
  flagUrl: string;
}

/**
 * FIFA 3-letter code → ISO 3166-1 alpha-2 (flagcdn.com slug). Covers the 2026 World
 * Cup field plus common nations, so real flags render for the whole live fixture feed.
 */
const FIFA_TO_ISO: Record<string, string> = {
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at', BEL: 'be', BIH: 'ba', BRA: 'br',
  CAN: 'ca', CHI: 'cl', CIV: 'ci', CMR: 'cm', COD: 'cd', COL: 'co', CPV: 'cv',
  CRC: 'cr', CRO: 'hr', CUW: 'cw', CZE: 'cz', DEN: 'dk', ECU: 'ec', EGY: 'eg',
  ENG: 'gb-eng', ESP: 'es', FRA: 'fr', GER: 'de', GHA: 'gh', GRE: 'gr', HAI: 'ht',
  HON: 'hn', IRN: 'ir', IRQ: 'iq', ISL: 'is', ITA: 'it', JAM: 'jm', JOR: 'jo',
  JPN: 'jp', KOR: 'kr', KSA: 'sa', MAR: 'ma', MEX: 'mx', NED: 'nl', NGA: 'ng',
  NOR: 'no', NZL: 'nz', PAN: 'pa', PAR: 'py', PER: 'pe', POL: 'pl', POR: 'pt',
  QAT: 'qa', ROU: 'ro', RSA: 'za', SCO: 'gb-sct', SEN: 'sn', SRB: 'rs', SUI: 'ch',
  SVN: 'si', SWE: 'se', TUN: 'tn', TUR: 'tr', UAE: 'ae', UKR: 'ua', URY: 'uy',
  USA: 'us', UZB: 'uz', VEN: 've', WAL: 'gb-wls',
};

/** Kit colours for the well-known sides (used by the gradient fallback if a flag 404s). */
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  ARG: { primary: '#74ACDF', secondary: '#F6B40E' },
  BRA: { primary: '#009B3A', secondary: '#FFDF00' },
  ENG: { primary: '#FFFFFF', secondary: '#CE1124' },
  ESP: { primary: '#AA151B', secondary: '#F1BF00' },
  FRA: { primary: '#0055A4', secondary: '#EF4135' },
  GER: { primary: '#111111', secondary: '#DD0000' },
  NED: { primary: '#AE1C28', secondary: '#21468B' },
  POR: { primary: '#006600', secondary: '#FF0000' },
  USA: { primary: '#3C3B6E', secondary: '#B22234' },
  MEX: { primary: '#006847', secondary: '#CE1126' },
  CRO: { primary: '#FFFFFF', secondary: '#FF0000' },
  JPN: { primary: '#BC002D', secondary: '#FFFFFF' },
};

const TEAM_NAMES: Record<string, string> = {
  ALG: 'Algeria', ARG: 'Argentina', AUS: 'Australia', AUT: 'Austria', BEL: 'Belgium',
  BIH: 'Bosnia & Herzegovina', BRA: 'Brazil', CAN: 'Canada', CIV: "Côte d'Ivoire",
  CMR: 'Cameroon', COD: 'DR Congo', COL: 'Colombia', CPV: 'Cape Verde', CRO: 'Croatia',
  CUW: 'Curaçao', CZE: 'Czechia', ECU: 'Ecuador', EGY: 'Egypt', ENG: 'England',
  ESP: 'Spain', FRA: 'France', GER: 'Germany', GHA: 'Ghana', HAI: 'Haiti', IRN: 'Iran',
  IRQ: 'Iraq', ITA: 'Italy', JOR: 'Jordan', JPN: 'Japan', KOR: 'Korea Republic',
  KSA: 'Saudi Arabia', MAR: 'Morocco', MEX: 'Mexico', NED: 'Netherlands', NOR: 'Norway',
  NZL: 'New Zealand', PAN: 'Panama', PAR: 'Paraguay', POR: 'Portugal', QAT: 'Qatar',
  RSA: 'South Africa', SCO: 'Scotland', SEN: 'Senegal', SUI: 'Switzerland',
  SWE: 'Sweden', TUN: 'Tunisia', TUR: 'Türkiye', URY: 'Uruguay', USA: 'United States',
  UZB: 'Uzbekistan',
};

export function getTeamMeta(code?: string, name?: string): TeamMeta {
  const normalized = (code || 'TBD').toUpperCase();
  const iso = FIFA_TO_ISO[normalized];
  const colors = TEAM_COLORS[normalized] ?? { primary: '#1C7A47', secondary: '#E7B84F' };
  const displayName = TEAM_NAMES[normalized] ?? name ?? normalized;
  return {
    code: normalized,
    name: displayName,
    shortName: displayName.length > 12 ? normalized : displayName,
    primary: colors.primary,
    secondary: colors.secondary,
    flagUrl: iso ? `https://flagcdn.com/${iso}.svg` : '',
  };
}
