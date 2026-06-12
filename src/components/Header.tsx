import { Avatar, Group, UnstyledButton } from '@mantine/core';
import { Link, useNavigate } from 'react-router';
import { UserAvatar } from './user';
import { useAuth } from '../hooks';
import regeneraLogo from '/logo-lg-2.png';
import classes from './Shell.module.css';

export default function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  return (
    <Group justify="space-between" h="100%" p={10}>
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
  )
}