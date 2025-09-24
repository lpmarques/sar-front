import { UnstyledButton, UnstyledButtonProps } from '@mantine/core';
import { modals } from '@mantine/modals';
import { SourceReadData } from '../../apis/core';
import { SourceDetails } from '.';

export interface SourceRefProps extends UnstyledButtonProps {
  sourceId: number,
}

export default function SourceRef({ sourceId, ...buttonProps }: SourceRefProps) {
  const openSourceDetailsModal = (sourceId: number) => modals.open({
    title: `Fonte [${sourceId}]`,
    children: <SourceDetails sourceId={sourceId} />
  });

  return (
    <UnstyledButton onClick={() => openSourceDetailsModal(sourceId)} {...buttonProps}>
      [{sourceId}]
    </UnstyledButton>
  )
}
