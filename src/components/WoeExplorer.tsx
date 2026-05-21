import { useState } from 'react';
import { WOE_TABLES, INFORMATION_VALUES } from '../modelsData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { HelpCircle, Sparkles } from 'lucide-react';

interface BinInfo {
  category: string;
  count: number;
  badRate: number;
  woe: number;
  iv: number;
}

export default function WoeExplorer() {
  const [selectedVar, setSelectedVar] = useState<'grade' | 'home_ownership' | 'verification_status' | 'purpose'>('grade');

  const binData = WOE_TABLES[selectedVar];
  const ivValue = INFORMATION_VALUES[selectedVar];

  // Helper to determine IV strength description
  const getIvStrength = (iv: number) => {
    if (iv < 0.02) return { text: 'Useless or Suspect', color: 'text-amber-800 bg-amber-100 border border-amber-300' };
    if (iv < 0.1) return { text: 'Weak Predictor', color: 'text-yellow-800 bg-yellow-101 border border-yellow-300' };
    if (iv < 0.3) return { text: 'Medium Predictor', color: 'text-blue-800 bg-blue-100 border border-blue-200' };
    if (iv < 0.5) return { text: 'Strong Predictor (Ideal)', color: 'text-[#141414] bg-emerald-100 border border-emerald-300' };
    return { text: 'Suspiciously Strong (Severe Leakage threat)', color: 'text-rose-800 bg-rose-100 border border-rose-300' };
  };

  const ivStrength = getIvStrength(ivValue);

  return (
    <div className="bg-[#EBE9E4] border border-[#141414] rounded-none overflow-hidden">
      <div className="p-5 border-b border-[#141414] bg-[#D6D5D2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-md font-serif italic text-gray-900 font-bold flex items-center gap-1.5">
            Weight of Evidence (WoE) & Information Value (IV) Explorer
          </h2>
          <p className="text-[10px] text-gray-700 uppercase font-mono tracking-tight">
            Regulatory preprocessing for peer-to-peer default limits (Basel II / IFRS 9)
          </p>
        </div>
        <div className="flex bg-[#E4E3E0] p-1 border border-[#141414] rounded-none self-start sm:self-center">
          {(['grade', 'home_ownership', 'verification_status', 'purpose'] as const).map((v) => (
            <button
              key={v}
              id={`woe-tab-${v}`}
              onClick={() => setSelectedVar(v)}
              className={`px-3 py-1 text-[11px] font-mono uppercase tracking-tight transition-all cursor-pointer ${
                selectedVar === v ? 'bg-[#141414] text-white' : 'text-gray-700 hover:text-[#141414]'
              }`}
            >
              {v.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Calculations & Description */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-mono uppercase text-gray-500 font-extrabold">Information Value Profile</div>
              <div className={`px-2 py-0.5 font-mono text-[10px] uppercase ${ivStrength.color}`}>
                {ivStrength.text}
              </div>
            </div>

            <div>
              <div className="text-3xl font-mono font-bold text-gray-950">
                {ivValue.toFixed(4)}
              </div>
              <p className="text-[10px] text-gray-600 uppercase mt-1 font-mono">
                Total Information Value (IV) for {selectedVar.replace('_', ' ')}
              </p>
            </div>

            <div className="bg-white border border-[#141414] p-4 text-xs leading-relaxed text-gray-800">
              <HelpCircle className="w-5 h-5 text-blue-900 flex-shrink-0 mb-1" />
              <div>
                <p className="font-serif italic font-bold text-gray-900 mb-1 text-[13px]">Why do institutions use WoE binning?</p>
                <p className="mb-2 font-sans">
                  Traditional Logistic Regression has difficulty with non-linear distributions. <strong>Weight of Evidence (WoE)</strong> maps categories and physical intervals to continuous metrics representing <strong>Log-Odds</strong> of payment.
                </p>
                <p className="font-sans">
                  This scales variables linearly, isolates the influence of outliers, resolves missing parameters efficiently, and aligns perfectly with Basel modeling mandates.
                </p>
              </div>
            </div>

            <div className="bg-[#E4E3E0] border border-[#141414] p-4 text-xs text-gray-950">
              <Sparkles className="w-5 h-5 text-gray-800 flex-shrink-0 mb-1" />
              <div>
                <span className="font-serif italic font-bold block mb-0.5">Basel & IFRS 9 Compliant Formula:</span>
                <span className="font-mono text-[11px] block bg-white px-2 py-1.5 border border-[#141414] mt-1 mb-2 text-center">
                  WoE_i = ln(Good_Dist_i / Bad_Dist_i)
                </span>
                <p className="text-[11px] leading-normal font-sans text-gray-800">
                  Positive WoE implies lower default risk than the portfolio mean; negative WoE indicates a high concentration of write-offs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Chart & Table */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h4 className="text-[10px] font-mono uppercase text-gray-500 font-extrabold mb-3 tracking-wide">
              Weight of Evidence (WoE) Distribution Chart
            </h4>
            <div className="h-48 w-full bg-white p-4 border border-[#141414]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={binData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="category" stroke="#141414" fontSize={10} tickLine={false} />
                  <YAxis stroke="#141414" fontSize={10} tickLine={false} />
                  <ReferenceLine y={0} stroke="#141414" />
                  <Tooltip
                    cursor={{ fill: '#E4E3E0' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as BinInfo;
                        return (
                          <div className="bg-[#141414] text-white p-2.5 text-xs font-mono border border-[#141414]">
                            <p className="font-sans font-bold border-b border-gray-700 pb-1 mb-1 text-blue-300">
                              Bin: {d.category}
                            </p>
                            <p>Default rate: {(d.badRate * 100).toFixed(1)}%</p>
                            <p>WoE: {d.woe.toFixed(3)}</p>
                            <p>IV contribution: {d.iv.toFixed(4)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="woe">
                    {binData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.woe >= 0 ? '#1e40af' : '#b91c1c'}
                        fillOpacity={0.9}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#141414]">
            <table className="min-w-full text-xs font-mono bg-white">
              <thead className="bg-[#D6D5D2] text-[#141414] uppercase tracking-wider border-b border-[#141414]">
                <tr>
                  <th className="px-4 py-2 text-left font-mono text-[10px] font-bold border-r border-[#141414]">Subgroup Bin</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] font-bold border-r border-[#141414]">Total Loans</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] font-bold border-r border-[#141414]">Default Rate</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] font-bold border-r border-[#141414]">WoE Value</th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] font-bold">IV Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414] text-[#141414]">
                {binData.map((row) => (
                  <tr key={row.category} className="hover:bg-[#E4E3E0] transition-colors">
                    <td className="px-4 py-2.5 font-bold font-serif italic text-[#141414] border-r border-[#141414]">{row.category}</td>
                    <td className="px-4 py-2.5 text-right border-r border-[#141414]">{row.count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right border-r border-[#141414] font-medium">
                      {(row.badRate * 100).toFixed(1)}%
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold border-r border-[#141414] ${row.woe >= 0 ? 'text-blue-900' : 'text-red-800'}`}>
                      {row.woe >= 0 ? '+' : ''}{row.woe.toFixed(3)}
                    </td>
                    <td className="px-4 py-2.5 text-right">{row.iv.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
