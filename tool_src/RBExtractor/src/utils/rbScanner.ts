/**
 * Beamtime & RB Reference Analysis Engine
 */

export interface RBScanMatch {
  id: string;
  rbNumber: string;          // e.g. "RB1910243"
  rawMatch: string;          // e.g. "RB 1910243" or "RB-1910243"
  category: 'exact_supported' | 'allocation_phrase' | 'facility_citation' | 'general_reference';
  confidence: 'high' | 'medium' | 'low';
  categoryLabel: string;
  isExactUserPhrase: boolean;
  facility: string;
  sectionHint: string;
  pageNumber?: number;
  snippet: {
    before: string;
    target: string;
    after: string;
    fullSentence: string;
  };
}

export interface ScanSummary {
  totalMatches: number;
  uniqueRBCount: number;
  uniqueRBs: string[];
  exactAllocationCount: number;
  allocationPhraseCount: number;
  facilityCitationCount: number;
  generalCount: number;
  hasExactBeamtimeAllocation: boolean;
}

const EXACT_BEAMTIME_REGEX = /supported\s+by\s+(?:the\s+)?beamtime\s+allocation\s+(?:no\.?\s+|number\s+|proposal\s+|code\s+)?RB[- ]?(\d{5,8})/i;
const GENERAL_ALLOCATION_REGEX = /(?:supported\s+by|provision\s+of|allocation\s+of|awarded|access\s+to|beamtime\s+under|proposal\s+(?:no\.?|number|reference)?|allocation\s+(?:no\.?|number|reference)?|beamtime\s+allocation)\s+[^.]{0,70}RB[- ]?(\d{5,8})/i;
const ALLOCATION_KEYWORD_REGEX = /beamtime\s+allocation|beam\s+time\s+allocation|beamtime\s+provision/i;
const ISIS_FACILITY_REGEX = /isis\s+(?:neutron|facility|pulsed|muon)|stfc|rutherford\s+appleton|10\.5286\/edata/i;
const DIAMOND_FACILITY_REGEX = /diamond\s+light\s+source|diamond\s+synchrotron|harwell\s+campus/i;

