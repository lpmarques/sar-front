/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

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
