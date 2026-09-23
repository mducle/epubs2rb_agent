export interface SampleDoc {
  id: string;
  title: string;
  type: 'doi' | 'text' | 'sample_paper';
  doi?: string;
  description: string;
  expectedRBs: string[];
  expectedPhrase: boolean;
  content?: string;
}

export const SAMPLE_PRESETS: SampleDoc[] = [
  {
    id: 'sample-exact-beamtime-1',
    title: 'Superconductivity in Layered Nickelates (Nature Comm. format)',
    type: 'sample_paper',
    doi: '10.1038/s41467-022-31842-x',
    description: 'Contains explicit "supported by beamtime allocation RB1910243" at ISIS Facility',
    expectedRBs: ['RB1910243', 'RB1920045'],
    expectedPhrase: true,
    content: `Title: Direct observation of magnetic excitations in superconducting infinite-layer nickelates
Authors: H. Zhang, E. M. Smith, L. C. Chapon, J. S. Gardner
Journal: Nature Communications (2022) 13:4182
DOI: 10.1038/s41467-022-31842-x

Abstract:
Inelastic neutron scattering was carried out on high-purity polycrystalline samples of Nd0.8Sr0.2NiO2 using the MAPS and MERLIN spectrometers. We uncover low-energy spin fluctuations with a characteristic gap below Tc = 15 K.

1. Introduction
High-temperature superconductivity in transition metal oxides continues to pose fundamental questions regarding electron-spin coupling. Recent developments at pulsed neutron sources allow resolution of excitation branches up to 350 meV.

2. Experimental Methods
Neutron time-of-flight spectroscopy was performed at the ISIS Neutron and Muon Source (Rutherford Appleton Laboratory, UK). Sample canisters of thin-walled aluminum were measured at base temperatures between 1.5 K and 300 K. Proposal data was logged under ISIS experimental run RB1920045.

3. Results & Discussion
The dynamic structure factor S(Q, omega) reveals dispersive spin-wave modes near Q = 1.2 A^-1. Background subtraction and absolute normalization were conducted using standard vanadium calibration.

Acknowledgements & Funding
The authors thank the instrument scientists at STFC for expert assistance during beamtime. This research was supported by beamtime allocation RB1910243 from the Science and Technology Facilities Council (STFC). Additional funding was provided by EPSRC Grant EP/V012345/1 and the European Research Council (ERC-2020-COG-892110). Beamtime allocation RB1920045 provided essential preliminary characterization on the OSIRIS spectrometer.

References
1. Chapon, L. C. et al. High-resolution powder neutron diffraction. Phys. Rev. B 74, 174414 (2006).
2. ISIS Facility Data Track, STFC Rutherford Appleton Laboratory: RB1910243, https://doi.org/10.5286/edata/isis/r/rb1910243.
3. Smith, E. M. Spin dynamics in nickelate superconductors. J. Phys. Condens. Matter 34, 124001 (2022).`,
  },
  {
    id: 'sample-diamond-synchrotron',
    title: 'In-situ Synchrotron X-ray Diffraction of Solid Electrolytes',
    type: 'sample_paper',
    doi: '10.1021/acs.chemmater.1c02891',
    description: 'Contains Diamond Light Source beamtime allocation phrase under RB2108742',
    expectedRBs: ['RB2108742'],
    expectedPhrase: true,
    content: `Title: Operando Crystallography of Sulfide-Based Solid-State Electrolytes During Galvanostatic Cycling
Authors: Dr. Claire Davies, Dr. Mark R. Sterling, Prof. A. Thorne
Journal: Chemistry of Materials (2021) 33:8920-8931
DOI: 10.1021/acs.chemmater.1c02891

Abstract:
We present high-resolution synchrotron powder diffraction investigations of Li6PS5Cl electrolyte degradation inside all-solid-state lithium batteries under continuous charge-discharge protocols.

Experimental
Measurements were carried out at Diamond Light Source on beamline I11 using a multi-analyzer crystal detector array. Capillary cells were cycled in-situ using a potentiostat integrated into the beamline control software.

Acknowledgements
We acknowledge Diamond Light Source for provision of beamtime under allocation RB2108742 on beamline I11. This study was supported by beamtime allocation RB2108742 and the Faraday Institution (grant number FIRG024). We are grateful to the beamline scientists for beamline maintenance and support.`,
  },
  {
    id: 'sample-isis-datatrack',
    title: 'ISIS Facility Open Data DOI (STFC Rutherford Appleton Laboratory)',
    type: 'doi',
    doi: '10.5286/edata/isis/r/rb1810012',
    description: 'Official STFC ISIS beamtime data archive DOI for proposal RB1810012',
    expectedRBs: ['RB1810012'],
    expectedPhrase: false,
    content: '',
  },
  {
    id: 'sample-multi-allocation',
    title: 'Multi-Facility Investigation with Multiple Beamtimes',
    type: 'sample_paper',
    doi: '10.1103/PhysRevB.104.144405',
    description: 'Multiple proposal references (RB1720341, RB1810055, RB2010189) with mixed phrases',
    expectedRBs: ['RB1720341', 'RB1810055', 'RB2010189'],
    expectedPhrase: true,
    content: `Title: Quantum criticality and field-induced transitions in triangular lattice antiferromagnets
Authors: V. K. Sharma, G. B. Williams, P. Manuel, D. T. Adroja

Acknowledgements
The experiments at the ISIS Pulsed Neutron and Muon Source were supported by beamtime allocation RB1720341 on WISH and allocation RB1810055 on the MARI spectrometer. Complementary synchrotron measurements were carried out under proposal RB2010189 at Diamond Light Source. We acknowledge financial support from the UK Research and Innovation council.`,
  },
];
