import type { MongodbContributionData } from '@/lib/schemas';
import {
  Users,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
} from 'lucide-react';

interface MongoDBContributionSectionProps {
  mongodbContribution: MongodbContributionData;
}

const REACTION_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Validated: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  'Not Validated': {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    icon: <MinusCircle className="w-3 h-3" />,
  },
  Rejected: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: <XCircle className="w-3 h-3" />,
  },
  Unknown: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: <HelpCircle className="w-3 h-3" />,
  },
};

const CONVERSATION_STYLE_CLASSES: Record<string, string> = {
  'Customer-Centric': 'bg-green-100 text-green-700 border-green-200',
  Balanced: 'bg-blue-100 text-blue-700 border-blue-200',
  'MongoDB-Centric': 'bg-orange-100 text-orange-700 border-orange-200',
};

const QUESTION_EFFECTIVENESS_CLASSES: Record<string, string> = {
  Effective: 'text-green-600',
  'Partially Effective': 'text-yellow-600',
  Ineffective: 'text-red-600',
};

function ReactionBadge({ reaction }: { reaction: string }) {
  const style = REACTION_STYLES[reaction] ?? REACTION_STYLES['Unknown'];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${style.bg} ${style.text}`}
    >
      {style.icon}
      {reaction}
    </span>
  );
}

export function MongoDBContributionSection({
  mongodbContribution,
}: MongoDBContributionSectionProps) {
  if (!mongodbContribution) return null;

  const {
    teamMembers,
    technicalContributions,
    salesMessaging,
    questionsAsked,
    unvalidatedSuggestions,
    overallEffectiveness,
  } = mongodbContribution;

  const styleClass =
    CONVERSATION_STYLE_CLASSES[overallEffectiveness.conversationStyle] ??
    CONVERSATION_STYLE_CLASSES['Balanced'];

  return (
    <div className="border-2 border-green-600 rounded-lg overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-green-700 px-6 py-4 flex items-center gap-3">
        <Users className="w-6 h-6 text-white flex-shrink-0" />
        <div>
          <h3 className="text-xl font-bold text-white">MongoDB Team Contribution</h3>
          <p className="text-green-200 text-sm">
            Summary of what the MongoDB team said and contributed
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-white">
        {/* Overall Effectiveness Banner */}
        <div className={`rounded-lg border p-4 ${styleClass}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold text-sm">Overall Assessment</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${styleClass}`}>
                  {overallEffectiveness.conversationStyle}
                </span>
              </div>
              <p className="text-sm">{overallEffectiveness.summary}</p>
            </div>
            <div className="flex-shrink-0">
              {overallEffectiveness.keyPainPointsUncovered ? (
                <div className="flex items-center gap-1 text-green-700 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Pain Points Uncovered
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                  <XCircle className="w-4 h-4" />
                  Pain Points NOT Uncovered
                </div>
              )}
            </div>
          </div>
          {overallEffectiveness.improvementAreas?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-xs font-semibold mb-1">Areas for Improvement:</p>
              <ul className="space-y-1">
                {overallEffectiveness.improvementAreas.map((area, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span className="mt-1">•</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Team Members */}
        {teamMembers?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-green-600" />
              MongoDB Team Members
            </h4>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((member, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unvalidated Suggestions — highlighted prominently */}
        {unvalidatedSuggestions?.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" />
              Suggestions NOT Validated by Customer ({unvalidatedSuggestions.length})
            </h4>
            <p className="text-xs text-amber-700 mb-3">
              These MongoDB suggestions were made but the customer did not confirm interest.
              Follow-up is needed.
            </p>
            <div className="space-y-3">
              {unvalidatedSuggestions.map((item, i) => (
                <div key={i} className="bg-white border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">{item.suggestion}</p>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Follow-up needed:</span> {item.followUpNeeded}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Contributions */}
        {technicalContributions?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-green-600" />
              Technical Contributions
            </h4>
            <div className="space-y-2">
              {technicalContributions.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{item.contribution}</p>
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded mt-1 inline-block">
                      {item.type}
                    </span>
                  </div>
                  <ReactionBadge reaction={item.customerReaction} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sales Messaging */}
        {salesMessaging?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-green-600" />
              Sales Messaging Used
            </h4>
            <div className="space-y-2">
              {salesMessaging.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{item.message}</p>
                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded mt-1 inline-block">
                      {item.type}
                    </span>
                  </div>
                  <ReactionBadge reaction={item.customerReaction} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discovery Questions */}
        {questionsAsked?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-green-600" />
              Discovery Questions Asked by MongoDB Team
            </h4>
            <div className="space-y-3">
              {questionsAsked.map((item, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-gray-900">
                      &ldquo;{item.question}&rdquo;
                    </p>
                    <span
                      className={`text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                        QUESTION_EFFECTIVENESS_CLASSES[item.effectiveness] ?? 'text-gray-600'
                      }`}
                    >
                      {item.effectiveness}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 italic">
                    Customer: &ldquo;{item.customerResponse}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
