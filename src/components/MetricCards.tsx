import { ShieldAlert, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';
import { DATASET_SUMMARY } from '../modelsData';

interface MetricCardsProps {
  currency: 'INR' | 'USD' | 'EUR';
}

export default function MetricCards({ currency = 'INR' }: MetricCardsProps) {
  const fpPct = ((DATASET_SUMMARY.targetDistribution.fullyPaid / DATASET_SUMMARY.totalPreparedRows) * 100).toFixed(2);
  const coPct = ((DATASET_SUMMARY.targetDistribution.chargedOff / DATASET_SUMMARY.totalPreparedRows) * 100).toFixed(2);


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#141414] bg-[#EBE9E4]">
      {/* Total Records card */}
      <div className="border-r border-b lg:border-b-0 border-[#141414] p-5 flex flex-col justify-between">
        <div>
          <p className="font-serif italic text-xs text-gray-800 mb-1">Historical Sample Volume</p>
          <p className="text-3xl font-mono tracking-tighter text-[#141414] font-bold">
            {DATASET_SUMMARY.totalPreparedRows.toLocaleString()}
          </p>
        </div>
        <p className="text-[10px] font-mono uppercase mt-2 opacity-60">LOANS LC-2007-2018</p>
      </div>

      {/* Fully Paid (Good) */}
      <div className="border-r border-b lg:border-b-0 border-[#141414] p-5 flex flex-col justify-between">
        <div>
          <p className="font-serif italic text-xs text-gray-800 mb-1">Solvent Accounts Rule</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-mono tracking-tighter text-blue-800 font-bold">{fpPct}%</span>
            <span className="text-[10px] font-mono text-gray-500">PAID</span>
          </div>
        </div>
        <p className="text-[10px] font-mono uppercase mt-2 opacity-60">
          {DATASET_SUMMARY.targetDistribution.fullyPaid.toLocaleString()} Solvent
        </p>
      </div>

      {/* Charged Off (Bad) */}
      <div className="border-r border-b md:border-b-0 border-[#141414] p-5 flex flex-col justify-between bg-red-100/30">
        <div>
          <p className="font-serif italic text-xs text-red-900 mb-1">Expected Default Rate</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-mono tracking-tighter text-red-800 font-bold">{coPct}%</span>
            <span className="text-[10px] font-mono text-gray-500">BOUNCED</span>
          </div>
        </div>
        <p className="text-[10px] font-mono uppercase mt-2 text-red-700/80 font-bold">
          {DATASET_SUMMARY.targetDistribution.chargedOff.toLocaleString()} defaults
        </p>
      </div>

      {/* Baselines */}
      <div className="p-5 flex flex-col justify-between">
        <div>
          <p className="font-serif italic text-xs text-gray-800 mb-1">Baseline Portfolio Risk</p>
          <div className="space-y-0.5 mt-1">
            <p className="text-xs font-mono font-medium text-gray-900">
              Avg FICO: <span className="font-bold underline">{DATASET_SUMMARY.averageFico}</span>
            </p>
            <p className="text-xs font-mono font-medium text-gray-900">
              Avg Income: <span className="font-bold underline">
                {currency === 'INR' 
                  ? '₹' + Math.round(DATASET_SUMMARY.averageIncome * 83).toLocaleString() 
                  : currency === 'EUR' 
                    ? '€' + Math.round(DATASET_SUMMARY.averageIncome * 0.92).toLocaleString() 
                    : '$' + DATASET_SUMMARY.averageIncome.toLocaleString()}
              </span>
            </p>
            <p className="text-xs font-mono font-medium text-gray-900">
              Interest: <span className="font-bold underline">{DATASET_SUMMARY.averageIntRate}%</span>
            </p>
          </div>
        </div>
        <p className="text-[10px] font-mono uppercase mt-2 opacity-60">Avg DTI: {DATASET_SUMMARY.averageDti}%</p>
      </div>
    </div>
  );
}

