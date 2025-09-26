import { TextProps } from '@mantine/core';
import { modals } from '@mantine/modals';
import ClickableText from '../common/ClickableText';
import { SourceDetails } from '.';

export interface SourceRefProps extends TextProps {
  sourceId: number,
}

export default function SourceRef({ sourceId, ...textProps }: SourceRefProps) {
  const openSourceDetailsModal = () => modals.open({
    title: `Fonte [${sourceId}]`,
    children: <SourceDetails sourceId={sourceId} />
  });

  return (
    <ClickableText onClick={() => openSourceDetailsModal()} {...textProps}>
      [{sourceId}]
    </ClickableText>
  )
}
