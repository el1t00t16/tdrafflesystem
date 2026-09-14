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

    // Map District
    const distLower = rawDistrict.toLowerCase();
    let district: District = 'SOUTH';
    if (distLower.includes('north')) district = 'NORTH';
    else if (distLower.includes('south')) district = 'SOUTH';
    else if (distLower.includes('east')) district = 'EAST';
    else if (distLower.includes('west')) district = 'WEST';
    else if (distLower.includes('private') || distLower.includes('eccd')) district = 'PRIVATE';

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


export const INITIAL_PRIZES: Prize[] = [
  {
    id: 'P001',
    name: '₱500 Cash Prize',
    description: 'Cash incentive envelope for Teachers Day 2026',
    unitValue: 500,
    quantity: 15,
    drawnQuantity: 0,
    remainingQuantity: 15,
    totalValue: 7500,
    status: 'AVAILABLE'
  },
  {
    id: 'P002',
    name: '₱1,000 Cash Prize',
    description: 'Special cash grant envelope for educators',
    unitValue: 1000,
    quantity: 6,
    drawnQuantity: 0,
    remainingQuantity: 6,
    totalValue: 6000,
    status: 'AVAILABLE'
  },
  {
    id: 'P003',
    name: 'Standard Stand Fan',
    description: '16-inch high-velocity oscillating electric stand fan',
    unitValue: 1500,
    quantity: 5,
    drawnQuantity: 0,
    remainingQuantity: 5,
    totalValue: 7500,
    status: 'AVAILABLE'
  },
  {
    id: 'P004',
    name: 'Digital Rice Cooker (1.8L)',
    description: 'Multi-function non-stick electric rice cooker & steamer',
    unitValue: 1800,
    quantity: 4,
    drawnQuantity: 0,
    remainingQuantity: 4,
    totalValue: 7200,
    status: 'AVAILABLE'
  },
  {
    id: 'P005',
    name: '₱2,000 Cash Prize',
    description: 'Executive cash prize for municipal educators',
    unitValue: 2000,
    quantity: 3,
    drawnQuantity: 0,
    remainingQuantity: 3,
    totalValue: 6000,
    status: 'AVAILABLE'
  },
  {
    id: 'P006',
    name: 'Microwave Oven (20L)',
    description: 'Stainless digital countertop microwave oven',
    unitValue: 3600,
    quantity: 2,
    drawnQuantity: 0,
    remainingQuantity: 2,
    totalValue: 7200,
    status: 'AVAILABLE'
  },
  {
    id: 'P007',
    name: '₱5,000 Grand Cash Prize',
    description: 'Grand cash bonanza for Malungon educators',
    unitValue: 5000,
    quantity: 2,
    drawnQuantity: 0,
    remainingQuantity: 2,
    totalValue: 10000,
    status: 'AVAILABLE'
  },
  {
    id: 'P008',
    name: '43" Smart Full HD LED TV',
    description: 'Smart LED TV with Google TV and Dolby Audio',
    unitValue: 14500,
    quantity: 1,
    drawnQuantity: 0,
    remainingQuantity: 1,
    totalValue: 14500,
    status: 'AVAILABLE'
  },
  {
    id: 'P009',
    name: 'Fully Automatic Washing Machine (7.5kg)',
    description: 'Top-load energy-saving inverter washing machine',
    unitValue: 13800,
    quantity: 1,
    drawnQuantity: 0,
    remainingQuantity: 1,
    totalValue: 13800,
    status: 'AVAILABLE'
  },
  {
    id: 'P010',
    name: 'Educator Laptop (Core i5 / 16GB / 512GB SSD)',
    description: 'Teacher digital classroom workstation laptop',
    unitValue: 28500,
    quantity: 1,
    drawnQuantity: 0,
    remainingQuantity: 1,
    totalValue: 28500,
    status: 'AVAILABLE'
  }
];

export const INITIAL_SETTINGS: SystemSettings = {
  eventName: "Municipal Teachers' Day 2026",
  eventDate: 'October 5, 2026',
  location: 'Malungon Gymnasium, Malungon, Sarangani Province',
  organization: 'Municipality of Malungon & DepEd Malungon Districts',
  allowMultipleWins: false,
  animationDuration: 6, // 6 seconds projector animation
  soundEnabled: true,
  raffleStatus: 'READY'
};

