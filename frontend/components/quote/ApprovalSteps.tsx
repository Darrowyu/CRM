import React, { memo } from 'react';
import { Steps } from 'antd';
import { Quote } from '../../services/quoteService';

interface ApprovalStepsProps {
  quote: Quote;
  statusMap: Record<string, { color: string; label: string; step: number }>;
  t: (key: string) => string;
}

const ApprovalSteps: React.FC<ApprovalStepsProps> = memo(({ quote, statusMap, t }) => {
  const currentStep = statusMap[quote.status]?.step ?? 0;
  const isRejected = quote.status === 'rejected';

  return (
    <Steps
      size="small"
      current={isRejected ? 1 : currentStep}
      status={isRejected ? 'error' : undefined}
      items={[
        { title: t('quote_step_draft'), subTitle: t('quote_step_draft_sub') },
        { title: t('quote_step_pending'), subTitle: isRejected ? t('quote_step_rejected') : t('quote_step_pending_sub') },
        { title: t('quote_step_approved'), subTitle: t('quote_step_approved_sub') },
        { title: t('quote_step_completed'), subTitle: t('quote_step_completed_sub') },
      ]}
    />
  );
});

ApprovalSteps.displayName = 'ApprovalSteps';

export default ApprovalSteps;
