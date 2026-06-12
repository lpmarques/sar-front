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
    <ClickableText path={path} {...textProps}>
      {user.firstName} {user.lastName}
    </ClickableText>
  )
}
