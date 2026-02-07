import { DCSData } from '@/lib/schema';
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
                {dcsData.accountInfo.workloadName}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Sales Motion:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {dcsData.accountInfo.salesMotion}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Name & Role of person with whom we're meeting:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {dcsData.accountInfo.keyStakeholders.map(stakeholder => 
                  `${stakeholder.name} (${stakeholder.role})`
                ).join(', ')}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Partner(s) involved in Workload:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {dcsData.accountInfo.partnersInvolved.join(', ')}
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
                {dcsData.valueFramework.valueDrivers.join(', ')}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Timeline/Deadline/Milestone Date(s):
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {dcsData.logistics.timeline.goLiveDate && `Go Live: ${dcsData.logistics.timeline.goLiveDate}`}
                {dcsData.logistics.timeline.compellingEvent && ` | ${dcsData.logistics.timeline.compellingEvent}`}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 bg-gray-200 px-3 py-2 font-semibold text-green-800">
                Tiger Sales Route:
              </td>
              <td className="border border-gray-400 px-3 py-2 text-green-700">
                {dcsData.logistics.tigerSalesRoute}
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
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-[100px]">
                <div className="font-medium mb-2">Current State: {dcsData.valueFramework.currentState.currentStateDescription}</div>
              </td>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-[100px]">
                <ul className="list-disc list-inside space-y-1">
                  {dcsData.valueFramework.currentState.negativeConsequences.map((consequence, index) => (
                    <li key={index}>{consequence}</li>
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
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-[100px]">
                <div className="font-medium mb-2">After Scenario ("How would CEO brag about it?")</div>
                <div>Future State: {dcsData.valueFramework.futureState.futureStateDescription}</div>
              </td>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-[100px]">
                <ul className="list-disc list-inside space-y-1">
                  {dcsData.valueFramework.futureState.positiveBusinessOutcomes.map((outcome, index) => (
                    <li key={index}>{outcome}</li>
                  ))}
                </ul>
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
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-[100px]">
                <ul className="list-disc list-inside space-y-1">
                  {dcsData.logistics.requiredCapabilities.map((capability, index) => (
                    <li key={index}>{capability}</li>
                  ))}
                </ul>
              </td>
              <td className="border border-gray-400 px-3 py-3 text-green-700 align-top min-h-[100px]">
                <ul className="list-disc list-inside space-y-1">
                  {dcsData.logistics.successMetrics.map((metric, index) => (
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