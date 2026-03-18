import { type DCSData } from '@/lib/schemas';
import { CheckCircle2, AlertCircle, HelpCircle, FileText, Network, CheckSquare, TrendingUp, Users, Calendar, Cpu, Rocket, Lightbulb, Layers, BrainCircuit, Flag } from 'lucide-react';
import { MongoDBContributionSection } from '@/components/MongoDBContributionSection';
import { useState } from 'react';

interface DCSDisplayProps {
  dcsData: DCSData;
  accountName: string;
  onFlag?: (workloadId: string) => void;
}

/* ── Shared primitives ─────────────────────────────────── */

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, color = 'green' }: { icon: React.ReactNode; title: string; color?: string }) {
  const colors: Record<string, string> = {
    green:  'bg-green-700 text-white',
    blue:   'bg-blue-700 text-white',
    purple: 'bg-purple-700 text-white',
    indigo: 'bg-indigo-700 text-white',
    amber:  'bg-amber-600 text-white',
    slate:  'bg-slate-700 text-white',
  };
  return (
    <div className={`flex items-center gap-2 px-5 py-3 ${colors[color] ?? colors.green}`}>
      <span className="opacity-90">{icon}</span>
      <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function KVRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 px-5 py-3 border-t border-gray-50 first:border-t-0">
      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-gray-800">
          <span className="text-green-500 mt-1 flex-shrink-0">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'FOUND')   return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
  if (status === 'PARTIAL') return <HelpCircle   className="w-5 h-5 text-amber-500 flex-shrink-0" />;
  return                           <AlertCircle  className="w-5 h-5 text-red-500 flex-shrink-0" />;
}

