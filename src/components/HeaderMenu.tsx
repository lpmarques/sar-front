import { IconChevronDown } from '@tabler/icons-react';
import {
  Avatar,
  Burger,
  Center,
  Collapse,
  Container,
  Divider,
  Drawer,
  Group,
  Menu,
  ScrollArea,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, useNavigate } from 'react-router';
import regeneraLogo from '/logo-lg-2.png';
import classes from './HeaderMenu.module.css';
import { useAuth } from '../hooks';
import { UserAvatar } from './user';

const links = [
  { link: '/about', label: 'Sobre' },
  {
    link: '#1',
    label: 'Ferramentas',
    links: [
      { link: '/plants', label: 'Catálogo de Plantas' },
      { link: '/farms', label: 'Projeto Agroflorestal' },
    ],
  },
  {
    link: '#2',
    label: 'Ajuda',
    links: [
      { link: '/demo', label: 'Tutoriais' },
      { link: '/faq', label: 'FAQ' },
      { link: '/support', label: 'Suporte' },
    ],
  },
];

export default function HeaderMenu() {
  const { user } = useAuth();
  const [opened, { toggle, close }] = useDisclosure(false);
  const navigate = useNavigate();

  const items = links.map((link) => {
    const menuItems = link.links?.map((item) => (
      <Menu.Item key={item.link}  onClick={() => navigate(item.link)}>
        {item.label}
      </Menu.Item>
    ));

    if (menuItems) {
      return (
        <Menu key={link.label} trigger="hover" transitionProps={{ exitDuration: 0 }} withinPortal>
          <Menu.Target>
            <Center className={classes.link}>
              <span className={classes.linkLabel}>{link.label}</span>
              <IconChevronDown size={14} stroke={1.5} />
            </Center>
          </Menu.Target>
          <Menu.Dropdown>{menuItems}</Menu.Dropdown>
        </Menu>
      );
    }

    return (
      <Link
        key={link.label}
        to={link.link}
        className={classes.link}
        // onClick={(event) => event.preventDefault()}
      >
        {link.label}
      </Link>
    );
  });

  return (
    <header className={classes.header}>
      <Container size={1200}>
        <Group justify="space-between" p={10}>
          <Link to="/">
            <img width={60} src={regeneraLogo} className={classes.logo} alt="Regenera logo" />
          </Link>
          <Group gap={5} visibleFrom="sm">
            {items}
          </Group>
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            hiddenFrom="sm"
            aria-label="Toggle navigation"
          />
          {user ? 
          <UserAvatar user={user} /> :
          <UnstyledButton onClick={() => window.open('/login', '_blank')}>
            <Avatar mb={15} size={60} />
          </UnstyledButton>}
        </Group>
      </Container>

      <Drawer
        opened={opened}
        onClose={close}
        size="100%"
        padding="md"
        title="Navegação"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px" mx="-md">
          <Divider my="sm" />
          {links.map((link) => {
            if (link.links) {
              return <DrawerLinksGroup key={link.label} link={link} />;
            }

            return (
              <Link
                key={link.label}
                to={link.link}
                className={classes.link}
                onClick={(event) => event.preventDefault()}
              >
                {link.label}
              </Link>
            );
          })}
        </ScrollArea>
      </Drawer>
    </header>
  );
}

function DrawerLinksGroup({
  link,
}: {
  link: { link: string; label: string; links?: { link: string; label: string }[] };
}) {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <>
      <UnstyledButton className={classes.link} onClick={toggle}>
        <Center inline>
          <span className={classes.linkLabel}>{link.label}</span>
          <IconChevronDown size={14} stroke={1.5} />
        </Center>
      </UnstyledButton>
      <Collapse in={opened}>
        {link.links?.map((subLink) => (
          <Link
            key={subLink.link}
            to={subLink.link}
            className={classes.subLink}
            onClick={(event) => event.preventDefault()}
          >
            {subLink.label}
          </Link>
        ))}
      </Collapse>
    </>
  );
}