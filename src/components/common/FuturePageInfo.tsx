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
