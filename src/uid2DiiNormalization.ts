export function isNormalizedPhone(phone: string): boolean {
  return /^\+[0-9]{10,15}$/.test(phone);
}

const EMAIL_EXTENSION_SYMBOL = "+";
const EMAIL_DOT = ".";
const GMAIL_DOMAIN = "gmail.com";

type EmailParts = {
  address: string;
  domain: string;
};

function splitEmailIntoAddressAndDomain(email: string): EmailParts | undefined {
  const parts = email.split("@");
  if (!parts.length || parts.length !== 2 || parts.some((part) => part === ""))
    return;

  return {
    address: parts[0],
    domain: parts[1],
  };
}

function isGmail(domain: string): boolean {
  return domain === GMAIL_DOMAIN;
}

function dropExtension(
  address: string,
  extensionSymbol: string = EMAIL_EXTENSION_SYMBOL
): string {
  return address.split(extensionSymbol)[0];
}

function normalizeAddressPart(
  address: string,
  shouldRemoveDot: boolean,
  shouldDropExtension: boolean
): string {
  let parsedAddress = address;
  if (shouldRemoveDot) parsedAddress = parsedAddress.replaceAll(EMAIL_DOT, "");
  if (shouldDropExtension) parsedAddress = dropExtension(parsedAddress);
  return parsedAddress;
}

export function normalizeEmail(email: string): string | undefined {
  if (!email || !email.length) return;

  const parsedEmail = email.trim().toLowerCase();
  if (parsedEmail.indexOf(" ") > 0) return;

  const emailParts = splitEmailIntoAddressAndDomain(parsedEmail);
  if (!emailParts) return;

  const { address, domain } = emailParts;

  const emailIsGmail = isGmail(domain);
  const parsedAddress = normalizeAddressPart(
    address,
    emailIsGmail,
    emailIsGmail
  );
  return parsedAddress ? `${parsedAddress}@${domain}` : undefined;
}
