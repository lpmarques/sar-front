import { UnstyledButton, UnstyledButtonProps } from '@mantine/core';
import { modals } from '@mantine/modals';
import { SourceReadData } from '../../apis/core';
import { SourceContent } from '.';

export interface UserNameProps extends UnstyledButtonProps {
  source: SourceReadData
}

export default function UserName({ source, ...buttonProps }: UserNameProps) {
  const openSourceContentModal = (source: SourceReadData) => modals.open({
    title: `Fonte [${source.id}]`,
    children: <SourceContent data={source} />
  });

  return (
    <UnstyledButton onClick={() => openSourceContentModal(source)} {...buttonProps}>
      [{source.id}]
    </UnstyledButton>
  )
}
