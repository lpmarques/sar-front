import { TextProps } from '@mantine/core';
import { UserReadData } from '../../apis/core';
import ClickableText from '../common/ClickableText';

export interface UserNameProps extends TextProps {
  user: UserReadData,
}

export default function UserName({ user, ...textProps }: UserNameProps) {
  return (
    <ClickableText onClick={() => window.open(`/users/${user.id}`, '_blank')} {...textProps}>
      {user.firstName} {user.lastName}
    </ClickableText>
  )
}
