import { DCSData } from '@/lib/schemas';
import { Clock, CheckCircle, RefreshCw } from 'lucide-react';

interface DCSDisplayProps {
  dcsData: DCSData | null;
  status: string;
  accountName: string;
}

export function DCSDisplay({ dcsData, status, accountName }: DCSDisplayProps) {
  if (status === 'GENERATING') {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
        <p className="text-green-700">Analyzing transcripts and generating DCS...</p>
      </div>
    );
  }

  if (!dcsData) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-green-500 mx-auto mb-4" />
        <p className="text-green-700">Upload transcripts and generate DCS to see results here</p>
      </div>
    );
  }

  console.log('DCSDisplay received dcsData:', JSON.stringify(dcsData, null, 2));

  const { technical, commercial, strategy } = dcsData;

  // Safety check for data structure
  if (!technical || !commercial || !strategy) {
    console.error('DCS data structure check failed:', { 
      hasTechnical: !!technical, 
      hasCommercial: !!commercial, 
      hasStrategy: !!strategy,
      dcsDataKeys: Object.keys(dcsData)
    });
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">DCS data is incomplete. Please regenerate.</p>
        <details className="mt-4 text-left max-w-md mx-auto">
          <summary className="cursor-pointer text-sm text-gray-500">Debug info</summary>
          <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify({ 
              hasTechnical: !!technical, 
              hasCommercial: !!commercial, 
              hasStrategy: !!strategy,
              keys: Object.keys(dcsData)
            }, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="flex items-center text-green-600 mb-6">
        <CheckCircle className="w-5 h-5 mr-2" />
        <span className="font-medium">DCS Generated Successfully</span>
      </div>

      {/* Main DCS Table */}
      <div className="space-y-0">
        {/* Account Information Section */}
        <table className="w-full border-collapse border border-gray-400">
          <tbody>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800 w-1/3">
                Account Name:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {accountName}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Workload Name (app/project/initiative/service):
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {dcsData.workloadName}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Sales Motion:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {strategy.salesMotion}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Name & Role of person with whom we're meeting:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {commercial.stakeholders.map(stakeholder => 
                  `${stakeholder.name} (${stakeholder.role})`
                ).join(', ')}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Partner(s) involved in Workload:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {commercial.partners.cloudProvider} | {commercial.partners.systemIntegrators.join(', ')}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Evaluation Process:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {/* This would be derived from the sales motion or transcript analysis */}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Value Driver and Timeline Section */}
        <table className="w-full border-collapse border border-gray-400 mt-0">
          <tbody>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800 w-1/3">
                Value Driver(s):
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {strategy.valueDrivers.map(vd => `${vd.category}: ${vd.justification}`).join(' | ')}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Timeline/Deadline/Milestone Date(s):
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {commercial.timeline.targetGoLiveDate}
                {commercial.timeline.compellingEvent && ` | ${commercial.timeline.compellingEvent}`}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Tiger Sales Route:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {strategy.tigerSalesRoute}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Current State vs Negative Consequences */}
        <table className="w-full border-collapse border border-gray-400 mt-0">
          <thead>
            <tr>
              <th className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800 w-1/2">
                Current State
              </th>
              <th className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800 w-1/2">
                Negative Consequences
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-25">
                <div className="font-medium mb-2">Current State Description:</div>
                <div>{technical.currentState.currentStateDescription}</div>
                <div className="mt-2">
                  <strong>Architecture:</strong> {technical.currentState.architecture.topology} | 
                  {technical.currentState.architecture.infrastructure}
                </div>
                <div className="mt-2">
                  <strong>Metrics:</strong> Data: {technical.currentState.metrics.dataSize} | 
                  Latency: {technical.currentState.metrics.latency} | 
                  Throughput: {technical.currentState.metrics.throughput}
                </div>
              </td>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-25">
                <ul className="list-disc list-inside space-y-2">
                  {technical.currentState.painPoints.map((pain, index) => (
                    <li key={index}>
                      <strong>{pain.currentStateDescription}:</strong> {pain.technicalRootCause} 
                      ({pain.businessImpact})
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Future State vs Positive Business Outcome */}
        <table className="w-full border-collapse border border-gray-400 mt-0">
          <thead>
            <tr>
              <th className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800 w-1/2">
                Future State
              </th>
              <th className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800 w-1/2">
                Positive Business Outcome
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-25">
                <div className="font-medium mb-2">After Scenario ("How would CEO brag about it?")</div>
                <div>{technical.futureState.futureStateDescription}</div>
                <div className="mt-2"><strong>Proposed Architecture:</strong> {technical.futureState.proposedArchitecture}</div>
                <div className="mt-2">{technical.futureState.proposedSolution}</div>
              </td>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-25">
                <div>{technical.futureState.positiveBusinessOutcome}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bridge Section */}
        <table className="w-full border-collapse border border-gray-400 mt-0">
          <tbody>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 text-center font-semibold text-green-800">
                These should <strong>bridge</strong> Current State to Future State
              </td>
            </tr>
          </tbody>
        </table>

        {/* Required Capabilities and Metrics */}
        <table className="w-full border-collapse border border-gray-400 mt-0">
          <thead>
            <tr>
              <th className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800 w-1/2">
                Required Capabilities ("Shopping list items" and in the customer's words)
              </th>
              <th className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800 w-1/2">
                Metrics (how customer measures tech. success of the RC's)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-25">
                <ul className="list-disc list-inside space-y-1">
                  {technical.futureState.requiredCapabilities.map((capability, index) => (
                    <li key={index}>{capability}</li>
                  ))}
                </ul>
              </td>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-25">
                <ul className="list-disc list-inside space-y-1">
                  {technical.futureState.successMetrics.map((metric, index) => (
                    <li key={index}>{metric}</li>
                  ))}
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}