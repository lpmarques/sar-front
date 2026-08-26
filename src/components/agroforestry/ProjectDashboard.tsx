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

import { useState } from "react";
import { useParams } from "react-router-dom";
import { Container, Grid, Paper, Transition } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getFarm, getFarmPlantFitnessList, getFieldList } from "../../apis/agroforestry";
import { ProjectProvider, useProject } from "../../hooks/useProject";
import { QueryLoader } from "../common/QueryLoader";
import { FieldMenu, FieldsMap } from ".";
import { ModalsProvider } from "@mantine/modals";

export default function ProjectDashboard() {
  const { farmId } = useParams();

  const farmQueryOptions = {
    queryKey: ['farm', farmId!.toString()],
    queryFn: getFarm
  };
  const farm = useQuery(farmQueryOptions);

  const fieldsQueryOptions = {
    queryKey: ['fieldList', farmId!.toString()],
    queryFn: getFieldList
  };
  const fields = useQuery(fieldsQueryOptions);
  
  const plantFitnessesQueryOptions = {
    queryKey: ['farmPlantFitnessList', farmId!.toString()],
    queryFn: getFarmPlantFitnessList
  }
  const plantsFitness = useQuery(plantFitnessesQueryOptions);

  if (!farm.data)
    return <QueryLoader {...farmQueryOptions} />
  if (!fields.data)
    return <QueryLoader {...fieldsQueryOptions} />
  
  return (
    <ProjectProvider
      farm={farm.data}
      initialFields={fields.data}
      plantsFitness={plantsFitness.data ?? []}
    >
      <ModalsProvider>
        <ProjectDashboardBody />
      </ModalsProvider>
    </ProjectProvider>
  )
}

function ProjectDashboardBody() {
  const { selectedFieldIndex } = useProject();
  const [isEditingFieldPolygon, setIsEditingFieldPolygon] = useState(false);
  const [isCroppingComputing, setIsCroppingComputing] = useState(false);

  return (
    <Container size="100%" mb={5} mt={-30}>
      <Grid>
        <Grid.Col span="auto">
          <Paper withBorder p={5}>
            <FieldsMap
              onFieldPolygonEditStart={() => setIsEditingFieldPolygon(true)}
              onFieldPolygonEditStop={() => setIsEditingFieldPolygon(false)}
              onCroppingComputed={() => setIsCroppingComputing(false)}
              style={{ height: '600px' }}
            />
          </Paper>
        </Grid.Col>
        <Transition mounted={selectedFieldIndex !== null} transition="slide-left">
          {(transStyle) => (
            <Grid.Col span={3} style={{ ...transStyle }}>
              {selectedFieldIndex !== null &&
              <Paper withBorder p={10} style={{ height: '100%' }}>
                <FieldMenu
                  inputsDisabled={isEditingFieldPolygon}
                  isCroppingComputing={isCroppingComputing}
                  onCroppingChange={() => setIsCroppingComputing(true)}
                />
              </Paper>}
            </Grid.Col>
          )}
        </Transition>
      </Grid>
    </Container>
  )
}
