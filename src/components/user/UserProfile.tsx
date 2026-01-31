import { useNavigate, useParams } from "react-router";
import { Avatar, Button, Center, Container, Group, Paper, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconMail, IconBuildings, IconMapPin } from '@tabler/icons-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { showMutationError } from '../../apis/common';
import { deleteUser, deleteUserToken, getUser, UserReadData } from "../../apis/core";
import { QueryLoader } from '../common/QueryLoader';
import { useAuth } from "../../hooks/useAuth";
import classes from './UserProfile.module.css';

export default function UserProfile() {
  let { userEmail } = useParams();

  let queryKey = ['user'];
  if (userEmail !== undefined)
    queryKey.push(`email=${userEmail}`);

  const userQueryOptions = {
    queryKey,
    queryFn: getUser
  }
  
  const { data } = useQuery(userQueryOptions);

  return (
    <QueryLoader {...userQueryOptions}>
      <Container size={300}>
        <UserDataCard data={data!} />
        {userEmail === undefined && <UserOptions />}
      </Container>
    </QueryLoader>
  )
}

function UserDataCard({ data }: { data: UserReadData }) {
  const navigate = useNavigate();

  return (
    <Paper withBorder shadow="sm" p={25} mt={20} mb={30} radius="md">
      <Stack gap="xs">
      <Avatar
        size={150}
        radius={120}
        mx="auto"
        mb={5}
        name={`${data.firstName} ${data.lastName}`}
        color="initials" />
      <Text ta="center" fz="lg" fw={500} className={classes.name}>
        {data.firstName} {data.lastName}
      </Text>
      <Text ta="center" fz="xs" tt="uppercase" fw={700} c="dimmed">
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
          <IconMapPin stroke={1.5} size={20} className={classes.icon} />
          <Text ta="center" fz="xs" c="dimmed">
            {data.municipality && <>{data.municipality}, </>}{data.state && <>{data.state} - </>}{data.country}
          </Text>
        </Group>
        }
        <Group wrap="nowrap" gap={10} mt={10}>
          <IconMail stroke={1.5} size={15} className={classes.icon} />
          <Text ta="center" fz="xs" c="dimmed">
            {data.email}
          </Text>
        </Group>
      </Container>
      <Button mt={10} onClick={() => navigate("contents")}>Minhas contribuições</Button>
      </Stack>
    </Paper>
  )
}

function UserOptions() {
  const { unauth } = useAuth();
  const navigate = useNavigate();

  const userTokenDeletion = useMutation({
    mutationFn: deleteUserToken,
    onSuccess: () => {
      unauth();
      navigate("/");
    },
    onError: showMutationError
  });

  const userDeletion = useMutation({
    mutationFn: deleteUser,
    onSuccess:  () => {
      unauth();
      navigate("/");
    },
    onError: showMutationError
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
    <Center>
      <Group gap="md" mb={30}>
        <Button color="gray.6" onClick={() => userTokenDeletion.mutate()}>Sair</Button>
        {/* <Button onClick={() => navigate("/user/edit")}>Editar</Button> */}
        <Button onClick={openDeleteConfirmModal} color='red'>Excluir</Button>
      </Group>
    </Center>
  )
}
