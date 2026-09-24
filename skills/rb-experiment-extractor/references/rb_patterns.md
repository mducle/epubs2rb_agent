# RB Proposal Experiment Number Syntax & Regex Guide

## Proposal Number Format (RB Numbers)

At the ISIS Pulsed Neutron and Muon Source and Diamond Light Source, scientific beamtime proposals are assigned a unique identifier known as an **RB Number** (standing for *Rutherford Beamtime*).

### Canonical Structure
- **Format**: `RB` followed by 5 to 8 digits, typically 7 digits.
- **Example**: `RB1910243`
  - `19`: Proposal submission round / year indicator (e.g. 2019 round 1).
  - `10243`: Serial proposal number.
- **Common Variations**:
  - `RB1910243` (standard no-space)
  - `RB-1910243` (hyphenated)
  - `RB 1910243` (space-separated)
  - `rb1910243` (lowercase)

## Pattern Classifications

The extractor categorizes detected occurrences into 3 confidence tiers:

### 1. `exact_beamtime_allocation` (Highest Confidence)
Matches the formal UKRI/STFC acknowledgement phrasing:
```regex
supported\s+by\s+(?:the\s+)?beamtime\s+allocation\s+(?:no\.?\s+|number\s+|proposal\s+|code\s+)?RB[- ]?(\d{5,8})
```
Example:
> *"This research was supported by beamtime allocation RB1910243 from the Science and Technology Facilities Council."*

### 2. `general_beamtime_mention` (Medium Confidence)
Matches allocation or proposal references containing keywords like `provision of`, `awarded`, `access to`, `proposal number`:
```regex
(?:supported\s+by|provision\s+of|allocation\s+of|awarded|access\s+to|beamtime\s+under|proposal\s+(?:no\.?|number|reference)?|allocation\s+(?:no\.?|number|reference)?|beamtime\s+allocation)\s+[^.]{0,70}RB[- ]?(\d{5,8})
```
Example:
> *"We acknowledge Diamond Light Source for provision of beamtime under allocation RB2108742 on beamline I11."*

### 3. `rb_number_mention` (Broad Match)
Matches any standalone or citation reference to an RB identifier:
```regex
\bRB[- ]?(\d{7})\b
```
Example:
> *"ISIS Facility Data Track, STFC Rutherford Appleton Laboratory: RB1810012, https://doi.org/10.5286/edata/isis/r/rb1810012"*

## Facility Attribution Rules

- **ISIS Pulsed Neutron and Muon Source**: Matched if surrounding context includes `ISIS`, `neutron`, `muon`, `RAL`, `10.5286/edata`, or instrument names (e.g. `MAPS`, `MERLIN`, `WISH`, `OSIRIS`, `MARI`, `ENGIN-X`, `SXD`, `GEM`).
- **Diamond Light Source**: Matched if surrounding context includes `Diamond Light Source`, `synchrotron`, `beamline I`, `Harwell Campus`.