export const INITIAL_PARTICIPANTS: Participant[] = parseProfilingTSV(`
9/1/2026 13:51:33\tW-2026-49550\t4928402\tNon-Teaching\tWest\tDatal Bila Integrated School\tAdministrative Officer II\tCATALUÑA\tIAN\tCARBON\t\tMale\t9632641187\tian.cataluna@deped.gov.ph
9/1/2026 13:53:18\tS-2026-03004\t4573979\tTeaching\tSouth\tMalungon Central Elem. School\tTeacher IV\tORDIZ\tRASHEL\tMAURERA\t\tFemale\t9485964855\trashel.ordiz@deped.gov.ph
9/1/2026 13:54:58\tS-2026-92402\t4785275\tTeaching\tSouth\tKawayan Integrated School\tTeacher I\tRUSSEL\tELLEN MAE\tBORJA\t\tFemale\t9603449242\tellenmae.russel@deped.gov.ph
9/1/2026 13:55:47\tE-2026-26145\t4948013\tNon-Teaching\tEast\tDanao Integrated School\tAdministrative Officer II\tMENDOZA\tJEMARIE\tUY\t\tFemale\t9197547275\tjemarie.uy@deped.gov.ph
9/1/2026 13:56:55\tE-2026-58374\t4785264\tTeaching\tEast\tLower Mainit Elementary School\tTeacher I\tPADUA\tCYROSE JANE\tYMBONG\t\tFemale\t9487344663\tcyrosejane.ymbong@deped.gov.ph
9/1/2026 13:57:28\tS-2026-62096\t4747640\tTeaching\tSouth\tMalungon Central Elem. School\tTeacher II\tMANGUERRA\tJIRAH\tRECLA\t\tFemale\t9606301244\tjirah.manguerra@deped.gov.ph
9/1/2026 13:57:57\tE-2026-34623\t\tTeaching\tEast\tKanyugan Elementary School\tTeacher I\tBORON\tARIEL\tLINTUA\t\tMale\t9757813655\tariel.boron@deped.gov.ph
9/1/2026 13:57:59\tS-2026-19614\t6507155\tTeaching\tSouth\tKawayan Integrated School\tMaster Teacher I\tFAYLOGA\tISABELITA\tSANCHEZ\t\tFemale\t9560918379\tisabelita.fayloga001@deped.gov.ph
9/1/2026 14:00:38\tN-2026-29796\t4746647\tSchool Head\tNorth\tOsmeña Elementary School\tTeacher-In-Charge\tSANGUTAN\tAVENER\tS.\t\tMale\t9150821872\tavener.sangutan@deped.gov.ph
9/1/2026 14:01:40\tN-2026-87562\t4264337\tTeaching\tNorth\tOsmeña Elementary School\tMaster Teacher I\tGALLO\tSHARON\tBRED\t\tFemale\t9477660451\tsharon.gallo@deped.gov.ph
9/1/2026 14:03:37\tN-2026-59727\t\tSchool Head\tNorth\tTagaytay Elementary School\tHead Teacher I\tESCANER\tROY\tO\t\tMale\t9485034962\troy.escaner001@deped.gov.ph
9/1/2026 14:05:33\tN-2026-25322\t4455826\tTeaching\tNorth\tTagaytay Elementary School\tTeacher I\tTUKO\tSHERYL\tJABONERO\t\tFemale\t9107444325\tsheryl.tuko@deped.gov.ph
9/1/2026 14:15:37\tP-2026-60553\t\tTeaching\tPrivate\tGoldenstate College of Malungon\tPrivate Teacher / Staff\tMATUGAS\tCHRIZTYL JANE\tPANTORILLA\t\tFemale\t9947335838\tchriztylmatugas@gmail.com
9/1/2026 14:16:08\tP-2026-52594\t\tTeaching\tPrivate\tGoldenstate College of Malungon\tPrivate Teacher / Staff\tILARDE\tCLAIRE\tSORIAL\t\tFemale\t9912935751\tclairesorialilarde@gmail.com
9/1/2026 14:17:46\tP-2026-09798\t\tTeaching\tPrivate\tCCT‑Visions of Hope Christian School\tPrivate Teacher / Staff\tPACHECO\tGEORGIE\t\t\tFemale\t9815062903\tpachecogeorgie77@gmail.com
9/1/2026 19:34:14\tEC-2026-12061\t\tTeaching\tECCD\tTALUS MOLAVE DAYCARE CENTER\tECCD Worker / Staff\tBUENAVISTA\tMYRA\tBACLID\t\tFemale\t9300531709\tkeilynbuenavista5@gmail.com
9/2/2026 10:19:40\tW-2026-03546\t4573723\tTeaching\tWest\tVicente B. Oliverio Sr. ES\tTeacher I\tGAISEN\tRESHELLE\tSIONOSA\t\tFemale\t9978743616\treshelle.sionosa@deped.gov.ph
9/2/2026 10:24:36\tW-2026-62335\t\tTeaching\tWest\tDatal Tampal Elementary School\tTeacher I\tROTEL\tMADONNA\tGERVERO\t\tFemale\t9751476317\tmadonna.rotel001@deped.gov.ph
9/2/2026 10:24:57\tW-2026-70426\t4952890\tNon-Teaching\tWest\tVicente B. Oliverio Sr. ES\tAdministrative Assistant II\tSALAS\tGLACEL BEBS\tARRIETA\t\tFemale\t9926356747\tglacelbebs.salas@deped.gov.ph
9/2/2026 10:26:03\tW-2026-98798\t1008033\tTeaching\tWest\tFK Constantino Elementary School\tMaster Teacher I\tRICHLYN\tVICENTE\tFORIO\t\tFemale\t9108268623\trichlyn.vicente001@deped.gov.ph
9/2/2026 10:30:15\tW-2026-16280\t4927262\tNon-Teaching\tWest\tVicente B. Oliverio Sr. ES\tAdministrative Officer II\tLAPUT\tBELEN\tVARGAS\t\tFemale\t9056243990\tbelen.laput@deped.gov.ph
9/2/2026 10:38:16\tW-2026-10251\t4455495\tTeaching\tWest\tFK Constantino Elementary School\tTeacher I\tBAHAN\tCRYSTAL\tVILLANUEVA\t\tFemale\t9092854051\tcrystal.bahan001@deped.gov.ph
9/2/2026 10:42:08\tW-2026-38574\t4642754\tTeaching\tWest\tLamlifew Integrated School\tMaster Teacher I\tDEJITO\tARIEL\tAMORO\t\tMale\t9059552562\tariel.dejito@deped.gov.ph
9/2/2026 10:49:04\tW-2026-02824\t4930187\tTeaching\tWest\tCamen Wata Bagi National HS\tTeacher I\tLABNAWAN\tDARWIN\tEMPA\t\tMale\t9090697545\tdarwin.labnawan@deped.gov.ph
9/2/2026 11:01:34\tW-2026-78993\t\tNon-Teaching\tWest\tMalandag Central Elem. School SC\tAdministrative Assistant III\tLEOCARIO\tMADELINE\tMOLLEÑO\t\tFemale\t9929314377\tmadeline.leocario@deped.gov.ph
9/2/2026 11:01:35\tW-2026-64495\t4936689\tTeaching\tWest\tLamlifew Integrated School\tTeacher I\tCARIÑO\tCHARMAINE\tDITAN\t\tFemale\t9918137437\tcharmaine.ditan@deped.gov.ph
9/2/2026 11:13:20\tW-2026-93079\t5176838\tTeaching\tWest\tMalandag Central Elem. School SC\tMaster Teacher II\tCABANTUGAN\tLYN\tLINGA\t\tFemale\t9557154122\tlyn.cabantugan@deped.gov.ph
9/2/2026 11:18:45\tW-2026-51762\t4945017\tTeaching\tWest\tMalandag Central Elem. School SC\tTeacher IV\tMOMO\tZEN ROLAND\t\t\tMale\t9761296065\tzenrolandmomo@gmail.com
9/2/2026 11:19:19\tW-2026-40587\t4928564\tTeaching\tWest\tMalandag Central Elem. School SC\tTeacher I\tHARLENE GRACE\tMANILA\tRULA\t\tFemale\t9266946905\tharlenegrace.manila@deped.gov.ph
9/2/2026 11:27:41\tW-2026-28436\t5115696\tSchool Head\tWest\tLamcanal Elementary School\tSchool Principal I\tOBIENA\tMA. RITA TEREZA\tBARCENA\t\tFemale\t9101429116\tmaritatereza.obiena@deped.gov.ph
9/2/2026 12:28:11\tW-2026-08532\t6508436\tSchool Head\tWest\tUpper Lamcanal Elementary School\tHead Teacher I\tPADIOS\tSANNY\tB.\t\tMale\t9518878143\tsanny.padios001@deped.gov.ph
9/2/2026 14:44:02\tW-2026-88833\t6508440\tTeaching\tWest\tLamcanal Elementary School\tTeacher VI\tPANIZAL\tGENELYN\tMALUNES\t\tFemale\t9268163975\tgenelyn.panizal001@deped.gov.ph
9/10/2026 15:10:31\tES-2026-63307\t6508120\tPublic Schools District Supervisor (PSDS)\tEast & South\tDivision Office / PSDS\tPublic Schools District Supervisor (PSDS)\tCABAYLO\tNOLI\tGOMEZ\t\tMale\t9176325691\tnoli.cabaylo001@deped.gov.ph
9/10/2026 15:56:15\tS-2026-98788\t4748335\tSchool Head\tSouth\tUpper Lumabat Integrated School\tSchool Principal I\tSARGADO\tDENNIS\tDARVIN\t\tMale\t9667649512\tdennis.sargado@deped.gov.ph
9/10/2026 16:11:00\tS-2026-92171\t5504280\tSchool Head\tSouth\tSan Roque National School\tSchool Principal II\tMENDOZA\tTEODORA\tBAYATE\t\tFemale\t9464136892\tteodora.mendoza009@depe.gov.ph
9/10/2026 16:22:46\tE-2026-55858\t6508754\tSchool Head\tEast\tTamban Central ES\tSchool Principal I\tMUTIA\tJESIEL\tA.\t\tFemale\t9489514156\tjesiel.mutia@deped.gov.ph
9/10/2026 17:03:56\tE-2026-11480\t6507150\tSchool Head\tEast\tConsolacion Elementary School\tSchool Principal I\tRANIS\tMARY JANE\tROCO\t\tFemale\t9477741704\tmaryjane.ranis@deped.gov.ph
9/10/2026 18:03:06\tS-2026-58392\t1008036\tSchool Head\tSouth\tKityan Elem. School\tSchool Principal I\tFERNANDO\tEDDIE\tSOLOMON\t\tMale\t9396001333\teddie.s.fernando@deped.gov.ph
9/11/2026 12:07:26\tW-2026-39318\t4455552\tSchool Head\tWest\tMalandag Central Elem. School SC\tSchool Principal I\tBEJONA\tJUJOHN\tASTO\t\tMale\t9508057279\tjujohn.bejona@deped.gov.ph
9/11/2026 16:51:31\tEC-2026-24334\t\tSchool Head\tECCD\tECCD\tECCD Worker / Staff\tMAUDE\tANGELA\tL\t\tFemale\t9776782541\tangelamaude88@gmail.com
9/11/2026 18:51:06\tW-2026-06732\t1051202\tTeaching\tWest\tMalandag National High School\tMaster Teacher II\tLAPOT\tCHERRY\tAMOROSO\t\tFemale\t9072885274\tcherry.lapot001@deped.gov.ph
9/11/2026 18:51:11\tW-2026-81593\t4664140\tTeaching\tWest\tMalandag National High School\tMaster Teacher I\tGLORIA\tSHIELA\tDONGALLO\t\tFemale\t9918379923\tshiela.gloria@deped.gov.ph
9/11/2026 19:36:23\tW-2026-79294\t5504645\tTeaching\tWest\tMalandag National High School\tMaster Teacher II\tTANGENTE\tVERLYN\tGARZON\t\tFemale\t9103335344\tverlyn.tangente001@deped.gov.ph
9/11/2026 20:14:44\tW-2026-70731\t6411380\tSchool Head\tWest\tKiblat Elementary School\tSchool Principal I\tSECRETO\tMILAGROS\tBALLARES\t\tFemale\t9171095711\tmilagros.secreto001@deped.gov.ph
`);
export const INITIAL_WINNERS: Winner[] = [
  {
    winnerId: 'WN-0001',
    participantId: 'S-2026-03004',
    depedId: '4573979',
    contactNumber: '9485964855',
    email: 'rashel.ordiz@deped.gov.ph',
    sex: 'Female',
    name: 'ORDIZ, RASHEL MAURERA',
    district: 'SOUTH',
    originalDistrict: 'South',
    personnelType: 'TEACHING',
    school: 'Malungon Central Elem. School',
    position: 'Teacher IV',
    prizeId: 'P006',
    prizeName: 'Smart Electric Kettle',
    unitValue: 1200,
    drawNumber: 'DRAW-0001',
    date: '2026-09-11',
    time: '14:30:00',
    claimStatus: 'UNCLAIMED'
  },
  {
    winnerId: 'WN-0002',
    participantId: 'W-2026-49550',
    depedId: '4928402',
    contactNumber: '9632641187',
    email: 'ian.cataluna@deped.gov.ph',
    sex: 'Male',
    name: 'CATALUÑA, IAN CARBON',
    district: 'WEST',
    originalDistrict: 'West',
    personnelType: 'NON-TEACHING',
    school: 'Datal Bila Integrated School',
    position: 'Administrative Officer II',
    prizeId: 'P005',
    prizeName: 'Heavy Duty Rice Cooker (10 Cups)',
    unitValue: 2800,
    drawNumber: 'DRAW-0001',
    date: '2026-09-11',
    time: '14:32:00',
    claimStatus: 'CLAIMED',
    claimedAt: '2026-09-11 14:45:12',
    claimedBy: 'Malungon Claims Desk - Station 1',
    idPresented: 'DepEd Employee ID',
    claimNotes: 'Unit Serial #RC-2026-0812'
  },
  {
    winnerId: 'WN-0003',
    participantId: 'E-2026-26145',
    depedId: '4948013',
    contactNumber: '9197547275',
    email: 'jemarie.uy@deped.gov.ph',
    sex: 'Female',
    name: 'MENDOZA, JEMARIE UY',
    district: 'EAST',
    originalDistrict: 'East',
    personnelType: 'NON-TEACHING',
    school: 'Danao Integrated School',
    position: 'Administrative Officer II',
    prizeId: 'P007',
    prizeName: 'Electric Stand Fan 16"',
    unitValue: 1800,
    drawNumber: 'DRAW-0002',
    date: '2026-09-11',
    time: '14:40:00',
    claimStatus: 'UNCLAIMED'
  },
  {
    winnerId: 'WN-0004',
    participantId: 'N-2026-87562',
    depedId: '4264337',
    contactNumber: '9477660451',
    email: 'sharon.gallo@deped.gov.ph',
    sex: 'Female',
    name: 'GALLO, SHARON BRED',
    district: 'NORTH',
    originalDistrict: 'North',
    personnelType: 'TEACHING',
    school: 'Osmeña Elementary School',
    position: 'Master Teacher I',
    prizeId: 'P005',
    prizeName: 'Heavy Duty Rice Cooker (10 Cups)',
    unitValue: 2800,
    drawNumber: 'DRAW-0002',
    date: '2026-09-11',
    time: '14:42:00',
    claimStatus: 'CLAIMED',
    claimedAt: '2026-09-11 15:02:40',
    claimedBy: 'Malungon Claims Desk - Station 2',
    idPresented: 'PRC Professional Teacher License',
    isProxyClaim: true,
    proxyName: 'Danilo Gallo',
    proxyRelationship: 'Spouse (with Auth Letter)',
    claimNotes: 'Voucher #V-90812'
  }
];
export const INITIAL_LOGS: RaffleLog[] = [
  {
    logId: 'LOG-0001',
    drawNumber: 'DRAW-0001',
    timestamp: '2026-09-11 14:30:00',
    prizeId: 'P006',
    prizeName: 'Smart Electric Kettle',
    numberOfWinners: 2,
    eligiblePoolSize: 45,
    winnerIds: ['S-2026-03004', 'W-2026-49550'],
    winnerNames: ['ORDIZ, RASHEL MAURERA', 'CATALUÑA, IAN CARBON'],
    status: 'CONFIRMED',
    admin: 'Event Admin',
    distributionMode: 'COMBINED_POOL'
  }
];

