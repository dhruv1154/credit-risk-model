import { useState } from 'react';
import { LOGISTIC_COEFFICIENTS, XGB_FEATURE_IMPORTANCE } from '../modelsData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Settings, HelpCircle, HardHat } from 'lucide-react';

export default function ModelExplorer() {
  const [activeTab, setActiveTab] = useState<'lr' | 'dt' | 'xgb'>('lr');

  // Sort coefficients to make bar chart pretty
  const sortedCoefs = [...LOGISTIC_COEFFICIENTS]
    .filter(c => c.feature !== 'Intercept')
    .sort((a, b) => b.coefficient - a.coefficient);

  const sortedImportance = [...XGB_FEATURE_IMPORTANCE].sort((a, b) => b.importance - a.importance);

  return (
    <div className="bg-[#EBE9E4] border border-[#141414] rounded-none overflow-hidden mb-6">
      <div className="p-5 border-b border-[#141414] bg-[#D6D5D2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-md font-serif italic text-gray-900 font-bold flex items-center gap-1.5">
            Model Interpretability & Feature Importance
          </h2>
          <p className="text-[10px] text-gray-700 uppercase font-mono tracking-tight">
            Glass box (interpretable) vs. Black box (performant) parameters comparison
          </p>
        </div>
        <div className="flex bg-[#E4E3E0] p-1 border border-[#141414] rounded-none self-start sm:self-center">
          <button
            onClick={() => setActiveTab('lr')}
            id="tab-lr-coef"
            className={`px-3 py-1 text-[11px] font-mono uppercase tracking-tight transition-all cursor-pointer ${
              activeTab === 'lr' ? 'bg-[#141414] text-white' : 'text-gray-700 hover:text-[#141414]'
            }`}
          >
            Logistic Coefs (WoE)
          </button>
          <button
            onClick={() => setActiveTab('dt')}
            id="tab-dt-rules"
            className={`px-3 py-1 text-[11px] font-mono uppercase tracking-tight transition-all cursor-pointer ${
              activeTab === 'dt' ? 'bg-[#141414] text-white' : 'text-gray-700 hover:text-[#141414]'
            }`}
          >
            Decision Tree Splits
          </button>
          <button
            onClick={() => setActiveTab('xgb')}
            id="tab-xgb-import"
            className={`px-3 py-1 text-[11px] font-mono uppercase tracking-tight transition-all cursor-pointer ${
              activeTab === 'xgb' ? 'bg-[#141414] text-white' : 'text-gray-700 hover:text-[#141414]'
            }`}
          >
            XGBoost Importances
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* LR Tab Content */}
        {activeTab === 'lr' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-500 font-extrabold pb-1 border-b border-[#141414]">
                  Log-Odds Coefficients Interpretation
                </h3>
                <p className="text-xs text-gray-800 leading-normal font-sans">
                  A <span className="font-bold underline text-blue-900">positive coefficient</span> increase raises the survival probability or repayment odds. For instance, high <strong>Grade WoE</strong> coefficients reflect prime solvency.
                </p>
                <p className="text-xs text-gray-800 leading-normal font-sans">
                  A <span className="font-bold underline text-red-700">negative coefficient</span> indicates a high default multiplier. High Debt-to-Income (DTI) or credit card inquiries act as penalization criteria during bank stress tests.
                </p>
              </div>

              <div className="bg-white border border-[#141414] p-4 text-xs font-mono">
                <div className="flex gap-2.5 items-start">
                  <Settings className="w-5 h-5 text-[#141414] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-serif italic font-bold text-gray-900 mb-1">Interview Advantage Tip:</p>
                    <p className="text-[11px] text-gray-800 leading-normal">
                      Regulators prefer Logistic Regression because coefficients are strictly <span className="font-bold">monotonic</span>. This guarantees that an applicant who raises their FICO can only improve their score, preventing random decision anomalies.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-extrabold">
                Normalized Magnitude of Coefficients
              </h4>
              <div className="h-64 w-full text-xs bg-white p-4 border border-[#141414]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedCoefs}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 35, bottom: 5 }}
                  >
                    <XAxis type="number" stroke="#141414" fontSize={10} tickLine={false} />
                    <YAxis dataKey="feature" type="category" stroke="#141414" fontSize={10} tickLine={false} width={130} />
                    <Tooltip
                      cursor={{ fill: '#E4E3E0' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono max-w-xs border border-[#141414]">
                              <p className="font-sans font-bold border-b border-gray-700 pb-1 mb-1 text-blue-300">
                                {d.feature}
                              </p>
                              <p>Coefficient: {d.coefficient.toFixed(3)}</p>
                              <p className="mt-1 font-sans text-gray-300 leading-normal text-[10px]">{d.meaning}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine x={0} stroke="#141414" strokeWidth={1} />
                    <Bar dataKey="coefficient">
                      {sortedCoefs.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.coefficient >= 0 ? '#1e40af' : '#b91c1c'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* DT Tab Content */}
        {activeTab === 'dt' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-500 font-extrabold pb-1 border-b border-[#141414]">
                  How Decision Trees Segment Credit Risk
                </h3>
                <p className="text-xs text-gray-800 leading-normal font-sans">
                  Decision trees divide borrowers by selecting features that maximize <strong>Gini Impurity reduction</strong> at each branch. 
                </p>
                <p className="text-xs text-gray-800 leading-normal font-sans">
                  Unlike additive scorecards, decision trees capture <strong>step-wise relationships</strong> automatically. Regulators appreciate them because tree splits map closely to underwriting rules.
                </p>
              </div>

              <div className="bg-white border border-[#141414] p-4 text-xs font-mono">
                <div className="flex gap-2.5 items-start">
                  <HelpCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-serif italic font-bold text-gray-900 mb-1">Decision Tree Limitations:</p>
                    <p className="text-[11px] text-gray-800 leading-normal">
                      Trees suffer from <span className="font-bold underline">high variance</span> and instability. A tiny shift in borrower datasets can rewrite the entire branching logic. We limit depth in banking to ensure cycle safety.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1" />

            <div className="lg:col-span-6 space-y-3">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-extrabold">
                Underwriting Decision Tree Splits
              </h4>
              <div className="relative border border-[#141414] bg-white p-6 flex flex-col items-center">
                
                <div className="bg-[#141414] text-white font-mono text-[10px] px-3 py-1.5 border border-[#141414] tracking-tight uppercase text-center">
                  <div className="font-bold text-blue-300">Root Node</div>
                  All Loans (Pd: 19.89%)
                </div>

                <div className="h-6 w-px bg-[#141414]" />

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="flex flex-col items-center border border-[#141414] bg-[#EBE9E4] p-3 text-center">
                     <div className="text-[9px] text-[#141414] uppercase font-mono font-bold mb-1">WoE Grade &lt; 0.2</div>
                     <span className="font-mono text-xs font-bold text-red-800 block">Subprime Bracket</span>
                     <div className="h-3 w-px bg-[#141414] my-1" />
                     <div className="text-[9px] font-mono text-gray-700 leading-tight">
                       High DTI, Multi-Inquiries
                       <div className="text-red-700 font-bold mt-1">PD ~ 42% (Default)</div>
                     </div>
                  </div>

                  <div className="flex flex-col items-center border border-[#141414] bg-[#EBE9E4] p-3 text-center">
                     <div className="text-[9px] text-[#141414] uppercase font-mono font-bold mb-1">WoE Grade &gt;= 0.2</div>
                     <span className="font-mono text-xs font-bold text-blue-800 block">Prime Bracket</span>
                     <div className="h-3 w-px bg-[#141414] my-1" />
                     <div className="text-[9px] font-mono text-gray-700 leading-tight">
                       Income &gt; $55K, 36M term
                       <div className="text-emerald-800 font-bold mt-1">PD ~ 4.4% (Elite Safe)</div>
                     </div>
                  </div>
                </div>

                <div className="mt-5 text-[10px] text-gray-700 font-mono text-center max-w-sm">
                  💡 Trace these bounds dynamically in the Sandbox panel.
                </div>

              </div>
            </div>
          </div>
        )}

        {/* XGBoost Tab Content */}
        {activeTab === 'xgb' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-gray-500 font-extrabold pb-1 border-b border-[#141414]">
                  XGBoost Feature Importance Explained
                </h3>
                <p className="text-xs text-gray-800 leading-normal font-sans">
                  As a gradient-boosted decision tree ensemble, XGBoost fits residuals sequentially. This allows it to capture <strong>non-linear interactions</strong> (collinear synergies) like "High revolving util + low FICO".
                </p>
                <p className="text-xs text-gray-800 leading-normal font-sans">
                  A feature's <strong>Gini Gain/Importance</strong> represents the fractional decrease in overall residual default loss directly attributable to splits using that specific variable.
                </p>
              </div>

              <div className="bg-white border border-[#141414] p-4 text-xs font-mono">
                <div className="flex gap-2.5 items-start">
                  <HardHat className="w-5 h-5 text-blue-900 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-serif italic font-bold text-gray-900 mb-1">Explainability Conflict (Shapley Values):</p>
                    <p className="text-[11px] text-gray-800 leading-normal">
                      Because ensembles are "black boxes", they require local attribution models like <span className="font-bold underline">SHAP (Shapley Values)</span> inside commercial risk pipelines to generate legal "Adverse Action Notices".
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-extrabold">
                XGBoost Gini Loss Reduction (Gain)
              </h4>
              <div className="h-64 w-full text-xs bg-white p-4 border border-[#141414]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedImportance}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 25, bottom: 5 }}
                  >
                    <XAxis type="number" stroke="#141414" fontSize={10} tickLine={false} />
                    <YAxis dataKey="feature" type="category" stroke="#141414" fontSize={10} tickLine={false} width={120} />
                    <Tooltip
                      cursor={{ fill: '#E4E3E0' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-[#141414] text-white p-2 text-xs font-mono border border-[#141414]">
                              <p className="font-sans font-bold text-blue-300">{d.feature}</p>
                              <p>Loss Gini reduction: {(d.importance * 100).toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="importance" fill="#141414" fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
