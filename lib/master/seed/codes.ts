import type { EntityType } from "../enums";

/**
 * Permanent destination codes (the third segment of IN-UP-VNS) plus the
 * transport-hub codes we are confident about. Codes are minted once here
 * and stored — they are never re-derived from a name or URL later.
 */
export interface DestinationCode {
  code: string;
  airport?: { code: string; name?: string };
  railway?: { code: string };
  entityType?: EntityType;
  destinationType?: string;
}

export const DESTINATION_CODES: Record<string, DestinationCode> = {
  delhi: { code: "DEL", airport: { code: "DEL" }, railway: { code: "NDLS" }, destinationType: "Capital city" },
  agra: { code: "AGR", airport: { code: "AGR" }, railway: { code: "AGC" }, destinationType: "Heritage city" },
  varanasi: { code: "VNS", airport: { code: "VNS" }, railway: { code: "BSB" }, destinationType: "Spiritual & heritage city" },
  prayagraj: { code: "PRG", airport: { code: "IXD" }, railway: { code: "PRYJ" }, destinationType: "Pilgrimage city" },
  lucknow: { code: "LKO", airport: { code: "LKO" }, railway: { code: "LKO" }, destinationType: "Heritage & food city" },
  jaipur: { code: "JAI", airport: { code: "JAI" }, railway: { code: "JP" }, destinationType: "Heritage city" },
  udaipur: { code: "UDR", airport: { code: "UDR" }, railway: { code: "UDZ" }, destinationType: "Lake city" },
  jodhpur: { code: "JDH", airport: { code: "JDH" }, railway: { code: "JU" }, destinationType: "Fort city" },
  goa: { code: "GOA", airport: { code: "GOI" }, railway: { code: "MAO" }, destinationType: "Coastal state & tourism region" },
  mumbai: { code: "BOM", airport: { code: "BOM" }, railway: { code: "CSMT" }, destinationType: "Metropolis" },
  kolkata: { code: "CCU", airport: { code: "CCU" }, railway: { code: "HWH" }, destinationType: "Heritage metropolis" },
  bengaluru: { code: "BLR", airport: { code: "BLR" }, railway: { code: "SBC" }, destinationType: "Metropolis" },
  mysuru: { code: "MYS", airport: { code: "MYQ" }, railway: { code: "MYS" }, destinationType: "Heritage city" },
  chennai: { code: "MAA", airport: { code: "MAA" }, railway: { code: "MAS" }, destinationType: "Metropolis" },
  madurai: { code: "IXM", airport: { code: "IXM" }, railway: { code: "MDU" }, destinationType: "Temple city" },
  hyderabad: { code: "HYD", airport: { code: "HYD" }, railway: { code: "SC" }, destinationType: "Heritage & food metropolis" },
  kochi: { code: "COK", airport: { code: "COK" }, railway: { code: "ERS" }, destinationType: "Port city" },
  ooty: { code: "OOT", airport: { code: "CJB" }, railway: { code: "UAM" }, entityType: "HILL_STATION", destinationType: "Hill station" },
  manali: { code: "MNL", airport: { code: "KUU" }, entityType: "HILL_STATION", destinationType: "Hill station" },
  srinagar: { code: "SXR", airport: { code: "SXR" }, destinationType: "Valley city" },
  rishikesh: { code: "RSK", airport: { code: "DED" }, railway: { code: "RKSH" }, destinationType: "Pilgrimage & adventure town" },
  amritsar: { code: "ATQ", airport: { code: "ATQ" }, railway: { code: "ASR" }, destinationType: "Pilgrimage city" },
  khajuraho: { code: "HJR", airport: { code: "HJR" }, railway: { code: "KURJ" }, destinationType: "Archaeological town" },
  ayodhya: { code: "AYD", airport: { code: "AYJ" }, railway: { code: "AYC" }, destinationType: "Pilgrimage city" },
  darjeeling: { code: "DJL", airport: { code: "IXB" }, railway: { code: "NJP" }, entityType: "HILL_STATION", destinationType: "Hill station" },
  // Level-B destinations (secondary places combined with a major one)
  sarnath: { code: "SRN", destinationType: "Buddhist heritage site" },
  ramnagar: { code: "RMN", destinationType: "Fort town" }
};
