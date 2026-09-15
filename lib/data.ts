import { District, EligibilityStatus, Participant, PersonnelType, Prize, SystemSettings, Winner, RaffleLog } from './types';

const FIRST_NAMES_MALE = [
  'Juan', 'Mark', 'Pedro', 'Jose', 'Christian', 'Angelo', 'Paolo', 'Ronaldo',
  'Anthony', 'Francis', 'Gabriel', 'Michael', 'Jerome', 'Danilo', 'Emmanuel',
  'Dennis', 'Rodel', 'Eduardo', 'Arnel', 'Jeffrey', 'Reynaldo', 'Elmer',
  'Ferdinand', 'Joel', 'Alexander', 'Jonathan', 'Vincent', 'Dexter', 'Melchor',
  'Nestor', 'Richard', 'Marvin', 'Allan', 'Edgardo', 'Benjamin', 'Ramon'
];

const FIRST_NAMES_FEMALE = [
  'Maria', 'Ana', 'Grace', 'Cristina', 'Rowena', 'Lourdes', 'Maricel', 'Elena',
  'Jocelyn', 'Michelle', 'Mary Jane', 'Cherry', 'Sheryl', 'Liezel', 'Rosemarie',
  'Gemma', 'Glenda', 'Josephine', 'Marites', 'Jennifer', 'Aileen', 'Carmela',
  'Rhea', 'Marilou', 'Lorna', 'Evelyn', 'Cynthia', 'Bernadette', 'Arlene',
  'Divina', 'Hazel', 'Janette', 'Rosario', 'Theresa', 'Vilma', 'Victoria'
];

const LAST_NAMES = [
  'Santos', 'Dela Cruz', 'Reyes', 'Garcia', 'Mendoza', 'Flores', 'Gonzales',
  'Bautista', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Torres',
  'Navarro', 'Salazar', 'Mercado', 'De Leon', 'Pascual', 'Manalo', 'Cortez',
  'Soriano', 'Guinto', 'Morales', 'Perez', 'Alcantara', 'Corpuz', 'Tolentino',
  'Mallari', 'Valdez', 'Padilla', 'Ferrer', 'Domingo', 'Abad', 'Enriquez',
  'Del Rosario', 'Aguilar', 'Santiago', 'Cabrera', 'Miranda', 'Legaspi', 'Tan',
  'Lim', 'Marquez', 'Ocampo', 'Espino', 'Sarmiento', 'Gatus', 'Macapagal'
];

const MIDDLE_NAMES = [
  'A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'L.', 'M.', 'N.', 'P.', 'R.', 'S.', 'T.', 'V.'
];

const SCHOOLS_BY_DISTRICT: Record<District, string[]> = {
  NORTH: [
    'Malungon National High School',
    'Malungon Central Elementary School',
    'J.P. Laurel Elementary School',
    'Upper Biangan Elementary School',
    'Nagpan Elementary School',
    'Datal Tampal Integrated School'
  ],
  SOUTH: [
    'Banate National High School',
    'Banate Elementary School',
    'San Miguel Elementary School',
    'Alkikan Elementary School',
    'Datal Batak Elementary School',
    'Kinabalan Integrated School'
  ],
  EAST: [
    'Malandag National High School',
    'Malandag Central Elementary School',
    'Kiblat Elementary School',
    'Panamin Elementary School',
    'Blaan Indigenous Integrated School',
    'Biatoles Elementary School'
  ],
  WEST: [
    'Lutay National High School',
    'Lutay Elementary School',
    'Tamban Elementary School',
    'Kawayan Integrated School',
    'Upper Mainit Elementary School',
    'Amparo Integrated School'
  ],
  PRIVATE: [
    'Malungon Institute',
    'St. Therese Academy of Malungon',
    'Holy Cross Academy of Malungon',
    'Adventist Academy of Malungon',
    "King's Christian Academy Malungon"
  ]
};

const TEACHING_POSITIONS = [
  'Teacher I', 'Teacher II', 'Teacher III', 'Master Teacher I',
  'Master Teacher II', 'Head Teacher I', 'Head Teacher III', 'Special Science Teacher I'
];

const NON_TEACHING_POSITIONS = [
  'Administrative Assistant II', 'Administrative Officer II',
  'School Registrar', 'Guidance Counselor', 'School Nurse',
  'Security Officer', 'Utility Worker', 'Bookkeeper'
];

