enum EmailParsingState {
  Starting,
  SubDomain,
}

export function isNormalizedPhone(phone: string): boolean {
  return /^\+[0-9]{10,15}$/.test(phone);
}

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
  return domain === "gmail.com";
}

function normalizeStarting(
  starting: string,
  removeDot: boolean,
  dropExtension: boolean
): string {
  let parsedStarting = starting.replaceAll(" ", "");
  if (removeDot) parsedStarting = parsedStarting.replaceAll(".", "");
  return dropExtension ? parsedStarting.split("+")[0] : parsedStarting;
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
