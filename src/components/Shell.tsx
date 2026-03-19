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

import { AppShell, Avatar, Group, rem, UnstyledButton } from '@mantine/core';
import { useHeadroom } from '@mantine/hooks';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import regeneraLogo from '/logo-lg-2.png';
import classes from './Shell.module.css';
import { UserAvatar } from './user';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pinned = useHeadroom({ fixedAt: 120 });
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell header={{height: 80, collapsed: !pinned, offset: false}}>
      <AppShell.Header p={10}>
        <Group justify="space-between" h="100%">
          <Group h="100%">
            <Link to="/">
              <img src={regeneraLogo} className={classes.logo} alt="Regenera logo" />
            </Link>
          </Group>
          <Group h="100%" gap={0} visibleFrom="sm">
            <Link to="/plants" className={classes.link}>
              Catálogo
            </Link>
            <Link to="/farms" className={classes.link}>
              Projeto
            </Link>
          </Group>
          <Group h="100%">
            { user ? 
            <UserAvatar user={user} /> :
            <UnstyledButton onClick={() => navigate("/login")}>
              <Avatar mb={15} size={60} />
            </UnstyledButton>
            }
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main pt={`calc(${rem(100)} + var(--mantine-spacing-md))`}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}