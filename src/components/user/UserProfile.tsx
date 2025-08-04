import axios, { AxiosResponse } from 'axios';
import { useNavigate, useParams } from "react-router";
import { Avatar, Button, Center, Container, Group, Paper, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconAt, IconBuildings, IconWorldPin } from '@tabler/icons-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from "../../hooks/useAuth";
import { deleteUser, deleteUserToken, getUser, UserReadData } from "../../apis/core";
import classes from './UserProfile.module.css';
import { QueryLoader } from '../common/QueryLoader';

export default function UserProfile() {
  let { userId } = useParams();

  let queryKey = ['user'];
  if (userId !== undefined)
    queryKey.push(userId);

  const userQueryOptions = {
    queryKey,
    queryFn: getUser
  }
  
  const { data } = useQuery(userQueryOptions);

  return (
    <QueryLoader {...userQueryOptions}>
      <Container size={300}>
        <UserDataCard data={data} />
        {userId === undefined && <UserOptions />}
      </Container>
    </QueryLoader>
  )
}

function UserDataCard({ data }: any) {

  return (
    <Paper withBorder shadow="sm" p={25} mt={20} mb={30} radius="md">
      <Avatar
        size={150}
        radius={120}
        mx="auto"
        mb={15} />
      <Text ta="center" fz="lg" fw={500} mb={10} className={classes.name}>
        {data.firstName} {data.lastName}
      </Text>
      <Text ta="center" fz="xs" tt="uppercase" fw={700} c="dimmed" mb={15}>
        {data.occupation}
      </Text>
      <Container size={200} pl={5} pr={5}>
        {data.company &&
        <Group wrap="nowrap" gap={10} mt={10}>
          <IconBuildings stroke={1.5} size={16} className={classes.icon} />
          <Text ta="center" fz="xs" c="dimmed">
            {data.company}
          </Text>
        </Group>
        }
        {data.country &&
        <Group wrap="nowrap" gap={10} mt={10}>
          <IconWorldPin stroke={1.5} size={16} className={classes.icon} />
          <Text ta="center" fz="xs" c="dimmed">
            {data.municipality && <>{data.municipality}, </>}{data.state && <>{data.state} - </>}{data.country}
          </Text>
        </Group>
        }
        <Group wrap="nowrap" gap={10} mt={10}>
          <IconAt stroke={1.5} size={16} className={classes.icon} />
          <Text ta="center" fz="xs" c="dimmed">
            {data.email}
          </Text>
        </Group>
      </Container>
    </Paper>
  )
}

function UserOptions() {
  const navigate = useNavigate();
  const { unauth } = useAuth();

  const userTokenDeletion = useMutation({
    mutationFn: deleteUserToken,
    onSuccess: () => {
      unauth();
      navigate("/");
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) alert(JSON.stringify(error.response?.data.msg));
    }
  });

  const userDeletion = useMutation({
    mutationFn: deleteUser,
    onSuccess:  () => {
      unauth();
      navigate("/");
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) alert(JSON.stringify(error.response?.data.msg));
    }
  });

  const openDeleteConfirmModal = () => modals.openConfirmModal({
    title: 'Deseja mesmo excluir sua conta?',
    children: (
      <Text size="sm">
        Esta ação é <strong>irreversível</strong>.
        Todos os seus dados pessoais serão apagados e não será mais possível acessar sua conta.
        Suas contribuições públicas continuarão disponíveis para consulta por outros usuários.
      </Text>
    ),
    labels: { confirm: 'Excluir', cancel: 'Cancelar exclusão' },
    confirmProps: { color: 'red' },
    onConfirm: () => userDeletion.mutate(),
  });

  return (
    <>
      <Center>
        <Group gap="md" mb={30}>
          <Button onClick={() => userTokenDeletion.mutate()}>Sair</Button>
          {/* <Button onClick={() => navigate("/user/edit")}>Editar</Button> */}
          <Button onClick={openDeleteConfirmModal} color='red'>Excluir</Button>
        </Group>
      </Center>
    </>
  )
}
