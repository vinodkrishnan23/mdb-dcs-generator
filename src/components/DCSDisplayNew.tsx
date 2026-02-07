import { type DCSData } from '@/lib/schemas';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

interface DCSDisplayProps {
  dcsData: DCSData;
  accountName: string;
}

export function DCSDisplay({ dcsData, accountName }: DCSDisplayProps) {
  const { technical, commercial, strategy } = dcsData;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-green-800 mb-1">Discovery Capture Sheet</h1>
        <h2 className="text-lg text-green-700">{commercial.accountInfo.accountName}</h2>
        <p className="text-sm text-green-600">{commercial.accountInfo.workloadName}</p>
      </div>

      {/* Deal Strategy Table */}
      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-green-800">
            <th colSpan={2} className="text-left px-4 py-2 text-white font-bold">DEAL STRATEGY</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 w-1/4">Sales Motion</td>
            <td className="px-4 py-2 text-gray-800">{strategy.salesMotion}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Tiger Sales Route</td>
            <td className="px-4 py-2 text-gray-800">{strategy.tigerSalesRoute}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Value Drivers</td>
            <td className="px-4 py-2 text-gray-800">
              {strategy.valueDrivers.map((vd, i) => (
                <div key={i} className="mb-2">
                  <div className="font-medium text-green-800">{vd.category}</div>
                  <div className="text-sm text-gray-700">{vd.justification}</div>
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      {/* The "3 Whys" Qualification Card */}
      <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-6 mb-4">
        <h3 className="text-xl font-bold text-blue-900 mb-4">The "3 Whys" Qualification Framework</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Why Anything? */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              {strategy.threeWhys.whyAnything.status === 'FOUND' && (
                <CheckCircle2 className="w-6 h-6 text-green-600 mr-2" />
              )}
              {strategy.threeWhys.whyAnything.status === 'PARTIAL' && (
                <HelpCircle className="w-6 h-6 text-yellow-600 mr-2" />
              )}
              {strategy.threeWhys.whyAnything.status === 'MISSING' && (
                <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
              )}
              <h4 className="font-bold text-gray-800">Why Anything?</h4>
            </div>
            
            {strategy.threeWhys.whyAnything.status !== 'MISSING' ? (
              <>
                {strategy.threeWhys.whyAnything.challenges.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-gray-700">Challenges:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {strategy.threeWhys.whyAnything.challenges.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {strategy.threeWhys.whyAnything.objectives.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-gray-700">Objectives:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {strategy.threeWhys.whyAnything.objectives.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {strategy.threeWhys.whyAnything.missingInfo && (
                  <p className="text-sm text-yellow-700 italic">{strategy.threeWhys.whyAnything.missingInfo}</p>
                )}
              </>
            ) : (
              <div className="text-red-700 text-sm font-medium">
                ⚠️ Data Missing
                {strategy.threeWhys.whyAnything.missingInfo && (
                  <p className="text-xs text-red-600 mt-1">{strategy.threeWhys.whyAnything.missingInfo}</p>
                )}
              </div>
            )}
          </div>

          {/* Why MongoDB? */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              {strategy.threeWhys.whyMongoDB.status === 'FOUND' && (
                <CheckCircle2 className="w-6 h-6 text-green-600 mr-2" />
              )}
              {strategy.threeWhys.whyMongoDB.status === 'PARTIAL' && (
                <HelpCircle className="w-6 h-6 text-yellow-600 mr-2" />
              )}
              {strategy.threeWhys.whyMongoDB.status === 'MISSING' && (
                <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
              )}
              <h4 className="font-bold text-gray-800">Why MongoDB?</h4>
            </div>
            
            {strategy.threeWhys.whyMongoDB.status !== 'MISSING' ? (
              <>
                {strategy.threeWhys.whyMongoDB.keyCapabilities.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-gray-700">Key Capabilities:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {strategy.threeWhys.whyMongoDB.keyCapabilities.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {strategy.threeWhys.whyMongoDB.differentiators.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-gray-700">Differentiators:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {strategy.threeWhys.whyMongoDB.differentiators.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {strategy.threeWhys.whyMongoDB.missingInfo && (
                  <p className="text-sm text-yellow-700 italic">{strategy.threeWhys.whyMongoDB.missingInfo}</p>
                )}
              </>
            ) : (
              <div className="text-red-700 text-sm font-medium">
                ⚠️ Data Missing
                {strategy.threeWhys.whyMongoDB.missingInfo && (
                  <p className="text-xs text-red-600 mt-1">{strategy.threeWhys.whyMongoDB.missingInfo}</p>
                )}
              </div>
            )}
          </div>

          {/* Why Now? */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              {strategy.threeWhys.whyNow.status === 'FOUND' && (
                <CheckCircle2 className="w-6 h-6 text-green-600 mr-2" />
              )}
              {strategy.threeWhys.whyNow.status === 'PARTIAL' && (
                <HelpCircle className="w-6 h-6 text-yellow-600 mr-2" />
              )}
              {strategy.threeWhys.whyNow.status === 'MISSING' && (
                <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
              )}
              <h4 className="font-bold text-gray-800">Why Now?</h4>
            </div>
            
            {strategy.threeWhys.whyNow.status !== 'MISSING' ? (
              <>
                {strategy.threeWhys.whyNow.compellingEvent && (
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-gray-700">Compelling Event:</p>
                    <p className="text-sm text-gray-600">{strategy.threeWhys.whyNow.compellingEvent}</p>
                  </div>
                )}
                {strategy.threeWhys.whyNow.businessImpactOfDelay && (
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-gray-700">Impact of Delay:</p>
                    <p className="text-sm text-gray-600">{strategy.threeWhys.whyNow.businessImpactOfDelay}</p>
                  </div>
                )}
                {strategy.threeWhys.whyNow.missingInfo && (
                  <p className="text-sm text-yellow-700 italic">{strategy.threeWhys.whyNow.missingInfo}</p>
                )}
              </>
            ) : (
              <div className="text-red-700 text-sm font-medium">
                ⚠️ Data Missing
                {strategy.threeWhys.whyNow.missingInfo && (
                  <p className="text-xs text-red-600 mt-1">{strategy.threeWhys.whyNow.missingInfo}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Discovery Coach Section */}
        <div className="border-2 border-yellow-400 bg-yellow-50 rounded-lg p-4">
          <h4 className="font-bold text-yellow-900 mb-2 flex items-center">
            <HelpCircle className="w-5 h-5 mr-2" />
            Discovery Coach: Suggested Questions for Next Call
          </h4>
          {strategy.gapAnalysis.discoveryQuestions.length > 0 ? (
            <ul className="space-y-2">
              {strategy.gapAnalysis.discoveryQuestions.map((q, i) => (
                <li key={i} className="text-sm text-gray-800 flex">
                  <span className="font-bold text-yellow-700 mr-2">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No additional discovery questions needed - all critical information captured.</p>
          )}
        </div>
      </div>

      {/* Stakeholders Table */}
      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-green-800">
            <th colSpan={3} className="text-left px-4 py-2 text-white font-bold">STAKEHOLDERS</th>
          </tr>
          <tr className="bg-green-50 border-t border-gray-300">
            <th className="px-4 py-2 text-left text-green-700 font-semibold">Name</th>
            <th className="px-4 py-2 text-left text-green-700 font-semibold">Role</th>
            <th className="px-4 py-2 text-left text-green-700 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {commercial.stakeholders.map((sh, i) => (
            <tr key={i} className="border-t border-gray-300">
              <td className="px-4 py-2 font-medium text-gray-800">{sh.name}</td>
              <td className="px-4 py-2 text-gray-800">{sh.role}</td>
              <td className="px-4 py-2 text-sm text-gray-700">{sh.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Timeline & Partners Table */}
      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-green-800">
            <th colSpan={2} className="text-left px-4 py-2 text-white font-bold">TIMELINE & PARTNERS</th>
          </tr>
        </thead>
        <tbody>
          {commercial.timeline.targetGoLiveDate && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 w-1/4">Target Go-Live Date</td>
              <td className="px-4 py-2 text-gray-800">{commercial.timeline.targetGoLiveDate}</td>
            </tr>
          )}
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Compelling Event</td>
            <td className="px-4 py-2 text-gray-800">{commercial.timeline.compellingEvent}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Consequence of Delay</td>
            <td className="px-4 py-2 text-gray-800">{commercial.timeline.consequenceOfDelay}</td>
          </tr>
          {commercial.timeline.allDatesDiscussed && commercial.timeline.allDatesDiscussed.length > 0 && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 align-top">All Dates Discussed</td>
              <td className="px-4 py-2 text-gray-800">
                {commercial.timeline.allDatesDiscussed.map((dateInfo, i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <div className="font-medium text-green-800">{dateInfo.date}</div>
                    <div className="text-sm text-gray-700">{dateInfo.description}</div>
                  </div>
                ))}
              </td>
            </tr>
          )}
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Cloud Provider</td>
            <td className="px-4 py-2 text-gray-800">{commercial.partners.cloudProvider}</td>
          </tr>
          {commercial.partners.systemIntegrators.length > 0 && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">System Integrators</td>
              <td className="px-4 py-2 text-gray-800">{commercial.partners.systemIntegrators.join(', ')}</td>
            </tr>
          )}
          {commercial.partners.hasCommittedSpend !== undefined && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Committed Spend</td>
              <td className="px-4 py-2 text-gray-800">{commercial.partners.hasCommittedSpend ? 'Yes' : 'No'}</td>
            </tr>
          )}
        </tbody>
      </table>



      {/* Technical Current State Table */}
      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-green-800">
            <th colSpan={2} className="text-left px-4 py-2 text-white font-bold">CURRENT STATE</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 w-1/4">Current State Description</td>
            <td className="px-4 py-2 text-gray-800">{technical.currentState.currentStateDescription}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 w-1/4">Topology</td>
            <td className="px-4 py-2 text-gray-800">{technical.currentState.architecture.topology}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Infrastructure</td>
            <td className="px-4 py-2 text-gray-800">{technical.currentState.architecture.infrastructure}</td>
          </tr>
          {technical.currentState.architecture.databaseVersion && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Database Version</td>
              <td className="px-4 py-2 text-gray-800">{technical.currentState.architecture.databaseVersion}</td>
            </tr>
          )}
          {technical.currentState.metrics.dataSize && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Data Size</td>
              <td className="px-4 py-2 text-gray-800">{technical.currentState.metrics.dataSize}</td>
            </tr>
          )}
          {technical.currentState.metrics.latency && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Latency</td>
              <td className="px-4 py-2 text-gray-800">{technical.currentState.metrics.latency}</td>
            </tr>
          )}
          {technical.currentState.metrics.throughput && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Throughput</td>
              <td className="px-4 py-2 text-gray-800">{technical.currentState.metrics.throughput}</td>
            </tr>
          )}
          {technical.currentState.painPoints.length > 0 && (
            <tr className="border-t border-gray-300">
              <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 align-top">Pain Points</td>
              <td className="px-4 py-2 text-gray-800">
                {technical.currentState.painPoints.map((pp, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="text-gray-800 mb-1">{pp.currentStateDescription}</div>
                    <div className="text-sm text-gray-700 ml-4">
                      <div><span className="font-semibold">Root Cause:</span> {pp.technicalRootCause}</div>
                      <div><span className="font-semibold">Business Impact:</span> {pp.businessImpact}</div>
                    </div>
                  </div>
                ))}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Technical Future State Table */}
      <table className="w-full border-collapse border border-gray-300 mb-4">
        <thead>
          <tr className="bg-green-800">
            <th colSpan={2} className="text-left px-4 py-2 text-white font-bold">FUTURE STATE</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 w-1/4">Vision</td>
            <td className="px-4 py-2 text-gray-800">{technical.futureState.futureStateDescription}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Proposed Architecture</td>
            <td className="px-4 py-2 text-gray-800">{technical.futureState.proposedArchitecture}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Proposed Solution</td>
            <td className="px-4 py-2 text-gray-800">{technical.futureState.proposedSolution}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50">Business Outcome</td>
            <td className="px-4 py-2 text-gray-800">{technical.futureState.positiveBusinessOutcome}</td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 align-top">Required Capabilities</td>
            <td className="px-4 py-2 text-gray-800">
              {technical.futureState.requiredCapabilities.join(', ')}
            </td>
          </tr>
          <tr className="border-t border-gray-300">
            <td className="px-4 py-2 font-semibold text-green-700 bg-green-50 align-top">Success Metrics</td>
            <td className="px-4 py-2 text-gray-800">
              <ul className="list-disc list-inside">
                {technical.futureState.successMetrics.map((metric, i) => (
                  <li key={i}>{metric}</li>
                ))}
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
