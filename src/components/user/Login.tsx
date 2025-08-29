import axios from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Anchor,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { createUserToken } from "../../apis/core";
import { showError, showSuccess } from '../common/notifications';
import { useAuth } from "../../hooks/useAuth";
import classes from './Login.module.css';

export default function Login() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const userTokenCreation = useMutation({
    mutationFn: createUserToken,
    onSuccess: (data) => {
      auth({
        user: data.user,
        token: data.token
      });
      showSuccess(data.msg);
      navigate("/user");
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) showError(JSON.stringify(error.response?.data.msg));
    }
  });

  const form = useForm({
    mode: 'controlled',
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) return 'E-mail inválido';
        return null;
      },
      password: isNotEmpty('Campo obrigatório')
    }
  });

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const validation = form.validate();
    if (validation.hasErrors)
      throw new Error("Há campos inválidos no formulário.");

    userTokenCreation.mutate(form.values);
  }

  return (
    <Container size={450} my={40}>
      <Title ta="center" className={classes.title}>
        Acesse sua conta
      </Title>

      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        <TextInput
          key={form.key('email')}
          label="E-mail"
          placeholder="seu@email.com"
          required
          radius="md" 
          {...form.getInputProps('email')}
        />
        <PasswordInput
          key={form.key('password')}
          label="Senha"
          placeholder="Sua senha"
          required
          mt="md"
          radius="md"
          {...form.getInputProps('password')}
        />
        {/* <Group justify="space-between" mt="lg">
          <Checkbox label="Remember me" />
          <Anchor component="button" size="sm">
            Forgot password?
          </Anchor>
        </Group> */}
        <Button fullWidth mt="xl" radius="md" type="submit" onClick={handleLogin}>
          Entrar
        </Button>
      </Paper>

      <Text className={classes.footer}>
        Primeira vez por aqui? <Anchor component={Link} to="/signup">Crie uma conta</Anchor>
      </Text>
    </Container>
  );
}
