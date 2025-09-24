import { AppShell, Avatar, Group, rem, UnstyledButton } from '@mantine/core';
import { useHeadroom } from '@mantine/hooks';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import regeneraLogo from '/logo-lg-2.png'
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
            <Link to="/" className={classes.link}>
              Projeto
            </Link>
          </Group>

          <Group h="100%">
            { user ? 
            <UserAvatar user={user} /> :
            <UnstyledButton onClick={() => navigate("/login")}>
                <Avatar
                  mb={15}
                  size={60} />
                {/* <img src={userLogo} className={classes.logo} alt="User logo" /> */}
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