/** Renders inline **bold** markers and auto-detects numbered / bulleted lists. */
function RichText({ text }: { text?: string }) {
  if (!text) return null;

  // Inline bold: split on **...**
  function renderInline(str: string) {
    const parts = str.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
    );
  }

  // Detect numbered list: token like "1. " appearing anywhere (handles "text. 1. item 2. item" patterns)
  const numberedRe = /(?:^|\s)(\d+)\.\s+/g;
  const hasNumberedList = (() => {
    const matches = [...text.matchAll(numberedRe)];
    return matches.length >= 2;
  })();

  if (hasNumberedList) {
    // Split into intro + list items
    // Find first occurrence of a number pattern to separate intro text
    const firstMatch = text.match(/(?:^|(?<=\s))1\.\s+/);
    const splitIdx = firstMatch?.index ?? 0;
    const intro = splitIdx > 0 ? text.slice(0, splitIdx).trim() : '';
    const listPart = splitIdx > 0 ? text.slice(splitIdx) : text;

    // Split list part on "N. " boundaries
    const items = listPart.split(/(?=\d+\.\s+)/).filter(Boolean).map(s => s.replace(/^\d+\.\s+/, '').trim());

    return (
      <div className="space-y-1.5">
        {intro && <p className="text-sm text-gray-800 mb-2">{renderInline(intro)}</p>}
        <ol className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-800">
              <span className="flex-shrink-0 font-semibold text-green-600 w-5">{i + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Plain text with possible inline bold
  return <span className="text-sm text-gray-800">{renderInline(text)}</span>;
}

/* ── Main component ────────────────────────────────────── */

function TechStackGroup({ label, items, indent = false }: {
  label: string;
  items: { name: string; summary: string }[];
  indent?: boolean;
}) {
  return (
    <div className={indent ? 'pl-2' : 'px-5 py-3'}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-baseline">
            <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{item.name}</span>
            <span className="text-gray-300 flex-shrink-0">—</span>
            <span className="text-sm text-gray-600">{item.summary}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DCSDisplay({ dcsData, accountName, onFlag }: DCSDisplayProps) {
  const { technical, commercial, strategy, mongodbContribution } = dcsData;
  const [showConfirm, setShowConfirm] = useState(false);
  const [flagging, setFlagging] = useState(false);

  const handleFlag = async () => {
    if (!onFlag) return;
    setFlagging(true);
    await onFlag(dcsData.workloadId);
    setFlagging(false);
    setShowConfirm(false);
  };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="text-center py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Discovery Capture Sheet</p>
        <h1 className="text-2xl font-bold text-gray-900">{accountName}</h1>
        {dcsData.workloadName && (
          <p className="text-sm text-gray-500 mt-1">{dcsData.workloadName}</p>
        )}
      </div>

      {/* ── Flag button ── */}
      {onFlag && (
        <div className="flex justify-end">
          {showConfirm ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm">
              <span className="text-red-800 font-medium">Mark as invalid? This workload was from a MongoDB employee example and will be hidden from your view.</span>
              <button
                onClick={handleFlag}
                disabled={flagging}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {flagging ? 'Marking…' : 'Yes, mark invalid'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1 bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-lg border border-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              Invalid — MongoDB Employee Example
            </button>
          )}
        </div>
      )}

      {/* ── Deal Strategy ── */}
      <SectionCard>
        <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Deal Strategy" color="green" />
        <dl>
          <KVRow label="Sales Motion" value={<RichText text={strategy.salesMotion} />} />
          <KVRow label="Tiger Sales Route" value={<RichText text={strategy.tigerSalesRoute} />} />
          {strategy.valueDrivers.length > 0 && (
            <KVRow
              label="Value Drivers"
              value={
                <div className="space-y-2">
                  {strategy.valueDrivers.map((vd, i) => (
                    <div key={i}>
                      <p className="text-sm font-semibold text-gray-700">{vd.category}</p>
                      <p className="text-sm text-gray-600">{vd.justification}</p>
                    </div>
                  ))}
                </div>
              }
            />
          )}
        </dl>
      </SectionCard>

      {/* ── 3 Whys ── */}
      <SectionCard>
        <SectionHeader icon={<HelpCircle className="w-4 h-4" />} title='The "3 Whys" Qualification Framework' color="blue" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Why Anything */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={strategy.threeWhys.whyAnything.status} />
              <h4 className="text-sm font-semibold text-gray-800">Why Anything?</h4>
            </div>
            {strategy.threeWhys.whyAnything.status !== 'MISSING' ? (
              <div className="space-y-2">
                {strategy.threeWhys.whyAnything.challenges.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Challenges</p>
                    <BulletList items={strategy.threeWhys.whyAnything.challenges} />
                  </div>
                )}
                {strategy.threeWhys.whyAnything.objectives.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Objectives</p>
                    <BulletList items={strategy.threeWhys.whyAnything.objectives} />
                  </div>
                )}
                {strategy.threeWhys.whyAnything.missingInfo && (
                  <p className="text-xs text-amber-700 italic">{strategy.threeWhys.whyAnything.missingInfo}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-red-600">Data missing</p>
                {strategy.threeWhys.whyAnything.missingInfo && (
                  <p className="text-xs text-red-500 mt-1">{strategy.threeWhys.whyAnything.missingInfo}</p>
                )}
              </div>
            )}
          </div>

          {/* Why MongoDB */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={strategy.threeWhys.whyMongoDB.status} />
              <h4 className="text-sm font-semibold text-gray-800">Why MongoDB?</h4>
            </div>
            {strategy.threeWhys.whyMongoDB.status !== 'MISSING' ? (
              <div className="space-y-2">
                {strategy.threeWhys.whyMongoDB.keyCapabilities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Capabilities</p>
                    <BulletList items={strategy.threeWhys.whyMongoDB.keyCapabilities} />
                  </div>
                )}
                {strategy.threeWhys.whyMongoDB.differentiators.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Differentiators</p>
                    <BulletList items={strategy.threeWhys.whyMongoDB.differentiators} />
                  </div>
                )}
                {strategy.threeWhys.whyMongoDB.missingInfo && (
                  <p className="text-xs text-amber-700 italic">{strategy.threeWhys.whyMongoDB.missingInfo}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-red-600">Data missing</p>
                {strategy.threeWhys.whyMongoDB.missingInfo && (
                  <p className="text-xs text-red-500 mt-1">{strategy.threeWhys.whyMongoDB.missingInfo}</p>
                )}
              </div>
            )}
          </div>

          {/* Why Now */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={strategy.threeWhys.whyNow.status} />
              <h4 className="text-sm font-semibold text-gray-800">Why Now?</h4>
            </div>
            {strategy.threeWhys.whyNow.status !== 'MISSING' ? (
              <div className="space-y-2">
                {strategy.threeWhys.whyNow.compellingEvent && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Compelling Event</p>
                    <p className="text-sm text-gray-800">{strategy.threeWhys.whyNow.compellingEvent}</p>
                  </div>
                )}
                {strategy.threeWhys.whyNow.businessImpactOfDelay && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Impact of Delay</p>
                    <p className="text-sm text-gray-800">{strategy.threeWhys.whyNow.businessImpactOfDelay}</p>
                  </div>
                )}
                {strategy.threeWhys.whyNow.missingInfo && (
                  <p className="text-xs text-amber-700 italic">{strategy.threeWhys.whyNow.missingInfo}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-red-600">Data missing</p>
                {strategy.threeWhys.whyNow.missingInfo && (
                  <p className="text-xs text-red-500 mt-1">{strategy.threeWhys.whyNow.missingInfo}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Discovery Coach */}
        {strategy.gapAnalysis.discoveryQuestions.length > 0 && (
          <div className="mx-5 mb-5 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4" />
              Discovery Coach — Suggested Questions for Next Call
            </h4>
            <ol className="space-y-1.5">
              {strategy.gapAnalysis.discoveryQuestions.map((q, i) => (
                <li key={i} className="text-sm text-gray-800 flex gap-2">
                  <span className="font-semibold text-amber-700 flex-shrink-0">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ol>
          </div>
        )}
      </SectionCard>

      {/* ── Use Case Summary ── */}
      <SectionCard>
        <SectionHeader icon={<FileText className="w-4 h-4" />} title="Use Case Summary" color="purple" />
        <dl>
          <KVRow label="Application Purpose" value={<RichText text={technical.useCaseSummary.applicationPurpose} />} />
          <KVRow label="Business Problem"    value={<RichText text={technical.useCaseSummary.businessProblem} />} />
          {technical.useCaseSummary.keyWorkflows.length > 0 && (
            <KVRow label="Key Workflows" value={<BulletList items={technical.useCaseSummary.keyWorkflows} />} />
          )}
          <KVRow label="Data Patterns"       value={<RichText text={technical.useCaseSummary.dataPatterns} />} />
          <KVRow label="Scale Characteristics" value={<RichText text={technical.useCaseSummary.scaleCharacteristics} />} />
        </dl>
      </SectionCard>

      {/* ── Data Flow Diagram ── */}
      <SectionCard>
        <SectionHeader icon={<Network className="w-4 h-4" />} title="Data Flow Diagram" color="indigo" />
        <div className="p-5 space-y-5">
          {/* Components */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">System Components</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {technical.dataFlowDiagram.components.map((c, i) => {
                const dot: Record<string, string> = {
                  Client: 'bg-blue-500', Service: 'bg-emerald-500',
                  Database: 'bg-purple-500', Integration: 'bg-orange-500',
                };
                return (
                  <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dot[c.type] ?? 'bg-gray-400'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400 mb-0.5">{c.type}</p>
                      <p className="text-xs text-gray-700">{c.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flows */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Data Flows</p>
            <div className="space-y-2">
              {technical.dataFlowDiagram.flows.map((flow, i) => (
                <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800">{flow.from}</span>
                    <span className="text-indigo-400">→</span>
                    <span className="text-sm font-semibold text-gray-800">{flow.to}</span>
                  </div>
                  <p className="text-sm text-gray-700">{flow.description}</p>
                  {flow.metrics && (
                    <p className="text-xs text-gray-500 mt-1 italic">Metrics: {flow.metrics}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Stakeholders ── */}
      <SectionCard>
        <SectionHeader icon={<Users className="w-4 h-4" />} title="Stakeholders" color="slate" />
        <div className="divide-y divide-gray-50">
          {commercial.stakeholders.map((sh, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_2fr] gap-4 px-5 py-3 text-sm">
              <span className="font-semibold text-gray-800">{sh.name}</span>
              <span className="text-gray-600">{sh.role}</span>
              <span className="text-gray-500">{sh.notes}</span>
            </div>
          ))}
          {commercial.stakeholders.length === 0 && (
            <p className="px-5 py-4 text-sm text-gray-400">No stakeholders identified.</p>
          )}
        </div>
      </SectionCard>

      {/* ── Timeline & Partners ── */}
      <SectionCard>
        <SectionHeader icon={<Calendar className="w-4 h-4" />} title="Timeline & Partners" color="green" />
        <dl>
          {commercial.timeline.targetGoLiveDate && (
            <KVRow label="Target Go-Live" value={commercial.timeline.targetGoLiveDate} />
          )}
          <KVRow label="Compelling Event"     value={<RichText text={commercial.timeline.compellingEvent} />} />
          <KVRow label="Consequence of Delay" value={<RichText text={commercial.timeline.consequenceOfDelay} />} />
          {commercial.timeline.allDatesDiscussed && commercial.timeline.allDatesDiscussed.length > 0 && (
            <KVRow
              label="All Dates Discussed"
              value={
                <div className="space-y-1">
                  {commercial.timeline.allDatesDiscussed.map((d, i) => (
                    <div key={i}>
                      <span className="font-medium text-gray-800">{d.date}</span>
                      {d.description && <span className="text-gray-600"> — {d.description}</span>}
                    </div>
                  ))}
                </div>
              }
            />
          )}
          <KVRow label="Cloud Provider" value={commercial.partners.cloudProvider} />
          {commercial.partners.systemIntegrators.length > 0 && (
            <KVRow label="System Integrators" value={commercial.partners.systemIntegrators.join(', ')} />
          )}
          {commercial.partners.hasCommittedSpend !== undefined && (
            <KVRow label="Committed Spend" value={commercial.partners.hasCommittedSpend ? 'Yes' : 'No'} />
          )}
        </dl>
      </SectionCard>

      {/* ── Current State ── */}
      <SectionCard>
        <SectionHeader icon={<Cpu className="w-4 h-4" />} title="Current State" color="slate" />
        <dl>
          <KVRow label="Description"      value={<RichText text={technical.currentState.currentStateDescription} />} />
          <KVRow label="Topology"         value={<RichText text={technical.currentState.architecture?.topology} />} />
          <KVRow label="Infrastructure"   value={<RichText text={technical.currentState.architecture?.infrastructure} />} />
          {technical.currentState.architecture?.databaseVersion && (
            <KVRow label="DB Version"     value={technical.currentState.architecture.databaseVersion} />
          )}
          {technical.currentState.metrics?.dataSize && (
            <KVRow label="Data Size"      value={technical.currentState.metrics.dataSize} />
          )}
          {technical.currentState.metrics?.latency && (
            <KVRow label="Latency"        value={technical.currentState.metrics.latency} />
          )}
          {technical.currentState.metrics?.throughput && (
            <KVRow label="Throughput"     value={technical.currentState.metrics.throughput} />
          )}
          {technical.currentState.painPoints?.length > 0 && (
            <KVRow
              label="Pain Points"
              value={
                <div className="space-y-3">
                  {technical.currentState.painPoints.map((pp, i) => (
                    <div key={i} className="rounded-xl bg-red-50 border border-red-100 p-3">
                      <p className="text-sm text-gray-800 mb-1">{pp.currentStateDescription}</p>
                      <p className="text-xs text-gray-600"><span className="font-semibold">Root Cause:</span> {pp.technicalRootCause}</p>
                      <p className="text-xs text-gray-600"><span className="font-semibold">Business Impact:</span> {pp.businessImpact}</p>
                    </div>
                  ))}
                </div>
              }
            />
          )}
        </dl>

        {/* ── Tech Stack sub-section ── */}
        {technical.currentState.techStack && (
          <div className="border-t border-gray-100">
            <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tech Stack</span>
            </div>
            <div className="divide-y divide-gray-50">
              {/* Databases */}
              {technical.currentState.techStack.databases?.length > 0 && (
                <TechStackGroup label="Databases" items={technical.currentState.techStack.databases} />
              )}
              {/* Backend */}
              {technical.currentState.techStack.backendLanguages?.length > 0 && (
                <TechStackGroup label="Backend / APIs" items={technical.currentState.techStack.backendLanguages} />
              )}
              {/* Frontend */}
              {technical.currentState.techStack.frontendTechnologies?.length > 0 && (
                <TechStackGroup label="Frontend" items={technical.currentState.techStack.frontendTechnologies} />
              )}
              {/* Messaging & Streaming */}
              {technical.currentState.techStack.messagingAndStreaming?.length > 0 && (
                <TechStackGroup label="Messaging & Streaming" items={technical.currentState.techStack.messagingAndStreaming} />
              )}
              {/* AI Stack */}
              {(() => {
                const ai = technical.currentState.techStack.aiStack;
                if (!ai) return null;
                const hasAI = (ai.llms?.length ?? 0) > 0 || (ai.embeddingModels?.length ?? 0) > 0 ||
                  ai.chunkingStrategy || (ai.orchestrationFrameworks?.length ?? 0) > 0 ||
                  ai.preferredLanguage || ai.multimodality || (ai.otherAITools?.length ?? 0) > 0;
                if (!hasAI) return null;
                return (
                  <div className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-3">
                      <BrainCircuit className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">AI Stack</span>
                    </div>
                    <div className="space-y-3">
                      {(ai.llms?.length ?? 0) > 0 && (
                        <TechStackGroup label="LLMs" items={ai.llms!} indent />
                      )}
                      {(ai.embeddingModels?.length ?? 0) > 0 && (
                        <TechStackGroup label="Embedding Models" items={ai.embeddingModels!} indent />
                      )}
                      {ai.chunkingStrategy && (
                        <div className="pl-2">
                          <span className="text-xs font-semibold text-gray-400 uppercase">Chunking Strategy</span>
                          <p className="text-sm text-gray-800 mt-0.5">{ai.chunkingStrategy}</p>
                        </div>
                      )}
                      {(ai.orchestrationFrameworks?.length ?? 0) > 0 && (
                        <TechStackGroup label="Orchestration" items={ai.orchestrationFrameworks!} indent />
                      )}
                      {ai.preferredLanguage && (
                        <div className="pl-2">
                          <span className="text-xs font-semibold text-gray-400 uppercase">Preferred Language</span>
                          <p className="text-sm text-gray-800 mt-0.5">{ai.preferredLanguage}</p>
                        </div>
                      )}
                      {ai.multimodality && (
                        <div className="pl-2">
                          <span className="text-xs font-semibold text-gray-400 uppercase">Multimodality</span>
                          <p className="text-sm text-gray-800 mt-0.5">{ai.multimodality}</p>
                        </div>
                      )}
                      {(ai.otherAITools?.length ?? 0) > 0 && (
                        <TechStackGroup label="Other AI Tooling" items={ai.otherAITools!} indent />
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Future State ── */}
      <SectionCard>
        <SectionHeader icon={<Rocket className="w-4 h-4" />} title="Future State" color="indigo" />
        <dl>
          <KVRow label="Vision"               value={<RichText text={technical.futureState.futureStateDescription} />} />
          <KVRow label="Proposed Architecture" value={<RichText text={technical.futureState.proposedArchitecture} />} />
          <KVRow label="Proposed Solution"     value={<RichText text={technical.futureState.proposedSolution} />} />
          <KVRow label="Business Outcome"      value={<RichText text={technical.futureState.positiveBusinessOutcome} />} />
          {technical.futureState.requiredCapabilities.length > 0 && (
            <KVRow label="Required Capabilities" value={<BulletList items={technical.futureState.requiredCapabilities} />} />
          )}
          {technical.futureState.successMetrics.length > 0 && (
            <KVRow label="Success Metrics" value={<BulletList items={technical.futureState.successMetrics} />} />
          )}
        </dl>
      </SectionCard>

      {/* ── Next Steps ── */}
      <SectionCard>
        <SectionHeader icon={<CheckSquare className="w-4 h-4" />} title="AI Suggested Next Steps" color="green" />
        <div className="p-5">
          {strategy.nextSteps && strategy.nextSteps.length > 0 ? (
            <div className="space-y-5">
              {(['Technical', 'Commercial', 'Enablement', 'Qualification'] as const).map(category => {
                const steps = strategy.nextSteps.filter(s => s.category === category);
                if (!steps.length) return null;
                return (
                  <div key={category}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{category}</p>
                    <div className="space-y-2">
                      {steps.map((step, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              step.priority === 'High'   ? 'bg-red-100 text-red-700' :
                              step.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                           'bg-blue-100 text-blue-700'
                            }`}>
                              {step.priority}
                            </span>
                            <span className="text-xs text-gray-400">Timeline: {step.timeline}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-0.5">{step.action}</p>
                          <p className="text-xs text-gray-500">Owner: {step.owner}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No next steps defined yet.</p>
          )}
        </div>
      </SectionCard>

      {/* ── MongoDB Team Contribution ── */}
      {mongodbContribution && (
        <MongoDBContributionSection mongodbContribution={mongodbContribution} />
      )}
    </div>
  );
}
