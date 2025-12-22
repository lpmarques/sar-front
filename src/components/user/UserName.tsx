import { TextProps } from '@mantine/core';
import { UserReadData } from '../../apis/core';
import ClickableText from '../common/ClickableText';
import { useAuth } from '../../hooks';

export interface UserNameProps extends TextProps {
  user: UserReadData,
}

export default function UserName({ user, ...textProps }: UserNameProps) {
  const auth = useAuth();

  const path = auth.user && auth.user.id === user.id ? "/user" : `/users/${user.email}`;

  return (
    <ClickableText onClick={() => window.open(path, '_blank')} {...textProps}>
      {user.firstName} {user.lastName}
    </ClickableText>
  )
}
