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

import { useNavigate, useParams } from "react-router";
import { Button, Container, Group, Paper, Space, Text } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteFarm, getFarm } from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import DeleteButton from "../common/DeleteButton";
import { QueryLoader } from "../common/QueryLoader";
import { showSuccess } from "../common/notifications";
import { positionToLatLng } from "../../utils/agroforestry";
import { FarmLandDetails, FarmMap, SiteTraitsDetails } from ".";

export default function FarmDetails() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const farmQueryOptions = {
    queryKey: ['farm', farmId!],
    queryFn: getFarm
  };
  const farm = useQuery(farmQueryOptions);

  const polygon = farm.data?.polygon ? positionToLatLng(farm.data.polygon.coordinates) : undefined;
  const location = !polygon && farm.data?.location ? positionToLatLng(farm.data.location.coordinates) : undefined;

  const handleProjectButtonClick = () => {
    navigate('project');
  };

  const farmDeletion = useMutation({
    mutationFn: deleteFarm,
    onSuccess: (data) => {
      queryClient.refetchQueries({ predicate: (query) => { return query.queryKey[0] === 'farmList' } });
      showSuccess(data.msg);
      navigate('/farms');
      queryClient.removeQueries({ queryKey: farmQueryOptions.queryKey });
    },
    onError: showMutationError
  });

  return (
    <QueryLoader {...farmQueryOptions}>
      { farm.data && 
      <Container size={550} mb={20}>
        <Paper withBorder shadow="sm" p={20}>
          <Group mb={10} justify="space-between">
            <Text fz="h2" fw={600}>{farm.data.name}</Text>
            <DeleteButton
              modalTitle="Deseja mesmo excluir essa propriedade?"
              modalContent={
                <Text size="sm" mb={20}>
                  Ao confirmar, você <strong>removerá</strong> o cadastro da 
                  propriedade <Text span fw={700}>{farm.data.name}</Text>, 
                  junto com todos os dados do projeto agroflorestal vinculado a ela.
                </Text>
              }
              onModalConfirm={() => farmDeletion.mutate(farm.data.id)}
            />
          </Group>
          <Container px={10}>
            <FarmMap
              farmLocation={location}
              farmPolygon={polygon}
              style={{ height: '400px', width: '100%' }}
              dragging={false}
              zoomControl={false}
              locationControl={false}
              scrollWheelZoom={false}
            />
          </Container>
          <Space h={15}/>
          <Button fullWidth color="teal" mb={30} onClick={handleProjectButtonClick}>Abrir projeto</Button>
          <Group justify="space-between">
            <Text fz="md" mb={10} fw={600}>Dados da propriedade</Text>
            <EditButton />
          </Group>
          <FarmLandDetails farm={farm.data} />
          <SiteTraitsDetails site={farm.data} />
        </Paper>
      </Container>}
      <Space h={25}/>
    </QueryLoader>
  )
}

function EditButton() {
  const navigate = useNavigate();

  const handleEditButtonClick = () => {
    navigate('edit');
  };

  return (
    <Button variant="default" size="compact-md" color="dimmed" onClick={() => handleEditButtonClick()}>
      <IconPencil />
      <Text fw={600}>&nbsp;
        Editar
      </Text>
    </Button>
  )
}
