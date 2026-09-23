/**
 * Generates a clean, valid PDF binary blob containing research paper text
 * with ISIS & Diamond beamtime allocations for instant in-browser testing.
 */

export function generateSampleBeamtimePdf(): Blob {
  const content = `%PDF-1.4
%âãÏÓ
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R 4 0 R]
  /Count 2
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 5 0 R
    >>
  >>
  /Contents 6 0 R
>>
endobj
4 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 5 0 R
    >>
  >>
  /Contents 7 0 R
>>
endobj
5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
6 0 obj
<< /Length 472 >>
stream
BT
/F1 16 Tf
50 720 Td
(Neutron Spectroscopy of Quantum Magnets - Page 1) Tj
/F1 11 Tf
0 -30 Td
(Author: Dr. Alex Vance, Prof. Sarah Chen) Tj
0 -20 Td
(Facility: ISIS Pulsed Neutron and Muon Source, STFC RAL) Tj
0 -30 Td
(Abstract:) Tj
0 -18 Td
(High-resolution inelastic neutron scattering was carried out on WISH and MAPS.) Tj
0 -18 Td
(Magnetic excitation spectra reveal spin-wave dispersions up to 45 meV.) Tj
0 -30 Td
(Experimental Section:) Tj
0 -18 Td
(Data collection was performed under proposal RB2010892 on the MAPS spectrometer.) Tj
0 -18 Td
(Low temperature helium-4 cryostats were used between 1.8 K and 100 K.) Tj
ET
endstream
endobj
7 0 obj
<< /Length 528 >>
stream
BT
/F1 16 Tf
50 720 Td
(Acknowledgements and References - Page 2) Tj
/F1 11 Tf
0 -30 Td
(Acknowledgements & Funding:) Tj
0 -20 Td
(We thank the beamline scientists at STFC Rutherford Appleton Laboratory.) Tj
0 -20 Td
(This research was supported by beamtime allocation RB1910243 at the ISIS Facility.) Tj
0 -20 Td
(Additional synchrotron measurements were supported by beamtime allocation RB2108742.) Tj
0 -30 Td
(References:) Tj
0 -18 Td
(1. ISIS Facility Data Track, STFC RAL: RB1910243, doi:10.5286/edata/isis/r/rb1910243) Tj
0 -18 Td
(2. Vance, A. et al. Quantum spin liquids. Phys. Rev. Lett. 128, 047201 (2022)) Tj
ET
endstream
endobj
xref
0 8
0000000000 65535 f 
0000000015 00000 n 
0000000068 00000 n 
0000000133 00000 n 
0000000282 00000 n 
0000000431 00000 n 
0000000508 00000 n 
0000001032 00000 n 
trailer
<<
  /Size 8
  /Root 1 0 R
>>
startxref
1612
%%EOF`;

  return new Blob([content], { type: 'application/pdf' });
}
