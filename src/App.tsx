import { useState } from 'react';
import { BookOpen, FileSpreadsheet, Percent, LayoutDashboard, BrainCircuit, Landmark } from 'lucide-react';
import MetricCards from './components/MetricCards';
import WoeExplorer from './components/WoeExplorer';
import ModelExplorer from './components/ModelExplorer';
import CreditScorecardSandbox from './components/CreditScorecardSandbox';
import MetricsChartTab from './components/MetricsChartTab';
import InterviewCoach from './components/InterviewCoach';

export default function App() {
  const [currentSection, setCurrentSection] = useState<'sandbox' | 'metrics' | 'woe' | 'coach'>('sandbox');
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR'>('INR');

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans selection:bg-[#141414] selection:text-white text-base md:text-[17px]">
      
      {/* Visual Top Navigation bar */}
      <header className="border-b border-[#141414] px-6 py-5 bg-[#E4E3E0] sticky top-0 z-50">
        <div className="max-w-[80%] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-[#141414] text-[#E4E3E0] font-mono px-1.5 py-0.5 rounded-xs tracking-widest uppercase">PD-XGB-2026</span>
              <span className="text-[10px] border border-[#141414] px-1.5 py-0.5 font-mono">REGULATORY COMPLIANT (IFRS 9)</span>
            </div>
            <h1 className="font-serif italic text-3xl leading-none text-[#141414]">LendingClub Risk Engine v4.2</h1>
            <p className="text-[10px] uppercase tracking-widest mt-2 opacity-60 font-mono">
              System Architecture: Probability Of Default (PD) Engine
            </p>
          </div>
          
          <div className="flex gap-6 text-left items-end">
            <div className="border-l border-[#141414] pl-4">
              <p className="text-[9px] uppercase font-extrabold tracking-wider opacity-60 font-mono">Dataset Hash</p>
              <p className="font-mono text-xs font-semibold">LC-2007-2018-SUB-100K</p>
            </div>
            
            <div className="border-l border-[#141414] pl-4">
              <p className="text-[9px] uppercase font-extrabold tracking-wider opacity-60 font-mono">Underwriting Currency</p>
              <div className="flex bg-[#EBE9E4] border border-[#141414] p-0.5 mt-0.5 rounded-none shadow-[1px_1px_0px_0px_rgba(20,20,20,1)]">
                <button
                  type="button"
                  id="header-currency-inr"
                  onClick={() => setCurrency('INR')}
                  className={`px-2 py-0.5 text-[9px] font-mono transition-all font-bold cursor-pointer rounded-none ${
                    currency === 'INR' ? 'bg-[#141414] text-white' : 'text-gray-650 hover:text-black hover:bg-gray-200'
                  }`}
                >
                  INR (₹)
                </button>
                <button
                  type="button"
                  id="header-currency-usd"
                  onClick={() => setCurrency('USD')}
                  className={`px-2 py-0.5 text-[9px] font-mono transition-all font-bold cursor-pointer rounded-none ${
                    currency === 'USD' ? 'bg-[#141414] text-white' : 'text-gray-650 hover:text-black hover:bg-gray-200'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  id="header-currency-eur"
                  onClick={() => setCurrency('EUR')}
                  className={`px-2 py-0.5 text-[9px] font-mono transition-all font-bold cursor-pointer rounded-none ${
                    currency === 'EUR' ? 'bg-[#141414] text-white' : 'text-gray-650 hover:text-black hover:bg-gray-200'
                  }`}
                >
                  EUR (€)
                </button>
              </div>
            </div>

            <div className="border-l border-[#141414] pl-4">
              <p className="text-[9px] uppercase font-extrabold tracking-wider opacity-60 font-mono">Environment Status</p>
              <p className="font-mono text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                PRODUCTION_READY
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main body Container */}
      <main className="flex-1 max-w-[80%] w-full mx-auto px-6 py-6 space-y-6">
        
        {/* Global executive baseline cards */}
        <MetricCards currency={currency} />


        {/* Dynamic section tabs */}
        <div className="flex border-b border-[#141414] overflow-x-auto gap-1">
          
          <button
            onClick={() => setCurrentSection('sandbox')}
            id="nav-sandbox"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-tight border-t border-x transition-all cursor-pointer ${
              currentSection === 'sandbox'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-[#D6D5D2]/50 text-gray-700 border-transparent hover:bg-[#D6D5D2] hover:text-gray-950'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Underwriting Sandbox
          </button>

          <button
            onClick={() => setCurrentSection('metrics')}
            id="nav-metrics"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-tight border-t border-x transition-all cursor-pointer ${
              currentSection === 'metrics'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-[#D6D5D2]/50 text-gray-700 border-transparent hover:bg-[#D6D5D2] hover:text-gray-950'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Performance & ROC
          </button>

          <button
            onClick={() => setCurrentSection('woe')}
            id="nav-woe"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-tight border-t border-x transition-all cursor-pointer ${
              currentSection === 'woe'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-[#D6D5D2]/50 text-gray-700 border-transparent hover:bg-[#D6D5D2] hover:text-gray-950'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            WoE & IV Metrics
          </button>

          <button
            onClick={() => setCurrentSection('coach')}
            id="nav-coach"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-tight border-t border-x transition-all cursor-pointer ${
              currentSection === 'coach'
                ? 'bg-[#141414] text-white border-[#141414]'
                : 'bg-[#D6D5D2]/50 text-gray-700 border-transparent hover:bg-[#D6D5D2] hover:text-gray-950'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Compliance Coach
          </button>

        </div>

        {/* Tab section dispatch */}
        <div className="space-y-6">
          {currentSection === 'sandbox' && (
            <>
              {/* Scorecard application inputs & predictive results container */}
              <CreditScorecardSandbox currency={currency} setCurrency={setCurrency} />
              
              {/* Feature model configurations and parameters exploration (LR / DT / XGB coefs) */}
              <ModelExplorer />
            </>
          )}

          {currentSection === 'metrics' && (
            <MetricsChartTab />
          )}

          {currentSection === 'woe' && (
            <WoeExplorer />
          )}

          {currentSection === 'coach' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Chat column */}
              <div className="lg:col-span-8">
                <InterviewCoach />
              </div>

              {/* Informative advice sidebar */}
              <div className="lg:col-span-4 bg-[#EBE9E4] border border-[#141414] p-5 space-y-4">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-[#141414] pb-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#141414]" />
                  Technical Interview Guide
                </div>
                
                <div className="text-[11px] leading-relaxed text-gray-800 space-y-3">
                  <p>
                    <strong className="text-gray-900 font-sans block mb-0.5">1. Explaining Logistic Regression</strong>
                    Interviewers often ask why deep learning isn't standard in banking. Ensure you explain that under <span className="font-bold">ECOA (Equal Credit Opportunity Act)</span>, institutions must supply monotonic decision transparent paths ("adverse action lines") for declines.
                  </p>
                  
                  <p>
                    <strong className="text-gray-900 font-sans block mb-0.5">2. Master Weight of Evidence</strong>
                    Be ready to write down formulas:
                    <span className="font-mono block bg-white border border-[#141414] px-2 py-1 text-[10px] my-1 font-bold">
                      WoE_i = ln(Good_i% / Bad_i%)
                    </span>
                    and explain why this converts non-linear attributes to monotonic parameters.
                  </p>

                  <p>
                    <strong className="text-gray-900 font-sans block mb-0.5">3. Calibration Factor Calibration</strong>
                    Explain scorecard linear points scaling:
                    <span className="font-mono block bg-white border border-[#141414] px-2 py-1 text-[10px] my-1 font-bold">
                      Factor = PDO / ln(2)
                    </span>
                    and how target scores are shifted according to expected bad rate target thresholds.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

      </main>

      {/* Corporate footer footer */}
      <footer className="h-10 mt-auto border-t border-[#141414] bg-[#141414] text-white flex items-center px-6 font-mono text-[10px] justify-between">
        <div className="flex gap-4">
          <span className="text-green-400 font-bold">$ pd_model.evaluate()</span>
          <span className="opacity-50 text-[9px]">SESSION ID: 7F-822-1A</span>
        </div>
        <div className="flex gap-4 items-center uppercase tracking-tighter">
          <span className="text-gray-400">Compliance Audit: PASSED</span>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-emerald-400 font-medium">Kernel Active</span>
        </div>
      </footer>

    </div>
  );
}

