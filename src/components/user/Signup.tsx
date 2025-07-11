import axios from "axios";
import { Anchor, Button, Container, Loader, Paper, PasswordInput, Select, Text, TextInput, Title, NumberInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from "react-router";
import classes from './Login.module.css';
import InputTip from '../common/InputTip';
import { createUserToken, createUser, UserCreateData } from "../../apis/core";
import { getCountryList, getStateList, getMunicipalityList } from "../../apis/geography";
import { showError, showSuccess } from '../common/notifications';
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router";

export default function Signup() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  const userTokenCreation = useMutation({
    mutationFn: createUserToken,
    onSuccess: (data) => {
      auth({
        user: {
          email: data.data.user.email,
          firstName: data.data.user.email,
          lastName: data.data.user.last_name
        },
        token: data.data.token
      });
      navigate("/user");
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) showError(JSON.stringify(error.response?.data.msg));
    }
  });
  
  const userCreation = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      userTokenCreation.mutate(form.values);
      showSuccess(JSON.stringify(data.data.msg));
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) showError(JSON.stringify(error.response?.data.msg));
    }
  });

  interface SignupForm extends UserCreateData {
    confirmPassword: string
  }

  const form = useForm<SignupForm>({
    mode: 'controlled',
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      occupation: '',
    },
    validate: {
      firstName: isNotEmpty('Campo obrigatório'),
      lastName: isNotEmpty('Campo obrigatório'),
      email: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) return 'E-mail inválido';
        return null;
      },
      password: isNotEmpty('Campo obrigatório'),
      confirmPassword: (value, { password }) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (value !== password) return 'A confirmação não confere com a senha';
        return null;
      },
      occupation: isNotEmpty('Campo obrigatório'),
    },
    transformValues: (values) => ({
      ...values,
      countryId: Number(values.countryId),
      stateId: Number(values.stateId),
      municipalityId: Number(values.municipalityId)
    })
  });

  form.watch('countryId', ({value}) => {
    form.setValues({
      stateId: undefined,
      municipalityId: undefined
    });
  });

  form.watch('stateId', ({value}) => {
    form.setValues({
      municipalityId: undefined
    })
  });

  form.watch('municipalityId', ({value}) => {
  });

  const countries = useQuery({
    queryKey: [],
    queryFn: getCountryList
  });

  const states = useQuery({
    queryKey: [form.getValues().countryId?.toString() ?? '0'],
    queryFn: getStateList
  });

  const municipalities = useQuery({
    queryKey: [form.getValues().stateId?.toString() ?? '0'],
    queryFn: getMunicipalityList
  });

  let countryOptions = countries.data?.data.map(
    country => ({
      value: country.id.toString(),
      label: country.name
    })
  ).sort((a, b) => a.label.localeCompare(b.label));

  let stateOptions = states.data?.data.map(
    state => ({
      value: state.id.toString(),
      label: state.name
    })
  ).sort((a, b) => a.label.localeCompare(b.label));

  let municipalityOptions = municipalities.data?.data.map(
    municipality => ({
      value: municipality.id.toString(),
      label: municipality.name
    })
  ).sort((a, b) => a.label.localeCompare(b.label));

  const handleSignup = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const validation = form.validate();
    if (validation.hasErrors)
      throw new Error("Há campos inválidos no formulário.");
    
    userCreation.mutate(form.values);
  }

  const inputs = (
    <>
      <TextInput
        key={form.key('firstName')}
        label="Nome"
        placeholder="Seu nome"
        required
        {...form.getInputProps('firstName')}
      />
      <TextInput
        key={form.key('lastName')}
        label="Sobrenome"
        placeholder="Seu sobrenome"
        required
        {...form.getInputProps('lastName')}
      />
      <TextInput
        key={form.key('email')}
        label="E-mail"
        placeholder="seu@email.com"
        required
        leftSection={<InputTip label="Use um e-mail válido. Sujeito a confirmação." />}
        {...form.getInputProps('email')}
      />
      <PasswordInput
        key={form.key('password')}
        label="Senha"
        placeholder="Sua senha"
        required
        {...form.getInputProps('password')}
      />
      <PasswordInput
        key={form.key('confirmPassword')}
        label="Confirmação de senha"
        placeholder="Repita sua senha"
        required
        {...form.getInputProps('confirmPassword')}
      />
      <TextInput
        key={form.key('occupation')}
        label="Ocupação"
        placeholder="Atuação ou formação principal"
        required
        {...form.getInputProps('occupation')}
      />
      <TextInput
        key={form.key('company')}
        label="Empresa/Instituição (se houver)"
        placeholder="Empresa/instituição onde trabalha"
        {...form.getInputProps('company')}
      />
      <Select
        key={form.key('countryId')}
        label="País"
        placeholder="País de residência"
        data={countryOptions}
        clearable
        searchable
        {...form.getInputProps('countryId')}
      />
      {states.isLoading ? <Loader size={25} mt={20}/> :
      stateOptions && stateOptions.length > 0 &&
      <Select
        key={form.key('stateId')}
        label="Estado"
        placeholder="Estado de residência"
        data={stateOptions}
        clearable
        searchable
        {...form.getInputProps('stateId')}
      />
      }
      {municipalities.isLoading ? <Loader size={25} mt={20}/> :
      municipalityOptions && municipalityOptions.length > 0 &&
      <Select
        key={form.key('municipalityId')}
        label="Município"
        placeholder="Município de residência"
        data={municipalityOptions}
        clearable
        searchable
        {...form.getInputProps('municipalityId')}
      />
      }
    </>
  )

  return (
    <Container size={450} my={40}>
      <Title ta="center" className={classes.title}>
        Nova conta
      </Title>
      <Paper withBorder shadow="sm" p={22} mt={30} mb={30} radius="md">
        {inputs}
        <Button fullWidth mt="xl" radius="md" type="submit" onClick={handleSignup}>
          Criar conta
        </Button>
      </Paper>
      
      <Text className={classes.footer}>
        Já tem conta aqui? <Anchor component={Link} to="/login">Faça login</Anchor>
      </Text>
    </Container>
  )
}
