export type District = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'PRIVATE';

export type PersonnelType = 'TEACHING' | 'NON-TEACHING';

export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE';

export type YesNo = 'YES' | 'NO';

export type PrizeStatus = 'AVAILABLE' | 'EXHAUSTED';

export type ClaimStatus = 'UNCLAIMED' | 'CLAIMED';

export type RaffleRoundStatus = 'CONFIRMED' | 'CANCELLED' | 'REDRAWN';

export type DistributionMode = 'EQUAL_PER_DISTRICT' | 'COMBINED_POOL';

export interface Participant {
  id: string; // PROFILING ID e.g. W-2026-49550
  depedId?: string; // Deped Employee ID
  timestamp?: string; // Form timestamp
  lastName: string;
  firstName: string;
  middleName: string;
  suffix?: string;
  fullName: string;
  district: District;
  originalDistrict?: string; // e.g. 'ECCD', 'Private', 'West', etc.
  personnelType: PersonnelType;
  typeOfPersonnel?: string; // Raw: Teaching, Non-Teaching, School Head, etc.
  school: string;
  position: string;
  sex?: string;
  contactNumber: string;
  email?: string;
  eligible: EligibilityStatus;
  winner: YesNo;
  claimed: YesNo;
  attendedAt?: string;
  attendedBy?: string;
  status: string; // 'ACTIVE'
  createdAt: string;
}

export interface AttendanceRecord {
  id: string; // log id e.g. ATT-0001
  participantId: string;
  depedId?: string;
  name: string;
  district: District;
  school: string;
  position: string;
  scannedAt: string;
  stationId: string;
  scannerOfficer: string;
  method: 'CAMERA_QR' | 'BARCODE_GUN' | 'MANUAL_ENTRY';
}

export interface Prize {
  id: string; // e.g. P001
  name: string;
  description: string;
  unitValue: number;
  quantity: number;
  drawnQuantity: number;
  remainingQuantity: number;
  totalValue: number;
  status: PrizeStatus;
}

export interface Winner {
  winnerId: string; // e.g. WN-0001
  participantId: string;
  depedId?: string;
  contactNumber?: string;
  email?: string;
  sex?: string;
  name: string;
  district: District;
  originalDistrict?: string;
  personnelType: PersonnelType;
  school: string;
  position: string;
  prizeId: string;
  prizeName: string;
  unitValue: number;
  drawNumber: string; // e.g. DRAW-0001
  date: string;
  time: string;
  claimStatus: ClaimStatus;
  claimedAt?: string;
  claimedBy?: string;
  idPresented?: string;
  isProxyClaim?: boolean;
  proxyName?: string;
  proxyRelationship?: string;
  claimNotes?: string;
}

export interface RaffleLog {
  logId: string; // e.g. LOG-0001
  drawNumber: string; // e.g. DRAW-0001
  timestamp: string;
  prizeId: string;
  prizeName: string;
  numberOfWinners: number;
  eligiblePoolSize: number;
  winnerIds: string[]; // participant IDs
  winnerNames: string[];
  status: RaffleRoundStatus;
  admin: string;
  distributionMode?: DistributionMode;
  winnersPerDistrict?: number;
}

export interface SystemSettings {
  eventName: string;
  eventDate: string;
  location: string;
  organization: string;
  allowMultipleWins: boolean;
  animationDuration: number; // in seconds (e.g. 6)
  soundEnabled: boolean;
  raffleStatus: 'READY' | 'DRAWING' | 'COMPLETED';
}

export interface TemporaryDrawResult {
  drawNumber: string;
  prize: Prize;
  winners: Participant[];
  timestamp: string;
  eligiblePoolSize: number;
  distributionMode: DistributionMode;
  winnersPerDistrict?: number;
}
