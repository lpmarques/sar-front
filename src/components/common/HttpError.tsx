import { Button, Container, Group, Text, Title } from '@mantine/core';
import classes from './HttpError.module.css';
import { useNavigate } from "react-router";
import { Dispatch, SetStateAction } from "react";
import { useQueryClient } from '@tanstack/react-query';

type HttpErrorInput = {
  status: number | string,
  statusText: string,
  message?: string,
  queryKey: string[]
}

export function HttpError({ status, statusText, queryKey }: HttpErrorInput) {
  const navigate = useNavigate();
  
  status = typeof status === "number" ? status : Number(status)
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
      {(status >= 400 && status < 500) ?
      clientErrorContent :
      (status >= 500) ?
      serverErrorContent : <></>
      }
    </Container>
  );
}
