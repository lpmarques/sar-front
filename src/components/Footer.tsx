import { IconBrandInstagram, IconBrandGithub } from '@tabler/icons-react';
import { ActionIcon, Container, Group, Text } from '@mantine/core';
import ClickableText from './common/ClickableText';
import classes from './Footer.module.css';

export default function Footer() {

  return (
    <footer className={classes.footer}>
      <Container>
        <Group justify="space-between">
          <Group gap="xs">
            <Text c="dimmed" size="sm">
              © 2026 Regenera Mata Atlântica, <ClickableText 
                path="https://creativecommons.org/licenses/by-sa/4.0"
                title="Creative Commons Attribution-Share Alike 4.0"
                >
                CC BY-SA 4.0
              </ClickableText>.
            </Text>
            {/* <Image h={29} w={85} width={10} src="https://upload.wikimedia.org/wikipedia/commons/f/ff/CC-BY-SA.svg" /> */}
            <Text c="dimmed" size="sm">
              Desenvolvido por <ClickableText path="https://www.linkedin.com/in/lucaspmarques">Lucas Marques</ClickableText>.
            </Text>
          </Group>
          <Group gap={0} justify="flex-end" wrap="nowrap">
            <ActionIcon
              title="Instagram"
              onClick={() => window.open("https://www.instagram.com/regeneramataatlantica")}
              size="lg"
              color="gray"
              variant="subtle"
              >
              <IconBrandInstagram size={25} stroke={1.5} />
            </ActionIcon>
            <ActionIcon
              title="Github"
              onClick={() => window.open("https://github.com/lpmarques/sar-front")}
              size="lg"
              color="gray"
              variant="subtle"
              >
              <IconBrandGithub size={25} stroke={1.5} />
            </ActionIcon>
          </Group>
        </Group>
      </Container>
    </footer>
  );
}