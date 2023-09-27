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
  const parts = email.split("@");
  if (!parts.length || parts.length > 2) return undefined;
  if (parts.some((part) => part === "")) return undefined;
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
  if (!email || !email.length) return undefined;
  const normalizedEmail = email.trim().toLowerCase();
  const emailParts = splitEmailIntoStartingAndDomain(normalizedEmail);
  if (!emailParts) return undefined;

  const { starting, domain } = emailParts;

  return `${normalizeStarting(
    starting,
    isGmail(domain),
    isGmail(domain)
  )}@${domain}`;
}

export function normalizeEmailOld(email: string): string | undefined {
  if (email == undefined || email.length <= 0) {
    return undefined;
  }

  let preSb = "";
  let preSbSpecialized = "";
  let sb = "";
  let wsBuffer = "";

  let parsingState = EmailParsingState.Starting;
  let inExtension = false;

  for (const cGiven of email) {
    let c = cGiven;
    if (cGiven >= "A" && cGiven < "Z") {
      c = String.fromCharCode(c.charCodeAt(0) + 32);
    }

    switch (parsingState) {
      case EmailParsingState.Starting:
        if (c == " ") {
          break;
        }
        if (c == "@") {
          parsingState = EmailParsingState.SubDomain;
        } else if (c == ".") {
          preSb += c;
        } else if (c == "+") {
          preSb += c;
          inExtension = true;
        } else {
          preSb += c;
          if (!inExtension) {
            preSbSpecialized += c;
          }
        }
        break;
      case EmailParsingState.SubDomain:
        if (c == "@") {
          return undefined;
        } else if (c == " ") {
          wsBuffer += c;
          break;
        } else if (wsBuffer.length > 0) {
          sb += wsBuffer;
          wsBuffer = "";
        }
        sb += c;
    }
  }

  if (sb.length == 0) {
    return undefined;
  }

  let domainPart = sb;
  const GMAILDOMAIN = "gmail.com";

  let addressPartToUse = domainPart == GMAILDOMAIN ? preSbSpecialized : preSb;
  if (addressPartToUse.length == 0) {
    return undefined;
  }

  return addressPartToUse + "@" + domainPart;
}
