export function isNormalizedPhone(phone: string): boolean {
  return /^\+[0-9]{10,15}$/.test(phone);
}

const EMAIL_EXTENSION_SYMBOL = "+";
const EMAIL_DOT = ".";
const GMAIL_DOMAIN = "gmail.com";

type EmailParts = {
  starting: string;
  domain: string;
};

function splitEmailIntoStartingAndDomain(
  email: string
): EmailParts | undefined {
  const normalizedEmail = email.trim().toLowerCase();

  const parts = normalizedEmail.split("@");
  if (!parts.length || parts.length !== 2) return;
  if (parts.some((part) => part === "")) return;

  return {
    starting: parts[0],
    domain: parts[1],
  };
}

function isGmail(domain: string): boolean {
  return domain === GMAIL_DOMAIN;
}

function dropExtension(
  starting: string,
  extensionSymbol: string = EMAIL_EXTENSION_SYMBOL
): string {
  return starting.split(extensionSymbol)[0];
}

function normalizeStarting(
  starting: string,
  shouldRemoveDot: boolean,
  shouldDropExtension: boolean
): string {
  let parsedStarting = starting.replaceAll(" ", "");
  if (shouldRemoveDot)
    parsedStarting = parsedStarting.replaceAll(EMAIL_DOT, "");
  if (shouldDropExtension) parsedStarting = dropExtension(parsedStarting);
  return parsedStarting;
}

export function normalizeEmail(email: string): string | undefined {
  if (!email || !email.length) return;

  const emailParts = splitEmailIntoStartingAndDomain(email);
  if (!emailParts) return;

  const { starting, domain } = emailParts;

  const emailIsGmail = isGmail(domain);
  const parsedStarting = normalizeStarting(
    starting,
    emailIsGmail,
    emailIsGmail
  );
  return parsedStarting ? `${parsedStarting}@${domain}` : undefined;
}