export function scanTextForRB(
  text: string,
  options: {
    pageNumber?: number;
    strictSevenDigits?: boolean;
    sourceName?: string;
  } = {}
): RBScanMatch[] {
  if (!text || typeof text !== 'string') return [];

  const { pageNumber, strictSevenDigits = false } = options;
  const matches: RBScanMatch[] = [];

  // Match RB numbers: 7 digits or 5-8 digits
  const rbRegex = strictSevenDigits ? /\bRB[- ]?(\d{7})\b/gi : /\bRB[- ]?(\d{5,8})\b/gi;
  let match: RegExpExecArray | null;

  while ((match = rbRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const digits = match[1];
    const canonicalRB = `RB${digits}`;
    const matchStart = match.index;
    const matchEnd = matchStart + rawMatch.length;

    // Surrounding context (180 chars before and after)
    const contextStart = Math.max(0, matchStart - 180);
    const contextEnd = Math.min(text.length, matchEnd + 180);
    const surroundingText = text.substring(contextStart, contextEnd);

    // Sentence boundary detection
    const sentenceStart = Math.max(0, text.lastIndexOf('.', matchStart) + 1);
    let sentenceEnd = text.indexOf('.', matchEnd);
    if (sentenceEnd === -1) sentenceEnd = text.length;
    const fullSentence = text.substring(sentenceStart, sentenceEnd + 1).trim();

    // Context analysis
    const isExactSupported = EXACT_BEAMTIME_REGEX.test(surroundingText) ||
      /supported\s+by\s+beamtime\s+allocation\s+RB/i.test(surroundingText);

    const isAllocationPhrase = isExactSupported ||
      GENERAL_ALLOCATION_REGEX.test(surroundingText) ||
      ALLOCATION_KEYWORD_REGEX.test(surroundingText);

    const hasISIS = ISIS_FACILITY_REGEX.test(surroundingText);
    const hasDiamond = DIAMOND_FACILITY_REGEX.test(surroundingText);
    const isFacilityMention = hasISIS || hasDiamond || /beamline|beamtime|synchrotron|neutron/i.test(surroundingText);

    // Detect section hint
    const precedingText = text.substring(Math.max(0, matchStart - 1000), matchStart).toLowerCase();
    let sectionHint = 'Main Body / Methods';
    if (/acknowledg(e)?ments?|funding|financial\s+support|grant\s+support/.test(precedingText)) {
      sectionHint = 'Acknowledgements & Funding';
    } else if (/references|bibliography|citations|data\s+availability|data\s+track/.test(precedingText)) {
      sectionHint = 'References / Data Availability';
    } else if (/experimental|instrumentation|beamline|diffraction|scattering/.test(precedingText)) {
      sectionHint = 'Experimental & Instrumentation';
    }

    // Facility attribution
    let facility = 'Not Specified';
    if (hasISIS) facility = 'ISIS Neutron and Muon Source (STFC RAL)';
    else if (hasDiamond) facility = 'Diamond Light Source';
    else if (/stfc/i.test(surroundingText)) facility = 'STFC Facility';
    else if (/neutron/i.test(surroundingText)) facility = 'Neutron Facility';
    else if (/synchrotron|x-ray/i.test(surroundingText)) facility = 'Synchrotron Facility';

    // Categorization
    let category: RBScanMatch['category'] = 'general_reference';
    let categoryLabel = 'General RB Reference';
    let confidence: RBScanMatch['confidence'] = 'low';

    if (isExactSupported) {
      category = 'exact_supported';
      categoryLabel = 'Exact Phrase: "supported by beamtime allocation RB#######"';
      confidence = 'high';
    } else if (isAllocationPhrase) {
      category = 'allocation_phrase';
      categoryLabel = 'Beamtime Allocation / Provision Mention';
      confidence = 'high';
    } else if (isFacilityMention || sectionHint === 'Acknowledgements & Funding') {
      category = 'facility_citation';
      categoryLabel = 'Facility & Acknowledgement Reference';
      confidence = 'medium';
    }

    const beforeSnippet = text.substring(contextStart, matchStart).replace(/\s+/g, ' ');
    const afterSnippet = text.substring(matchEnd, contextEnd).replace(/\s+/g, ' ');

    matches.push({
      id: `${canonicalRB}-${matchStart}-${Math.random().toString(36).substring(2, 6)}`,
      rbNumber: canonicalRB,
      rawMatch,
      category,
      categoryLabel,
      confidence,
      isExactUserPhrase: isExactSupported,
      facility,
      sectionHint,
      pageNumber,
      snippet: {
        before: beforeSnippet.length > 0 ? (contextStart > 0 ? '...' : '') + beforeSnippet : '',
        target: rawMatch,
        after: afterSnippet + (contextEnd < text.length ? '...' : ''),
        fullSentence: fullSentence.length > 10 ? fullSentence.replace(/\s+/g, ' ') : surroundingText.replace(/\s+/g, ' '),
      },
    });
  }

  return matches;
}

export function computeScanSummary(matches: RBScanMatch[]): ScanSummary {
  const uniqueRBs = Array.from(new Set(matches.map((m) => m.rbNumber)));
  const exactAllocationCount = matches.filter((m) => m.category === 'exact_supported').length;
  const allocationPhraseCount = matches.filter((m) => m.category === 'allocation_phrase').length;
  const facilityCitationCount = matches.filter((m) => m.category === 'facility_citation').length;
  const generalCount = matches.filter((m) => m.category === 'general_reference').length;

  return {
    totalMatches: matches.length,
    uniqueRBCount: uniqueRBs.length,
    uniqueRBs,
    exactAllocationCount,
    allocationPhraseCount,
    facilityCitationCount,
    generalCount,
    hasExactBeamtimeAllocation: exactAllocationCount > 0 || allocationPhraseCount > 0,
  };
}
