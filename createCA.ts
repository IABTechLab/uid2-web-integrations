import { createCA, createCert } from 'mkcert';
import { devDomains } from './localtest/siteDetails';
import fs from 'node:fs/promises';

const domains = devDomains;

const caFolder = './ca/';
const caFile = `${caFolder}ca.crt`;
const caKey = `${caFolder}ca.key`;
const certFile = `${caFolder}cert.crt`;
const certKey = `${caFolder}cert.key`;

const overwriteFileOptions = {
  flag: 'w',
};
const failIfExistsFileOptions = {
  flag: 'wx',
};

const fileExists = async (path) => !!(await fs.stat(path).catch((e) => false));
const getOrCreateCA = async () => {
  if (await fileExists(caFile)) {
    console.log('Found existing CA, loading...');
    return {
      cert: await fs.readFile(caFile, { encoding: 'utf8' }),
      key: await fs.readFile(caKey, { encoding: 'utf8' }),
    };
  } else {
    console.log('Creating new CA...');
    const ca = await createCA({
      organization: 'UID2 local dev CA',
      countryCode: 'AU',
      state: 'NSW',
      locality: 'Sydney',
      validity: 3650,
    });
    await fs.mkdir(caFolder, { recursive: true });
    await fs.writeFile(caFile, ca.cert, failIfExistsFileOptions);
    await fs.writeFile(caKey, ca.key, failIfExistsFileOptions);
    return ca;
  }
};

async function createCerts() {
  const ca = await getOrCreateCA();
  const cert = await createCert({
    ca: { key: ca.key, cert: ca.cert },
    domains,
    validity: 3650,
  });
  await fs.writeFile(certFile, `${cert.cert}${ca.cert}`, overwriteFileOptions);
  await fs.writeFile(certKey, cert.key, overwriteFileOptions);

  console.log('New certificate saved.');
}

createCerts();
