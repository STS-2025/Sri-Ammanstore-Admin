import React from 'react';
import { Layers, Database, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { COLLECTION_METADATA } from '../../firebase/collections';

export const PhasePlaceholder = ({
  moduleName,
  targetPhase = 'Phase 2',
  description,
  plannedFeatures = [],
  affectedCollections = [],
  requiredPermissions = [],
  breadcrumbs = []
}) => {
  return (
    <div>
      <PageHeader
        title={moduleName}
        subtitle={`${targetPhase} Operational Module`}
        breadcrumbs={breadcrumbs}
        badge={
          <span className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
            {targetPhase} Roadmap
          </span>
        }
      />

      <div className="space-y-6">
        {/* Module Scope Banner */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <Layers className="w-4 h-4" />
              <span>Architectural Foundation Ready</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{moduleName} Architecture</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {description ||
                `The technical infrastructure, route authorization, database schema definitions, and security rules for ${moduleName} are fully established. Full business workflows will be delivered in ${targetPhase}.`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 shrink-0 text-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Development Status
            </span>
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shell, Routes & Roles Bound</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Scheduled for implementation in {targetPhase}.
            </div>
          </div>
        </div>

        {/* Technical Specification Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Planned Features */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle flex flex-col">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-sm">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h4>Planned Capabilities</h4>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600 flex-1">
              {plannedFeatures.map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bound Firestore Collections */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle flex flex-col">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-sm">
              <Database className="w-4 h-4 text-blue-600" />
              <h4>Target Firestore Collections</h4>
            </div>
            <div className="space-y-2 flex-1">
              {affectedCollections.map((colName) => {
                const meta = COLLECTION_METADATA[colName];
                return (
                  <div
                    key={colName}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="font-mono font-semibold text-slate-800">{colName}</div>
                    {meta?.description && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{meta.description}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Required Permissions */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle flex flex-col">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <h4>Governing Permissions</h4>
            </div>
            <div className="space-y-2 flex-1">
              {requiredPermissions.map((perm) => (
                <div
                  key={perm}
                  className="p-2 rounded-lg bg-purple-50/60 border border-purple-100 text-xs"
                >
                  <span className="font-mono text-purple-900 font-semibold">{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