export function determineParticipantDistrict(params: {
  rawDistrict?: string;
  rawType?: string;
  position?: string;
  school?: string;
}): District {
  const rawDist = (params.rawDistrict || '').toLowerCase().trim();
  const rawType = (params.rawType || '').toLowerCase().trim();
  const pos = (params.position || '').toLowerCase().trim();
  const school = (params.school || '').toLowerCase().trim();

  // 1. PSDS (Public Schools District Supervisor) Routing
  // "for the 2 PSDS: if East & South, include this in raffle to EAST District; if North & West, include this in raffle to NORTH DISTRICT"
  const isPsds =
    rawType.includes('psds') ||
    pos.includes('psds') ||
    pos.includes('district supervisor') ||
    school.includes('psds') ||
    school.includes('district supervisor');

  if (
    isPsds ||
    (rawDist.includes('east') && rawDist.includes('south')) ||
    (rawDist.includes('north') && rawDist.includes('west'))
  ) {
    if (rawDist.includes('east') || rawDist.includes('south')) {
      return 'EAST';
    }
    if (rawDist.includes('north') || rawDist.includes('west')) {
      return 'NORTH';
    }
  }

  // 2. LSB (Local School Board in Type / Position)
  // "Private (ECCD + Private School + LSB) *this LSB is in Type / Position"
  if (
    rawType.includes('lsb') ||
    pos.includes('lsb') ||
    rawType.includes('local school board') ||
    pos.includes('local school board')
  ) {
    return 'PRIVATE';
  }

  // 3. ECCD (Early Childhood Care & Development)
  if (
    rawDist.includes('eccd') ||
    school.includes('eccd') ||
    pos.includes('eccd') ||
    rawType.includes('eccd')
  ) {
    return 'PRIVATE';
  }

  // 4. Private Schools
  if (
    rawDist.includes('private') ||
    school.includes('private') ||
    school.includes('institute') ||
    school.includes('academy')
  ) {
    return 'PRIVATE';
  }

  // 5. Standard DepEd Districts
  if (rawDist.includes('north')) return 'NORTH';
  if (rawDist.includes('east')) return 'EAST';
  if (rawDist.includes('west')) return 'WEST';
  if (rawDist.includes('south')) return 'SOUTH';

  // Fallback checks on school if district is ambiguous
  if (school.includes('north')) return 'NORTH';
  if (school.includes('east')) return 'EAST';
  if (school.includes('west')) return 'WEST';
  if (school.includes('south')) return 'SOUTH';

  return 'SOUTH';
}

export function parseProfilingTSV(
  tsv: string,
  defaultEligibility: EligibilityStatus = 'INELIGIBLE'
): Participant[] {
  const lines = tsv.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const participants: Participant[] = [];
  const startIdx = lines[0].includes('TIMESTAMP') || lines[0].includes('PROFILING ID') ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split('\t');
    if (parts.length < 5) continue;

    const timestamp = parts[0]?.trim() || '';
    const profilingId = parts[1]?.trim() || `T-${i}`;
    const depedId = parts[2]?.trim() || '';
    const rawType = parts[3]?.trim() || 'Teaching';
    const rawDistrict = parts[4]?.trim() || 'South';
    const school = parts[5]?.trim() || 'Malungon School';
    const position = parts[6]?.trim() || 'Teacher';
    const lastName = parts[7]?.trim() || '';
    const firstName = parts[8]?.trim() || '';
    const middleName = parts[9]?.trim() || '';
    const suffix = parts[10]?.trim() || '';
    const sex = parts[11]?.trim() || '';
    const contactNumber = parts[12]?.trim() || '';
    const email = parts[13]?.trim() || '';

    // Classify District using strict criteria:
    // 1. PSDS (East&South -> EAST, North&West -> NORTH)
    // 2. Private (ECCD + Private School + LSB in Type/Position)
    // 3. North, East, West, South
    const district: District = determineParticipantDistrict({
      rawDistrict,
      rawType,
      position,
      school
    });

    const personnelType: PersonnelType =
      rawType.toLowerCase().includes('non') ? 'NON-TEACHING' : 'TEACHING';

    const nameParts = [lastName ? `${lastName},` : '', firstName, middleName, suffix].filter(Boolean);
    const fullName = nameParts.join(' ').trim() || profilingId;

    participants.push({
      id: profilingId,
      depedId,
      timestamp,
      lastName,
      firstName,
      middleName,
      suffix,
      fullName,
      district,
      originalDistrict: rawDistrict,
      personnelType,
      typeOfPersonnel: rawType,
      school,
      position,
      sex,
      contactNumber,
      email,
      eligible: defaultEligibility,
      winner: 'NO',
      claimed: 'NO',
      status: 'ACTIVE',
      createdAt: timestamp || new Date().toISOString()
    });
  }

  return participants;
}


export const INITIAL_PRIZES: Prize[] = [];

export const INITIAL_SETTINGS: SystemSettings = {
  eventName: "Municipal Teachers' Day 2026",
  eventDate: 'October 5, 2026',
  location: 'Malungon Gymnasium, Malungon, Sarangani Province',
  organization: 'Municipality of Malungon & DepEd Malungon Districts',
  allowMultipleWins: false,
  animationDuration: 6, // 6 seconds projector animation
  soundEnabled: true,
  raffleStatus: 'READY',
  gateAccessPin: '2026',
  adminAccessPin: '2026'
};

export const INITIAL_PARTICIPANTS: Participant[] = [];

export const INITIAL_WINNERS: Winner[] = [];

export const INITIAL_LOGS: RaffleLog[] = [];
