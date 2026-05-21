import { useState, useEffect, useMemo } from 'react';
import { Applicant, ModelPrediction } from '../types';
import { calculateLogisticModel, calculateDecisionTreeModel, calculateXGBoostModel } from '../modelsData';
import { Activity, AlertTriangle, ShieldCheck, Sparkles, Calculator, Gauge, FileText, Plus, Trash2, Printer, Download, TrendingUp, HelpCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const PRESETS = {
  prime: {
    label: '🏆 Prime Homeowner (Very Low)',
    config: {
      loan_amnt: 15000,
      term: 36,
      int_rate: 6.5,
      grade: 'A',
      emp_length: 8,
      home_ownership: 'MORTGAGE',
      annual_inc: 120000,
      verification_status: 'Not Verified',
      purpose: 'credit_card',
      dti: 9.5,
      inq_last_6mths: 0,
      revol_util: 12,
      mort_acc: 3,
      pub_rec_bankruptcies: 0,
    }
  },
  subprime: {
    label: '⚠️ Subprime Debt Consolidator (Medium)',
    config: {
      loan_amnt: 22000,
      term: 60,
      int_rate: 16.2,
      grade: 'D',
      emp_length: 3,
      home_ownership: 'RENT',
      annual_inc: 52000,
      verification_status: 'Source Verified',
      purpose: 'debt_consolidation',
      dti: 24.5,
      inq_last_6mths: 2,
      revol_util: 78,
      mort_acc: 0,
      pub_rec_bankruptcies: 0,
    }
  },
  severe: {
    label: '🚨 Small Business (Extreme Risk)',
    config: {
      loan_amnt: 35000,
      term: 60,
      int_rate: 24.8,
      grade: 'F',
      emp_length: 1,
      home_ownership: 'RENT',
      annual_inc: 32000,
      verification_status: 'Verified',
      purpose: 'small_business',
      dti: 36.8,
      inq_last_6mths: 5,
      revol_util: 95,
      mort_acc: 0,
      pub_rec_bankruptcies: 1,
    }
  }
};

const BOUNDS = {
  annual_inc: { min: 10000, max: 1000000, label: 'Annual Income', prefix: '$' },
  loan_amnt: { min: 1000, max: 40000, label: 'Loan Size', prefix: '$' },
  dti: { min: 0, max: 50, label: 'DTI Ratio', suffix: '%' },
  revol_util: { min: 0, max: 120, label: 'Revolving Utilization', suffix: '%' },
  int_rate: { min: 5.0, max: 30.0, label: 'Interest Rate', suffix: '%' },
  inq_last_6mths: { min: 0, max: 10, label: 'Hard Inquiries', isInt: true },
  mort_acc: { min: 0, max: 10, label: 'Mortgage Accounts', isInt: true },
};

interface CreditScorecardSandboxProps {
  currency: 'INR' | 'USD' | 'EUR';
  setCurrency: (c: 'INR' | 'USD' | 'EUR') => void;
}

export default function CreditScorecardSandbox({ currency = 'INR', setCurrency }: CreditScorecardSandboxProps) {
  const [stressScenario, setStressScenario] = useState<'baseline' | 'recession' | 'inflation'>('baseline');

  const [app, setApp] = useState<Applicant>({
    loan_amnt: 15000,
    term: 36,
    int_rate: 11.5,
    grade: 'B',
    emp_length: 5,
    home_ownership: 'MORTGAGE',
    annual_inc: 75000,
    verification_status: 'Source Verified',
    purpose: 'debt_consolidation',
    dti: 17.5,
    inq_last_6mths: 1,
    revol_util: 45,
    mort_acc: 1,
    pub_rec_bankruptcies: 0,
  });

  const [rawInputs, setRawInputs] = useState({
    annual_inc: '6225000', // Initialize loaded converted to INR (default) - 75k income is 6225000 INR
    loan_amnt: '1245000',  // Initialize loaded converted to INR (default) - 15k loan size is 1245000 INR
    dti: '17.5',
    revol_util: '45',
    int_rate: '11.5',
    inq_last_6mths: '1',
    mort_acc: '1',
  });

  // Calculate rate and symbol based on selected currency
  const rate = currency === 'INR' ? 83 : currency === 'EUR' ? 0.92 : 1;
  const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$';

  // Initialize raw inputs on mount or whenever app/currency changes internally
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    const rate = currency === 'INR' ? 83 : currency === 'EUR' ? 0.92 : 1;
    setRawInputs({
      annual_inc: String(Math.round(app.annual_inc * rate)),
      loan_amnt: String(Math.round(app.loan_amnt * rate)),
      dti: String(app.dti),
      revol_util: String(app.revol_util),
      int_rate: String(app.int_rate),
      inq_last_6mths: String(app.inq_last_6mths),
      mort_acc: String(app.mort_acc),
    });
    setIsInitialized(true);
  }, [currency]);

  const [decisionVisible, setDecisionVisible] = useState(false);
  const [voluntaryPrepayment, setVoluntaryPrepayment] = useState<number>(0);

  const [lrResult, setLrResult] = useState<ModelPrediction | null>(null);
  const [dtResult, setDtResult] = useState<{ path: string[]; probPaid: number; probDefault: number; score: number; rating: string } | null>(null);
  const [xgbResult, setXgbResult] = useState<ModelPrediction | null>(null);

  const [justAddedNote, setJustAddedNote] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [portfolioLedger, setPortfolioLedger] = useState<Array<{
    id: string;
    alias: string;
    loan_amnt: number;
    grade: string;
    int_rate: number;
    pd: number;
    score: number;
    decision: 'APPROVED' | 'DENIED';
    currency: 'INR' | 'USD' | 'EUR';
  }>>([
    { id: 'NOTE-101', alias: 'Simulated Note #A-309', loan_amnt: 10000, grade: 'A', int_rate: 6.5, pd: 0.021, score: 712, decision: 'APPROVED', currency: 'USD' },
    { id: 'NOTE-102', alias: 'Simulated Note #D-457', loan_amnt: 18000, grade: 'D', int_rate: 15.8, pd: 0.185, score: 588, decision: 'APPROVED', currency: 'USD' },
    { id: 'NOTE-103', alias: 'Simulated Note #B-883', loan_amnt: 12000, grade: 'B', int_rate: 11.2, pd: 0.082, score: 651, decision: 'APPROVED', currency: 'USD' },
  ]);

  const addToPortfolioLedger = () => {
    if (Object.keys(errors).length > 0) return;
    const isApproved = (lrResult?.score || 300) >= 580;
    const noteId = 'NOTE-' + Math.floor(100 + Math.random() * 900);
    const alias = `Simulated Note #${app.grade}-${Math.floor(100 + Math.random() * 899)}`;
    
    setPortfolioLedger(prev => [
      ...prev,
      {
        id: noteId,
        alias: alias,
        loan_amnt: app.loan_amnt, // base in USD
        grade: app.grade,
        int_rate: app.int_rate,
        pd: lrResult?.probabilityOfDefault || 0.1,
        score: lrResult?.score || 600,
        decision: isApproved ? 'APPROVED' : 'DENIED',
        currency: currency,
      }
    ]);

    setJustAddedNote(true);
    setToastMessage(`SUCCESS: Application logged as active asset (${alias}) to P2P Investment Ledger at the bottom of the dashboard!`);
    
    setTimeout(() => {
      setJustAddedNote(false);
    }, 1800);

    // Auto-dismiss toast after 6 seconds
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const removeFromPortfolioLedger = (id: string) => {
    setPortfolioLedger(prev => prev.filter(item => item.id !== id));
  };

  const portfolioStats = useMemo(() => {
    if (portfolioLedger.length === 0) {
      return { totalVolume: 0, weightedPD: 0, weightedYield: 0, netExpectedReturn: 0 };
    }
    let totalVolUsd = 0;
    let weightedPdSum = 0;
    let weightedYieldSum = 0;

    portfolioLedger.forEach(item => {
      totalVolUsd += item.loan_amnt;
      weightedPdSum += item.pd * item.loan_amnt;
      weightedYieldSum += (item.int_rate / 100) * item.loan_amnt;
    });

    const wPd = totalVolUsd > 0 ? (weightedPdSum / totalVolUsd) : 0;
    const wYield = totalVolUsd > 0 ? (weightedYieldSum / totalVolUsd) : 0;
    const netReturn = wYield - wPd;

    return {
      totalVolume: totalVolUsd, 
      weightedPD: wPd * 100, 
      weightedYield: wYield * 100, 
      netExpectedReturn: Math.max(-100, netReturn * 100)
    };
  }, [portfolioLedger]);

  const getDynamicAdverseActions = () => {
    const reasons: string[] = [];
    if (app.dti > 20) {
      reasons.push(`High Debt-to-Income: Outflow ratio is ${app.dti}% exceeding credit policy reference (<20.0%).`);
    }
    if (app.revol_util > 50) {
      reasons.push(`High Revolving Utilization: Current card utilization is ${Math.round(app.revol_util)}% exceeding target constraints (<50.0%).`);
    }
    if (app.inq_last_6mths >= 2) {
      reasons.push(`Credit-Seeking Behavior: Past 6M hard inquiries is ${app.inq_last_6mths} indicating intensive reliance on near-term financing.`);
    }
    if (app.annual_inc < 45000) {
      reasons.push(`Vulnerable Income Layer: Annual income of ${symbol}${Math.round(app.annual_inc * rate).toLocaleString()} restricts underwriting tiers.`);
    }
    if (app.mort_acc < 1) {
      reasons.push(`Limited Diversified Secure Tradelines: Absence of seasoned home mortgage records.`);
    }
    if (reasons.length === 0) {
      reasons.push('Leverage standing remains fully supportive with zero policy overrides.');
      reasons.push('Model factors satisfy prime target guidelines.');
    }
    return reasons;
  };

  const getImprovementElasticity = () => {
    const actions: Array<{ title: string; scoreGap: string; metricGap: string; text: string }> = [];
    if (app.revol_util > 30) {
      actions.push({
        title: 'Pay Card Debt Below 30%',
        scoreGap: '+35-45 PTS',
        metricGap: 'PD -6.8%',
        text: `Target utilization under 30% by paying down revolving balances.`
      });
    }
    if (app.dti > 15) {
      actions.push({
        title: 'Optimize Monthly Non-Mortgage Debt',
        scoreGap: '+20-30 PTS',
        metricGap: 'PD -4.2%',
        text: `Lowering non-mortgage outflows from ${app.dti}% to 15.0% secures scoring metrics.`
      });
    }
    if (app.inq_last_6mths > 0) {
      actions.push({
        title: 'Restrict Hard Inquiries for 120 Days',
        scoreGap: '+15 PTS',
        metricGap: 'PD -2.5%',
        text: 'Allowing credit requests to age past 4 months recovers baseline levels.'
      });
    }
    if (app.loan_amnt > 12000) {
      const reducedAmount = Math.max(1000, Math.round(app.loan_amnt * 0.8));
      actions.push({
        title: 'Request a 20% Smaller Loan Balance',
        scoreGap: '+18 PTS',
        metricGap: 'PD -3.1%',
        text: `Reducing requested principal to ${symbol}${Math.round(reducedAmount * rate).toLocaleString()} reduces default risk.`
      });
    }
    if (actions.length === 0) {
      actions.push({
        title: 'Maintain Active Tradelines',
        scoreGap: 'MAX OPTIMIZED',
        metricGap: 'Stable PD',
        text: 'All scorecard parameters are positioned in prime clusters.'
      });
    }
    return actions;
  };

  const downloadHtmlDossier = () => {
    const P = app.loan_amnt * rate;
    const r = (app.int_rate / 100) / 12;
    const n = app.term;
    const emiVal = r > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / n;

    // Standard schedule
    let stdBal = P;
    let standardTotalInterest = 0;
    for (let month = 1; month <= n; month++) {
      if (stdBal <= 0) break;
      const interest = Math.max(0, stdBal * r);
      const pr = Math.min(stdBal, emiVal - interest);
      stdBal = Math.max(0, stdBal - pr);
      standardTotalInterest += interest;
    }

    // Prepaid schedule
    let prepBal = P;
    let prepaidTotalInterest = 0;
    const prepaidSchedule = [];
    
    for (let month = 1; month <= 360; month++) {
      if (prepBal <= 0.01) break;
      const startingBalance = prepBal;
      const interestPaid = Math.max(0, startingBalance * r);
      const normalPaymentAmount = Math.min(startingBalance + interestPaid, emiVal);
      const regularPrincipalPaid = Math.max(0, normalPaymentAmount - interestPaid);
      
      const maxPrepaymentAllowed = Math.max(0, startingBalance - regularPrincipalPaid);
      const prepaidApplied = Math.min(maxPrepaymentAllowed, voluntaryPrepayment);
      
      const totalPrincipal = regularPrincipalPaid + prepaidApplied;
      const endingBalance = Math.max(0, startingBalance - totalPrincipal);
      
      prepaidSchedule.push({
        paymentNumber: month,
        startingBalance,
        interestPaid,
        principalPaid: totalPrincipal,
        voluntaryPrepaymentApplied: prepaidApplied,
        endingBalance
      });
      
      prepaidTotalInterest += interestPaid;
      prepBal = endingBalance;
    }

    const actualTerm = prepaidSchedule.length;
    const monthsSaved = Math.max(0, n - actualTerm);
    const interestSaved = Math.max(0, standardTotalInterest - prepaidTotalInterest);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Underwriting Compliance Memorandum - LendingClub Case Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #141414;
      line-height: 1.5;
      padding: 30px;
      max-width: 850px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .memo-container {
      border: 3px solid #141414;
      padding: 35px;
      background-color: #ffffff;
    }
    .header-banner {
      border-bottom: 5px solid #141414;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .classification {
      display: inline-block;
      font-family: monospace;
      font-weight: bold;
      font-size: 10px;
      background-color: #141414;
      color: #ffffff;
      padding: 4px 10px;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      margin-bottom: 12px;
    }
    h1 {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 28px;
      margin: 0;
      color: #000000;
      font-weight: 900;
    }
    .subtitle {
      font-family: monospace;
      font-size: 9px;
      color: #555;
      text-transform: uppercase;
      margin-top: 6px;
      letter-spacing: 1.5px;
      font-weight: bold;
    }
    .memo-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      font-family: monospace;
      font-size: 11px;
      border-top: 1px dashed #ccc;
      border-bottom: 1px dashed #ccc;
      padding: 15px 0;
      margin-top: 20px;
    }
    h2 {
      font-family: monospace;
      font-size: 12px;
      text-transform: uppercase;
      border-bottom: 2px solid #141414;
      padding-bottom: 5px;
      margin-top: 35px;
      margin-bottom: 15px;
      letter-spacing: 1px;
      font-weight: bold;
    }
    .param-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      background-color: #fcfcfc;
      border: 1px solid #141414;
      padding: 18px;
      margin-bottom: 20px;
    }
    .param-card {
      font-family: monospace;
    }
    .param-label {
      font-size: 9px;
      color: #777;
      display: block;
      text-transform: uppercase;
      font-weight: bold;
    }
    .param-value {
      font-size: 15px;
      font-weight: bold;
      color: #000;
      margin-top: 3px;
    }
    .model-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      font-family: monospace;
    }
    .model-card {
      border: 1px solid #ccc;
      padding: 15px;
      background: #fafafa;
    }
    .model-title {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      font-weight: bold;
    }
    .model-score {
      font-size: 18px;
      font-weight: bold;
      margin: 6px 0 3px 0;
      color: #000;
    }
    .model-desc {
      font-size: 10px;
      color: #444;
    }
    .action-list {
      list-style-type: none;
      padding: 0;
      margin: 0;
    }
    .action-item {
      font-family: monospace;
      font-size: 11px;
      background-color: #fdfdfd;
      border: 1px solid #ddd;
      padding: 12px;
      margin-bottom: 10px;
    }
    .action-num {
      font-weight: bold;
      margin-right: 6px;
      color: #141414;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      font-family: monospace;
      font-size: 10.5px;
      margin-top: 15px;
    }
    .schedule-table th, .schedule-table td {
      border: 1px solid #141414;
      padding: 8px 10px;
    }
    .schedule-table th {
      background-color: #ebe9e4;
      font-weight: bold;
      text-align: right;
    }
    .schedule-table th.center, .schedule-table td.center {
      text-align: center;
    }
    .schedule-table td {
      text-align: right;
    }
    .legal-footer {
      font-family: monospace;
      font-size: 10px;
      color: #555;
      text-align: justify;
      border-top: 1px solid #ccc;
      padding-top: 15px;
      margin-top: 40px;
    }
    .footer-signs {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      font-size: 9px;
    }
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      .no-print {
        display: none;
      }
    }
    .alert-banner {
      background-color: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 15px;
      margin-bottom: 25px;
      font-size: 12px;
      border-radius: 0px;
      font-family: monospace;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="alert-banner no-print">
    [SYSTEM DETECTED SECURE EXPORT MODE]<br/>
    DIRECTIONS: A browser print dialogue was automatically initialized. If blocked, tap <strong>Ctrl + P</strong> (Windows) or <strong>Cmd + P</strong> (Mac) inside this browser window to immediately save this compliance audit memo to an official, pixel-perfect PDF file.
  </div>

  <div class="memo-container">
    <div class="header-banner">
      <span class="classification">INTERNAL AUDIT RECORD &bull; ECOA HIGH PRIORITY</span>
      <h1>Underwriting Compliance Memorandum</h1>
      <div class="subtitle">LENDINGCLUB RISK CONTROL MANAGEMENT &bull; ECOA TITLE VI PROTOCOL</div>
    </div>

    <div class="memo-meta">
      <div>
        <p><strong>TO:</strong> Bank Solvency & Credit Risk Committee</p>
        <p><strong>FROM:</strong> Principal Credit Officer (dhruvtickoo21@gmail.com)</p>
      </div>
      <div>
        <p><strong>DATE:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>REF:</strong> REF-MEMO-DOSSIER-#${Math.floor(10000 + Math.random() * 89999)}</p>
      </div>
    </div>

    <h2>I. Executive Application Parameters</h2>
    <div class="param-grid">
      <div class="param-card">
        <span class="param-label">Loan Size Principal</span>
        <div class="param-value">${symbol}${Math.round(app.loan_amnt * rate).toLocaleString()}</div>
      </div>
      <div class="param-card">
        <span class="param-label">Annual Income Baseline</span>
        <div class="param-value">${symbol}${Math.round(app.annual_inc * rate).toLocaleString()}</div>
      </div>
      <div class="param-card">
        <span class="param-label">DTI Outflow Ratio</span>
        <div class="param-value">${app.dti}%</div>
      </div>
      <div class="param-card">
        <span class="param-label">Interest Yield (APR)</span>
        <div class="param-value">${app.int_rate}%</div>
      </div>
      <div class="param-card">
        <span class="param-label">Structured Risk grade</span>
        <div class="param-value">GRADE ${app.grade}</div>
      </div>
      <div class="param-card">
        <span class="param-label">Loan Tenure Duration</span>
        <div class="param-value">${app.term} Months</div>
      </div>
    </div>

    <h2>II. Multi-Model Scoring Metrics & Loss Ratios</h2>
    <div class="model-grid">
      <div class="model-card">
        <div class="model-title">Logistic Scorecard Model</div>
        <div class="model-score">${lrResult?.score || 300} POINTS</div>
        <div class="model-desc">PD Index: ${(lrResult?.probabilityOfDefault || 0.1 * 100).toFixed(2)}%</div>
      </div>
      <div class="model-card">
        <div class="model-title">XGBoost Ensemble</div>
        <div class="model-score">${(xgbResult?.probabilityOfPaid || 0.9 * 100).toFixed(1)}% PAID</div>
        <div class="model-desc">Hazard Ratio: ${xgbResult ? (xgbResult.probabilityOfPaid / xgbResult.probabilityOfDefault).toFixed(1) : '0'}:1</div>
      </div>
      <div class="model-card">
        <div class="model-title">Decision Tree Classifier</div>
        <div class="model-score">${dtResult?.rating || 'D-F'} TIER</div>
        <div class="model-desc font-bold">Prob Paid: ${(dtResult?.probPaid || 0 * 100).toFixed(1)}%</div>
      </div>
    </div>

    <h2>III. Regulation B Adverse Action Indicators</h2>
    <ul class="action-list">
      ${getDynamicAdverseActions().map((reason, i) => `
        <li class="action-item">
          <span class="action-num">[REASON ${i + 1}]</span>
          <span>${reason}</span>
        </li>
      `).join('')}
    </ul>

    <h2>IV. Accelerated Amortization Summary (Prepayment Modeling)</h2>
    <div style="font-family: monospace; font-size: 11px; margin-bottom: 20px; background-color: #fafbfc; padding: 15px; border: 1px solid #141414;">
      <p><strong>Baseline Structured Repayments:</strong> ${app.term} Months</p>
      <p><strong>Discretionary Recurring Prepayment:</strong> ${symbol}${Math.round(voluntaryPrepayment).toLocaleString()} / period</p>
      <p><strong>Accelerated Adjusted Repayments:</strong> ${actualTerm} Months</p>
      <p><strong>Direct Term Reduction:</strong> <span style="color:#047857; font-weight:bold;">Saved ${monthsSaved} Months</span></p>
      <p><strong>Systemic Interest Savings:</strong> <span style="color:#047857; font-weight:bold;">${symbol}${Math.round(interestSaved).toLocaleString()}</span></p>
    </div>

    <h2>V. Periodic Amortization Audit Log (Full Sample Series)</h2>
    <table class="schedule-table">
      <thead>
        <tr>
          <th class="center" style="width: 10%;">PMT #</th>
          <th>Starting Bal.</th>
          <th>Interest Paid</th>
          <th>Principal Paid</th>
          <th>Prepayment Applied</th>
          <th>Ending Balance</th>
        </tr>
      </thead>
      <tbody>
        ${prepaidSchedule.map(row => `
          <tr>
            <td class="center">#${row.paymentNumber}</td>
            <td>${symbol}${Math.round(row.startingBalance).toLocaleString()}</td>
            <td>${symbol}${Math.round(row.interestPaid).toLocaleString()}</td>
            <td>${symbol}${Math.round(row.principalPaid).toLocaleString()}</td>
            <td style="color: ${row.voluntaryPrepaymentApplied > 0 ? '#10b981' : '#141414'}; font-weight: ${row.voluntaryPrepaymentApplied > 0 ? 'bold' : 'normal'}">${row.voluntaryPrepaymentApplied > 0 ? symbol + Math.round(row.voluntaryPrepaymentApplied).toLocaleString() : '-'}</td>
            <td style="font-weight: bold; background-color: #fcfcfc;">${symbol}${Math.round(row.endingBalance).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="legal-footer">
      <p>
        This compliance audit memorandum serves as formal documentation of LendingClub solvency guidelines in relation to the applicant risk portfolio. Scoring algorithms operate under strict alignment with Title VII consumer standards and the Basel Accords.
      </p>
      <div class="footer-signs">
        <div>
          <span>MEMO INTEGRITY TRACKING ID</span><br/>
          <strong>CORE-HASH: B90-FICO-SECURE-${Math.floor(100000 + Math.random() * 899999)}</strong>
        </div>
        <div style="text-align: right;">
          <span>VERIFICATION OFFICE COGNIZANCE</span><br/>
          <strong style="text-decoration: underline; text-transform: uppercase;">LendingClub Risk Compliance Office</strong>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Underwriting_Compliance_Memo_Grade_${app.grade}_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Sensitivity Analysis & Dossier Memo States
  const [sensitivityVar, setSensitivityVar] = useState<'annual_inc' | 'loan_amnt' | 'dti' | 'revol_util' | 'int_rate'>('dti');
  const [sensitivityMetric, setSensitivityMetric] = useState<'score' | 'pd'>('score');
  const [dossierVisible, setDossierVisible] = useState(false);

  const sensitivityData = useMemo(() => {
    const bound = BOUNDS[sensitivityVar] || BOUNDS.dti;
    const min = bound.min;
    const max = bound.max;
    const steps = 11;
    const data = [];

    const currencyRate = currency === 'INR' ? 83 : currency === 'EUR' ? 0.92 : 1;

    for (let i = 0; i < steps; i++) {
      const val = min + (i * (max - min)) / (steps - 1);
      const testApp = {
        ...app,
        [sensitivityVar]: val
      };

      const res = calculateLogisticModel(testApp);
      
      const displayedVal = (sensitivityVar === 'loan_amnt' || sensitivityVar === 'annual_inc')
        ? Math.round(val * currencyRate)
        : Number(val.toFixed(1));

      data.push({
        xValue: displayedVal,
        score: Math.round(res.score),
        pd: Number((res.probabilityOfDefault * 100).toFixed(2)),
      });
    }
    return data;
  }, [app, sensitivityVar, currency]);

  // Dynamic Bounds based on selected currency
  const dynamicBounds = useMemo(() => {
    const rate = currency === 'INR' ? 83 : currency === 'EUR' ? 0.92 : 1;
    const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$';
    return {
      annual_inc: { min: 10000 * rate, max: 1000000 * rate, label: 'Annual Income', prefix: symbol },
      loan_amnt: { min: 1000 * rate, max: 40000 * rate, label: 'Loan Size', prefix: symbol },
      dti: { min: 0, max: 50, label: 'DTI Ratio', suffix: '%' },
      revol_util: { min: 0, max: 120, label: 'Revolving Utilization', suffix: '%' },
      int_rate: { min: 5.0, max: 30.0, label: 'Interest Rate', suffix: '%' },
      inq_last_6mths: { min: 0, max: 10, label: 'Hard Inquiries', isInt: true },
      mort_acc: { min: 0, max: 10, label: 'Mortgage Accounts', isInt: true },
    };
  }, [currency]);

  // Validate fields in real-time
  const errors = useMemo(() => {
    const errs: { [key in keyof typeof BOUNDS]?: string } = {};
    if (!rawInputs.annual_inc || !rawInputs.loan_amnt) return errs;

    // Validate Annual Income
    const incVal = rawInputs.annual_inc.trim();
    if (incVal === '') {
      errs.annual_inc = 'Required';
    } else {
      const num = Number(incVal);
      if (isNaN(num)) {
        errs.annual_inc = 'Must be a valid number';
      } else if (num < dynamicBounds.annual_inc.min) {
        errs.annual_inc = `Too low (Min: ${dynamicBounds.annual_inc.prefix}${dynamicBounds.annual_inc.min.toLocaleString()})`;
      } else if (num > dynamicBounds.annual_inc.max) {
        errs.annual_inc = `Too high (Max: ${dynamicBounds.annual_inc.prefix}${dynamicBounds.annual_inc.max.toLocaleString()})`;
      }
    }

    // Validate Loan Amount
    const loanVal = rawInputs.loan_amnt.trim();
    if (loanVal === '') {
      errs.loan_amnt = 'Required';
    } else {
      const num = Number(loanVal);
      if (isNaN(num)) {
        errs.loan_amnt = 'Must be a valid number';
      } else if (num < dynamicBounds.loan_amnt.min) {
        errs.loan_amnt = `Too low (Min: ${dynamicBounds.loan_amnt.prefix}${dynamicBounds.loan_amnt.min.toLocaleString()})`;
      } else if (num > dynamicBounds.loan_amnt.max) {
        errs.loan_amnt = `Too high (Max: ${dynamicBounds.loan_amnt.prefix}${dynamicBounds.loan_amnt.max.toLocaleString()})`;
      }
    }

    // Validate DTI
    const dtiVal = (rawInputs.dti || '').trim();
    if (dtiVal === '') {
      errs.dti = 'Required';
    } else {
      const num = Number(dtiVal);
      if (isNaN(num)) {
        errs.dti = 'Must be a valid number';
      } else if (num < BOUNDS.dti.min) {
        errs.dti = `Cannot be negative`;
      } else if (num > BOUNDS.dti.max) {
        errs.dti = `Cannot exceed ${BOUNDS.dti.max}%`;
      }
    }

    // Validate Revolving Utilization
    const revolVal = (rawInputs.revol_util || '').trim();
    if (revolVal === '') {
      errs.revol_util = 'Required';
    } else {
      const num = Number(revolVal);
      if (isNaN(num)) {
        errs.revol_util = 'Must be a valid number';
      } else if (num < BOUNDS.revol_util.min) {
        errs.revol_util = `Cannot be negative`;
      } else if (num > BOUNDS.revol_util.max) {
        errs.revol_util = `Cannot exceed ${BOUNDS.revol_util.max}%`;
      }
    }

    // Validate Interest Rate
    const intVal = (rawInputs.int_rate || '').trim();
    if (intVal === '') {
      errs.int_rate = 'Required';
    } else {
      const num = Number(intVal);
      if (isNaN(num)) {
        errs.int_rate = 'Must be a valid number';
      } else if (num < BOUNDS.int_rate.min) {
        errs.int_rate = `Minimum Interest Rate is ${BOUNDS.int_rate.min}%`;
      } else if (num > BOUNDS.int_rate.max) {
        errs.int_rate = `Maximum Interest Rate is ${BOUNDS.int_rate.max}%`;
      }
    }

    // Validate Inquiries
    const inqVal = (rawInputs.inq_last_6mths || '').trim();
    if (inqVal === '') {
      errs.inq_last_6mths = 'Required';
    } else {
      const num = Number(inqVal);
      if (isNaN(num) || !Number.isInteger(num)) {
        errs.inq_last_6mths = 'Must be an integer';
      } else if (num < BOUNDS.inq_last_6mths.min) {
        errs.inq_last_6mths = 'Cannot be negative';
      } else if (num > BOUNDS.inq_last_6mths.max) {
        errs.inq_last_6mths = `Cannot exceed ${BOUNDS.inq_last_6mths.max}`;
      }
    }

    // Validate Mortgage Accounts
    const mortVal = (rawInputs.mort_acc || '').trim();
    if (mortVal === '') {
      errs.mort_acc = 'Required';
    } else {
      const num = Number(mortVal);
      if (isNaN(num) || !Number.isInteger(num)) {
        errs.mort_acc = 'Must be an integer';
      } else if (num < BOUNDS.mort_acc.min) {
        errs.mort_acc = 'Cannot be negative';
      } else if (num > BOUNDS.mort_acc.max) {
        errs.mort_acc = `Cannot exceed ${BOUNDS.mort_acc.max}`;
      }
    }

    return errs;
  }, [rawInputs, dynamicBounds]);

  // Re-calculate predictions whenever applicant variables modify, and ONLY when inputs are valid
  useEffect(() => {
    if (Object.keys(errors).length === 0) {
      setLrResult(calculateLogisticModel(app));
      setDtResult(calculateDecisionTreeModel(app));
      setXgbResult(calculateXGBoostModel(app));
    }
  }, [app, errors]);

  const handleInputChange = (field: keyof typeof BOUNDS, val: string) => {
    // 1. Update Raw Input
    setRawInputs(prev => ({ ...prev, [field]: val }));

    // 2. Parse and propagate to underlying 'app' state ONLY if mathematically viable
    const num = Number(val);
    if (val.trim() !== '' && !isNaN(num)) {
      const bound = dynamicBounds[field] || BOUNDS[field];
      if (num >= bound.min && num <= bound.max) {
        const activeRate = currency === 'INR' ? 83 : currency === 'EUR' ? 0.92 : 1;
        const usdValue = (field === 'annual_inc' || field === 'loan_amnt')
          ? num / activeRate
          : num;
        setApp(prev => ({ ...prev, [field]: usdValue }));
      }
    }
  };

  const handleSliderChange = (field: keyof typeof BOUNDS, val: number) => {
    setRawInputs(prev => ({ ...prev, [field]: String(val) }));
    setApp(prev => ({ ...prev, [field]: val }));
  };

  const loadPreset = (presetKey: keyof typeof PRESETS) => {
    const config = PRESETS[presetKey].config;
    setApp(config as any);
    const activeRate = currency === 'INR' ? 83 : currency === 'EUR' ? 0.92 : 1;
    setRawInputs({
      annual_inc: String(Math.round(config.annual_inc * activeRate)),
      loan_amnt: String(Math.round(config.loan_amnt * activeRate)),
      dti: String(config.dti),
      revol_util: String(config.revol_util),
      int_rate: String(config.int_rate),
      inq_last_6mths: String(config.inq_last_6mths),
      mort_acc: String(config.mort_acc),
    });
  };


  return (
    <div className="bg-[#EBE9E4] border border-[#141414] rounded-none overflow-hidden mb-6 relative">
      {/* Interactive Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-white border-2 border-[#141414] p-4 shadow-[4px_4px_0px_rgba(20,20,20,1)] animate-slide-in flex flex-col gap-2 rounded-none font-mono">
          <div className="flex items-start gap-2.5">
            <div className="bg-emerald-100 border border-emerald-400 p-1">
              <ShieldCheck className="w-4 h-4 text-emerald-800 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">System Notification</p>
              <p className="text-[10px] text-gray-700 leading-normal mt-1">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[10px] text-gray-400 hover:text-[#141414] border border-gray-200 hover:border-gray-500 px-1 py-0.5"
            >
              [X]
            </button>
          </div>
          
          <div className="flex gap-2 justify-end mt-1 border-t border-dashed border-gray-200 pt-2">
            <button
              type="button"
              onClick={() => {
                document.getElementById('p2p-portfolio-ledger')?.scrollIntoView({ behavior: 'smooth' });
                setToastMessage(null);
              }}
              className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 border border-emerald-300 hover:bg-emerald-100 transition-colors uppercase tracking-widest"
            >
              Scroll to Portfolio Ledger &rarr;
            </button>
          </div>
        </div>
      )}

      <div className="p-5 border-b border-[#141414] bg-[#D6D5D2] flex justify-between items-center">
        <div>
          <h2 className="text-md font-serif italic text-[#141414] flex items-center gap-1.5 font-bold">
            Interactive Credit Underwriting Sandbox
          </h2>
          <p className="text-[10px] text-gray-700 font-mono tracking-tight uppercase">
            RE-COMPUTE SCORECARD FACTORS AND SYSTEMIC WRITE-OFF GAIN/LOSS RATIOS
          </p>
        </div>
        <span className="text-[10px] font-mono border border-[#141414] bg-[#E4E3E0] px-2 py-0.5">SANDBOX ENV</span>
      </div>

      <div className="p-6">
        {/* Preset profiles section */}
        <div className="mb-6 bg-[#E4E3E0] p-4 border border-[#141414] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-[11px] text-[#141414] max-w-md">
            <span className="font-serif italic font-bold block mb-0.5">Quick Test Scenarios:</span>
            Load calibrated LendingClub borrower profiles to test baseline models side-by-side.
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
              <button
                key={key}
                id={`preset-${key}`}
                onClick={() => loadPreset(key)}
                className="px-3 py-1.5 bg-white border border-[#141414] hover:bg-[#D6D5D2] text-[10px] font-mono uppercase tracking-tight transition-all cursor-pointer"
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* NEW FEATURE 2: Macroeconomic Stress Shock Simulator under Basel Guidelines */}
        <div className="mb-6 bg-[#E8E6E0] p-4 border border-[#141414] rounded-none">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="text-[11px] leading-relaxed max-w-xl">
              <span className="text-[#141414] font-serif italic font-bold text-xs block mb-0.5 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-red-700 rounded-none animate-pulse"></span>
                Basel Regulatory Macro Stress Testing Simulator
              </span>
              <p className="text-gray-750 text-[10px] font-mono leading-normal">
                Subject LendingClub underwriting algorithms to simulated macroeconomic market shocks to assess capital and scoring stability.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'baseline', label: '🟢 Baseline (Normal State)', desc: 'Standard trained parameters' },
                { id: 'recession', label: '🔴 Recession Shock (High default pressure)', desc: 'Heavy stress with multi-notch risk deterioration' },
                { id: 'inflation', label: '🟡 Inflation Surge (Liquidity Squeeze)', desc: 'Cash flow constraints and higher leverage pressure' }
              ].map(shock => (
                <button
                  key={shock.id}
                  type="button"
                  id={`btn-shock-${shock.id}`}
                  onClick={() => setStressScenario(shock.id as any)}
                  className={`px-3 py-1.5 border font-mono text-[9px] uppercase transition-all cursor-pointer font-bold ${
                    stressScenario === shock.id
                      ? 'bg-[#141414] text-white border-[#141414] shadow-[1px_1px_0px_rgba(20,20,20,1)]'
                      : 'bg-white text-gray-700 border-gray-400 hover:bg-[#D6D5D2] hover:text-[#141414]'
                  }`}
                  title={shock.desc}
                >
                  {shock.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: Form Sliders and Controls */}
          <div className="lg:col-span-6 space-y-5 border-b lg:border-b-0 lg:border-r border-[#141414] pb-6 lg:pb-0 lg:pr-8">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-extrabold">
              Borrower Underwriting Parameters
            </h3>

            {/* Income & Loan size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-serif italic font-bold text-gray-900 mb-1">
                  Annual Income ({symbol})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-mono text-xs">
                    {symbol}
                  </div>
                  <input
                    type="text"
                    id="input-annual-inc"
                    value={rawInputs.annual_inc || ''}
                    onChange={(e) => handleInputChange('annual_inc', e.target.value)}
                    className={`pl-7 block w-full rounded-none border text-xs px-3 py-2 text-gray-900 bg-white font-mono focus:bg-[#EBE9E4] focus:outline-none ${
                      errors.annual_inc ? 'border-red-600 bg-red-50 focus:bg-red-50 ring-1 ring-red-500 text-red-900 font-bold' : 'border-[#141414]'
                    }`}
                  />
                </div>
                {errors.annual_inc && (
                  <p className="text-[10px] text-red-700 font-mono mt-1 font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    {errors.annual_inc}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-serif italic font-bold text-gray-900 mb-1">
                  Requested Loan Size ({symbol})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-mono text-xs">
                    {symbol}
                  </div>
                  <input
                    type="text"
                    id="input-loan-amnt"
                    value={rawInputs.loan_amnt || ''}
                    onChange={(e) => handleInputChange('loan_amnt', e.target.value)}
                    className={`pl-7 block w-full rounded-none border text-xs px-3 py-2 text-gray-900 bg-white font-mono focus:bg-[#EBE9E4] focus:outline-none ${
                      errors.loan_amnt ? 'border-red-600 bg-red-50 focus:bg-red-50 ring-1 ring-red-500 text-red-900 font-bold' : 'border-[#141414]'
                    }`}
                  />
                </div>
                {errors.loan_amnt && (
                  <p className="text-[10px] text-red-700 font-mono mt-1 font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    {errors.loan_amnt}
                  </p>
                )}
              </div>
            </div>

            {/* FICO Range approximation via Grade select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-serif italic font-bold text-gray-900 mb-1">
                  Credit Risk Grade (Assigned)
                </label>
                <select
                  value={app.grade}
                  id="select-grade"
                  onChange={(e) => setApp({ ...app, grade: e.target.value as any })}
                  className="block w-full rounded-none border border-[#141414] text-xs px-3 py-2 text-gray-900 bg-white font-mono focus:bg-[#EBE9E4] focus:outline-none"
                >
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((g) => (
                    <option key={g} value={g}>Grade {g} (FICO equivalent: {g === 'A' ? '740+' : g === 'B' ? '715+' : g === 'C' ? '690+' : g === 'D' ? '670+' : g === 'E' ? '650+' : '620'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-serif italic font-bold text-gray-900 mb-1">
                  Loan Term (Matures)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[36, 60].map((t) => (
                    <button
                      key={t}
                      type="button"
                      id={`btn-term-${t}`}
                      onClick={() => setApp({ ...app, term: t as 36 | 60 })}
                      className={`py-2 text-[11px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                        app.term === t
                          ? 'bg-[#141414] text-white border-[#141414]'
                          : 'bg-white text-gray-700 border-[#141414] hover:bg-[#D6D5D2]'
                      }`}
                    >
                      {t} Months
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Continuous ratio sliders */}
            <div className="space-y-4 pt-1">
              {/* DTI Slider */}
              <div>
                <div className="flex justify-between items-center text-[11px] text-gray-700 mb-1">
                  <span className="font-serif italic font-bold">Debt-to-Income (DTI) ratio</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      id="input-dti"
                      value={rawInputs.dti || ''}
                      onChange={(e) => handleInputChange('dti', e.target.value)}
                      className={`w-16 text-right font-mono font-bold text-gray-900 bg-white border px-1 py-0.5 text-[10px] focus:outline-none ${
                        errors.dti ? 'border-red-600 bg-red-50 text-red-900 font-bold ring-1 ring-red-500' : 'border-[#141414]'
                      }`}
                    />
                    <span className="font-mono">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="0.5"
                  id="range-dti"
                  value={Number(rawInputs.dti) || 0}
                  onChange={(e) => handleSliderChange('dti', Number(e.target.value))}
                  className="w-full accent-[#141414]"
                />
                {errors.dti && (
                  <p className="text-[10px] text-red-750 font-mono mt-1 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    {errors.dti}
                  </p>
                )}
              </div>

              {/* Revolving util slider */}
              <div>
                <div className="flex justify-between items-center text-[11px] text-gray-700 mb-1">
                  <span className="font-serif italic font-bold">Credit Card Revolving Utilization</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      id="input-revol"
                      value={rawInputs.revol_util || ''}
                      onChange={(e) => handleInputChange('revol_util', e.target.value)}
                      className={`w-16 text-right font-mono font-bold text-gray-900 bg-white border px-1 py-0.5 text-[10px] focus:outline-none ${
                        errors.revol_util ? 'border-red-600 bg-red-50 text-red-900 font-bold ring-1 ring-red-500' : 'border-[#141414]'
                      }`}
                    />
                    <span className="font-mono">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  id="range-revol"
                  value={Number(rawInputs.revol_util) || 0}
                  onChange={(e) => handleSliderChange('revol_util', Number(e.target.value))}
                  className="w-full accent-[#141414]"
                />
                {errors.revol_util && (
                  <p className="text-[10px] text-red-750 font-mono mt-1 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    {errors.revol_util}
                  </p>
                )}
              </div>

              {/* Interest Rate slider */}
              <div>
                <div className="flex justify-between items-center text-[11px] text-gray-700 mb-1">
                  <span className="font-serif italic font-bold">Lending Club Assigned Interest Rate</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      id="input-int-rate"
                      value={rawInputs.int_rate || ''}
                      onChange={(e) => handleInputChange('int_rate', e.target.value)}
                      className={`w-16 text-right font-mono font-bold text-gray-900 bg-white border px-1 py-0.5 text-[10px] focus:outline-none ${
                        errors.int_rate ? 'border-red-600 bg-red-50 text-red-900 font-bold ring-1 ring-red-500' : 'border-[#141414]'
                      }`}
                    />
                    <span className="font-mono">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="30.0"
                  step="0.1"
                  id="range-int-rate"
                  value={Number(rawInputs.int_rate) || 5.0}
                  onChange={(e) => handleSliderChange('int_rate', Number(e.target.value))}
                  className="w-full accent-[#141414]"
                />
                {errors.int_rate && (
                  <p className="text-[10px] text-red-750 font-mono mt-1 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    {errors.int_rate}
                  </p>
                )}
              </div>

              {/* Hard Inquiries */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center text-[11px] text-gray-700 mb-1">
                    <span className="font-serif italic font-bold">Inquiries (6M)</span>
                    <input
                      type="text"
                      id="input-inq"
                      value={rawInputs.inq_last_6mths || ''}
                      onChange={(e) => handleInputChange('inq_last_6mths', e.target.value)}
                      className={`w-10 text-center font-mono font-bold text-gray-900 bg-white border px-1 py-0.5 text-[10px] focus:outline-none ${
                        errors.inq_last_6mths ? 'border-red-600 bg-red-50 text-red-900 font-bold ring-1 ring-red-500' : 'border-[#141414]'
                      }`}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    id="range-inq"
                    value={Number(rawInputs.inq_last_6mths) || 0}
                    onChange={(e) => handleSliderChange('inq_last_6mths', Number(e.target.value))}
                    className="w-full accent-[#141414]"
                  />
                  {errors.inq_last_6mths && (
                    <p className="text-[10px] text-red-750 font-mono mt-1 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      {errors.inq_last_6mths}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center text-[11px] text-gray-700 mb-1">
                    <span className="font-serif italic font-bold">Mortgage Accs</span>
                    <input
                      type="text"
                      id="input-mort"
                      value={rawInputs.mort_acc || ''}
                      onChange={(e) => handleInputChange('mort_acc', e.target.value)}
                      className={`w-10 text-center font-mono font-bold text-gray-900 bg-white border px-1 py-0.5 text-[10px] focus:outline-none ${
                        errors.mort_acc ? 'border-red-600 bg-red-50 text-red-900 font-bold ring-1 ring-red-500' : 'border-[#141414]'
                      }`}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    id="range-mort"
                    value={Number(rawInputs.mort_acc) || 0}
                    onChange={(e) => handleSliderChange('mort_acc', Number(e.target.value))}
                    className="w-full accent-[#141414]"
                  />
                  {errors.mort_acc && (
                    <p className="text-[10px] text-red-750 font-mono mt-1 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      {errors.mort_acc}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Categorical details: home ownership & verification status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-serif italic font-bold text-gray-900 mb-1">
                  Home Ownership Status
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['MORTGAGE', 'OWN', 'RENT'] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      id={`btn-home-${h}`}
                      onClick={() => setApp({ ...app, home_ownership: h })}
                      className={`py-1.5 text-[10px] font-mono uppercase tracking-tight rounded-none border text-center transition-all cursor-pointer ${
                        app.home_ownership === h
                          ? 'bg-[#141414] text-white border-[#141414]'
                          : 'bg-white text-gray-700 border-[#141414] hover:bg-[#D6D5D2]'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-serif italic font-bold text-gray-900 mb-1">
                  Income Verification Status
                </label>
                <select
                  value={app.verification_status}
                  id="select-verify"
                  onChange={(e) => setApp({ ...app, verification_status: e.target.value as any })}
                  className="block w-full rounded-none border border-[#141414] text-xs px-3 py-2 text-gray-900 bg-white font-mono focus:bg-[#EBE9E4] focus:outline-none"
                >
                  {['Not Verified', 'Source Verified', 'Verified'].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-serif italic font-bold text-gray-900 mb-1">
                  Loan Purpose Category
                </label>
                <select
                  value={app.purpose}
                  id="select-purpose"
                  onChange={(e) => setApp({ ...app, purpose: e.target.value as any })}
                  className="block w-full rounded-none border border-[#141414] text-xs px-3 py-2 text-gray-900 bg-white font-mono focus:bg-[#EBE9E4] focus:outline-none"
                >
                  {[
                    { value: 'credit_card', label: 'Credit Card Refinance' },
                    { value: 'debt_consolidation', label: 'Debt Consolidation' },
                    { value: 'home_improvement', label: 'Home Improvement' },
                    { value: 'major_purchase', label: 'Major Purchase' },
                    { value: 'small_business', label: 'Small Business' },
                    { value: 'other', label: 'Other/Personal' }
                  ].map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-serif italic font-bold text-gray-900 mb-1">
                  Employment Length (Years)
                </label>
                <select
                  value={app.emp_length}
                  id="select-emp"
                  onChange={(e) => setApp({ ...app, emp_length: Number(e.target.value) })}
                  className="block w-full rounded-none border border-[#141414] text-xs px-3 py-2 text-gray-900 bg-white font-mono focus:bg-[#EBE9E4] focus:outline-none"
                >
                  <option value={0}>&lt; 1 Year</option>
                  <option value={1}>1 Year</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years</option>
                  <option value={8}>8 Years</option>
                  <option value={10}>10+ Years</option>
                </select>
              </div>
            </div>

            {/* Lock Parameters & Underwrite Submission Button */}
            <div className="pt-4 border-t border-[#141414] mt-6 space-y-3">
              <button
                type="button"
                id="btn-submit-underwrite"
                disabled={Object.keys(errors).length > 0}
                onClick={() => setDecisionVisible(true)}
                className={`w-full py-3 px-4 font-mono text-xs uppercase tracking-wider font-extrabold border transition-all rounded-none flex items-center justify-center gap-2 ${
                  Object.keys(errors).length > 0
                    ? 'bg-gray-200 border-gray-400 text-gray-400 cursor-not-allowed border-dashed'
                    : 'bg-[#141414] text-white hover:bg-emerald-800 border-[#141414] cursor-pointer'
                }`}
              >
                {Object.keys(errors).length > 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Underwriting Blocked & Locked
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Verify Regulations & Issue Decision
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-add-p2p"
                disabled={Object.keys(errors).length > 0}
                onClick={addToPortfolioLedger}
                className={`w-full py-3 px-4 font-mono text-xs uppercase tracking-wider font-extrabold border transition-all rounded-none flex items-center justify-center gap-2 ${
                  Object.keys(errors).length > 0
                    ? 'bg-gray-200 border-gray-400 text-gray-400 cursor-not-allowed border-dashed animate-pulse'
                    : justAddedNote
                    ? 'bg-emerald-600 text-white border-emerald-800 scale-[1.02] shadow-[1px_1px_0px_rgba(20,20,20,1)]'
                    : 'bg-emerald-800 hover:bg-emerald-700 text-white border-emerald-900 cursor-pointer shadow-[2px_2px_0px_rgba(20,20,20,1)] active:translate-x-0.5 active:translate-y-0.5'
                }`}
              >
                {justAddedNote ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300 animate-bounce" />
                    Note Logged Successfully! ✓
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-emerald-300" />
                    Add Note to Simulated Portfolio
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-print-dossier"
                disabled={Object.keys(errors).length > 0}
                onClick={() => setDossierVisible(true)}
                className={`w-full py-3 px-4 font-mono text-xs uppercase tracking-wider font-extrabold border transition-all rounded-none flex items-center justify-center gap-2 ${
                  Object.keys(errors).length > 0
                    ? 'bg-gray-200 border-gray-400 text-gray-400 cursor-not-allowed border-dashed'
                    : 'bg-zinc-805 hover:bg-zinc-700 text-white border-zinc-900 cursor-pointer shadow-[2px_2px_0px_rgba(20,20,20,1)] active:translate-x-0.5 active:translate-y-0.5'
                }`}
                title="Generate compliance report package"
              >
                <Printer className="w-4 h-4 text-zinc-300" />
                Compile Regulatory Dossier Memo
              </button>
            </div>

            {/* NEW FEATURE 1: Monthly Servicing Cost & EMI Calculator */}
            <div className="border border-[#141414] bg-white p-4 mt-6 rounded-none shadow-[2px_2px_0px_rgba(20,20,20,1)]">
              <div className="flex justify-between items-center border-b border-[#141414] pb-2 mb-3">
                <h4 className="text-[11px] font-mono uppercase text-[#141414] font-black flex items-center gap-1.5 leading-none">
                  <Calculator className="w-4 h-4 text-[#141414]" />
                  Active Servicing Cost (EMI Estimator)
                </h4>
                <span className="text-[9px] font-mono bg-[#E4E3E0] px-1.5 py-0.5 border border-[#141414] uppercase font-bold">
                  {currency} mode
                </span>
              </div>

              {/* Math logic: EMI */}
              {(() => {
                const P = app.loan_amnt * rate;
                const r = (app.int_rate / 100) / 12;
                const n = app.term;
                const emi = r > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / n;
                const totalPayback = emi * n;
                const totalInterest = totalPayback - P;
                const burdenRatio = ((emi * 12) / (app.annual_inc * rate)) * 100;

                return (
                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#E4E3E0]/40 p-2.5 border border-[#141414]/30 text-center">
                        <span className="text-[8px] text-gray-500 uppercase block mb-1 font-bold">Monthly Installment (EMI)</span>
                        <strong className="text-sm font-bold text-[#141414] tracking-tight">
                          {symbol}{Math.round(emi).toLocaleString()}
                        </strong>
                      </div>
                      <div className="bg-[#E4E3E0]/40 p-2.5 border border-[#141414]/30 text-center">
                        <span className="text-[8px] text-gray-500 uppercase block mb-1 font-bold">Total Interest Serviced</span>
                        <strong className="text-sm font-bold text-red-800 tracking-tight">
                          {symbol}{Math.round(totalInterest).toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-dashed border-gray-305">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500 uppercase">Total Outflow Over Term:</span>
                        <span className="font-bold">{symbol}{Math.round(totalPayback).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500 uppercase">Annual Debt Service Burden:</span>
                        <span className={`font-bold ${burdenRatio > 35 ? 'text-red-700' : 'text-emerald-700'}`}>
                          {burdenRatio.toFixed(1)}% of income
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

          {/* Right panel: Side-by-side Predictions */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 relative min-h-[400px]">
            {Object.keys(errors).length > 0 && (
              <div className="absolute inset-0 bg-[#EBE9E4]/90 backdrop-blur-[1.5px] border-2 border-red-700/80 p-6 flex flex-col items-center justify-center text-center z-20">
                <div className="p-3 bg-red-100 rounded-none border border-red-300 mb-4 animate-bounce">
                  <AlertTriangle className="w-10 h-10 text-red-700" />
                </div>
                <h4 className="text-sm font-mono font-bold uppercase text-red-900 tracking-wider">
                  Underwriting Engine Suspended
                </h4>
                <p className="text-[11px] text-gray-700 max-w-sm font-sans mt-2.5 leading-relaxed font-semibold">
                  Real-time algorithmic comparison and risk models are blocked due to out-of-bounds parameters. Please correct all fields highlighted in red to restore active underwriting scores.
                </p>
              </div>
            )}

            <h3 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-extrabold">
              Model Outcomes & Calibrated Risk Indicators
            </h3>

            {/* Basel Stressed Portfolio Projection Card */}
            {stressScenario !== 'baseline' && lrResult && (
              <div className="border bg-red-50 border-red-750 p-4 font-mono text-[11px] text-red-950 shadow-[2px_2px_0px_rgba(185,28,28,1)] rounded-none">
                <div className="flex gap-2 items-start mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="font-extrabold uppercase text-red-900 tracking-wider text-xs">
                      {stressScenario === 'recession' ? 'RECESSION SHOCK ACTIVE (SEVERE)' : 'INFLATION LIQUIDITY STRIP ACTIVE (MODERATE)'}
                    </h4>
                    <p className="text-[9px] text-red-750 uppercase font-bold">PORTFOLIO DEGRADATION MODEL UNDER MACRO STRESS CONDITIONS</p>
                  </div>
                </div>

                {(() => {
                  const scorePenalty = stressScenario === 'recession' ? 65 : 35;
                  const pdMultiplier = stressScenario === 'recession' ? 1.82 : 1.38;
                  
                  const stressedScore = Math.max(300, lrResult.score - scorePenalty);
                  const stressedPD = Math.min(1.0, lrResult.probabilityOfDefault * pdMultiplier);
                  
                  return (
                    <div className="space-y-2 pt-2 border-t border-red-200">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-red-700 text-[8px] block uppercase font-bold">Stressed Scorecard Score</span>
                          <strong className="text-sm font-black text-red-900">
                            {stressedScore} PTS <span className="text-[10px] font-normal font-mono">(-{scorePenalty} pts)</span>
                          </strong>
                        </div>
                        <div>
                          <span className="text-red-700 text-[8px] block uppercase font-bold">Stressed Probability of Default</span>
                          <strong className="text-sm font-black text-red-900">
                            {(stressedPD * 100).toFixed(2)}% <span className="text-[10px] font-normal font-mono">(+{Math.round((pdMultiplier - 1) * 100)}%)</span>
                          </strong>
                        </div>
                      </div>
                      <div className="text-[9px] text-red-800 leading-normal italic font-sans border border-red-300 bg-white p-2">
                        * Under governance guidelines (Basel III Article 12): {stressedScore < 580 ? '❌ EXCEEDS MANDATED CRITICAL SOLVENCY CAP. Scoring models under this condition reject approval.' : '✅ LIQUIDITY COVERABLE. The scenario leaves capital requirements intact.'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Model summaries */}
            <div className={`space-y-6 flex-1 transition-opacity duration-300 ${Object.keys(errors).length > 0 ? 'opacity-10' : ''}`}>
              {/* LR Card */}
              {lrResult && (
                <div className="border border-[#141414] rounded-none p-4 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-xs font-mono uppercase text-blue-800 font-extrabold flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-800 rounded-none inline-block"></span>
                        1. Logistic Scorecard Metrics
                      </h4>
                      <p className="text-[9px] text-gray-500 font-mono">Traditional ECOA additive scorecard</p>
                    </div>
                    <div className="px-3 py-1 bg-[#141414] text-white font-mono text-[13px] font-black tracking-tight">
                      {lrResult.score} PTS
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1 border-t border-dashed border-gray-200">
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase font-mono">PD (Probability of Default)</div>
                      <div className="text-xl font-mono font-black text-[#141414]">
                        {(lrResult.probabilityOfDefault * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase font-mono">Calibrated Grade Rating</div>
                      <div className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 inline-block mt-0.5 border border-blue-200">
                        {lrResult.rating}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="w-full bg-[#E4E3E0] h-3 rounded-none border border-[#141414] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          lrResult.score >= 680 ? 'bg-emerald-500' : lrResult.score >= 580 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${((lrResult.score - 300) / 550) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* XGBoost Card */}
              {xgbResult && (
                <div className="border border-[#141414] rounded-none p-4 bg-[#E4E3E0]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-xs font-mono uppercase text-[#141414] font-extrabold flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#141414] rounded-none inline-block"></span>
                        2. XGBoost Ensemble Classifier
                      </h4>
                      <p className="text-[9px] text-gray-600 font-mono">Nonlinear interaction forest estimator</p>
                    </div>
                    <div className={`px-2.5 py-1 text-white font-mono text-[10px] font-bold uppercase tracking-widest ${xgbResult.score >= 670 ? 'bg-emerald-800' : xgbResult.score >= 550 ? 'bg-amber-700' : 'bg-red-700'}`}>
                      {xgbResult.score >= 670 ? 'ELITE PRIME' : xgbResult.score >= 550 ? 'CAUTION RISK' : 'DISTRESSED'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1 border-t border-dashed border-gray-300">
                    <div>
                      <div className="text-[9px] text-gray-600 uppercase font-mono">Ensemble Loss Index (PD)</div>
                      <div className={`text-xl font-mono font-black ${xgbResult.probabilityOfDefault > 0.25 ? 'text-red-700' : 'text-[#141414]'}`}>
                        {(xgbResult.probabilityOfDefault * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-600 uppercase font-mono">Solvency Leverage Ratio</div>
                      <div className="text-xl font-mono font-black text-[#141414]">
                        {(xgbResult.probabilityOfPaid / xgbResult.probabilityOfDefault).toFixed(1)}:1
                      </div>
                    </div>
                  </div>

                  {app.revol_util > 75 && app.dti > 25 && (
                    <div className="mt-3 bg-red-100 border border-red-300 p-2 text-[10px] text-red-900 font-mono">
                      <div className="flex gap-1.5 items-start">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Synergistic Risk Detected:</strong> CC leverage ({app.revol_util}%) & DTI ({app.dti}%) generates exponential loss projections.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Decision Tree Node split history */}
              {dtResult && (
                <div className="border border-[#141414] rounded-none p-4 bg-white">
                  <h4 className="text-xs font-mono uppercase text-[#141414] font-extrabold mb-2">3. Decision Tree Split History</h4>
                  <div className="space-y-1 font-mono text-[9px] text-gray-85 bg-gray-50 border border-[#141414] p-3 max-h-28 overflow-y-auto">
                    {dtResult.path.map((step, index) => (
                      <div key={index} className="flex gap-2 items-start border-b border-gray-100 pb-0.5">
                        <span className="text-[#141414] font-bold">[{index + 1}]</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-xs font-mono">
                    <span className="text-gray-600">Deterministic default risk:</span>
                    <span className="text-red-700 font-bold">{(dtResult.probDefault * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#141414] text-[#E4E3E0] p-4 rounded-none flex gap-3 text-xs leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-serif italic text-[11px] text-emerald-300">Why Model Comparison Matters in Boards:</p>
                <p className="mt-1 text-[10px] font-mono leading-normal text-gray-300">
                  LogReg is strict and monotonic for audit trails. XGBoost triggers warnings when extreme interactive risks bypass baseline checklists, predicting portfolio default waves before they appear.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* NEW FEATURE 1: WHAT-IF SENSITIVITY AND EXPERT CREDIT CURVE PLOTTER (RECHARTS) */}
        {/* ========================================================================= */}
        <div className="border border-[#141414] bg-white p-5 rounded-none shadow-[2px_2px_0px_rgba(20,20,20,1)] mt-8" id="sensitivity-analysis-wrapper">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#141414] pb-3 mb-4 gap-4">
            <div>
              <h4 className="text-sm font-serif italic text-[#141414] font-bold flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-700" />
                What-If Risk Sensitivity & Scoring Elasticity Curve
              </h4>
              <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase mt-0.5">
                PLOT CORRELATIONS ACROSS THE ENTIRE OPERATIONAL SPAN FOR INDIVIDUAL CREDIT PARAMETERS
              </p>
            </div>
            
            {/* Control Selectors */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              <div>
                <span className="text-gray-500 mr-1.5 font-bold">VARIABLE :</span>
                <select
                  value={sensitivityVar}
                  onChange={(e) => setSensitivityVar(e.target.value as any)}
                  className="bg-white border border-[#141414] px-2 py-1 text-[10px] font-mono rounded-none focus:outline-none"
                >
                  <option value="dti">Debt-to-Income (DTI)</option>
                  <option value="revol_util">Revolving Utilization</option>
                  <option value="annual_inc">Annual Income</option>
                  <option value="loan_amnt">Loan Size (Principal)</option>
                  <option value="int_rate">Interest Rate</option>
                </select>
              </div>

              <div className="flex border border-[#141414]">
                <button
                  type="button"
                  onClick={() => setSensitivityMetric('score')}
                  className={`px-2 py-1 font-bold text-[9px] cursor-pointer transition-all ${
                    sensitivityMetric === 'score' ? 'bg-[#141414] text-white' : 'bg-white text-gray-700 hover:bg-[#D6D5D2]'
                  }`}
                >
                  CREDIT SCORE
                </button>
                <button
                  type="button"
                  onClick={() => setSensitivityMetric('pd')}
                  className={`px-2 py-1 font-bold text-[9px] cursor-pointer transition-all ${
                    sensitivityMetric === 'pd' ? 'bg-[#141414] text-white' : 'bg-white text-gray-700 hover:bg-[#D6D5D2]'
                  }`}
                >
                  DEFAULT PROB.
                </button>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full bg-slate-50/50 border border-dotted border-gray-300 p-2 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensitivityData} margin={{ top: 15, right: 25, left: 10, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e3e0" />
                <XAxis 
                  dataKey="xValue" 
                  stroke="#141414" 
                  fontSize={9} 
                  fontFamily="monospace"
                  tickLine={true} 
                  label={{ 
                    value: `Simulated Values (${
                      sensitivityVar === 'dti' ? '%' :
                      sensitivityVar === 'revol_util' ? '%' :
                      sensitivityVar === 'int_rate' ? '%' :
                      symbol
                    })`, 
                    position: 'insideBottom', 
                    offset: -10, 
                    fontSize: 9, 
                    fontFamily: 'monospace',
                    fill: '#141414',
                    fontWeight: 'bold'
                  }} 
                />
                <YAxis 
                  domain={sensitivityMetric === 'score' ? [450, 855] : [0, 'auto']} 
                  stroke="#141414" 
                  fontSize={9} 
                  fontFamily="monospace"
                  label={{ 
                    value: sensitivityMetric === 'score' ? 'FICO Score Equivalent (Points)' : 'Probability of Default (%)', 
                    angle: -90, 
                    position: 'insideLeft', 
                    offset: -2, 
                    fontSize: 9, 
                    fontFamily: 'monospace',
                    fill: '#141414',
                    fontWeight: 'bold'
                  }} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141414',
                    color: '#E4E3E0',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    borderRadius: '0px',
                    border: '1px solid #141414',
                  }}
                  labelFormatter={(v) => `${BOUNDS[sensitivityVar as keyof typeof BOUNDS]?.label || sensitivityVar}: ${sensitivityVar === 'annual_inc' || sensitivityVar === 'loan_amnt' ? symbol : ''}${v}${(BOUNDS[sensitivityVar as keyof typeof BOUNDS] as any)?.suffix || ''}`}
                />
                {sensitivityMetric === 'score' ? (
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#15803d" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#15803d', strokeWidth: 1 }} 
                    activeDot={{ r: 5 }} 
                    name="Calibrated FICO-equivalent" 
                  />
                ) : (
                  <Line 
                    type="monotone" 
                    dataKey="pd" 
                    stroke="#b91c1c" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#b91c1c', strokeWidth: 1 }} 
                    activeDot={{ r: 5 }} 
                    name="Probability of Default (PD %)" 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] text-gray-500 font-mono mt-3 leading-relaxed">
            * Methodology explanation: Underwriting sensitivity algorithms project risk elasticities across score card ranges. Risk officers track these curves to detect exact "cutoff cliffs" where incremental credit seeks cause compounding hazard escalations.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* NEW SYSTEM FEATURE: VOLUNTARY PREPAYMENT & ACCELERATED AMORTIZATION SCHEDULE */}
        {/* ========================================================================= */}
        {(() => {
          const P = app.loan_amnt * rate;
          const r = (app.int_rate / 100) / 12;
          const n = app.term;
          const standardEmi = r > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / n;

          // Standard schedule
          let stdBal = P;
          let standardTotalInterest = 0;
          for (let month = 1; month <= n; month++) {
            if (stdBal <= 0) break;
            const interest = Math.max(0, stdBal * r);
            const pr = Math.min(stdBal, standardEmi - interest);
            stdBal = Math.max(0, stdBal - pr);
            standardTotalInterest += interest;
          }

          // Prepaid schedule
          let prepBal = P;
          let prepaidTotalInterest = 0;
          const prepaidSchedule = [];
          
          for (let month = 1; month <= 360; month++) {
            if (prepBal <= 0.01) break;
            const startingBalance = prepBal;
            const interestPaid = Math.max(0, startingBalance * r);
            const normalPaymentAmount = Math.min(startingBalance + interestPaid, standardEmi);
            const regularPrincipalPaid = Math.max(0, normalPaymentAmount - interestPaid);
            
            const maxPrepaymentAllowed = Math.max(0, startingBalance - regularPrincipalPaid);
            const prepaidApplied = Math.min(maxPrepaymentAllowed, voluntaryPrepayment);
            
            const totalPrincipal = regularPrincipalPaid + prepaidApplied;
            const endingBalance = Math.max(0, startingBalance - totalPrincipal);
            
            prepaidSchedule.push({
              paymentNumber: month,
              startingBalance,
              interestPaid,
              principalPaid: totalPrincipal,
              voluntaryPrepaymentApplied: prepaidApplied,
              endingBalance
            });
            
            prepaidTotalInterest += interestPaid;
            prepBal = endingBalance;
          }

          const actualTerm = prepaidSchedule.length;
          const monthsSaved = Math.max(0, n - actualTerm);
          const interestSaved = Math.max(0, standardTotalInterest - prepaidTotalInterest);

          return (
            <div className="border border-[#141414] bg-white p-5 rounded-none shadow-[2px_2px_0px_rgba(20,20,20,1)] mt-8" id="amortization-schedule-wrapper">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#141414] pb-3 mb-4 gap-4">
                <div>
                  <h4 className="text-sm font-serif italic text-[#141414] font-bold flex items-center gap-2">
                    <Calculator className="w-4.5 h-4.5 text-emerald-700" />
                    Voluntary Prepayment & Accelerated Amortization Schedule
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase mt-0.5">
                    MODEL THE DIRECT SAVINGS AND TERM REDUCTION OF DISCRETIONARY MONTHLY PRINCIPAL PREPAYMENTS
                  </p>
                </div>
                <span className="text-[8px] font-mono bg-[#EBE9E4] px-1.5 py-0.5 border border-[#141414] uppercase font-bold text-emerald-800">
                  Amortizer
                </span>
              </div>

              {/* Grid with inputs and summary cards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-4">
                {/* Prepayment input tool */}
                <div className="lg:col-span-5 bg-[#EBE9E4] border border-[#141414] p-4 text-[11px] font-mono space-y-4">
                  <div>
                    <span className="font-bold text-gray-900 uppercase block mb-1">Voluntary Monthly Prepayment :</span>
                    <p className="text-[9px] text-gray-500 leading-normal mb-3">
                      Add a recurring monthly payment applied directly to reduce the outstanding loan principal.
                    </p>
                    
                    {/* Compact layout with decrement/increment and manual input */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVoluntaryPrepayment(prev => Math.max(0, prev - 100))}
                        className="bg-white border border-[#141414] px-2.5 py-1 text-xs hover:bg-[#D6D5D2] font-black cursor-pointer shadow-[1px_1px_0px_rgba(20,20,20,1)] active:translate-x-0.5 active:translate-y-0.5 text-[#141414]"
                      >
                        -100
                      </button>
                      
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1.5 text-gray-500 text-[10px]">{symbol}</span>
                        <input
                          type="number"
                          value={voluntaryPrepayment === 0 ? '' : voluntaryPrepayment}
                          placeholder="0"
                          min="0"
                          max={Math.round(P)}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setVoluntaryPrepayment(isNaN(val) || val < 0 ? 0 : Math.min(Math.round(P), val));
                          }}
                          className="w-full bg-white border border-[#141414] pl-6 pr-3 py-1 text-xs text-gray-950 font-black focus:outline-none focus:bg-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setVoluntaryPrepayment(prev => Math.min(Math.round(P), prev + 100))}
                        className="bg-white border border-[#141414] px-2.5 py-1 text-xs hover:bg-[#D6D5D2] font-black cursor-pointer shadow-[1px_1px_0px_rgba(20,20,20,1)] active:translate-x-0.5 active:translate-y-0.5 text-[#141414]"
                      >
                        +100
                      </button>
                    </div>
                  </div>

                  {/* Range Slider control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-gray-600 font-bold">
                      <span>No Prepayment</span>
                      <span>Max Payoff ({symbol}{Math.round(P / 4).toLocaleString()}/mo)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.round(P / 4)}
                      value={voluntaryPrepayment}
                      onChange={(e) => setVoluntaryPrepayment(Math.round(Number(e.target.value)))}
                      className="w-full accent-[#141414] cursor-pointer"
                    />
                  </div>

                  {/* Prepayment Quick Presets */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setVoluntaryPrepayment(0)}
                      className="flex-1 bg-white border border-gray-400 py-1 text-[8.5px] font-bold text-gray-700 hover:border-[#141414] hover:text-[#141414]"
                    >
                      RESET
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoluntaryPrepayment(Math.round(P * 0.01))}
                      className="flex-1 bg-white border border-gray-400 py-1 text-[8.5px] font-bold text-gray-700 hover:border-[#141414] hover:text-[#141414]"
                      title="1% of the starting principal balance"
                    >
                      1% PRINCIPAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoluntaryPrepayment(Math.round(P * 0.02))}
                      className="flex-1 bg-white border border-gray-400 py-1 text-[8.5px] font-bold text-gray-700 hover:border-[#141414] hover:text-[#141414]"
                      title="2% of the starting principal balance"
                    >
                      2% PRINCIPAL
                    </button>
                  </div>
                </div>

                {/* Performance & Savings Metrics Board */}
                <div className="lg:col-span-7 flex flex-col justify-between border border-[#141414] bg-white p-4 font-mono text-[11px] space-y-3">
                  <div className="border-b border-dashed border-gray-300 pb-2">
                    <span className="font-bold text-gray-900 uppercase block mb-1">ACCELERATION SOLVENCY & LOSS RESULTS :</span>
                    <p className="text-[9px] text-gray-500 leading-normal">
                      Compare baseline structured payment rules against your voluntary pay-down strategy.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                    <div className="bg-gray-50 border border-gray-200 p-2">
                      <span className="text-[8px] text-gray-400 block uppercase">Orig. Term</span>
                      <strong className="text-xs text-gray-900 font-bold">{n} Months</strong>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-2">
                      <span className="text-[8px] text-gray-400 block uppercase">New Term</span>
                      <strong className="text-xs text-emerald-800 font-black">{actualTerm} Months</strong>
                    </div>
                    <div className="bg-gray-100 border border-emerald-200 p-2 bg-emerald-50/20">
                      <span className="text-[8.5px] text-emerald-800 block uppercase font-bold">Months Saved</span>
                      <strong className="text-md text-emerald-855 font-black">{monthsSaved} Mos</strong>
                    </div>
                    <div className="bg-gray-150 border border-indigo-200 p-2 bg-indigo-50/20">
                      <span className="text-[8.5px] text-indigo-805 block uppercase font-bold">Total Saved</span>
                      <strong className="text-md text-indigo-900 font-black">{symbol}{Math.round(interestSaved).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="bg-zinc-900 text-slate-200 p-2.5 text-[9.5px] leading-normal flex gap-2 items-start">
                    <span className="text-amber-400 font-bold font-mono">💡 POLICY MEMO:</span>
                    <p className="font-sans text-gray-300">
                      By adding {symbol}{Math.round(voluntaryPrepayment).toLocaleString()} voluntary payment per period, you pay off the entire balance in <strong className="text-white font-bold">{actualTerm} months</strong> instead of {n}. Total loan interest will drop from {symbol}{Math.round(standardTotalInterest).toLocaleString()} to <strong className="text-emerald-400 font-bold">{symbol}{Math.round(prepaidTotalInterest).toLocaleString()}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Scrollable Amortization Schedule Table */}
              <div className="overflow-x-auto border border-[#141414] bg-white text-[10.5px] font-mono max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#D6D5D2] border-b border-[#141414] z-10 text-gray-805">
                    <tr>
                      <th className="p-2 border-r border-[#141414] text-[9.5px] uppercase font-bold text-center w-14">PMT #</th>
                      <th className="p-2 border-r border-[#141414] text-[9.5px] uppercase font-bold text-right">STARTING BAL.</th>
                      <th className="p-2 border-r border-[#141414] text-[9.5px] uppercase font-bold text-right">INTEREST PAID</th>
                      <th className="p-2 border-r border-[#141414] text-[9.5px] uppercase font-bold text-right">PRINCIPAL PAID</th>
                      <th className="p-2 border-r border-[#141414] text-[9.5px] uppercase font-bold text-right text-emerald-800">PREPAYMENT</th>
                      <th className="p-2 text-[9.5px] uppercase font-bold text-right">ENDING BALANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141414]/15 bg-slate-50/30">
                    {prepaidSchedule.map((row) => (
                      <tr key={row.paymentNumber} className="hover:bg-slate-100/60 transition-colors">
                        <td className="p-2 border-r border-[#141414]/15 text-center font-bold text-gray-600 bg-[#E4E3E0]/20">
                          #{row.paymentNumber}
                        </td>
                        <td className="p-2 border-r border-[#141414]/15 text-right font-medium">
                          {symbol}{Math.round(row.startingBalance).toLocaleString()}
                        </td>
                        <td className="p-2 border-r border-[#141414]/15 text-right text-red-700">
                          {symbol}{Math.round(row.interestPaid).toLocaleString()}
                        </td>
                        <td className="p-2 border-r border-[#141414]/15 text-right text-slate-800 font-semibold">
                          {symbol}{Math.round(row.principalPaid).toLocaleString()}
                        </td>
                        <td className="p-2 border-r border-[#141414]/15 text-right font-black text-emerald-800 bg-emerald-50/20">
                          {row.voluntaryPrepaymentApplied > 0 ? `${symbol}${Math.round(row.voluntaryPrepaymentApplied).toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2 text-right font-bold text-gray-900 bg-slate-100/10">
                          {symbol}{Math.round(row.endingBalance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-3 pt-2 text-[8.5px] text-gray-500 font-mono leading-normal border-t border-[#141414]/10">
                <p>
                  * Accelerated values assume immediate, consistent, periodic prepayment applied exactly at period milestones. Calculations rounded to nearest integer.
                </p>
                <div className="flex gap-3 h-fit whitespace-nowrap font-bold text-[#141414]">
                  <span>REPS: Basel II Accord Protocol</span>
                  <span>Solvency: Active and Verified</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* NEW SYSTEM FEATURES ROW: REGULATORY ECOA ADVICE & PORTFOLIO SIMULATION LEDGER */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 pt-8 border-t border-[#141414]" id="fintech-expansion-row">
          
          {/* Column 1: Compliance Diagnostics & Elastic Advisor (ECOA / FCRA) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="border border-[#141414] bg-white p-4 rounded-none shadow-[2px_2px_0px_rgba(20,20,20,1)]">
              <div className="flex justify-between items-center border-b border-[#141414] pb-2 mb-3">
                <h4 className="text-[11px] font-mono uppercase text-[#141414] font-black flex items-center gap-1.5 leading-none">
                  <FileText className="w-4 h-4 text-[#141414]" />
                  ECOA Adverse Action Reason Codes
                </h4>
                <span className="text-[8px] font-mono bg-[#E4E3E0] px-1.5 py-0.5 border border-[#141414] uppercase font-bold text-red-905">
                  Compliance
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono mb-3 leading-normal">
                Under Regulation B of the Equal Credit Opportunity Act (ECOA), we provide the primary analytical reasons for risk levels:
              </p>
              <ul className="space-y-2.5 font-mono text-[10px]">
                {getDynamicAdverseActions().map((reason, i) => (
                  <li key={i} className="flex gap-2 items-start bg-red-50/50 p-2 border border-red-200 text-red-950">
                    <span className="text-red-700 font-bold">[{i + 1}]</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-[#141414] bg-[#EBE9E4] p-4 rounded-none shadow-[2px_2px_0px_rgba(20,20,20,1)]">
              <div className="flex justify-between items-center border-b border-[#141414] pb-2 mb-3">
                <h4 className="text-[11px] font-mono uppercase text-[#141414] font-black flex items-center gap-1.5 leading-none">
                  <Sparkles className="w-4 h-4 text-[#141414]" />
                  Credit Elasticity & Improvement Guide
                </h4>
                <span className="text-[8px] font-mono bg-white px-1.5 py-0.5 border border-[#141414] uppercase font-bold text-emerald-800">
                  Advisory
                </span>
              </div>
              <p className="text-[10px] text-gray-650 font-sans mb-3 leading-relaxed">
                Recommended adjustments to shift this applicant into a lower risk pricing band or boost FICO equivalents:
              </p>
              <div className="space-y-2">
                {getImprovementElasticity().map((act, i) => (
                  <div key={i} className="bg-white p-2.5 border border-[#141414] text-[10px] font-mono space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-[#141414]">
                      <span>{act.title}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-1 border border-emerald-200 text-[9px]">
                        {act.scoreGap}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-500 leading-normal font-sans">{act.text}</p>
                    <div className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">
                      Impact Index: {act.metricGap}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: P2P Portfolio Simulator Ledger & Statistics Board */}
          <div className="lg:col-span-7 space-y-5">
            <div className="border border-[#141414] bg-[#141414] text-[#E4E3E0] p-5 rounded-none shadow-[4px_4px_0px_rgba(20,20,20,1)]">
              <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                <div>
                  <h4 className="text-xs font-mono uppercase text-white font-black flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    P2P Portfolio Investment Ledger
                  </h4>
                  <p className="text-[9px] text-gray-400 font-mono mt-0.5">Aggregate performance metrics and expected loss analysis</p>
                </div>
                <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 border border-emerald-850 uppercase font-bold text-center">
                  Active Simulation
                </span>
              </div>

              {/* Portfolio Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 font-mono text-[10px] text-slate-200">
                <div className="bg-zinc-900 border border-zinc-800 p-2.5 text-center">
                  <span className="text-[8px] text-gray-450 block uppercase mb-1 font-bold">Total Capital</span>
                  <strong className="text-xs font-black text-white">
                    {symbol}{Math.round(portfolioStats.totalVolume * rate).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-2.5 text-center">
                  <span className="text-[8px] text-gray-450 block uppercase mb-1 font-bold">Blended PD</span>
                  <strong className="text-xs font-black text-red-400">
                    {portfolioStats.weightedPD.toFixed(2)}%
                  </strong>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-2.5 text-center">
                  <span className="text-[8px] text-gray-450 block uppercase mb-1 font-bold">Weighted Yield</span>
                  <strong className="text-xs font-black text-emerald-400">
                    {portfolioStats.weightedYield.toFixed(2)}%
                  </strong>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-2.5 text-center">
                  <span className="text-[8px] text-gray-450 block uppercase mb-1 font-bold">Expected Return</span>
                  <strong className={`text-xs font-black ${portfolioStats.netExpectedReturn >= 0 ? 'text-[#86efac]' : 'text-red-400'}`}>
                    {portfolioStats.netExpectedReturn.toFixed(2)}%
                  </strong>
                </div>
              </div>

              {/* Portfolio table of logged notes */}
              {portfolioLedger.length === 0 ? (
                <div className="border border-dashed border-gray-750 p-6 text-center text-gray-500 font-mono text-[11px]">
                  No active loan notes logged. Re-configure underwriting inputs and click "Add Note to Simulated Portfolio" to model investment cohorts.
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-800 bg-zinc-950 font-mono text-[10px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-gray-400 border-b border-zinc-800">
                        <th className="p-2.5 text-[9px] uppercase font-bold">Alias ID</th>
                        <th className="p-2.5 text-[9px] uppercase font-bold text-right">Loan Amount</th>
                        <th className="p-2.5 text-[9px] uppercase font-bold text-center">Grade</th>
                        <th className="p-2.5 text-[9px] uppercase font-bold text-right">Yield</th>
                        <th className="p-2.5 text-[9px] uppercase font-bold text-right">PD Score</th>
                        <th className="p-2.5 text-[9px] uppercase font-bold text-center">Status</th>
                        <th className="p-2.5 text-[9px] uppercase font-bold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-slate-200">
                      {portfolioLedger.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-900/50">
                          <td className="p-2.5 font-bold text-white">{item.alias}</td>
                          <td className="p-2.5 text-right font-semibold">{symbol}{Math.round(item.loan_amnt * rate).toLocaleString()}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-1.5 py-0.5 bg-zinc-805 border border-zinc-700 text-white font-bold rounded-xs">
                              {item.grade}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-semibold text-emerald-400">{item.int_rate}%</td>
                          <td className="p-2.5 text-right font-medium text-red-300">{(item.pd*100).toFixed(1)}%</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-1.5 py-0.2 text-[8px] font-bold ${item.decision === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-900' : 'bg-red-950 text-red-300 border border-red-900'}`}>
                              {item.decision}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeFromPortfolioLedger(item.id)}
                              className="text-red-450 hover:text-red-300 hover:scale-110 active:scale-95 transition-all text-[9px] px-1 cursor-pointer"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-[9px] text-gray-500 font-mono mt-3 leading-normal border-t border-zinc-850 pt-2 text-justify italic">
                * Note on simulations: Portfolio yields assume monotonic linear default write-off conditions with 100% loss-given-default (LGD) factors. Returns reflect simulated peer-to-peer modeling benchmarks only.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Dynamic Credit Decision Modal popup as regulatory submission letter */}
      {decisionVisible && (
        <div className="fixed inset-0 bg-[#141414]/75 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-fade-in" id="credit-decision-modal">
          <div className="bg-[#EBE9E4] border-2 border-[#141414] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 flex flex-col justify-between rounded-none shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
            
            {/* Header */}
            <div className="border-b-2 border-[#141414] pb-4 mb-6 flex justify-between items-start">
              <div>
                <h3 className="text-md sm:text-lg font-serif italic text-[#141414] font-bold" id="decision-modal-title">
                  Official Credit Risk Decision Report
                </h3>
                <p className="text-[9px] font-mono text-gray-600 uppercase tracking-tight">
                  LENDINGCLUB ANALYTICS SOLVENCY SYSTEM • BASEL II FRAMEWORK
                </p>
              </div>
              <button
                type="button"
                id="close-decision-modal"
                onClick={() => setDecisionVisible(false)}
                className="text-xs font-mono border border-[#141414] bg-white px-2 py-0.5 hover:bg-[#141414] hover:text-white transition-all cursor-pointer"
              >
                [ESC CLOSE]
              </button>
            </div>

            {/* Decision Showcase Accent */}
            <div className="mb-6">
              {lrResult && lrResult.score >= 580 ? (
                <div className="border bg-emerald-50 border-emerald-500 p-5 text-emerald-950 text-center" id="decision-approved-card">
                  <div className="inline-block px-3 py-1 bg-emerald-800 text-white font-mono text-[10px] uppercase tracking-widest font-black mb-2.5">
                    CREDIT APPROVAL CALIBRATED
                  </div>
                  <h4 className="text-lg font-serif italic font-bold">Approved for Underwriting</h4>
                  <p className="text-[11px] text-emerald-800 mt-2 max-w-sm mx-auto font-sans leading-relaxed">
                    The applicant meets the Basel liquidity and solvency ratio limits. Credit Score of <strong className="font-mono">{lrResult.score} PTS</strong> indicates acceptable default probability (PD: {(lrResult.probabilityOfDefault * 100).toFixed(2)}%).
                  </p>
                </div>
              ) : (
                <div className="border bg-red-50 border-red-500 p-5 text-red-950 text-center" id="decision-denied-card">
                  <div className="inline-block px-3 py-1 bg-red-800 text-white font-mono text-[10px] uppercase tracking-widest font-black mb-2.5">
                    ADVERSE ACTION REGULATORY WARNING
                  </div>
                  <h4 className="text-lg font-serif italic font-bold">Application Denied / High Risk</h4>
                  <p className="text-[11px] text-red-800 mt-2 max-w-sm mx-auto font-sans leading-relaxed">
                    Applicant scored <strong className="font-mono">{lrResult?.score || 300} PTS</strong>. This fails the minimum regulatory stress check requirement. Under § 615 of FCRA, credit tier cannot be funded at standard rates due to premium leverage constraints.
                  </p>
                </div>
              )}
            </div>

            {/* Structured details parameters */}
            <div className="space-y-3 font-mono text-xs mb-6 bg-white border border-[#141414] p-4 text-gray-900" id="decision-modal-metrics">
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500">Requested Loan Principal:</span>
                <span className="font-bold text-blue-900">{symbol}{Math.round(app.loan_amnt * rate).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500">Applicant Income coverage:</span>
                <span className="font-bold">{symbol}{Math.round(app.annual_inc * rate).toLocaleString()} / Yr</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500">Debt-to-Income (DTI):</span>
                <span className="font-bold">{app.dti}%</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500">Assigned Interest Yield:</span>
                <span className="font-bold">{app.int_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500">Model Credit Grade:</span>
                <span className="font-bold">Grade {app.grade}</span>
              </div>
              <div className="flex justify-between pt-0.5 font-bold">
                <span className="text-gray-500">Estimated Loss Gain ratio:</span>
                <span className="text-[#141414]">
                  {xgbResult ? (xgbResult.probabilityOfPaid / xgbResult.probabilityOfDefault).toFixed(1) : '0.0'}:1
                </span>
              </div>
            </div>

            {/* Legal / Regulatory Disclaimer */}
            <div className="text-[10px] text-gray-650 leading-relaxed space-y-2 border-t border-gray-300 pt-4 font-sans border-dashed text-justify">
              <p>
                <strong>Equal Credit Opportunity Act (ECOA) Statement:</strong> This credit decision was formulated purely based on statistical mathematical scorecards (Basel guidelines) mapping continuous financial risk factors. Variables representing protected statuses such as race, gender, age, or marital status are strictly omitted from the model datasets.
              </p>
              <p className="text-gray-500 italic mt-1 font-mono text-[9px] text-left">
                Report Signature Key: SOLVENCY-CHECK-SECURE-PASSED
              </p>
            </div>

            {/* Back button */}
            <button
              type="button"
              id="confirm-close-decision"
              onClick={() => setDecisionVisible(false)}
              className="mt-6 w-full py-2.5 bg-[#141414] hover:bg-gray-800 text-white font-mono text-[11px] uppercase cursor-pointer rounded-none tracking-wider font-extrabold"
            >
              Acknowledge & Back to Underwriting
            </button>

          </div>
        </div>
      )}

      {/* NEW FEATURE 3: COMPLIANCE DOSSIER MEMORANDUM & PRINTABLE AUDIT REPORT OVERLAY */}
      {dossierVisible && (
        <div className="fixed inset-0 bg-[#141414]/75 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto" id="compliance-dossier-modal">
          <div className="bg-white border-2 border-[#141414] max-w-2xl w-full p-6 md:p-8 flex flex-col rounded-none shadow-[6px_6px_0px_0px_rgba(20,20,20,1)] my-8">
            
            {/* Memorandum Header banner */}
            <div className="border-b-4 border-[#141414] pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-mono font-bold bg-[#141414] text-white px-2 py-0.5 uppercase tracking-widest block w-fit mb-1.5">
                    INTERNAL AUDIT RECORD • LEVEL 3 CLASSIFIED
                  </span>
                  <h3 className="text-lg sm:text-xl font-serif italic text-gray-950 font-black">
                    Underwriting Compliance Memorandum
                  </h3>
                  <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mt-0.5">
                    LENDINGCLUB RISK CONTROL MANAGEMENT • ECOA TITLE VI PROTOCOL
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDossierVisible(false)}
                  className="text-[10px] font-mono border border-gray-300 hover:border-[#141414] text-gray-400 hover:text-[#141414] px-2.5 py-1.5 transition-all cursor-pointer bg-white"
                >
                  [CLOSE MEMO]
                </button>
              </div>

              {/* Memo To/From parameters */}
              <div className="grid grid-cols-2 gap-4 mt-5 pt-3 border-t border-dashed border-gray-300 font-mono text-[10.5px]">
                <div>
                  <p><strong className="text-gray-900 font-bold">TO:</strong> Bank Solvency & Credit Risk Committee</p>
                  <p><strong className="text-gray-900 font-bold">FROM:</strong> Principal Credit Officer (dhruvtickoo21@gmail.com)</p>
                </div>
                <div>
                  <p><strong className="text-gray-900 font-bold">DATE:</strong> {new Date().toLocaleDateString()} (Active Audit)</p>
                  <p><strong className="text-gray-900 font-bold">REF:</strong> MEMO-DOSSIER-#{Math.floor(1000 + Math.random() * 8999)}</p>
                </div>
              </div>

              {/* Iframe warning notice box */}
              <div className="mt-4 p-3 border border-amber-300 bg-amber-50/50 text-[10px] sm:text-[10.5px] font-mono text-amber-900 leading-normal">
                <strong>⚠️ SANDBOX RUNTIME PRINT NOTICE:</strong><br/>
                Direct in-frame printing (<code className="bg-amber-100 px-0.5">window.print()</code>) is restricted by modern browser security policies when running inside a preview iframe. To print/save as PDF cleanly, click the <strong>"Download PDF-Ready HTML"</strong> button below, open that file, and print from there, or open the app in a <strong>New Tab</strong> (using the arrow in the top right of the previewer) and print!
              </div>
            </div>

            {/* Memorandum Body */}
            <div className="space-y-5 text-xs text-gray-800 leading-normal font-sans">
              
              {/* Section 1 */}
              <div>
                <h4 className="text-[10px] font-mono uppercase text-[#141414] font-black tracking-widest border-b border-gray-300 pb-1 mb-2">
                  I. Executive Application Parameters
                </h4>
                <div className="bg-gray-50 border border-gray-300 p-4 font-mono text-[11px] grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-gray-400 text-[9px] block">LOAN AMOUNT</span>
                    <strong className="text-gray-900 font-bold">{symbol}{Math.round(app.loan_amnt * rate).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[9px] block">ANNUAL INCOME</span>
                    <strong className="text-gray-900 font-bold">{symbol}{Math.round(app.annual_inc * rate).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[9px] block">DTI RATIO</span>
                    <strong className="text-gray-900 font-bold">{app.dti}%</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[9px] block">INTEREST TIY</span>
                    <strong className="text-gray-900 font-bold">{app.int_rate}%</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[9px] block">RISK TIER</span>
                    <strong className="text-gray-900 font-bold">GRADE {app.grade}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[9px] block">LOAN TERM</span>
                    <strong className="text-gray-900 font-bold">{app.term} Months</strong>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h4 className="text-[10px] font-mono uppercase text-[#141414] font-black tracking-widest border-b border-gray-300 pb-1 mb-2">
                  II. Multi-Model Scoring Metrics & Loss Ratios
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[10px]">
                  <div className="border border-gray-200 p-3 bg-white">
                    <span className="text-[8px] text-gray-500 uppercase block">Logistic Regression</span>
                    <p className="text-sm font-bold mt-1 text-emerald-800">{lrResult?.score || 300} PTS</p>
                    <p className="text-[9px] text-gray-400 mt-1">PD: {(lrResult?.probabilityOfDefault || 0.1 * 100).toFixed(2)}%</p>
                  </div>
                  
                  <div className="border border-gray-200 p-3 bg-white">
                    <span className="text-[8px] text-gray-500 uppercase block">XGBoost Ensemble</span>
                    <p className="text-sm font-bold mt-1 text-[#141414]">{(xgbResult?.probabilityOfPaid || 0.9 * 100).toFixed(1)}% PAID</p>
                    <p className="text-[9px] text-gray-400 mt-1">Hazard Index: {xgbResult ? (xgbResult.probabilityOfPaid / xgbResult.probabilityOfDefault).toFixed(1) : '0'}:1</p>
                  </div>

                  <div className="border border-gray-200 p-3 bg-white">
                    <span className="text-[8px] text-gray-500 uppercase block">Decision Tree Rating</span>
                    <p className="text-sm font-bold mt-1 text-red-800">{dtResult?.rating || 'D-F'}</p>
                    <p className="text-[9px] text-gray-400 mt-1">Prob Paid: {(dtResult?.probPaid || 0 * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h4 className="text-[10px] font-mono uppercase text-[#141414] font-black tracking-widest border-b border-gray-300 pb-1 mb-2">
                  III. Regulation B Adverse Action Indicators
                </h4>
                <ul className="space-y-2.5 font-mono text-[10.5px]">
                  {getDynamicAdverseActions().map((reason, i) => (
                    <li key={i} className="flex gap-2 items-start bg-gray-50 p-2 border border-gray-200 text-gray-900">
                      <span className="text-[#141414] font-bold">[{i + 1}]</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 4 */}
              <div className="border-t border-gray-300 pt-3 text-[10px] leading-relaxed text-gray-500 italic text-justify font-mono">
                <p>
                  This memorandum serves as a formal electronic attestation of credit eligibility evaluation. The scoring calculations conform strictly with Title VII of the Consumer Credit Protection Act, the financial underwriting limits of LendingClub solvency mandates, and the Basel II liquidity directives.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-5 pt-3 border-t border-dashed border-gray-200 text-[9.5px]">
                  <div>
                    <span className="block text-gray-400">MEMO VERIFICATION CORE</span>
                    <strong className="block text-gray-700 font-black">HASH-KEY: B90-FICO-F24</strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-gray-400">AUTHORIZED SYSTEM SIGNATURE</span>
                    <strong className="block text-[#141414] font-black underline uppercase">LendingClub Risk Engine</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Print and Download Action Buttons */}
            <div className="mt-8 pt-4 border-t border-gray-300 grid grid-cols-1 md:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  const dossierObj = {
                    metadata: {
                      title: "Compliance Memorandum Underwriting Audit Dossier",
                      organization: "LendingClub Risk Solutions",
                      timestamp: new Date().toISOString(),
                      underwriter_id: "dhruvtickoo21@gmail.com"
                    },
                    applicant: app,
                    models: {
                      logistic_regression_scorecard: lrResult,
                      decision_tree_classifier: dtResult,
                      xgboost_ensemble_model: xgbResult
                    },
                    eco_adverse_action_codes: getDynamicAdverseActions(),
                    improvement_elasticity_recommendations: getImprovementElasticity()
                  };
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dossierObj, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `lendingclub_underwriting_audit_${app.grade}_${Date.now()}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="w-full py-2.5 px-3 bg-[#EBE9E4] hover:bg-[#D6D5D2] text-[#141414] font-mono text-[10px] sm:text-xs uppercase font-extrabold flex items-center justify-center gap-1.5 rounded-none transition-all cursor-pointer border border-[#141414] shadow-[1px_1px_0px_rgba(20,20,20,1)] hover:-translate-y-0.5 active:translate-y-0"
                title="Download full structural report parameters as JSON"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                Raw JSON
              </button>

              <button
                type="button"
                onClick={downloadHtmlDossier}
                className="w-full py-2.5 px-3 bg-emerald-800 hover:bg-emerald-700 text-white font-mono text-[10px] sm:text-xs uppercase font-extrabold flex items-center justify-center gap-1.5 rounded-none transition-all cursor-pointer border border-emerald-950 shadow-[2px_2px_0px_rgba(20,20,20,1)] hover:-translate-y-0.5 active:translate-y-0 text-center"
                title="Download highly styled document with print script triggers"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-300" />
                Dossier (Save PDF)
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 px-3 bg-[#141414] hover:bg-zinc-800 text-white font-mono text-[10px] sm:text-xs uppercase font-extrabold flex items-center justify-center gap-1.5 rounded-none transition-all cursor-pointer border border-[#141414] shadow-[2px_2px_0px_rgba(20,20,20,1)] hover:-translate-y-0.5 active:translate-y-0"
                title="Trigger standard print action (iframe sandboxing issues may block this)"
              >
                <Printer className="w-3.5 h-3.5 text-gray-300" />
                Print (Iframe)
              </button>

              <button
                type="button"
                onClick={() => setDossierVisible(false)}
                className="w-full py-2.5 px-3 bg-white hover:bg-gray-100 text-[#141414] font-mono text-[10px] sm:text-xs uppercase border border-gray-450 hover:border-[#141414] rounded-none transition-all cursor-pointer text-center"
              >
                [X] Close Memo
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

