const sites = [
  {
    name: 'www',
    domain: 'www.uid2-local-dev-setup.com',
  },
  {
    name: 'auth',
    domain: 'auth.uid2-local-dev-setup.com',
  },
  {
    name: 'thirdparty',
    domain: 'www.unrelated-third-party-test.com',
  },
];

export const port = 443;

export const urlPortSuffix = port === 443 ? '' : `:${port}`;

export const devSites = sites.map((s) => ({ ...s, url: `https://${s.domain}${urlPortSuffix}/` }));

export const devDomains = Object.values(devSites).map((s) => s.domain);

export const devSiteMap = Object.fromEntries(devSites.map((s) => [s.name, s]));

export const topLevelDomain = 'uid2-local-dev-setup.com';
