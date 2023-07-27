enum EmailParsingState {
  Starting,
  SubDomain,
}

export type NormalizedPhone = string;
export type NormalizedEmail = string;

export function isNormalizedPhone(phone: string): phone is NormalizedPhone {
  return /^\+[0-9]{10,15}$/.test(phone);
}

export function normalizeEmail(email: string): NormalizedEmail | undefined {
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
