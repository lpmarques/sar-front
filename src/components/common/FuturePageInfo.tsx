import { Button, Center, Container, Group, Text, Title } from '@mantine/core';
import classes from './HttpError.module.css';
import { useNavigate } from "react-router";
import { IconShovel } from '@tabler/icons-react';

type FuturePageInfoInput = {
  pageName: string,
  message?: string,
}

export function FuturePageInfo({ pageName }: FuturePageInfoInput) {
  const navigate = useNavigate();

  return (
    <Container className={classes.root}>
      <Center mb={10}><IconShovel size={80} stroke={1.5} /></Center>
      <Title fz="h1" fw={500} ta="center" mb={20}>{pageName}</Title>
      <Text c="dimmed" size="lg" ta="center" className={classes.description}>
        Essa página está em construção!<br/>Em breve, teremos mais para mostrar por aqui...
      </Text>
      <Group justify="center">
        <Button variant="subtle" size="md" onClick={() => navigate("/")}>
          Voltar para a página inicial
        </Button>
      </Group>
    </Container>
  );
}
