import { Avatar, AvatarProps, Group, UnstyledButton } from "@mantine/core";
import { UserReadData } from "../../apis/core";
import { useAuth } from "../../hooks/useAuth";

export interface UserAvatarProps extends AvatarProps {
  user: UserReadData
}

export default function UserAvatar({ user, ...avatarProps }: UserAvatarProps) {
  const auth = useAuth();

  const path = auth.user && auth.user.id === user.id ? "/user" : `/users/${user.email}`;
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <Group align="center">
      <UnstyledButton onClick={() => window.open(path, '_blank')}>
        <Avatar
          title={name}
          size={60}
          name={name}
          color="initials"
          {...avatarProps}
          />
      </UnstyledButton>
    </Group>
  )
}
