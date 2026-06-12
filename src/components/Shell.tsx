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

import { AppShell, rem } from '@mantine/core';
import { useHeadroom } from '@mantine/hooks';
import Footer from './Footer';
import Header from './Header';
import HeaderMenu from './HeaderMenu';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pinned = useHeadroom({ fixedAt: 120 });
  const borderStyle = "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))";

  return (
    <AppShell header={{height: 90, collapsed: !pinned, offset: false}} footer={{height: 80}}>
      <AppShell.Header bd={borderStyle}>
        {/* <Header /> */}
        <HeaderMenu />
      </AppShell.Header>
      <AppShell.Main pt={rem(140)}>
        {children}
      </AppShell.Main>
      <AppShell.Footer style={{position: "relative"}}>
        <Footer />
      </AppShell.Footer>
    </AppShell>
  );
}