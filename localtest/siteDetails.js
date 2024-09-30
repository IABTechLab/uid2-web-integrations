const sites = [
  {
    name: 'www',
    domain: 'www.uid2-local-dev-setup.com',
  },
  {
    name: 'auth',
    domain: 'auth.uid2-local-dev-setup.com',
  },
];

export const devSites = sites.map((s) => ({ ...s, url: `https://${s.domain}/` }));

export const devDomains = Object.values(devSites).map((s) => s.domain);

export const devSiteMap = Object.fromEntries(devSites.map((s) => [s.name, s]));

export const topLevelDomain = 'uid2-local-dev-setup.com';
