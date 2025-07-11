import { Box, Group } from '@mantine/core';
import { Link } from 'react-router';
import regeneraLogo from '/regenera.svg'
import userLogo from '/user-circle.svg'
import classes from './Header.module.css';

export default function Header() {
  return (
    <Box pb={30}>
      <header className={classes.header}>
        <Group justify="space-between" h="100%">

          <Group h="100%">
            <Link to="/">
              <img src={regeneraLogo} className={classes.logo} alt="Regenera logo" />
            </Link>
          </Group>

          <Group h="100%" gap={0} visibleFrom="sm">
            <Link to="/" className={classes.link}>
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
      </header>
    </Box>
  );
}