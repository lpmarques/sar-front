import { useNavigate } from "react-router";
import unidecode from "unidecode-plus";
import { Anchor, Button, Container, Loader, Paper, PasswordInput, Select, Text, TextInput, Title } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from "react-router";
import classes from './Login.module.css';
import InputTip from '../common/InputTip';
import { showError, showSuccess } from '../common/notifications';
import { showMutationError } from "../../apis/common";
import { createUserToken, createUser, UserWriteRequestData } from "../../apis/core";
import { getCountryList, getStateList, getMunicipalityList, MunicipalityData, CountryData, StateData } from "../../apis/geography";
import { useAuth } from "../../hooks/useAuth";

export default function Signup() {
  const { auth } = useAuth();
  const navigate = useNavigate();

  const userTokenCreation = useMutation({
    mutationFn: createUserToken,
    onSuccess: (data) => {
      auth({
        user: data.user,
        token: data.token
      });
      navigate("/user");
    },
    onError: showMutationError
  });
  
  const userCreation = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      userTokenCreation.mutate(form.values);
      showSuccess(data.msg);
    },
    onError: showMutationError
  });

  interface SignupForm extends UserWriteRequestData {
    confirmPassword: string,
    countryId?: number,
    stateId?: number,
    municipalityId?: number,
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
      firstName: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(unidecode(value))) return 'Nome inválido';
        return null;
      },
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

  form.watch('countryId', () => {
    form.setValues({
      stateId: undefined,
      municipalityId: undefined
    });
  });

  form.watch('stateId', () => {
    form.setValues({
      municipalityId: undefined
    })
  });

  const countries = useQuery({
    queryKey: ['countryList'],
    queryFn: getCountryList
  });

  const states = useQuery({
    queryKey: ['stateList', form.getValues().countryId?.toString() ?? '0'],
    queryFn: getStateList,
    enabled: form.getDirty().countryId,
  });

  const municipalities = useQuery({
    queryKey: ['municipalityList', form.getValues().stateId?.toString() ?? '0'],
    queryFn: getMunicipalityList,
    enabled: form.getDirty().stateId,
  });

  const geoDataToOptions = (data: CountryData[] | StateData[] | MunicipalityData[]) => {
    return data.map(
      item => ({
        value: item.id.toString(),
        label: item.name
      })
    ).sort((a, b) => a.label.localeCompare(b.label));
  }

  const countryOptions = countries.data ? geoDataToOptions(countries.data) : [];
  const stateOptions = states.data ? geoDataToOptions(states.data) : [];
  const municipalityOptions = municipalities.data ? geoDataToOptions(municipalities.data) : [];

  const handleSignup = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    const validation = form.validate();
    if (validation.hasErrors)
      return showError("Há campos inválidos no formulário.", "Erro");
    
    form.values['country'] = form.values.countryId ? countries.data!.find(item => item.id == form.values.countryId)?.name : undefined;
    form.values['state'] = form.values.stateId ? states.data!.find(item => item.id == form.values.stateId)?.name : undefined;
    form.values['municipality'] = form.values.municipalityId ? municipalities.data!.find(item => item.id == form.values.municipalityId)?.name : undefined;

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
      stateOptions.length > 0 &&
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
      municipalityOptions.length > 0 &&
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
        <Button loading={userCreation.isPending} fullWidth mt="xl" radius="md" type="submit" onClick={handleSignup}>
          Criar conta
        </Button>
      </Paper>
      
      <Text className={classes.footer}>
        Já tem conta aqui? <Anchor component={Link} to="/login">Faça login</Anchor>
      </Text>
    </Container>
  )
}
