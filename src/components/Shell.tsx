import { AppShell, Group, rem } from '@mantine/core';
import { useHeadroom } from '@mantine/hooks';
import { Link } from 'react-router';
import regeneraLogo from '/logo-lg-2.png'
import userLogo from '/user-circle.svg'
import classes from './Shell.module.css';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pinned = useHeadroom({ fixedAt: 120 });

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
            <Link to="plants" className={classes.link}>
              Catálogo
            </Link>
            <Link to="/" className={classes.link}>
              Projeto
            </Link>
          </Group>

          <Group h="100%">
            <Link to="/login">
              <img src={userLogo} className={classes.logo} alt="User logo" />
            </Link>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main pt={`calc(${rem(100)} + var(--mantine-spacing-md))`}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}