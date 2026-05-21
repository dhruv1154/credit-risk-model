export interface Applicant {
  loan_amnt: number;
  term: 36 | 60;
  int_rate: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  emp_length: number; // 0 to 10 years
  home_ownership: 'MORTGAGE' | 'OWN' | 'RENT';
  annual_inc: number;
  verification_status: 'Not Verified' | 'Source Verified' | 'Verified';
  purpose: 'credit_card' | 'debt_consolidation' | 'home_improvement' | 'major_purchase' | 'small_business' | 'other';
  dti: number; // Debt to Income %
  inq_last_6mths: number;
  revol_util: number; // %
  mort_acc: number;
  pub_rec_bankruptcies: number;
}

export interface ModelPrediction {
  probabilityOfPaid: number; // Target = 1
  probabilityOfDefault: number; // Target = 0
  score: number; // Credit score (scaled e.g. 300 to 850)
  rating: string; // e.g. AAA, AA, A, B, C, Default
}

export interface BinInfo {
  category: string;
  count: number;
  good: number;
  bad: number;
  badRate: number;
  woe: number;
  iv: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface CoefficientInfo {
  feature: string;
  coefficient: number;
  meaning: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}
