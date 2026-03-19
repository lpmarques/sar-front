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

import { Button, Container, Group, Text, Title } from '@mantine/core';
import classes from './HttpError.module.css';
import { useNavigate } from "react-router";
import { useQueryClient } from '@tanstack/react-query';

type HttpErrorInput = {
  status: number,
  statusText: string,
  message?: string,
  queryKey?: string[]
}

export function HttpError({ status, statusText, queryKey }: HttpErrorInput) {
  const navigate = useNavigate();
    
  const queryClient = useQueryClient();

  function tryAgain() {
    queryClient.invalidateQueries({ queryKey: queryKey });
  }

  const clientErrorContent = (
    <>
      <Text c="dimmed" size="lg" ta="center" className={classes.description}>
        O recurso que você procura pode não existir ou foi movido para outra URL.
      </Text>
      <Group justify="center">
        <Button variant="subtle" size="md" onClick={() => navigate("/")}>
          Voltar para a página inicial
        </Button>
      </Group>
    </>
  );

  const serverErrorContent = (
    <>
      <Text c="dimmed" size="lg" ta="center" className={classes.description}>
        O servidor não conseguiu responder à requisição. Entre em contato com o suporte ou tente novamente em alguns instantes.
      </Text>
      <Group justify="center">
        <Button variant="subtle" size="md" onClick={tryAgain}>
          Tentar novamente
        </Button>
      </Group>
    </>
  );

  return (
    <Container className={classes.root}>
      <div className={classes.label}>{status}</div>
      <Title className={classes.title}>{statusText}</Title>
      {
      (status >= 400 && status < 500) ?
      clientErrorContent :
      (status >= 500) ?
      serverErrorContent : <></>
      }
    </Container>
  );
}
