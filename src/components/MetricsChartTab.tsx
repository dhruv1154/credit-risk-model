import { useState, useMemo } from 'react';
import { EVALUATION_CURVE_DATA, getConfusionMatrix } from '../modelsData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine
} from 'recharts';
import { Sliders, HelpCircle, LayoutGrid } from 'lucide-react';

export default function MetricsChartTab() {
  const [selectedModel, setSelectedModel] = useState<'Logistic Regression' | 'Decision Tree' | 'XGBoost'>('Logistic Regression');
  const [threshold, setThreshold] = useState<number>(0.50);

  // Dynamic calculations based on selected model and threshold
  const cmInfo = useMemo(() => {
    return getConfusionMatrix(selectedModel, threshold);
  }, [selectedModel, threshold]);

  // Find corresponding curve coordinates to overlay a highlight dot
  const currentPoint = useMemo(() => {
    // Round threshold to two decimals to match data indexing
    const index = Math.round(threshold * 100);
    const pt = EVALUATION_CURVE_DATA[index] || EVALUATION_CURVE_DATA[50];
    
    let fpr = pt.fpr_lr;
    let tpr = pt.tpr_lr;
    let rec = pt.recall_lr;
    let prec = pt.precision_lr;

    if (selectedModel === 'Decision Tree') {
      fpr = pt.fpr_dt;
      tpr = pt.tpr_dt;
      rec = pt.recall_dt;
      prec = pt.precision_dt;
    } else if (selectedModel === 'XGBoost') {
      fpr = pt.fpr_xgb;
      tpr = pt.tpr_xgb;
      rec = pt.recall_xgb;
      prec = pt.precision_xgb;
    }

    return { fpr, tpr, rec, prec };
  }, [selectedModel, threshold]);

  // Format percent helpers
  const toPct = (val: number) => `${(val * 100).toFixed(2)}%`;

  return (
    <div className="bg-[#EBE9E4] border border-[#141414] rounded-none overflow-hidden mb-6">
      <div className="p-5 border-b border-[#141414] bg-[#D6D5D2] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-md font-serif italic text-gray-900 font-bold flex items-center gap-1.5">
            Model Performance Metrics & Threshold Tuning
          </h2>
          <p className="text-[10px] text-gray-700 uppercase font-mono tracking-tight">
            Analyze ROC-AUC, Recall of defaults, and tune approval cut-offs on test fold (20K loans)
          </p>
        </div>
        
        {/* Model switcher */}
        <div className="flex bg-[#E4E3E0] p-1 border border-[#141414] rounded-none self-start md:self-center">
          {(['Logistic Regression', 'Decision Tree', 'XGBoost'] as const).map((model) => (
            <button
              key={model}
              id={`metrics-tab-${model.replace(' ', '-')}`}
              onClick={() => setSelectedModel(model)}
              className={`px-3 py-1 text-[11px] font-mono uppercase tracking-tight transition-all cursor-pointer ${
                selectedModel === model ? 'bg-[#141414] text-white font-bold' : 'text-gray-700 hover:text-[#141414]'
              }`}
            >
              {model}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Threshold slider controller */}
        <div className="mb-8 bg-[#E4E3E0] p-5 border border-[#141414] flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-gray-900">
              <Sliders className="w-4 h-4 text-blue-900" />
              Adjust Loan Approval Threshold: <span className="font-mono text-xs bg-white text-[#141414] border border-[#141414] px-2 py-0.5 ml-1 font-extrabold">{threshold.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-gray-750 leading-normal max-w-xl font-sans mt-1">
              We approve borrowers with calculated probability of repayment &ge; threshold. 
              <strong> High threshold</strong> minimizes defaults but rejects good borrowers. <strong>Low threshold</strong> maximizes revenue but incurs extreme credit write-off losses.
            </p>
          </div>
          <div className="w-full lg:w-96">
            <input
              type="range"
              min="0.01"
              max="0.99"
              step="0.01"
              id="threshold-slider"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-[#141414] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-1">
              <span>0.01 (High Volume/Lenient)</span>
              <span>0.99 (Conservative)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Confusion Matrix & Key Metrics */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-[10px] font-mono uppercase text-gray-500 tracking-wider font-extrabold mb-4 pb-1 border-b border-gray-400">
                Confusion Matrix on Test Set
              </h3>
              
              {/* Interactive Grid Confusion Matrix */}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto aspect-square mb-4 text-center">
                
                {/* TN (True Negatives) */}
                <div className="bg-white border border-[#141414] p-4 flex flex-col justify-between items-center bg-gray-50">
                  <div className="text-[9px] text-gray-600 font-mono uppercase font-bold">True Negatives<br />(Denied Bad)</div>
                  <div className="text-xl font-mono font-black text-[#141414]">{cmInfo.TN.toLocaleString()}</div>
                  <div className="text-[9px] border border-blue-200 text-blue-900 bg-blue-50 font-mono uppercase tracking-tight px-2 py-0.5 mt-1">
                    Caught Delinquency
                  </div>
                </div>

                {/* FP (False Positives) */}
                <div className="bg-white border border-[#141414] p-4 flex flex-col justify-between items-center bg-red-50/50">
                  <div className="text-[9px] text-red-900 font-mono uppercase font-bold">False Positives<br />(Funded Default)</div>
                  <div className="text-xl font-mono font-black text-red-800">{cmInfo.FP.toLocaleString()}</div>
                  <div className="text-[9px] border border-red-200 text-red-900 bg-red-100 font-mono uppercase tracking-tight px-2 py-0.5 mt-1">
                     Credit Write-Off
                  </div>
                </div>

                {/* FN (False Negatives) */}
                <div className="bg-white border border-[#141414] p-4 flex flex-col justify-between items-center bg-amber-50/50">
                  <div className="text-[9px] text-amber-900 font-mono uppercase font-bold">False Negatives<br />(Denied Good)</div>
                  <div className="text-xl font-mono font-black text-amber-800">{cmInfo.FN.toLocaleString()}</div>
                  <div className="text-[9px] border border-amber-200 text-amber-950 bg-amber-100 font-mono uppercase tracking-tight px-2 py-0.5 mt-1">
                    Opportunity Loss
                  </div>
                </div>

                {/* TP (True Positives) */}
                <div className="bg-white border border-[#141414] p-4 flex flex-col justify-between items-center bg-emerald-50/40">
                  <div className="text-[9px] text-emerald-950 font-mono uppercase font-bold">True Positives<br />(Funded Solvent)</div>
                  <div className="text-xl font-mono font-black text-emerald-800">{cmInfo.TP.toLocaleString()}</div>
                  <div className="text-[9px] border border-emerald-300 text-emerald-950 bg-emerald-100/60 font-mono uppercase tracking-tight px-2 py-0.5 mt-1">
                    Profit & Interest
                  </div>
                </div>

              </div>

              {/* Sub-text explaining actual profit/loss logic */}
              <div className="bg-white border border-[#141414] p-4 text-[10px] text-gray-800 font-mono">
                <div className="flex gap-2.5 items-start">
                  <LayoutGrid className="w-4 h-4 text-[#141414] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-serif italic font-bold text-gray-950 mb-0.5">Underwriting Outcomes:</p>
                    A false positive represents funding a loan to a borrower who defaults, leading to principal write-offs of up to 4x the value of interest profits earned on true positives!
                  </div>
                </div>
              </div>
            </div>

            {/* Side metrics table */}
            <div className="space-y-1.5 mt-4 border-t border-[#141414] pt-4 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-bold">Model Gini Index / ROC-AUC:</span>
                <span className="text-gray-900 font-extrabold">{cmInfo.rocAuc.toFixed(4)} (Gini: {cmInfo.gini}%)</span>
              </div>
              <div className="flex justify-between items-center border-t border-dashed border-gray-300 pt-1">
                <span className="text-gray-600 font-bold">Overall Precision (Good selection rate):</span>
                <span className="text-gray-900 font-extrabold">{toPct(cmInfo.precision)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-dashed border-gray-300 pt-1">
                <span className="text-gray-600 font-bold">Sensitivity / Recall (Solvent caught):</span>
                <span className="text-gray-900 font-extrabold">{toPct(cmInfo.recall)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#141414] pt-1 text-red-900 font-extrabold">
                <span>Default Avoidance Catch Rate:</span>
                <span className="text-red-700 font-bold">{toPct(cmInfo.defaultRecall)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-dashed border-gray-300 pt-1">
                <span className="text-gray-600 font-bold">Standard F1-Score:</span>
                <span className="text-gray-900 font-extrabold">{cmInfo.f1.toFixed(4)}</span>
              </div>
            </div>

          </div>

          {/* Right Column: ROC & Precision-Recall Curves */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* ROC AUC Chart */}
              <div>
                <h4 className="text-[10px] font-mono uppercase text-gray-500 mb-2 tracking-wide font-extrabold">
                  ROC Curve (FPR vs TPR)
                </h4>
                <div className="h-48 w-full bg-white border border-[#141414] p-3 text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={EVALUATION_CURVE_DATA}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#D6D5D2" />
                      <XAxis dataKey="fpr_lr" stroke="#141414" fontSize={9} tickLine={false} />
                      <YAxis stroke="#141414" fontSize={9} tickLine={false} />
                      
                      <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#999" strokeDasharray="3 3" />
                      
                      <Line
                        type="monotone"
                        dataKey={selectedModel === 'Logistic Regression' ? 'tpr_lr' : selectedModel === 'Decision Tree' ? 'tpr_dt' : 'tpr_xgb'}
                        stroke="#1e40af"
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                      />
                      
                      <ReferenceDot
                        x={currentPoint.fpr}
                        y={currentPoint.tpr}
                        r={5}
                        fill="#b91c1c"
                        stroke="#141414"
                        strokeWidth={1.5}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[10px] text-gray-700 text-center font-mono mt-2 uppercase tracking-tight">
                  FPR: {currentPoint.fpr.toFixed(2)} | TPR: {currentPoint.tpr.toFixed(2)}
                </div>
              </div>

              {/* PR Curve Chart */}
              <div>
                <h4 className="text-[10px] font-mono uppercase text-gray-500 mb-2 tracking-wide font-extrabold">
                  Precision-Recall Curve
                </h4>
                <div className="h-48 w-full bg-white border border-[#141414] p-3 text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={EVALUATION_CURVE_DATA}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#D6D5D2" />
                      <XAxis dataKey={selectedModel === 'Logistic Regression' ? 'recall_lr' : selectedModel === 'Decision Tree' ? 'recall_dt' : 'recall_xgb'} stroke="#141414" fontSize={9} tickLine={false} reversed />
                      <YAxis stroke="#141414" fontSize={9} tickLine={false} />
                      
                      <Line
                        type="monotone"
                        dataKey={selectedModel === 'Logistic Regression' ? 'precision_lr' : selectedModel === 'Decision Tree' ? 'precision_dt' : 'precision_xgb'}
                        stroke="#141414"
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                      />
                      
                      <ReferenceDot
                        x={currentPoint.rec}
                        y={currentPoint.prec}
                        r={5}
                        fill="#b91c1c"
                        stroke="#141414"
                        strokeWidth={1.5}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[10px] text-gray-700 text-center font-mono mt-2 uppercase tracking-tight">
                  Recall: {currentPoint.rec.toFixed(2)} | Precision: {currentPoint.prec.toFixed(2)}
                </div>
              </div>

            </div>

            <div className="bg-white border border-[#141414] p-4 text-xs font-mono leading-normal text-gray-800">
              <div className="flex gap-2.5 items-start">
                <HelpCircle className="w-5 h-5 text-blue-900 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-serif italic font-bold text-gray-900 mb-0.5">Quantitative Interview Insights:</p>
                  <p className="text-[11px]">
                    Explaining how <strong>Gini (2*AUC - 1)</strong> maps directly to the scorecard ranks, and how a CRO selects approval thresholds to meet Basel capital reserve expectations is what sets high-tier candidates apart.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
