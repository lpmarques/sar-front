import { UserReadData } from '../../apis/core';
import { UnstyledButton, UnstyledButtonProps } from '@mantine/core';

export interface UserNameProps extends UnstyledButtonProps {
  user: UserReadData
}

export default function UserName({ user, ...buttonProps }: UserNameProps) {
  return (
    <UnstyledButton onClick={() => window.open(`/users/${user.id}`, '_blank')} {...buttonProps}>
      {user.firstName} {user.lastName}
    </UnstyledButton>
  )
}